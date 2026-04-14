import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { HalftonePass } from 'three/examples/jsm/postprocessing/HalftonePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { loadGLTF } from './gltfLoader.js';
import { initPhysics, stepPhysics, disposePhysics } from './physics.js';

// ─── Geometry ────────────────────────────────────────────────────────────────

const GEOMETRY_BUILDERS = {
  box:          p => new THREE.BoxGeometry(p?.width ?? 1,    p?.height ?? 1,    p?.depth ?? 1),
  sphere:       p => new THREE.SphereGeometry(p?.radius ?? 1, p?.widthSegments ?? 32, p?.heightSegments ?? 32),
  cylinder:     p => new THREE.CylinderGeometry(p?.radiusTop ?? 0.5, p?.radiusBottom ?? 0.5, p?.height ?? 1, p?.radialSegments ?? 16),
  cone:         p => new THREE.ConeGeometry(p?.radius ?? 0.5, p?.height ?? 1,  p?.radialSegments ?? 16),
  torus:        p => new THREE.TorusGeometry(p?.radius ?? 1,  p?.tube ?? 0.3,  p?.radialSegments ?? 16, p?.tubularSegments ?? 64),
  torusknot:    p => new THREE.TorusKnotGeometry(p?.radius ?? 1, p?.tube ?? 0.3, p?.tubularSegments ?? 64, p?.radialSegments ?? 16, p?.p ?? 2, p?.q ?? 3),
  ring:         p => new THREE.RingGeometry(p?.innerRadius ?? 0.5, p?.outerRadius ?? 1, p?.thetaSegments ?? 32),
  capsule:      p => new THREE.CapsuleGeometry(p?.radius ?? 0.5, p?.length ?? 1, p?.capSegments ?? 8, p?.radialSegments ?? 16),
  circle:       p => new THREE.CircleGeometry(p?.radius ?? 1, p?.segments ?? 32),
  tetrahedron:  p => new THREE.TetrahedronGeometry(p?.radius ?? 1, p?.detail ?? 0),
  octahedron:   p => new THREE.OctahedronGeometry(p?.radius ?? 1, p?.detail ?? 0),
  dodecahedron: p => new THREE.DodecahedronGeometry(p?.radius ?? 1, p?.detail ?? 0),
  icosahedron:  p => new THREE.IcosahedronGeometry(p?.radius ?? 1, p?.detail ?? 0),
  plane:        p => new THREE.PlaneGeometry(p?.width ?? 2,   p?.height ?? 2),

  terrain: p => {
    const geo = new THREE.PlaneGeometry(
      p?.width ?? 10, p?.depth ?? 10,
      p?.widthSegments ?? 64, p?.heightSegments ?? 64,
    );
    geo.rotateX(-Math.PI / 2);
    const amp  = p?.amplitude  ?? 1.5;
    const freq = p?.frequency  ?? 0.3;
    const pos  = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = (Math.sin(x * freq) * Math.cos(z * freq)
               + Math.sin(x * freq * 1.7 + 0.5) * 0.5
               + Math.sin(z * freq * 2.3 + 1.2) * 0.3) * amp;
      pos.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  },

  lathe: p => {
    const rawPts = p?.points ?? [[0,0],[0.6,0.4],[0.5,0.8],[0.3,1.4],[0.4,2],[0,2.2]];
    const points = rawPts.map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(points, p?.segments ?? 16);
  },
};

// ─── Procedural textures ─────────────────────────────────────────────────────

function makeProceduralTexture(name) {
  try {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    switch (name) {
      case 'checker': {
        const s = size / 8;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#cccccc' : '#444444';
          ctx.fillRect(x * s, y * s, s, s);
        }
        break;
      }
      case 'grid': {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        const step = size / 8;
        for (let i = 0; i <= 8; i++) {
          ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
        }
        break;
      }
      case 'wood': {
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          const t = (Math.sin(y * 0.15 + Math.sin(y * 0.03) * 3) + 1) / 2;
          const r = Math.floor(100 + t * 70), g = Math.floor(50 + t * 30), b = 15;
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        break;
      }
      case 'brick': {
        ctx.fillStyle = '#8b2500';
        ctx.fillRect(0, 0, size, size);
        const bw = size / 4, bh = size / 8;
        ctx.fillStyle = '#888888';
        for (let row = 0; row < 9; row++) {
          const off = row % 2 === 0 ? 0 : bw / 2;
          for (let col = -1; col < 5; col++) {
            ctx.fillRect(col * bw + off, row * bh, bw, 3);
            ctx.fillRect(col * bw + off, row * bh, 3, bh);
          }
        }
        break;
      }
      case 'marble': {
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const n = Math.sin(x * 0.05 + Math.sin(y * 0.04 + x * 0.02) * 5) * 0.5 + 0.5;
          const v = Math.floor(190 + n * 65);
          const i = (y * size + x) * 4;
          d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        break;
      }
      case 'metal': {
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          const v = Math.floor(140 + Math.sin(y * 0.4) * 40 + Math.sin(y * 0.1) * 20);
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            d[i] = v + 10; d[i+1] = v + 10; d[i+2] = v + 15; d[i+3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        break;
      }
      default:
        return null;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  } catch {
    return null;
  }
}

// ─── Procedural normal maps ──────────────────────────────────────────────────

const NORMAL_MAP_TEXTURES = new Set(['wood', 'brick', 'marble', 'metal', 'checker']);

function makeProceduralNormalMap(name) {
  if (!NORMAL_MAP_TEXTURES.has(name)) return null;
  try {
    // Render the diffuse texture to a canvas, extract greyscale, run Sobel
    const diffuse = makeProceduralTexture(name);
    if (!diffuse?.image) return null;

    const size = 256;
    const src  = document.createElement('canvas');
    src.width  = src.height = size;
    const sCtx = src.getContext('2d');
    if (!sCtx) return null;
    sCtx.drawImage(diffuse.image, 0, 0, size, size);
    const srcData = sCtx.getImageData(0, 0, size, size).data;

    // Greyscale height field
    const h = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      h[i] = (srcData[i * 4] * 0.299 + srcData[i * 4 + 1] * 0.587 + srcData[i * 4 + 2] * 0.114) / 255;
    }

    const out  = document.createElement('canvas');
    out.width  = out.height = size;
    const oCtx = out.getContext('2d');
    if (!oCtx) return null;
    const img  = oCtx.createImageData(size, size);
    const d    = img.data;

    const px = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
    const strength = 4;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // 3×3 Sobel
        const gx = (
          -px(x-1,y-1) + px(x+1,y-1)
          - 2*px(x-1,y) + 2*px(x+1,y)
          - px(x-1,y+1) + px(x+1,y+1)
        ) * strength;
        const gy = (
          -px(x-1,y-1) - 2*px(x,y-1) - px(x+1,y-1)
          + px(x-1,y+1) + 2*px(x,y+1) + px(x+1,y+1)
        ) * strength;
        const len = Math.sqrt(gx*gx + gy*gy + 1);
        const i   = (y * size + x) * 4;
        d[i]   = Math.floor((-gx / len * 0.5 + 0.5) * 255);
        d[i+1] = Math.floor((-gy / len * 0.5 + 0.5) * 255);
        d[i+2] = Math.floor((1   / len * 0.5 + 0.5) * 255);
        d[i+3] = 255;
      }
    }

    oCtx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(out);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  } catch {
    return null;
  }
}

// ─── Built-in shader materials ────────────────────────────────────────────────

const SHADERS = {
  lava: () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      float noise(vec2 p) {
        return sin(p.x * 6.0 + uTime) * sin(p.y * 6.0 + uTime * 0.7) * 0.5 + 0.5;
      }
      void main() {
        float n = noise(vUv + noise(vUv * 2.0 + uTime * 0.3) * 0.5);
        vec3 hot  = vec3(1.0, 0.9, 0.1);
        vec3 cool = vec3(0.8, 0.05, 0.0);
        gl_FragColor = vec4(mix(cool, hot, n), 1.0);
      }`,
  }),

  hologram: () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv; varying vec3 vNormal;
      void main() { vUv = uv; vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv; varying vec3 vNormal;
      void main() {
        float scan = sin(vUv.y * 80.0 - uTime * 4.0) * 0.5 + 0.5;
        float rim  = pow(1.0 - abs(dot(vNormal, vec3(0.0,0.0,1.0))), 2.0);
        vec3 col   = vec3(0.0, 0.8, 1.0);
        float alpha = (scan * 0.3 + rim * 0.6) * 0.85;
        gl_FragColor = vec4(col, alpha);
      }`,
  }),

  water: () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.z += sin(pos.x * 3.0 + uTime) * 0.15 + sin(pos.y * 2.5 + uTime * 0.8) * 0.1;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float wave = sin(vUv.x * 10.0 + uTime) * sin(vUv.y * 8.0 + uTime * 0.7);
        vec3 deep   = vec3(0.0, 0.15, 0.4);
        vec3 shallow = vec3(0.1, 0.6, 0.8);
        gl_FragColor = vec4(mix(deep, shallow, wave * 0.5 + 0.5), 1.0);
      }`,
  }),

  iridescent: () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal; varying vec3 vViewDir;
      void main() {
        float f = dot(vNormal, vViewDir);
        float hue = f + uTime * 0.15;
        vec3 col = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }),

  dissolve: () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0.5 } },
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main() {
        float n = noise(vUv * 8.0 + uTime * 0.2);
        if (n < uProgress) discard;
        float edge = smoothstep(uProgress, uProgress + 0.06, n);
        vec3 edgeCol = vec3(1.0, 0.5, 0.1);
        vec3 baseCol = vec3(0.7, 0.7, 0.7);
        gl_FragColor = vec4(mix(edgeCol, baseCol, edge), edge);
      }`,
  }),

  xray: () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vNormal; varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        rim = pow(rim, 2.5);
        gl_FragColor = vec4(0.2, 0.8, 1.0, rim * 0.9);
      }`,
  }),
};

// ─── Material factory ─────────────────────────────────────────────────────────

function makeMaterial(spec) {
  const shaderType = spec?.shader;
  if (shaderType && SHADERS[shaderType]) return SHADERS[shaderType]();

  const color      = spec?.color     ?? '#646cff';
  const type       = spec?.type      ?? 'standard';
  const tex        = spec?.texture   ? makeProceduralTexture(spec.texture) : null;
  const normalTex  = spec?.texture   ? makeProceduralNormalMap(spec.texture) : null;
  const roughness  = spec?.roughness ?? 0.4;
  const metalness  = spec?.metalness ?? 0.1;

  const base = {
    color, roughness, metalness,
    ...(tex                               && { map: tex }),
    ...(normalTex                         && { normalMap: normalTex, normalScale: new THREE.Vector2(1, 1) }),
    ...(spec?.emissive                    && { emissive: spec.emissive, emissiveIntensity: spec?.emissiveIntensity ?? 1 }),
    ...(spec?.emissiveIntensity != null && !spec?.emissive && { emissiveIntensity: spec.emissiveIntensity }),
    ...(spec?.transparent                 && { transparent: true, opacity: spec.opacity ?? 0.8 }),
    ...(spec?.wireframe                   && { wireframe: true }),
  };

  switch (type) {
    case 'physical':
      return new THREE.MeshPhysicalMaterial({
        ...base,
        transmission: spec?.transmission ?? 0,
        ior:          spec?.ior          ?? 1.5,
        thickness:    spec?.thickness    ?? 0.5,
        ...(spec?.clearcoat        != null && { clearcoat: spec.clearcoat, clearcoatRoughness: spec.clearcoatRoughness ?? 0.1 }),
        ...(spec?.sheen            != null && { sheen: spec.sheen, sheenColor: new THREE.Color(spec.sheenColor ?? '#ffffff'), sheenRoughness: spec.sheenRoughness ?? 0.5 }),
        ...(spec?.anisotropy       != null && { anisotropy: spec.anisotropy, anisotropyRotation: spec.anisotropyRotation ?? 0 }),
        ...(spec?.iridescence      != null && { iridescence: spec.iridescence, iridescenceIOR: spec.iridescenceIOR ?? 1.3 }),
        ...(spec?.attenuationColor != null && { attenuationColor: new THREE.Color(spec.attenuationColor), attenuationDistance: spec.attenuationDistance ?? 1 }),
      });
    case 'toon':
      return new THREE.MeshToonMaterial({ color, ...(tex && { map: tex }), ...(spec?.wireframe && { wireframe: true }) });
    case 'normal':
      return new THREE.MeshNormalMaterial({ ...(spec?.wireframe && { wireframe: true }) });
    case 'wireframe':
      return new THREE.MeshBasicMaterial({ color, wireframe: true });
    default:
      return new THREE.MeshStandardMaterial(base);
  }
}

// ─── Particle sprite textures ────────────────────────────────────────────────

function makeParticleTexture(shape) {
  try {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const c = size / 2;

    if (shape === 'bubble') {
      // Transparent interior, bright rim — looks like a glass bubble
      const grad = ctx.createRadialGradient(c, c, c * 0.55, c, c, c * 0.95);
      grad.addColorStop(0,   'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0)');
      grad.addColorStop(0.8, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else if (shape === 'soft') {
      // Soft radial glow — good for mist, fire, glow effects
      const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
      grad.addColorStop(0,   'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else if (shape === 'circle') {
      // Hard circle — clean dot
      ctx.beginPath();
      ctx.arc(c, c, c * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else {
      return null;
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  } catch {
    return null;
  }
}

// ─── Particle systems ─────────────────────────────────────────────────────────

function buildParticleSystem(spec) {
  const preset = spec.preset;
  const count  = spec.count  ?? 500;
  const spread = spec.spread ?? 5;

  const PRESET_DEFAULTS = {
    bubbles: { size: 0.12, color: '#88ccff', opacity: 0.7,  sprite: 'bubble' },
    mist:    { size: 0.18, color: '#aaccee', opacity: 0.2,  sprite: 'soft'   },
    snow:    { size: 0.06, color: '#ffffff', opacity: 0.8,  sprite: 'soft'   },
    rain:    { size: 0.04, color: '#aaddff', opacity: 0.6,  sprite: 'circle' },
    sparks:  { size: 0.05, color: '#ffaa22', opacity: 0.9,  sprite: 'soft'   },
    fire:    { size: 0.1,  color: '#ff4400', opacity: 0.7,  sprite: 'soft'   },
    stars:   { size: 0.06, color: '#ffffff', opacity: 0.9,  sprite: 'circle' },
  };
  const defaults = PRESET_DEFAULTS[preset] ?? PRESET_DEFAULTS.stars;
  const size    = spec.size    ?? defaults.size;
  const color   = spec.color   ?? defaults.color;
  const opacity = spec.opacity ?? defaults.opacity;
  const sprite  = spec.sprite  ?? defaults.sprite;
  const spriteTex = makeParticleTexture(sprite);

  const confinedRadius = spec.confinedRadius ?? null;
  const confinedBox    = spec.confinedBox    ?? null;

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3); // stored in userData

  for (let i = 0; i < count; i++) {
    if ((preset === 'snow' || preset === 'rain') && confinedRadius) {
      // Sphere-uniform spawn so particles fill the globe evenly from the start
      const phi  = Math.random() * Math.PI * 2;
      const cosT = 2 * Math.random() - 1;
      const sinT = Math.sqrt(1 - cosT * cosT);
      const r    = Math.cbrt(Math.random()) * confinedRadius * 0.95;
      positions[i * 3]     = r * sinT * Math.cos(phi);
      positions[i * 3 + 1] = r * cosT;
      positions[i * 3 + 2] = r * sinT * Math.sin(phi);
      velocities[i * 3]     = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = -(0.008 + Math.random() * 0.012);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    } else if (preset === 'snow' || preset === 'rain') {
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = -(0.02 + Math.random() * 0.03);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    } else if (preset === 'sparks' || preset === 'fire') {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * 0.5;
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.03;
      velocities[i * 3 + 1] = 0.02 + Math.random() * 0.05;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    } else if (preset === 'bubbles') {
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 1] = 0.005 + Math.random() * 0.01;  // slow rise
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    } else if (preset === 'mist') {
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.004;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
    } else {
      // stars / ambient
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      velocities[i * 3] = velocities[i * 3 + 1] = velocities[i * 3 + 2] = 0;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    alphaTest: 0.01,
    ...(spriteTex && { map: spriteTex }),
  });

  const points = new THREE.Points(geo, mat);
  if (spec.position) points.position.set(...spec.position);

  points.userData = {
    isParticles: true,
    preset,
    spread,
    velocities,
    count,
    confinedRadius,
    confinedBox,
    confinedTo: spec.confinedTo ?? null,
  };

  return { points, geo, mat, spriteTex };
}

function tickParticles(points, t) {
  const { preset, spread, velocities, count, confinedRadius, confinedBox } = points.userData;
  const pos = points.geometry.attributes.position;

  for (let i = 0; i < count; i++) {
    pos.array[i * 3]     += velocities[i * 3];
    pos.array[i * 3 + 1] += velocities[i * 3 + 1];
    pos.array[i * 3 + 2] += velocities[i * 3 + 2];

    if (confinedRadius) {
      // Keep particles within a sphere — respawn at a random point inside if they escape
      const x = pos.array[i * 3], y = pos.array[i * 3 + 1], z = pos.array[i * 3 + 2];
      if (x * x + y * y + z * z > confinedRadius * confinedRadius) {
        const phi  = Math.random() * Math.PI * 2;
        const cosT = 2 * Math.random() - 1;
        const sinT = Math.sqrt(1 - cosT * cosT);
        const r    = Math.cbrt(Math.random()) * confinedRadius * 0.9;
        pos.array[i * 3]     = r * sinT * Math.cos(phi);
        pos.array[i * 3 + 1] = r * cosT;
        pos.array[i * 3 + 2] = r * sinT * Math.sin(phi);
      }
    } else if (confinedBox) {
      // Reflect at box walls (prevents piling at edges)
      const [hw, hh, hd] = [confinedBox[0] / 2, confinedBox[1] / 2, confinedBox[2] / 2];
      if (Math.abs(pos.array[i * 3])     > hw) { velocities[i * 3]     *= -1; pos.array[i * 3]     = Math.sign(pos.array[i * 3]) * hw; }
      if (Math.abs(pos.array[i * 3 + 1]) > hh) { velocities[i * 3 + 1] *= -1; pos.array[i * 3 + 1] = Math.sign(pos.array[i * 3 + 1]) * hh; }
      if (Math.abs(pos.array[i * 3 + 2]) > hd) { velocities[i * 3 + 2] *= -1; pos.array[i * 3 + 2] = Math.sign(pos.array[i * 3 + 2]) * hd; }
    } else if (preset === 'snow' || preset === 'rain') {
      if (pos.array[i * 3 + 1] < -0.5) pos.array[i * 3 + 1] = spread;
    } else if (preset === 'bubbles') {
      if (pos.array[i * 3 + 1] > spread * 0.5) {
        pos.array[i * 3]     = (Math.random() - 0.5) * spread;
        pos.array[i * 3 + 1] = -spread * 0.5;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * spread;
      }
    } else if (preset === 'mist') {
      // Wrap all axes to keep mist in volume
      for (let ax = 0; ax < 3; ax++) {
        const half = ax === 1 ? spread * 0.25 : spread * 0.5;
        if (pos.array[i * 3 + ax] >  half) pos.array[i * 3 + ax] = -half;
        if (pos.array[i * 3 + ax] < -half) pos.array[i * 3 + ax] =  half;
      }
    } else if (preset === 'sparks' || preset === 'fire') {
      if (pos.array[i * 3 + 1] > spread * 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.5;
        pos.array[i * 3]     = Math.cos(angle) * r;
        pos.array[i * 3 + 1] = 0;
        pos.array[i * 3 + 2] = Math.sin(angle) * r;
      }
    } else {
      // twinkle
      const flicker = Math.sin(t * 2 + i) * 0.0005;
      pos.array[i * 3] += flicker;
    }
  }

  pos.needsUpdate = true;
}

// ─── Light builder ────────────────────────────────────────────────────────────

function buildLights(scene, lightsSpec, shadowsEnabled) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  if (!lightsSpec || lightsSpec.length === 0) {
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    if (shadowsEnabled) {
      dir.castShadow = true;
      dir.shadow.mapSize.set(2048, 2048);
      dir.shadow.bias = -0.001;
      dir.shadow.camera.near   =  0.5;
      dir.shadow.camera.far    = 50;
      dir.shadow.camera.left   = -10;
      dir.shadow.camera.right  =  10;
      dir.shadow.camera.top    =  10;
      dir.shadow.camera.bottom = -10;
    }
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 2, -5);
    scene.add(fill);
    return;
  }

  for (const spec of lightsSpec) {
    const color     = spec.color     ?? '#ffffff';
    const intensity = spec.intensity ?? 1;
    switch (spec.type) {
      case 'directional': {
        const l = new THREE.DirectionalLight(color, intensity);
        if (spec.position) l.position.set(...spec.position);
        if (shadowsEnabled) l.castShadow = true;
        scene.add(l);
        break;
      }
      case 'point': {
        const l = new THREE.PointLight(color, intensity, spec.distance ?? 0, spec.decay ?? 2);
        if (spec.position) l.position.set(...spec.position);
        if (shadowsEnabled) l.castShadow = true;
        scene.add(l);
        break;
      }
      case 'spot': {
        const l = new THREE.SpotLight(color, intensity);
        if (spec.position) l.position.set(...spec.position);
        if (spec.angle    != null) l.angle    = spec.angle;
        if (spec.penumbra != null) l.penumbra = spec.penumbra;
        if (shadowsEnabled) l.castShadow = true;
        scene.add(l);
        break;
      }
      case 'hemisphere': {
        scene.add(new THREE.HemisphereLight(
          spec.skyColor ?? '#87ceeb', spec.groundColor ?? '#8b4513', intensity,
        ));
        break;
      }
      default: {
        const l = new THREE.DirectionalLight(color, intensity);
        if (spec.position) l.position.set(...spec.position);
        scene.add(l);
      }
    }
  }
}

// ─── Post-processing ──────────────────────────────────────────────────────────

function buildComposer(renderer, scene, camera, fx, canvas) {
  if (!fx || Object.keys(fx).length === 0) return null;

  const w = canvas?.clientWidth  ?? window.innerWidth;
  const h = canvas?.clientHeight ?? window.innerHeight;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  if (fx.ssao) {
    const { radius = 4, minDistance = 0.001, maxDistance = 0.1 } = fx.ssao;
    const pass = new SSAOPass(scene, camera, w, h);
    pass.kernelRadius = radius;
    pass.minDistance  = minDistance;
    pass.maxDistance  = maxDistance;
    composer.addPass(pass);
  }

  if (fx.bloom) {
    const { strength = 1.2, radius = 0.5, threshold = 0.2 } = fx.bloom;
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), strength, radius, threshold));
  }

  if (fx.afterimage) {
    const { damp = 0.88 } = fx.afterimage;
    composer.addPass(new AfterimagePass(damp));
  }

  if (fx.outline) {
    const { color = '#ffffff', strength = 3 } = fx.outline;
    const pass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
    pass.edgeStrength   = strength;
    pass.visibleEdgeColor.set(color);
    pass.hiddenEdgeColor.set(color);
    composer.addPass(pass);
  }

  if (fx.film) {
    const { intensity = 0.35 } = fx.film;
    composer.addPass(new FilmPass(intensity));
  }

  if (fx.gtao) {
    const { radius = 0.25, thickness = 1, distanceExponent = 1 } = fx.gtao;
    const pass = new GTAOPass(scene, camera, w, h);
    pass.output = GTAOPass.OUTPUT.Default;
    pass.pdRings = 2;
    pass.pdRadiusExponent = distanceExponent;
    pass.radius = radius;
    pass.thickness = thickness;
    composer.addPass(pass);
  }

  if (fx.dof) {
    const { focus = 3, aperture = 0.025, maxblur = 0.01 } = fx.dof;
    composer.addPass(new BokehPass(scene, camera, { focus, aperture, maxblur }));
  }

  if (fx.halftone) {
    const { radius = 4, scatter = 0 } = fx.halftone;
    composer.addPass(new HalftonePass(w, h, { radius, scatter, blending: 1, blendingMode: 1 }));
  }

  if (fx.pixelate) {
    const { pixelSize = 6 } = fx.pixelate;
    composer.addPass(new RenderPixelatedPass(pixelSize, scene, camera));
  }

  if (fx.smaa) {
    composer.addPass(new SMAAPass(w, h));
  } else if (fx.fxaa) {
    const pass = new FXAAPass();
    pass.uniforms.resolution.value.set(1 / w, 1 / h);
    composer.addPass(pass);
  }

  composer.addPass(new OutputPass());
  return composer;
}

// ─── Animation ticker ─────────────────────────────────────────────────────────

function tickAnimations(group, t) {
  // Only iterate objects registered at build time — O(animated) not O(all children)
  const targets = group.userData.animated ?? group.children;
  for (const obj of targets) {
    if (obj.userData.isParticles) {
      try { tickParticles(obj, t); } catch { /* particle error — skip */ }
      continue;
    }

    const anim = obj.userData.animation;
    if (!anim) {
      // Shader-only tick
      if (obj.material?.uniforms?.uTime !== undefined) obj.material.uniforms.uTime.value = t;
      continue;
    }
    const speed = anim.speed ?? 1;

    switch (anim.type) {
      case 'rotate':
      case 'spin': {
        const axis = anim.axis ?? 'y';
        obj.rotation[axis] = t * speed;
        break;
      }
      case 'float': {
        const amp = anim.amplitude ?? 0.3;
        obj.position.y = (obj.userData.baseY ?? 0) + Math.sin(t * speed) * amp;
        break;
      }
      case 'pulse': {
        const amp = anim.amplitude ?? 0.1;
        const s = 1 + Math.sin(t * speed * 2) * amp;
        obj.scale.set(s, s, s);
        break;
      }
      case 'orbit': {
        const r    = anim.radius ?? 2;
        const axis = anim.axis   ?? 'y';
        const angle = t * speed;
        if (axis === 'y') {
          obj.position.x = Math.cos(angle) * r;
          obj.position.z = Math.sin(angle) * r;
        } else if (axis === 'x') {
          obj.position.y = Math.cos(angle) * r;
          obj.position.z = Math.sin(angle) * r;
        } else {
          obj.position.x = Math.cos(angle) * r;
          obj.position.y = Math.sin(angle) * r;
        }
        break;
      }
      case 'swing': {
        const amp  = anim.amplitude ?? 0.6;
        const axis = anim.axis      ?? 'z';
        obj.rotation[axis] = Math.sin(t * speed) * amp;
        break;
      }
      case 'keyframes': {
        const dur  = anim.duration ?? 1;
        const loop = anim.loop !== false;
        const tMod = loop ? t % dur : Math.min(t, dur);
        for (const track of (anim.tracks ?? [])) {
          const keys = track.keys;
          if (!keys?.length) continue;
          // Binary search for current keyframe interval
          let lo = 0, hi = keys.length - 2;
          while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (keys[mid][0] <= tMod) lo = mid; else hi = mid - 1;
          }
          const [t0, v0] = keys[lo];
          const [t1, v1] = keys[lo + 1] ?? keys[lo];
          const alpha = t1 > t0 ? (tMod - t0) / (t1 - t0) : 0;
          const val   = v0 + (v1 - v0) * alpha;
          const [obj3, prop] = track.property.split('.');
          if (obj[obj3] !== undefined) obj[obj3][prop] = val;
        }
        break;
      }
      case 'path': {
        // Lazy-build CatmullRomCurve3 once, store on userData
        if (!obj.userData._pathCurve) {
          const pts = (anim.points ?? []).map(p => new THREE.Vector3(...p));
          obj.userData._pathCurve = pts.length >= 2
            ? new THREE.CatmullRomCurve3(pts, anim.loop !== false)
            : null;
        }
        const curve = obj.userData._pathCurve;
        if (curve) {
          const u = (t * speed * 0.1) % 1;
          curve.getPoint(u, obj.position);
          if (anim.lookAt) {
            const ahead = curve.getPoint((u + 0.01) % 1);
            obj.lookAt(ahead);
          }
        }
        break;
      }
    }

    // Tick shader uniforms
    if (obj.material?.uniforms?.uTime !== undefined) {
      obj.material.uniforms.uTime.value = t;
    }
  }
}

// ─── Group builder ────────────────────────────────────────────────────────────

function toParts(shapeConfig) {
  const parts = shapeConfig.shapes && Array.isArray(shapeConfig.shapes)
    ? [...shapeConfig.shapes]
    : [{ geometry: shapeConfig.geometry, material: shapeConfig.material }];

  if (shapeConfig.particles && Array.isArray(shapeConfig.particles)) {
    for (const p of shapeConfig.particles) parts.push({ particles: p });
  }

  return parts;
}

function buildGroup(parts, shadowsEnabled) {
  const group  = new THREE.Group();
  const meshes = [];
  const particleSystems = [];
  group.userData.animated = [];  // only objects needing per-frame updates

  // ── Pass 1: build all meshes, index by id ────────────────────────────────
  const meshById   = new Map();  // id → mesh (for parenting)
  const partMeshes = [];         // [{ part, mesh }] for pass 2 attachment

  for (const part of parts) {
    // Particle system — no parenting support, add immediately
    if (part.particles) {
      const { points, geo, mat } = buildParticleSystem(part.particles);
      group.add(points);
      particleSystems.push({ points, geo, mat });
      group.userData.animated.push(points);
      continue;
    }

    const builder = GEOMETRY_BUILDERS[part.geometry?.type];
    if (!builder) continue;

    const geometry = builder(part.geometry.params);

    // ── Swing pivot correction ───────────────────────────────────────────────
    // Shift geometry so its top face sits at local origin — rotation then
    // naturally pivots at the top (mounting point) rather than the center.
    if (part.animation?.type === 'swing') {
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      geometry.translate(0, -(bbox.max.y - bbox.min.y) / 2, 0);
    }

    const material = makeMaterial(part.material);

    // ── Instanced rendering ──────────────────────────────────────────────────
    if (part.instances) {
      const { count = 100, spread = 5, randomRotation = false, randomScale } = part.instances;
      const im    = new THREE.InstancedMesh(geometry, material, count);
      const dummy = new THREE.Object3D();
      const baseY = part.position?.[1] ?? 0;
      for (let i = 0; i < count; i++) {
        dummy.position.set(
          (Math.random() - 0.5) * spread + (part.position?.[0] ?? 0),
          baseY,
          (Math.random() - 0.5) * spread + (part.position?.[2] ?? 0),
        );
        dummy.rotation.y = randomRotation ? Math.random() * Math.PI * 2 : 0;
        if (randomScale) {
          const s = randomScale[0] + Math.random() * (randomScale[1] - randomScale[0]);
          dummy.scale.set(s, s, s);
        } else {
          dummy.scale.set(1, 1, 1);
        }
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      if (shadowsEnabled) { im.castShadow = true; im.receiveShadow = true; }
      if (part.animation) { im.userData.animation = part.animation; im.userData.baseY = baseY; }
      // Instanced meshes don't participate in parenting — add directly
      group.add(im);
      meshes.push(im);
      continue;
    }

    // ── Standard mesh ────────────────────────────────────────────────────────
    const mesh = new THREE.Mesh(geometry, material);

    if (part.position) mesh.position.set(...part.position);
    if (part.rotation) mesh.rotation.set(...part.rotation);
    if (part.scale)    mesh.scale.set(...part.scale);

    if (shadowsEnabled) { mesh.castShadow = true; mesh.receiveShadow = true; }

    if (part.animation) {
      mesh.userData.animation = part.animation;
      mesh.userData.baseY     = part.position?.[1] ?? 0;
      group.userData.animated.push(mesh);
    } else if (part.material?.shader) {
      // Shader materials have uTime uniforms that need ticking even without animation
      group.userData.animated.push(mesh);
    }

    if (part.physics) {
      mesh.userData.physicsDef  = part.physics;
      mesh.userData.geometryDef = part.geometry;
    }

    if (part.geometry?.type === 'terrain') mesh.userData.isTerrain = true;

    if (part.id) meshById.set(part.id, mesh);
    partMeshes.push({ part, mesh });
    meshes.push(mesh);
  }

  // ── Pass 2: attach to parent or root group ───────────────────────────────
  for (const { part, mesh } of partMeshes) {
    if (part.parent && meshById.has(part.parent)) {
      meshById.get(part.parent).add(mesh);
    } else {
      group.add(mesh);
    }
  }

  return { group, meshes, particleSystems, meshById };
}

// ─── Terrain snapping ────────────────────────────────────────────────────────

function snapMeshesToTerrain(meshes) {
  const terrainMesh = meshes.find(m => m.userData.isTerrain);
  if (!terrainMesh) return;

  const raycaster = new THREE.Raycaster();
  const down      = new THREE.Vector3(0, -1, 0);

  for (const mesh of meshes) {
    if (mesh.userData.isTerrain || mesh.isInstancedMesh) continue;

    // Compute half-height of the mesh so its base sits on the surface
    mesh.geometry.computeBoundingBox();
    const bbox       = mesh.geometry.boundingBox;
    const halfHeight = (bbox.max.y - bbox.min.y) / 2;

    // Cast downward from well above the mesh's x,z
    const origin = new THREE.Vector3(mesh.position.x, 50, mesh.position.z);
    raycaster.set(origin, down);
    const hits = raycaster.intersectObject(terrainMesh);
    if (hits.length > 0) {
      mesh.position.y = hits[0].point.y + halfHeight;
      mesh.userData.baseY = mesh.position.y; // keep float animation relative
    }
  }
}

// ─── Raycasting / hover ───────────────────────────────────────────────────────

function setupRaycaster(canvas, camera, getMeshes) {
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  let hoveredMesh = null;
  const originalColors = new Map();

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = getMeshes();
    const hits   = raycaster.intersectObjects(meshes);

    if (hoveredMesh && (hits.length === 0 || hits[0].object !== hoveredMesh)) {
      const orig = originalColors.get(hoveredMesh);
      if (orig !== undefined && hoveredMesh.material.color) {
        hoveredMesh.material.color.setHex(orig);
      }
      hoveredMesh = null;
    }

    if (hits.length > 0) {
      const mesh = hits[0].object;
      if (mesh !== hoveredMesh && mesh.material?.color) {
        if (!originalColors.has(mesh)) {
          originalColors.set(mesh, mesh.material.color.getHex());
        }
        hoveredMesh = mesh;
        // Lighten on hover
        const c = new THREE.Color(originalColors.get(mesh));
        c.lerp(new THREE.Color(0xffffff), 0.3);
        mesh.material.color.set(c);
      }
    }
  }

  canvas.addEventListener('mousemove', onMouseMove);
  return () => canvas.removeEventListener('mousemove', onMouseMove);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildScene(canvas, shapeConfig) {
  const shadowsEnabled = !!shapeConfig.shadows;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x111111);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  if (shadowsEnabled) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  }

  // IBL — environment map for realistic reflections on metal/glass
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment()).texture;
  pmrem.dispose();

  const scene  = new THREE.Scene();
  scene.environment = envTexture;

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
  camera.position.set(0, 2, 6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  buildLights(scene, shapeConfig.lights, shadowsEnabled);

  const clock  = new THREE.Timer();
  let composer = null;
  let currentGroup        = null;
  let currentMeshes       = [];
  let currentParticles    = [];
  let currentTextures     = [];
  let currentGltfGroups   = [];
  let currentMixer        = null;
  let currentPhysics      = null;
  let removeHoverListener = null;

  async function setShape(config) {
    // Teardown
    if (removeHoverListener) { removeHoverListener(); removeHoverListener = null; }
    if (currentGroup) {
      for (const m of currentMeshes) { m.geometry.dispose(); m.material.dispose(); }
      for (const { geo, mat, spriteTex } of currentParticles) { geo.dispose(); mat.dispose(); spriteTex?.dispose(); }
      for (const t of currentTextures) t.dispose();
      for (const g of currentGltfGroups) {
        g.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose(); });
      }
      scene.remove(currentGroup);
    }
    if (currentMixer) { currentMixer.stopAllAction(); currentMixer = null; }
    disposePhysics(currentPhysics); currentPhysics = null;
    if (composer) { composer.dispose?.(); composer = null; }

    // Background & fog
    scene.background = config.background
      ? new THREE.Color(config.background)
      : new THREE.Color(0x111111);
    scene.fog = config.fog
      ? new THREE.FogExp2(config.fog.color ?? '#111111', config.fog.density ?? 0.04)
      : null;

    const allParts  = toParts(config);
    const gltfParts = allParts.filter(p => !p.particles && p.geometry?.type === 'gltf');
    const primParts = allParts.filter(p =>  p.particles || p.geometry?.type !== 'gltf');

    const { group, meshes, particleSystems, meshById } = buildGroup(primParts, !!config.shadows);
    snapMeshesToTerrain(meshes);

    // Auto-snap confinedTo particle systems to their target mesh's world position
    group.updateWorldMatrix(true, true);
    for (const { points } of particleSystems) {
      const targetId = points.userData.confinedTo;
      if (targetId && meshById.has(targetId)) {
        const target = meshById.get(targetId);
        target.getWorldPosition(points.position);
      }
    }

    currentTextures   = meshes.map(m => m.material.map).filter(Boolean);
    currentGltfGroups = [];
    scene.add(group);
    currentGroup     = group;
    currentMeshes    = meshes;
    currentParticles = particleSystems;

    // Physics — only for meshes that opted in via part.physics
    const physicsMeshes = meshes.filter(m => m.userData.physicsDef);
    if (physicsMeshes.length) {
      currentPhysics = await initPhysics(physicsMeshes);
    }

    // Load glTF models async — scene is already rendering, models appear when ready
    for (const part of gltfParts) {
      const { group: gltfGroup, mixer } = await loadGLTF(part.geometry.params.src);
      if (part.position) gltfGroup.position.set(...part.position);
      if (part.scale)    gltfGroup.scale.set(...part.scale);
      if (part.rotation) gltfGroup.rotation.set(...part.rotation);
      group.add(gltfGroup);
      currentGltfGroups.push(gltfGroup);
      if (mixer) currentMixer = mixer;
    }

    // Post-processing
    if (config.postProcessing) {
      composer = buildComposer(renderer, scene, camera, config.postProcessing, canvas);
    }

    // Hover
    if (config.hover !== false && meshes.length > 0) {
      removeHoverListener = setupRaycaster(canvas, camera, () => currentMeshes);
    }
  }

  setShape(shapeConfig);

  let animFrameId;

  // ResizeObserver fires only on actual resize — no per-frame DOM polling
  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer?.setSize(w, h);
  });
  resizeObserver.observe(canvas);

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    controls.update();
    clock.update();
    const elapsed = clock.getElapsed();
    const delta   = Math.min(clock.getDelta(), 1 / 30);  // cap to prevent spiral-of-death
    if (currentGroup) tickAnimations(currentGroup, elapsed);
    if (currentMixer) currentMixer.update(delta);
    if (currentPhysics) stepPhysics(currentPhysics, delta);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  animate();

  return {
    async updateShape(config) { await setShape(config); },
    exportGLB() {
      return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(scene, gltf => {
          const blob = new Blob([gltf], { type: 'application/octet-stream' });
          resolve(blob);
        }, reject, { binary: true });
      });
    },
    dispose() {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      if (removeHoverListener) removeHoverListener();
      controls.dispose();
      for (const m of currentMeshes) { m.geometry.dispose(); m.material.dispose(); }
      for (const { geo, mat, spriteTex } of currentParticles) { geo.dispose(); mat.dispose(); spriteTex?.dispose(); }
      for (const t of currentTextures) t.dispose();
      for (const g of currentGltfGroups) {
        g.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose(); });
      }
      if (currentMixer) currentMixer.stopAllAction();
      disposePhysics(currentPhysics);
      envTexture.dispose();
      composer?.dispose?.();
      renderer.dispose();
    },
  };
}
