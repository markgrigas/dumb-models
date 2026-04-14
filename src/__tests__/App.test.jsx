import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('three', () => ({
  WebGLRenderer: vi.fn(function () {
    this.setPixelRatio = vi.fn(); this.setClearColor = vi.fn();
    this.setSize = vi.fn(); this.render = vi.fn(); this.dispose = vi.fn();
    this.shadowMap = { enabled: false, type: null };
  }),
  Scene:            vi.fn(function () { this.add = vi.fn(); this.remove = vi.fn(); this.background = null; this.fog = null; this.environment = null; }),
  PMREMGenerator:   vi.fn(function () { this.fromScene = vi.fn(() => ({ texture: { dispose: vi.fn() } })); this.dispose = vi.fn(); }),
  FogExp2:          vi.fn(function () {}),
  Group:            vi.fn(function () { this.add = vi.fn(); this.children = []; }),
  PerspectiveCamera: vi.fn(function () {
    this.position = { set: vi.fn() }; this.aspect = 1; this.updateProjectionMatrix = vi.fn();
  }),
  Timer:             vi.fn(function () { this.update = vi.fn(); this.getElapsed = vi.fn(() => 0); }),
  AmbientLight:      vi.fn(function () {}),
  DirectionalLight:  vi.fn(function () { this.position = { set: vi.fn() }; this.castShadow = false; }),
  PointLight:        vi.fn(function () { this.position = { set: vi.fn() }; this.castShadow = false; }),
  SpotLight:         vi.fn(function () { this.position = { set: vi.fn() }; this.castShadow = false; this.angle = 0; this.penumbra = 0; }),
  HemisphereLight:   vi.fn(function () {}),
  MeshStandardMaterial:  vi.fn(function (o) { this.color = o?.color; this.map = null; this.dispose = vi.fn(); }),
  MeshPhysicalMaterial:  vi.fn(function ()  { this.dispose = vi.fn(); }),
  MeshToonMaterial:      vi.fn(function ()  { this.dispose = vi.fn(); }),
  MeshNormalMaterial:    vi.fn(function ()  { this.dispose = vi.fn(); }),
  MeshBasicMaterial:     vi.fn(function ()  { this.dispose = vi.fn(); }),
  ShaderMaterial:        vi.fn(function (o) { this.uniforms = o?.uniforms ?? {}; this.dispose = vi.fn(); }),
  PointsMaterial:        vi.fn(function ()  { this.dispose = vi.fn(); }),
  Mesh: vi.fn(function (geo, mat) {
    this.geometry = geo; this.material = mat;
    this.position = { set: vi.fn(), y: 0 };
    this.rotation = { set: vi.fn() };
    this.scale    = { set: vi.fn() };
    this.userData = {};
    this.castShadow = false; this.receiveShadow = false;
  }),
  Points: vi.fn(function (geo, mat) {
    this.geometry = geo; this.material = mat;
    this.position = { set: vi.fn() };
    this.userData = {};
  }),
  BufferGeometry: vi.fn(function () {
    this.setAttribute = vi.fn();
    this.attributes = { position: { array: new Float32Array(0), needsUpdate: false } };
    this.dispose = vi.fn();
  }),
  BufferAttribute: vi.fn(function (arr, itemSize) {
    this.array = arr; this.itemSize = itemSize; this.needsUpdate = false;
  }),
  Raycaster: vi.fn(function () {
    this.setFromCamera = vi.fn();
    this.intersectObjects = vi.fn(() => []);
  }),
  Color: vi.fn(function () {
    this.getHex = vi.fn(() => 0xffffff);
    this.setHex = vi.fn(); this.set = vi.fn(); this.lerp = vi.fn();
  }),
  Vector2: vi.fn(function (x, y) { this.x = x ?? 0; this.y = y ?? 0; }),
  CanvasTexture:       vi.fn(function () { this.wrapS = 0; this.wrapT = 0; this.repeat = { set: vi.fn() }; this.dispose = vi.fn(); }),
  BoxGeometry:          vi.fn(function () { this.dispose = vi.fn(); }),
  SphereGeometry:       vi.fn(function () { this.dispose = vi.fn(); }),
  CylinderGeometry:     vi.fn(function () { this.dispose = vi.fn(); }),
  ConeGeometry:         vi.fn(function () { this.dispose = vi.fn(); }),
  TorusGeometry:        vi.fn(function () { this.dispose = vi.fn(); }),
  TorusKnotGeometry:    vi.fn(function () { this.dispose = vi.fn(); }),
  RingGeometry:         vi.fn(function () { this.dispose = vi.fn(); }),
  CapsuleGeometry:      vi.fn(function () { this.dispose = vi.fn(); }),
  CircleGeometry:       vi.fn(function () { this.dispose = vi.fn(); }),
  TetrahedronGeometry:  vi.fn(function () { this.dispose = vi.fn(); }),
  OctahedronGeometry:   vi.fn(function () { this.dispose = vi.fn(); }),
  DodecahedronGeometry: vi.fn(function () { this.dispose = vi.fn(); }),
  IcosahedronGeometry:  vi.fn(function () { this.dispose = vi.fn(); }),
  PlaneGeometry:        vi.fn(function () { this.dispose = vi.fn(); }),
  PCFShadowMap: 1,
  ACESFilmicToneMapping: 4,
  RepeatWrapping: 1000,
  DoubleSide: 2,
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(function () {
    this.enableDamping = false; this.update = vi.fn(); this.dispose = vi.fn();
  }),
}));

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: vi.fn(function () {
    this.addPass = vi.fn(); this.render = vi.fn(); this.dispose = vi.fn(); this.setSize = vi.fn();
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

vi.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: vi.fn(function () {}),
}));

vi.mock('three/examples/jsm/exporters/GLTFExporter.js', () => ({
  GLTFExporter: vi.fn(function () {
    this.parse = vi.fn((scene, cb) => cb(new ArrayBuffer(0)));
  }),
}));

vi.stubGlobal('requestAnimationFrame', vi.fn());
vi.stubGlobal('cancelAnimationFrame', vi.fn());
vi.stubGlobal('window', { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600 });

describe('App', () => {
  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('shows the app title', () => {
    render(<App />);
    expect(screen.getByText('dumb-models')).toBeTruthy();
  });

  it('shows the search input', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Search shapes...')).toBeTruthy();
  });

  it('shows the placeholder message before any shape is selected', () => {
    render(<App />);
    expect(screen.getByText('Select a shape to render')).toBeTruthy();
  });

  it('renders the canvas element', () => {
    render(<App />);
    expect(document.querySelector('canvas')).toBeTruthy();
  });

  it('renders the Export button disabled when no shape is selected', () => {
    render(<App />);
    const exportBtn = screen.getByText('Export');
    expect(exportBtn.disabled).toBe(true);
  });
});
