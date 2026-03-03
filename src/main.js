import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0, 120, 300);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const pointLight = new THREE.PointLight(0xffdd88, 2, 2000);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Texture loader
const loader = new THREE.TextureLoader();
const textures = {
  sun: loader.load('/textures/8k_sun.jpg'),
  b: loader.load('/textures/gas.jpg'),
  c: loader.load('/textures/gas.jpg'),
  d: loader.load('/textures/gas.jpg'),
  f: loader.load('/textures/ice.jpg')
};

// Central star
const starMaterial = new THREE.MeshStandardMaterial({
  map: textures.sun,
  color: 0xff5555,
  emissive: 0xff2200,
  emissiveIntensity: 1,
  roughness: 0.3,
  metalness: 0.1
});
const star = new THREE.Mesh(new THREE.SphereGeometry(20, 128, 128), starMaterial);
star.userData = {name:"55 Cancri", info:"Keskustähti planeettojen ympärillä. Se on huomattavasti suurempi ja kirkkaampi kuin Aurinko."};
scene.add(star);

// Solar rays
const rayMaterial = new THREE.LineBasicMaterial({ color:0xff3300, transparent:true, opacity:0.4 });
for(let i=0;i<50;i++){
  const geometry = new THREE.BufferGeometry();
  const dir = new THREE.Vector3((Math.random()-0.5)*50,(Math.random()-0.5)*50,(Math.random()-0.5)*50);
  geometry.setFromPoints([star.position, star.position.clone().add(dir)]);
  const line = new THREE.Line(geometry, rayMaterial);
  scene.add(line);
}

// Label helper
function createLabel(text, color, size=12, height=3){
  const canvas = document.createElement('canvas');
  canvas.width=256; canvas.height=64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle="#" + color.toString(16);
  ctx.font=`${size}px Arial`;
  ctx.textAlign='center';
  ctx.fillText(text,128,48);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture }));
  sprite.scale.set(size*1.2,height,1);
  return sprite;
}

// Star label
const starLabel = createLabel(star.userData.name, 0xff5555, 14, 4);
starLabel.position.set(0,25,0);
scene.add(starLabel);

// Starfield
const starGeometry = new THREE.BufferGeometry();
const starsCount = 7000;
const positions = new Float32Array(starsCount*3);
for(let i=0;i<starsCount;i++){
  positions[i*3]=(Math.random()-0.5)*5000;
  positions[i*3+1]=(Math.random()-0.5)*5000;
  positions[i*3+2]=(Math.random()-0.5)*5000;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
const starFieldMaterial = new THREE.PointsMaterial({ color:0xffffff, size:0.5 });
scene.add(new THREE.Points(starGeometry, starFieldMaterial));

// Planets with bright, moving halo highlights
const planetData=[
  { size:2, distance:60, texture:textures.sun, name:'55 Cancri e', info:'Pieni kiviplaneetta, erittäin kuuma, laavaa ja voimakkaita vulkaanisia purkauksia.', color:0xff3300, emissive:0xff2200, emissiveIntensity:0.8 },
  { size:2.5, distance:120, texture:textures.b, name:'55 Cancri b', info:'Kaasujättiläinen lähellä tähteä. Suurempi ja kuumempi kuin Maa.', color:0xff9933 },
  { size:3, distance:180, texture:textures.c, name:'55 Cancri c', info:'Suurempi kaasujättiläinen kauempana. Ei elinkelpoinen.', color:0xffcc66 },
  { size:3.5, distance:260, texture:textures.f, name:'55 Cancri f', info:'Mahdollisesti elinkelpoinen, lämpötila sopiva veden esiintymiseen.', color:0x66ccff },
  { size:5, distance:360, texture:textures.d, name:'55 Cancri d', info:'Suurin planeetta kaukana, jättimäinen kaasujättiläinen.', color:0xcc9966 }
];

const planets=[];
const planetLabels=[];
const planetHalos=[]; // store halos

planetData.forEach(d=>{
  const mat=new THREE.MeshStandardMaterial({
    map: d.texture,
    color: d.color,
    emissive: d.emissive||0x000000,
    emissiveIntensity: d.emissiveIntensity||0,
    roughness:0.4,
    metalness:0.1
  });

  const planet=new THREE.Mesh(new THREE.SphereGeometry(d.size,128,128), mat);
  planet.position.x=d.distance;
  planet.userData={name:d.name, info:d.info, size:d.size};
  scene.add(planet); 
  planets.push(planet);

  // Bright glowing halo
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5, // much brighter
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(d.size*1.6, 64, 64), glowMat);
  glow.position.copy(planet.position);
  scene.add(glow);
  planetHalos.push(glow);

  // Label
  const label=createLabel(d.name, d.color, 12, 3);
  label.position.set(d.distance,d.size+4,0);
  scene.add(label);
  planetLabels.push(label);
});

// Info panel
const infoPanel=document.getElementById('info-panel');
const planetNameEl=document.getElementById('planet-name');
const planetInfoEl=document.getElementById('planet-info');

const clickableObjects=[star,...planets];
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();

window.addEventListener('click', e=>{
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const intersects=raycaster.intersectObjects(clickableObjects);
  if(intersects.length>0){
    const obj=intersects[0].object;
    planetNameEl.textContent=obj.userData.name;
    planetInfoEl.textContent=obj.userData.info + " (Koko: " + obj.userData.size + " yksikköä)";
    infoPanel.classList.remove('show');
    setTimeout(()=>infoPanel.classList.add('show'),50);
  }
});

// Animate
function animate(){
  requestAnimationFrame(animate);

  planets.forEach((p,i)=>{
    p.rotation.y+=0.01;
    p.position.applyAxisAngle(new THREE.Vector3(0,1,0),0.001*(i+1));

    // Update corresponding halo position
    planetHalos[i].position.copy(p.position);
  });

  planetLabels.forEach((l,i)=>{
    l.position.x=planets[i].position.x;
    l.position.z=planets[i].position.z;
  });

  starLabel.position.set(star.position.x, star.position.y+25, star.position.z);

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Responsive
window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});