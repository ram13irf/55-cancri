import pyaudio
import numpy as np
import webbrowser
import subprocess
import os
import glob
import time
import threading
import tkinter as tk
import math
import random
import sys

import tracker
import lockcrack

try:
    import speech_recognition as sr
    SR_OK = True
except ImportError:
    SR_OK = False

# ---------------- SETTINGS ----------------
CLAP_MIN_HZ = 1500
CLAP_MAX_HZ = 4000
CLAP_THRESHOLD = 5000
DOUBLE_CLAP_GAP = 0.5
CLAP_COOLDOWN = 2.5
SAMPLE_RATE = 44100
CHUNK = 1024
AUDIO_RATE = 16000

# ---------------- FILE REGISTRY ----------------
def build_registry():
    reg = {}
    dirs = [
        r"C:\Program Files",
        r"C:\Program Files (x86)",
        os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs"),
        os.path.join(os.environ['USERPROFILE'], 'Desktop'),
    ]

    exts = ("*.exe", "*.lnk")

    for d in dirs:
        if not os.path.exists(d): continue
        for ext in exts:
            for path in glob.glob(os.path.join(d, "**/" + ext), recursive=True):
                name = os.path.splitext(os.path.basename(path))[0].lower()
                if name not in reg:
                    reg[name] = path
    return reg

# ---------------- INTENTS ----------------
def parse_intent(text, reg):
    t = text.lower().strip()

    if "time" in t:
        return "time", None, None

    if "tracker" in t or "camera" in t:
        return "tracker", None, None

    if "lock" in t:
        return "lock", None, None

    if t.startswith("search "):
        return "search", t.replace("search ", ""), None

    if t.startswith("open "):
        target = t.replace("open ", "")
        if target in reg:
            return "open", target, reg[target]

    return "search", t, None

# ---------------- UI SYSTEM ----------------
class SystemR:
    def __init__(self, root):
        self.root = root
        self.root.title("R")
        self.root.geometry("360x520")
        self.root.configure(bg="#0a0a0a")
        self.root.overrideredirect(True)

        self.state = "loading"
        self.bars = [0.0] * 32
        self.reg = {}

        self._build_ui()
        self._animate()

        threading.Thread(target=self._boot, daemon=True).start()

    def _build_ui(self):
        self.cv = tk.Canvas(self.root, width=360, height=260, bg="#0a0a0a", highlightthickness=0)
        self.cv.pack()

        self.sv = tk.StringVar(value="R")
        tk.Label(self.root, textvariable=self.sv, fg="white", bg="#0a0a0a").pack()

    def _boot(self):
        self.reg = build_registry()
        self.state = "idle"
        threading.Thread(target=self._audio_monitor, daemon=True).start()

    def _animate(self):
        self.cv.delete("all")
        cx, cy = 180, 130
        color = "#00d4ff"

        for i, h in enumerate(self.bars):
            angle = (i/32) * 2 * math.pi
            x1 = cx + 60 * math.cos(angle)
            y1 = cy + 60 * math.sin(angle)
            x2 = cx + (60 + h*80) * math.cos(angle)
            y2 = cy + (60 + h*80) * math.sin(angle)
            self.cv.create_line(x1, y1, x2, y2, fill=color)

            self.bars[i] = max(0, h - 0.05)

        self.root.after(30, self._animate)

    def _audio_monitor(self):
        p = pyaudio.PyAudio()
        s = p.open(format=pyaudio.paInt16, channels=1, rate=SAMPLE_RATE, input=True, frames_per_buffer=CHUNK)

        last_clap = 0
        count = 0

        while True:
            data = s.read(CHUNK, exception_on_overflow=False)
            arr = np.frombuffer(data, dtype=np.int16)

            vol = np.abs(arr).mean()

            if vol > 400:
                self.bars[random.randint(0,31)] = min(1.0, vol/7000)

            fft = np.fft.rfft(arr)
            freqs = np.fft.rfftfreq(len(arr), 1/SAMPLE_RATE)
            mask = (freqs >= CLAP_MIN_HZ) & (freqs <= CLAP_MAX_HZ)

            if np.abs(fft[mask]).mean() > CLAP_THRESHOLD:
                now = time.time()
                count = count + 1 if now - last_clap < DOUBLE_CLAP_GAP else 1
                last_clap = now

                if count >= 2:
                    count = 0
                    self.root.after(0, self._trigger)

    def _trigger(self):
        if self.state != "idle":
            return

        self.state = "listening"
        self.sv.set("Listening...")

        threading.Thread(target=self._process, daemon=True).start()

    def _process(self):
        text = self._listen()

        if not text:
            self.state = "idle"
            self.sv.set("R")
            return

        intent, target, path = parse_intent(text, self.reg)

        if intent == "tracker":
            threading.Thread(target=tracker.run_tracker, daemon=True).start()

        elif intent == "lock":
            threading.Thread(target=lockcrack.run_lock, daemon=True).start()

        elif intent == "search":
            webbrowser.open(f"https://google.com/search?q={target}")

        elif intent == "open":
            os.startfile(path)

        self.state = "idle"
        self.sv.set("R")

    def _listen(self):
        if not SR_OK:
            return None

        r = sr.Recognizer()
        with sr.Microphone() as source:
            try:
                audio = r.listen(source, timeout=5)
                return r.recognize_google(audio)
            except:
                return None

# ---------------- RUN ----------------
if __name__ == "__main__":
    root = tk.Tk()
    SystemR(root)
    root.mainloop()