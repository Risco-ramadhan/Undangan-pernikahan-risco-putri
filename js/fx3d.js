/* Efek partikel 3D undangan berbasis Three.js (self-hosted di /vendor/three) */
import * as THREE from '../vendor/three/three.module.js';

const C = window.INV || {};
const canvas = document.getElementById('fx3d');
if (canvas && C.effect && C.effect !== 'none') {
  try {
    init();
  } catch (e) {
    console.warn('fx3d skipped:', e);
  }
}

function init() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = innerWidth < 640;
  let density = Math.max(5, Math.min(100, C.density || 60)) / 100;
  if (reduced) density *= 0.3;
  if (small) density *= 0.75;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 10;

  const base = new THREE.Color(C.effectColor || '#f2c14e');
  const acc = new THREE.Color(C.accent || '#f2c14e');
  const view = () => {
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(30)) * 10;
    return { w: h * camera.aspect, h };
  };
  let V = view();
  const rnd = (a, b) => a + Math.random() * (b - a);

  let boost = 0;
  const updaters = [];

  function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function sparkTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(255,255,255,.9)';
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(32, 2);
    x.lineTo(32, 62);
    x.moveTo(2, 32);
    x.lineTo(62, 32);
    x.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function pointField(count, opt) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = rnd(-V.w / 2 - 1, V.w / 2 + 1);
      p[i * 3 + 1] = rnd(-V.h / 2 - 1, V.h / 2 + 1);
      p[i * 3 + 2] = rnd(-8, 4);
      v[i] = rnd(opt.speed[0], opt.speed[1]);
      ph[i] = rnd(0, Math.PI * 2);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({
      size: opt.size,
      map: opt.map,
      color: opt.color,
      transparent: true,
      depthWrite: false,
      opacity: opt.opacity ?? 0.9,
      blending: opt.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(g, mat);
    scene.add(pts);
    updaters.push((dt, t) => {
      const sp = 1 + boost * 3;
      const lim = V.h / 2 + 1;
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        p[k + 1] += (opt.rise ? 1 : -1) * v[i] * dt * sp;
        p[k] += Math.sin(t * 0.6 + ph[i]) * 0.003;
        if (p[k + 1] < -lim) p[k + 1] = lim;
        if (p[k + 1] > lim) p[k + 1] = -lim;
      }
      g.attributes.position.needsUpdate = true;
      if (opt.twinkle) {
        mat.opacity = (opt.opacity ?? 0.9) * (0.65 + Math.sin(t * opt.twinkle) * 0.35);
      }
    });
  }

  pointField(Math.round(380 * density), {
    size: 0.1,
    map: dotTexture(),
    color: base,
    speed: [0.05, 0.25],
    additive: true,
    rise: true,
    twinkle: 2.2,
  });
  pointField(Math.round(70 * density), {
    size: 0.35,
    map: sparkTexture(),
    color: acc,
    speed: [0.05, 0.18],
    additive: true,
    rise: true,
    twinkle: 3.1,
  });

  let mx = 0;
  let my = 0;
  addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    },
    { passive: true }
  );
  let scrollY0 = 0;
  addEventListener(
    'scroll',
    () => {
      scrollY0 = scrollY;
    },
    { passive: true }
  );

  document.addEventListener('inv:open', () => {
    boost = 1;
  });
  document.addEventListener('inv:burst', () => {
    boost = 1;
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    V = view();
  });

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      clock.getDelta();
      loop();
    }
  });

  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    boost = Math.max(0, boost - dt * 0.6);
    const gy = window.INV_GYRO || { x: 0, y: 0 };
    const tx = (mx + gy.x * 0.5) * 1.6;
    const ty = (-my - gy.y * 0.3) * 1.2 - scrollY0 * 0.0008;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    for (const u of updaters) u(dt, t);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
}
