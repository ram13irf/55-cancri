import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ✅ Vite image imports (images must be inside src folder)
import sunTexture from './8k_sun.jpg'
import gasTexture from './gas.jpg'
import iceTexture from './ice.jpg'

// --------------------
// SCENE & CAMERA
// --------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000010)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
)
camera.position.set(0, 120, 320)

// --------------------
// RENDERER (IMPORTANT FIX HERE)
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// ✅ CRITICAL FIX FOR MODERN THREE.JS
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2

document.body.appendChild(renderer.domElement)

// --------------------
// CONTROLS
// --------------------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// --------------------
// LIGHTS
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
scene.add(new THREE.PointLight(0xffaa55, 5, 3000))

// --------------------
// TEXTURES
// --------------------
const loader = new THREE.TextureLoader()

const textures = {
  sun: loader.load(sunTexture),
  gas: loader.load(gasTexture),
  ice: loader.load(iceTexture)
}

textures.sun.colorSpace = THREE.SRGBColorSpace
textures.gas.colorSpace = THREE.SRGBColorSpace
textures.ice.colorSpace = THREE.SRGBColorSpace

// --------------------
// CENTRAL STAR
// --------------------
const starMaterial = new THREE.MeshStandardMaterial({
  map: textures.sun,
  emissive: 0xff3300,
  emissiveIntensity: 2,
  roughness: 0.4,
  metalness: 0.1
})

const star = new THREE.Mesh(
  new THREE.SphereGeometry(22, 128, 128),
  starMaterial
)

star.userData = {
  nimi: "55 Cancri",
  info: "Kirkas tähti noin 40 valovuoden päässä."
}

scene.add(star)

// --------------------
// LAVA PARTICLES
// --------------------
const lavaGeo = new THREE.BufferGeometry()
const lavaCount = 500
const lavaPositions = new Float32Array(lavaCount * 3)

for (let i = 0; i < lavaCount; i++) {
  const phi = Math.random() * Math.PI * 2
  const theta = Math.random() * Math.PI
  const r = 22 + Math.random() * 2

  lavaPositions[i * 3] = r * Math.sin(theta) * Math.cos(phi)
  lavaPositions[i * 3 + 1] = r * Math.cos(theta)
  lavaPositions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi)
}

lavaGeo.setAttribute(
  'position',
  new THREE.BufferAttribute(lavaPositions, 3)
)

const lavaMat = new THREE.PointsMaterial({
  color: 0xff3300,
  size: 1.2,
  transparent: true,
  opacity: 0.8
})

const lavaParticles = new THREE.Points(lavaGeo, lavaMat)
star.add(lavaParticles)

// --------------------
// PLANETS
// --------------------
const planetData = [
  { size: 3, distance: 75, texture: textures.sun, color: 0xff7744, nimi: "55 Cancri e", info: "Kuuma kiviplaneetta." },
  { size: 5, distance: 140, texture: textures.gas, color: 0xffbb66, nimi: "55 Cancri b", info: "Kaasujättiläinen." },
  { size: 6, distance: 210, texture: textures.gas, color: 0xffdd88, nimi: "55 Cancri c", info: "Massiivinen kaasukehä." },
  { size: 7, distance: 290, texture: textures.ice, color: 0x66ccff, nimi: "55 Cancri f", info: "Mahdollisesti elinkelpoinen." },
  { size: 10, distance: 390, texture: textures.sun, color: 0xcc4433, nimi: "55 Cancri d", info: "Suurin planeetta." }
]

const planets = []
const halos = []

planetData.forEach((d, i) => {
  const mat = new THREE.MeshStandardMaterial({
    map: d.texture,
    emissive: d.color,
    emissiveIntensity: 0.3,
    roughness: 0.5,
    metalness: 0.1
  })

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(d.size, 128, 128),
    mat
  )

  planet.position.x = d.distance
  planet.userData = { nimi: d.nimi, info: d.info }

  scene.add(planet)
  planets.push(planet)

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
  })

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(d.size * 1.8, 64, 64),
    haloMat
  )

  halo.userData = { parentPlanet: planet }
  planet.add(halo)
  halos.push(halo)
})

// --------------------
// STARFIELD
// --------------------
const starGeo = new THREE.BufferGeometry()
const starCount = 9000
const positions = new Float32Array(starCount * 3)

for (let i = 0; i < starCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 5000
  positions[i * 3 + 1] = (Math.random() - 0.5) * 5000
  positions[i * 3 + 2] = (Math.random() - 0.5) * 5000
}

starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })))

// --------------------
// INFO PANEL CLICK
// --------------------
const infoPanel = document.getElementById('info-panel')
const planetNameEl = document.getElementById('planet-name')
const planetInfoEl = document.getElementById('planet-info')

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects([star, ...planets, ...halos], true)

  if (intersects.length > 0) {
    let obj = intersects[0].object
    if (obj.userData.parentPlanet) obj = obj.userData.parentPlanet

    planetNameEl.textContent = obj.userData.nimi
    planetInfoEl.textContent = obj.userData.info
    infoPanel.classList.add('show')
  }
})

// --------------------
// ANIMATION LOOP
// --------------------
function animate() {
  requestAnimationFrame(animate)

  star.rotation.y += 0.002

  const lavaPos = lavaParticles.geometry.attributes.position.array
  for (let i = 0; i < lavaPos.length; i += 3) {
    lavaPos[i] += (Math.random() - 0.5) * 0.05
    lavaPos[i + 1] += (Math.random() - 0.5) * 0.05
    lavaPos[i + 2] += (Math.random() - 0.5) * 0.05
  }
  lavaParticles.geometry.attributes.position.needsUpdate = true

  planets.forEach((p, i) => {
    p.rotation.y += 0.01
    p.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.001 * (i + 1))
    halos[i].material.opacity = 0.3 + Math.sin(Date.now() * 0.002 + i) * 0.15
  })

  controls.update()
  renderer.render(scene, camera)
}

animate()

// --------------------
// RESPONSIVE
// --------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})