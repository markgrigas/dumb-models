import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export function loadGLTF(src) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(src, gltf => {
      const group = gltf.scene;
      let mixer = null;
      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(group);
        for (const clip of gltf.animations) mixer.clipAction(clip).play();
      }
      resolve({ group, mixer });
    }, undefined, reject);
  });
}
