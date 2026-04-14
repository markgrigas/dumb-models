import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom doesn't implement ResizeObserver — provide a minimal stub
global.ResizeObserver = vi.fn(function (cb) {
  this.observe   = vi.fn();
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();
});

vi.mock('three', () => ({
  WebGLRenderer: vi.fn(function () {
    this.setPixelRatio = vi.fn();
    this.setClearColor = vi.fn();
    this.setSize = vi.fn();
    this.render = vi.fn();
    this.dispose = vi.fn();
    this.shadowMap = { enabled: false, type: null };
  }),
  Scene: vi.fn(function () { this.add = vi.fn(); this.remove = vi.fn(); this.background = null; this.fog = null; this.environment = null; }),
  PMREMGenerator: vi.fn(function () { this.fromScene = vi.fn(() => ({ texture: { dispose: vi.fn() } })); this.dispose = vi.fn(); }),
  FogExp2: vi.fn(function (color, density) { this.color = color; this.density = density; }),
  Group: vi.fn(function () { this.add = vi.fn(); this.children = []; this.userData = {}; this.updateWorldMatrix = vi.fn(); }),
  PerspectiveCamera: vi.fn(function () {
    this.position = { set: vi.fn() };
    this.aspect = 1;
    this.updateProjectionMatrix = vi.fn();
  }),
  Timer: vi.fn(function () { this.update = vi.fn(); this.getElapsed = vi.fn(() => 0); this.getDelta = vi.fn(() => 0.016); }),
  AmbientLight:     vi.fn(function () {}),
  DirectionalLight: vi.fn(function () {
    this.position = { set: vi.fn() };
    this.castShadow = false;
    this.shadow = {
      mapSize: { set: vi.fn() },
      bias: 0,
      camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
    };
  }),
  PointLight:       vi.fn(function () { this.position = { set: vi.fn() }; this.castShadow = false; }),
  SpotLight:        vi.fn(function () { this.position = { set: vi.fn() }; this.castShadow = false; this.angle = 0; this.penumbra = 0; }),
  HemisphereLight:  vi.fn(function () {}),
  MeshStandardMaterial:  vi.fn(function (o) { this.color = o?.color; this.map = o?.map ?? null; this.dispose = vi.fn(); }),
  MeshPhysicalMaterial:  vi.fn(function (o) { this.color = o?.color; this.dispose = vi.fn(); }),
  MeshToonMaterial:      vi.fn(function (o) { this.color = o?.color; this.dispose = vi.fn(); }),
  MeshNormalMaterial:    vi.fn(function ()  { this.dispose = vi.fn(); }),
  MeshBasicMaterial:     vi.fn(function (o) { this.color = o?.color; this.dispose = vi.fn(); }),
  ShaderMaterial:        vi.fn(function (o) { this.uniforms = o?.uniforms ?? {}; this.dispose = vi.fn(); }),
  PointsMaterial:        vi.fn(function (o) { this.color = o?.color; this.dispose = vi.fn(); }),
  Mesh: vi.fn(function (geo, mat) {
    this.geometry = geo;
    this.material = mat;
    this.position  = { set: vi.fn(), y: 0 };
    this.rotation  = { set: vi.fn() };
    this.scale     = { set: vi.fn() };
    this.userData  = {};
    this.castShadow    = false;
    this.receiveShadow = false;
  }),
  Points: vi.fn(function (geo, mat) {
    this.geometry = geo;
    this.material = mat;
    this.position = { set: vi.fn() };
    this.userData = {};
  }),
  BufferGeometry: vi.fn(function () {
    this.setAttribute = vi.fn();
    this.attributes = { position: { array: new Float32Array(0), needsUpdate: false } };
    this.dispose = vi.fn();
  }),
  BufferAttribute: vi.fn(function (arr, itemSize) {
    this.array = arr;
    this.itemSize = itemSize;
    this.needsUpdate = false;
  }),
  Raycaster: vi.fn(function () {
    this.setFromCamera = vi.fn();
    this.intersectObjects = vi.fn(() => []);
  }),
  Color: vi.fn(function (val) {
    this.r = 1; this.g = 1; this.b = 1;
    this.getHex = vi.fn(() => 0xffffff);
    this.setHex = vi.fn();
    this.set = vi.fn();
    this.lerp = vi.fn();
  }),
  Vector2: vi.fn(function (x, y) { this.x = x ?? 0; this.y = y ?? 0; }),
  CanvasTexture: vi.fn(function () {
    this.wrapS  = 0;
    this.wrapT  = 0;
    this.repeat = { set: vi.fn() };
    this.dispose = vi.fn();
  }),
  BoxGeometry:          vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  SphereGeometry:       vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  CylinderGeometry:     vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  ConeGeometry:         vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  TorusGeometry:        vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  TorusKnotGeometry:    vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  RingGeometry:         vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  CapsuleGeometry:      vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  CircleGeometry:       vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  TetrahedronGeometry:  vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  OctahedronGeometry:   vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  DodecahedronGeometry: vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  IcosahedronGeometry:  vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  PlaneGeometry:        vi.fn(function () { this.dispose = vi.fn(); this.translate = vi.fn(); this.computeBoundingBox = vi.fn(); this.boundingBox = { min: { y: 0 }, max: { y: 1 } }; }),
  PCFShadowMap: 1,
  PCFSoftShadowMap: 2,
  ACESFilmicToneMapping: 4,
  RepeatWrapping:   1000,
  DoubleSide: 2,
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(function () {
    this.enableDamping = false;
    this.update  = vi.fn();
    this.dispose = vi.fn();
  }),
}));

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: vi.fn(function () {
    this.addPass = vi.fn();
    this.render  = vi.fn();
    this.dispose = vi.fn();
    this.setSize = vi.fn();
  }),
}));

vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/FilmPass.js', () => ({
  FilmPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/SSAOPass.js', () => ({
  SSAOPass: vi.fn(function () { this.kernelRadius = 0; this.minDistance = 0; this.maxDistance = 0; }),
}));

vi.mock('three/examples/jsm/postprocessing/AfterimagePass.js', () => ({
  AfterimagePass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/OutlinePass.js', () => ({
  OutlinePass: vi.fn(function () {
    this.edgeStrength = 0;
    this.visibleEdgeColor = { set: vi.fn() };
    this.hiddenEdgeColor  = { set: vi.fn() };
  }),
}));

vi.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/GTAOPass.js', () => {
  const GTAOPass = vi.fn(function () { this.output = 0; this.pdRings = 0; this.pdRadiusExponent = 1; this.radius = 0; this.thickness = 0; });
  GTAOPass.OUTPUT = { Default: 0 };
  return { GTAOPass };
});

vi.mock('three/examples/jsm/postprocessing/BokehPass.js', () => ({
  BokehPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/HalftonePass.js', () => ({
  HalftonePass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/SMAAPass.js', () => ({
  SMAAPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/postprocessing/FXAAPass.js', () => ({
  FXAAPass: vi.fn(function () { this.uniforms = { resolution: { value: { set: vi.fn() } } }; }),
}));

vi.mock('three/examples/jsm/postprocessing/RenderPixelatedPass.js', () => ({
  RenderPixelatedPass: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/exporters/GLTFExporter.js', () => ({
  GLTFExporter: vi.fn(function () {
    this.parse = vi.fn((scene, cb) => cb(new ArrayBuffer(0)));
  }),
}));

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildScene } from '../three/sceneBuilder.js';

function makeCanvas() {
  const canvas = {
    clientWidth: 800, clientHeight: 600, width: 800, height: 600,
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return canvas;
}

const GEOM_TYPES = [
  { type: 'box',          params: { width: 1, height: 1, depth: 1 } },
  { type: 'sphere',       params: { radius: 1, widthSegments: 8, heightSegments: 8 } },
  { type: 'cylinder',     params: { radiusTop: 0.5, radiusBottom: 0.5, height: 2, radialSegments: 8 } },
  { type: 'cone',         params: { radius: 0.5, height: 2, radialSegments: 8 } },
  { type: 'torus',        params: { radius: 1, tube: 0.3, radialSegments: 8, tubularSegments: 16 } },
  { type: 'torusknot',    params: { radius: 1, tube: 0.3, tubularSegments: 32, radialSegments: 8, p: 2, q: 3 } },
  { type: 'ring',         params: { innerRadius: 0.5, outerRadius: 1, thetaSegments: 16 } },
  { type: 'capsule',      params: { radius: 0.5, length: 1, capSegments: 8, radialSegments: 16 } },
  { type: 'circle',       params: { radius: 1, segments: 16 } },
  { type: 'tetrahedron',  params: { radius: 1, detail: 0 } },
  { type: 'octahedron',   params: { radius: 1, detail: 0 } },
  { type: 'dodecahedron', params: { radius: 1, detail: 0 } },
  { type: 'icosahedron',  params: { radius: 1, detail: 0 } },
  { type: 'plane',        params: { width: 2, height: 2 } },
];

const CHRISTMAS_TREE = {
  shadows: true,
  shapes: [
    { geometry: { type: 'cone',     params: { radius: 1.2, height: 2.5, radialSegments: 8 } }, material: { color: '#1a6e1a' }, position: [0, 1.25, 0] },
    { geometry: { type: 'cone',     params: { radius: 0.8, height: 1.8, radialSegments: 8 } }, material: { color: '#1f8c1f' }, position: [0, 2.65, 0] },
    { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 0.5, radialSegments: 8 } }, material: { color: '#8B4513', texture: 'wood' }, position: [0, 0.25, 0] },
    { geometry: { type: 'icosahedron', params: { radius: 0.2, detail: 0 } }, material: { color: '#ffff00', emissive: '#ffff00', emissiveIntensity: 2 }, position: [0, 3.7, 0], animation: { type: 'pulse', speed: 2, amplitude: 0.15 } },
  ],
};

describe('buildScene()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('window', { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600 });
  });

  // ── Core API ────────────────────────────────────────────────────────────────

  it('returns updateShape and dispose', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    expect(typeof s.updateShape).toBe('function');
    expect(typeof s.dispose).toBe('function');
  });

  // ── Legacy geometry types ───────────────────────────────────────────────────

  for (const geom of GEOM_TYPES) {
    it(`renders legacy ${geom.type} without throwing`, () => {
      expect(() => buildScene(makeCanvas(), { geometry: geom })).not.toThrow();
    });
  }

  // ── Multi-shape ─────────────────────────────────────────────────────────────

  it('renders multi-shape config without throwing', () => {
    expect(() => buildScene(makeCanvas(), CHRISTMAS_TREE)).not.toThrow();
  });

  it('creates correct geometry count for multi-shape', () => {
    buildScene(makeCanvas(), CHRISTMAS_TREE);
    expect(THREE.ConeGeometry).toHaveBeenCalledTimes(2);
    expect(THREE.CylinderGeometry).toHaveBeenCalledTimes(1);
    expect(THREE.IcosahedronGeometry).toHaveBeenCalledTimes(1);
  });

  it('passes color to material', () => {
    buildScene(makeCanvas(), CHRISTMAS_TREE);
    const colors = THREE.MeshStandardMaterial.mock.calls.map(c => c[0]?.color);
    expect(colors).toContain('#1a6e1a');
    expect(colors).toContain('#8B4513');
  });

  it('uses default color for legacy shape with no material', () => {
    buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    expect(THREE.MeshStandardMaterial.mock.calls[0][0]?.color).toBe('#646cff');
  });

  it('enables shadow map when shadows:true', () => {
    buildScene(makeCanvas(), CHRISTMAS_TREE);
    const renderer = THREE.WebGLRenderer.mock.instances[0];
    expect(renderer.shadowMap.enabled).toBe(true);
  });

  // ── Material types ──────────────────────────────────────────────────────────

  it('creates physical material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], material: { type: 'physical', color: '#aabbcc', transmission: 0.9 } }],
    })).not.toThrow();
    expect(THREE.MeshPhysicalMaterial).toHaveBeenCalled();
  });

  it('creates toon material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[1], material: { type: 'toon', color: '#ff0000' } }],
    })).not.toThrow();
    expect(THREE.MeshToonMaterial).toHaveBeenCalled();
  });

  it('creates wireframe material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[2], material: { type: 'wireframe', color: '#00ff00' } }],
    })).not.toThrow();
    expect(THREE.MeshBasicMaterial).toHaveBeenCalled();
  });

  // ── Shader materials ────────────────────────────────────────────────────────

  it('creates lava shader material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], material: { shader: 'lava' } }],
    })).not.toThrow();
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it('creates hologram shader material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[1], material: { shader: 'hologram' } }],
    })).not.toThrow();
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it('creates water shader material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[2], material: { shader: 'water' } }],
    })).not.toThrow();
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it('creates iridescent shader material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[3], material: { shader: 'iridescent' } }],
    })).not.toThrow();
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it('creates xray shader material without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[4], material: { shader: 'xray' } }],
    })).not.toThrow();
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it('shader material has uTime uniform', () => {
    buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], material: { shader: 'lava' } }],
    });
    const shaderCall = THREE.ShaderMaterial.mock.calls[0][0];
    expect(shaderCall.uniforms).toHaveProperty('uTime');
  });

  // ── Animation ───────────────────────────────────────────────────────────────

  it('stores animation spec on mesh userData', () => {
    buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], animation: { type: 'rotate', axis: 'y', speed: 1 } }],
    });
    const mesh = THREE.Mesh.mock.instances[0];
    expect(mesh.userData.animation).toEqual({ type: 'rotate', axis: 'y', speed: 1 });
  });

  // ── Lights ──────────────────────────────────────────────────────────────────

  it('adds custom point light without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      lights: [{ type: 'point', color: '#ff4400', intensity: 1.5, position: [2, 3, 0] }],
    })).not.toThrow();
    expect(THREE.PointLight).toHaveBeenCalled();
  });

  it('adds spot light without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      lights: [{ type: 'spot', color: '#ffffff', intensity: 2, position: [0, 10, 0], angle: 0.3 }],
    })).not.toThrow();
    expect(THREE.SpotLight).toHaveBeenCalled();
  });

  it('adds hemisphere light without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      lights: [{ type: 'hemisphere', skyColor: '#87ceeb', groundColor: '#8b4513', intensity: 0.6 }],
    })).not.toThrow();
    expect(THREE.HemisphereLight).toHaveBeenCalled();
  });

  // ── Particles ───────────────────────────────────────────────────────────────

  it('creates snow particle system without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      particles: [{ preset: 'snow', count: 100, spread: 5 }],
    })).not.toThrow();
    expect(THREE.Points).toHaveBeenCalled();
  });

  it('creates rain particle system without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      particles: [{ preset: 'rain', count: 100, spread: 4 }],
    })).not.toThrow();
    expect(THREE.Points).toHaveBeenCalled();
  });

  it('creates sparks particle system without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      particles: [{ preset: 'sparks', count: 50, spread: 2 }],
    })).not.toThrow();
    expect(THREE.Points).toHaveBeenCalled();
  });

  it('creates stars particle system without throwing', () => {
    expect(() => buildScene(makeCanvas(), {
      particles: [{ preset: 'stars', count: 200, spread: 10 }],
    })).not.toThrow();
    expect(THREE.Points).toHaveBeenCalled();
  });

  it('particle system uses BufferGeometry', () => {
    buildScene(makeCanvas(), {
      particles: [{ preset: 'snow', count: 50 }],
    });
    expect(THREE.BufferGeometry).toHaveBeenCalled();
  });

  it('particle system uses PointsMaterial', () => {
    buildScene(makeCanvas(), {
      particles: [{ preset: 'fire', count: 50 }],
    });
    expect(THREE.PointsMaterial).toHaveBeenCalled();
  });

  it('supports top-level particles array alongside shapes', () => {
    expect(() => buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], material: { color: '#ff0000' } }],
      particles: [{ preset: 'snow', count: 100 }],
    })).not.toThrow();
    expect(THREE.Mesh).toHaveBeenCalled();
    expect(THREE.Points).toHaveBeenCalled();
  });

  // ── Post-processing ─────────────────────────────────────────────────────────

  it('creates EffectComposer when postProcessing is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { bloom: { strength: 1, radius: 0.4, threshold: 0.2 } },
    });
    expect(EffectComposer).toHaveBeenCalled();
  });

  it('adds RenderPass to composer', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { bloom: { strength: 1 } },
    });
    expect(RenderPass).toHaveBeenCalled();
    const composer = EffectComposer.mock.instances[0];
    expect(composer.addPass).toHaveBeenCalled();
  });

  it('adds UnrealBloomPass when bloom is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { bloom: { strength: 0.8, radius: 0.4, threshold: 0.2 } },
    });
    expect(UnrealBloomPass).toHaveBeenCalled();
  });

  it('adds FilmPass when film is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { film: { intensity: 0.3 } },
    });
    expect(FilmPass).toHaveBeenCalled();
  });

  it('does not create EffectComposer when no postProcessing', () => {
    buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    expect(EffectComposer).not.toHaveBeenCalled();
  });

  // ── Dispose & cleanup ───────────────────────────────────────────────────────

  it('calls dispose on renderer when dispose() is called', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    s.dispose();
    expect(THREE.WebGLRenderer.mock.instances[0].dispose).toHaveBeenCalled();
  });

  it('calls cancelAnimationFrame on dispose', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    s.dispose();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('calls composer.dispose when postProcessing was active', () => {
    const s = buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { bloom: { strength: 1 } },
    });
    s.dispose();
    const composer = EffectComposer.mock.instances[0];
    expect(composer.dispose).toHaveBeenCalled();
  });

  // ── updateShape ─────────────────────────────────────────────────────────────

  it('updateShape switches geometry', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    s.updateShape({ geometry: GEOM_TYPES[1] });
    expect(THREE.SphereGeometry).toHaveBeenCalled();
  });

  it('updateShape handles multi-shape config', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    expect(() => s.updateShape(CHRISTMAS_TREE)).not.toThrow();
  });

  it('updateShape with postProcessing creates composer', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    s.updateShape({ geometry: GEOM_TYPES[0], postProcessing: { bloom: { strength: 1 } } });
    expect(EffectComposer).toHaveBeenCalled();
  });

  // ── New post-processing passes ──────────────────────────────────────────────

  it('adds SSAOPass when ssao is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { ssao: { radius: 4 } },
    });
    expect(SSAOPass).toHaveBeenCalled();
  });

  it('adds AfterimagePass when afterimage is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { afterimage: { damp: 0.9 } },
    });
    expect(AfterimagePass).toHaveBeenCalled();
  });

  it('adds OutlinePass when outline is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      postProcessing: { outline: { color: '#ff0000', strength: 3 } },
    });
    expect(OutlinePass).toHaveBeenCalled();
  });

  // ── Environment & atmosphere ────────────────────────────────────────────────

  it('sets scene.background when background is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      background: '#223344',
    });
    const scene = THREE.Scene.mock.instances[0];
    expect(THREE.Color).toHaveBeenCalledWith('#223344');
    expect(scene.background).toBeDefined();
  });

  it('sets scene.fog when fog is specified', () => {
    buildScene(makeCanvas(), {
      geometry: GEOM_TYPES[0],
      fog: { color: '#334455', density: 0.05 },
    });
    const scene = THREE.Scene.mock.instances[0];
    expect(THREE.FogExp2).toHaveBeenCalledWith('#334455', 0.05);
    expect(scene.fog).toBeDefined();
  });

  it('scene.fog is null when fog is not specified', () => {
    buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    const scene = THREE.Scene.mock.instances[0];
    expect(scene.fog).toBeNull();
  });

  // ── New animation types ─────────────────────────────────────────────────────

  it('stores orbit animation on mesh userData', () => {
    buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], animation: { type: 'orbit', radius: 3, speed: 0.5 } }],
    });
    const mesh = THREE.Mesh.mock.instances[0];
    expect(mesh.userData.animation).toEqual({ type: 'orbit', radius: 3, speed: 0.5 });
  });

  it('stores swing animation on mesh userData', () => {
    buildScene(makeCanvas(), {
      shapes: [{ geometry: GEOM_TYPES[0], animation: { type: 'swing', speed: 1, amplitude: 0.6, axis: 'z' } }],
    });
    const mesh = THREE.Mesh.mock.instances[0];
    expect(mesh.userData.animation).toEqual({ type: 'swing', speed: 1, amplitude: 0.6, axis: 'z' });
  });

  // ── Export ──────────────────────────────────────────────────────────────────

  it('exportGLB returns a promise', () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    expect(s.exportGLB()).toBeInstanceOf(Promise);
  });

  it('exportGLB resolves to a Blob', async () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    const blob = await s.exportGLB();
    expect(blob).toBeInstanceOf(Blob);
  });

  it('exportGLB calls GLTFExporter.parse', async () => {
    const s = buildScene(makeCanvas(), { geometry: GEOM_TYPES[0] });
    await s.exportGLB();
    const exporter = GLTFExporter.mock.instances[0];
    expect(exporter.parse).toHaveBeenCalled();
  });
});
