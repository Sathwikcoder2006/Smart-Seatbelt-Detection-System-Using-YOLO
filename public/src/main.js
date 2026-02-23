import * as THREE from 'three'
import { LoadGLTFByPath } from './Helpers/ModelHelper.js'
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/renderers/CSS2DRenderer';

//Renderer does the job of rendering the graphics
let renderer = new THREE.WebGLRenderer({

	//Defines the canvas component in the DOM that will be used
	canvas: document.querySelector('#background'),
  antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);

//set up the renderer with the default settings for threejs.org/editor - revision r153

renderer.setPixelRatio( window.devicePixelRatio );
renderer.toneMapping = 0;
renderer.toneMappingExposure = 1
renderer.useLegacyLights  = false;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0xffffff, 0);
//make sure three/build/three.module.js is over r152 or this feature is not available. 
renderer.outputColorSpace = THREE.SRGBColorSpace 

const scene = new THREE.Scene();

let cameraList = [];

let camera;
let z;
const zfinal = 30;
window.addEventListener('mousedown', function() {
  z = camera.position.z;
});

//A method to be run each time a frame is generated
let isAnimating = true;

function animate() {
  requestAnimationFrame(animate);

  if (isAnimating && z !== undefined && z < zfinal) {
    z -= 0.1;
    camera.position.z = z;
  }

  labelRenderer.render(scene, camera);

  renderer.render(scene, camera);
}

window.addEventListener('dblclick', function() {
  isAnimating = false;
});

const img = document.createElement('img');
img.style.position = 'absolute';
img.style.top = '600px';
img.style.left = '20px';
img.style.width = '700px';
img.style.height = '200px';
img.style.pointerEvents = 'none';
img.style.zIndex = '999';         
img.src = 'car_console_images/in_motion_seatbelt_off.jpeg';    
document.body.appendChild(img);

const SEATBELT_ON_IMG  = 'car_console_images/in_motion_seatbelt_on.jpeg';
const SEATBELT_OFF_IMG = 'car_console_images/in_motion_seatbelt_off.jpeg';

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(this.window.innerWidth, this.window.innerHeight)
})

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
document.body.appendChild(labelRenderer.domElement);

// Load the GLTF model
LoadGLTFByPath(scene)
  .then(() => {
    retrieveListOfCameras(scene);
  })
  .catch((error) => {
    console.error('Error loading JSON scene:', error);
  });

//retrieve list of all cameras
function retrieveListOfCameras(scene) {
  scene.traverse(function (object) {
    if (object.isCamera) {
      cameraList.push(object);
    }
  });

  camera = cameraList[0];
  z = camera.position.z;
  updateCameraAspect(camera);
  animate();
}

// Set the camera aspect ratio to match the browser window dimensions
function updateCameraAspect(camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ─── Seatbelt Detection via Server-Sent Events ────────────────────────────────
// Connects to the Flask backend which streams detection results
// from seatbelt_testing.mov in real-time.

const eventSource = new EventSource('http://localhost:5000/detect-stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.status === 'ended') {
    console.log('Video processing complete');
    eventSource.close();
    return;
  }

  if (data.error) {
    console.error('Detection error:', data.error);
    return;
  }

  console.log(`Frame ${data.frame} — seatbelt: ${data.seatbelt_detected} (conf: ${data.confidence})`);

  // Swap the car console image based on detection result
  img.src = data.seatbelt_detected ? SEATBELT_ON_IMG : SEATBELT_OFF_IMG;
};

eventSource.onerror = (err) => {
  console.error('SSE connection error:', err);
  eventSource.close();
};