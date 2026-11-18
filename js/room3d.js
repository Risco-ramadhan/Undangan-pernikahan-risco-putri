/* Sampul "Masuk Ruangan 3D": lorong aula berlengkung, kamera berjalan masuk & pintu terbuka */
import * as THREE from '../vendor/three/three.module.js';

const C = window.INV || {};
const cover = document.getElementById('cover');
const canvas = document.getElementById('room3d');

function fallback() {
  // Tanpa WebGL: pakai sampul pintu CSS 3D
  cover && cover.classList.replace('cover-room', 'cover-doors');
  window.INV_ROOM = null;
}

if (cover && canvas && !C.opened) {
  try {
    init();
  } catch (e) {
    console.warn('room3d fallback:', e);
    fallback();
  }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const css = getComputedStyle(document.documentElement);
  const col = (v, d) => new THREE.Color((css.getPropertyValue(v) || d).trim());
  const bg = col('--bg', '#1a0d0d');
  const surface = col('--surface', '#2a1414');
  const primary = col('--primary', '#c8102e');
  const accent = col('--accent', '#f2c14e');
  const text = col('--text', '#f7e7c6');
  const glow = new THREE.Color(C.effectColor || '#f2c14e');
  const dark = C.dark || bg.getHSL({}).l < 0.4;

  const scene = new THREE.Scene();
  const fogCol = bg.clone().lerp(new THREE.Color(dark ? '#000000' : '#ffffff'), 0.15);
  scene.background = fogCol;
  scene.fog = new THREE.Fog(fogCol, 10, 46);

  const camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 72 : 58, innerWidth / innerHeight, 0.1, 120);
  const START_Z = 9;
  const END_Z = -30.2;
  const EYE = 2.3;
  camera.position.set(0, EYE, START_Z);

  /* ---------- Tekstur Prosedural ---------- */
  const hex = (c) => '#' + c.getHexString();
  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    return t;
  }

  function haloTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  const tileA = surface.clone().lerp(bg, 0.3);
  const tileB = bg.clone().lerp(dark ? new THREE.Color('#000') : new THREE.Color('#fff'), 0.25);
  const floorTex = canvasTex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = hex(tileA);
      x.fillRect(0, 0, w, h);
      x.fillStyle = hex(tileB);
      x.fillRect(0, 0, w / 2, h / 2);
      x.fillRect(w / 2, h / 2, w / 2, h / 2);
      x.strokeStyle = hex(accent);
      x.globalAlpha = 0.35;
      x.lineWidth = 2;
      x.strokeRect(1, 1, w - 2, h - 2);
      x.beginPath();
      x.moveTo(w / 2, 0);
      x.lineTo(w / 2, h);
      x.moveTo(0, h / 2);
      x.lineTo(w, h / 2);
      x.stroke();
    },
    4,
    20
  );

  const wallTex = canvasTex(
    256,
    512,
    (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, hex(surface.clone().lerp(bg, 0.5)));
      g.addColorStop(1, hex(surface));
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      x.strokeStyle = hex(accent);
      x.globalAlpha = 0.45;
      x.lineWidth = 3;
      x.strokeRect(28, 60, w - 56, h * 0.48);
      x.strokeRect(28, h * 0.62, w - 56, h * 0.3);
      x.globalAlpha = 0.25;
      x.strokeRect(44, 76, w - 88, h * 0.48 - 32);
      x.globalAlpha = 0.6;
      x.fillStyle = hex(accent);
      x.fillRect(0, h * 0.57, w, 6);
    },
    10,
    1
  );

  const carpetTex = canvasTex(
    128,
    512,
    (x, w, h) => {
      x.fillStyle = hex(primary.clone().multiplyScalar(dark ? 0.55 : 0.85));
      x.fillRect(0, 0, w, h);
      x.fillStyle = hex(accent);
      x.globalAlpha = 0.8;
      x.fillRect(6, 0, 6, h);
      x.fillRect(w - 12, 0, 6, h);
      x.globalAlpha = 0.25;
      x.strokeStyle = hex(accent);
      for (let i = 0; i < 8; i++) {
        x.beginPath();
        x.ellipse(w / 2, i * 64 + 32, 18, 26, 0, 0, Math.PI * 2);
        x.stroke();
      }
    },
    1,
    6
  );

  /* ---------- Lorong ---------- */
  const W = 9;
  const H = 9.5;
  const LEN = 48;
  const Z0 = 10;
  const mid = Z0 - LEN / 2;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, LEN),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.28, metalness: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, mid);
  scene.add(floor);

  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, LEN),
    new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.9 })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.01, mid);
  scene.add(carpet);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8 });
  [-1, 1].forEach((s) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(LEN, H), wallMat);
    w.rotation.y = (-s * Math.PI) / 2;
    w.position.set((s * W) / 2, H / 2, mid);
    scene.add(w);
  });

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(W, LEN),
    new THREE.MeshStandardMaterial({ color: surface.clone().multiplyScalar(0.6), roughness: 1 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H, mid);
  scene.add(ceil);

  /* ---------- Lengkungan, Pilar, Lampu Gantung, Bunga ---------- */
  const gold = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.75,
    roughness: 0.28,
    emissive: accent,
    emissiveIntensity: 0.06,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: surface.clone().lerp(text, 0.25),
    roughness: 0.45,
    metalness: 0.1,
  });
  const lampMat = new THREE.MeshBasicMaterial({ color: glow });

  const R = 3.5;
  const PY = 4.8;
  const archZ = [];
  for (let z = 3; z > -28; z -= 5.2) archZ.push(z);

  const flowers = [];
  const sharedHalo = haloTex();

  archZ.forEach((z, i) => {
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, PY, 16), pillarMat);
      p.position.set(s * R, PY / 2, z);
      scene.add(p);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.85), gold);
      cap.position.set(s * R, PY, z);
      scene.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.85), gold);
      base.position.set(s * R, 0.15, z);
      scene.add(base);
      for (let k = 0; k < 22; k++) {
        flowers.push([
          s * (R - 0.15 + Math.random() * 0.9 - 0.45),
          0.25 + Math.random() * 0.7,
          z + Math.random() * 1.2 - 0.6,
        ]);
      }
    });

    const arch = new THREE.Mesh(new THREE.TorusGeometry(R, 0.17, 12, 56, Math.PI), gold);
    arch.position.set(0, PY, z);
    scene.add(arch);

    const arch2 = new THREE.Mesh(new THREE.TorusGeometry(R - 0.32, 0.05, 8, 56, Math.PI), gold);
    arch2.position.set(0, PY, z);
    scene.add(arch2);

    const chainH = H - (PY + R) + 0.9;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, chainH, 4), gold);
    chain.position.set(0, H - chainH / 2, z);
    scene.add(chain);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), lampMat);
    lamp.position.set(0, H - chainH, z);
    scene.add(lamp);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedHalo,
        color: glow,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    halo.scale.set(2.4, 2.4, 1);
    halo.position.copy(lamp.position);
    scene.add(halo);

    if (i % 2 === 0) {
      const pl = new THREE.PointLight(glow, dark ? 26 : 14, 14, 1.6);
      pl.position.set(0, H - chainH - 0.4, z);
      scene.add(pl);
    }
  });

  const fGeo = new THREE.SphereGeometry(0.15, 10, 8);
  const fMat = new THREE.MeshStandardMaterial({ roughness: 0.75, color: 0xffffff });
  const fl = new THREE.InstancedMesh(fGeo, fMat, flowers.length);
  const m4 = new THREE.Matrix4();
  const cc = new THREE.Color();
  const palette = [
    glow.clone().lerp(new THREE.Color('#ffffff'), 0.3),
    new THREE.Color('#ffffff'),
    primary.clone().lerp(new THREE.Color('#ffffff'), 0.45),
    glow,
    new THREE.Color('#8fb38f'),
  ];
  flowers.forEach((f, i) => {
    const k = 0.6 + Math.random() * 0.7;
    m4.makeScale(k, k * 0.85, k).setPosition(...f);
    fl.setMatrixAt(i, m4);
    fl.setColorAt(i, cc.copy(palette[i % 5]).multiplyScalar(0.88 + Math.random() * 0.12));
  });
  scene.add(fl);

  /* ---------- Pintu di Ujung Lorong ---------- */
  const DZ = -31.5;
  const DW = 1.75;
  const DH = 4.4;

  const light = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ color: glow.clone().lerp(new THREE.Color('#ffffff'), 0.6), fog: false })
  );
  light.position.set(0, H / 2, DZ - 0.6);
  scene.add(light);

  const wallEnd = new THREE.Shape();
  wallEnd.moveTo(-W / 2, 0);
  wallEnd.lineTo(W / 2, 0);
  wallEnd.lineTo(W / 2, H);
  wallEnd.lineTo(-W / 2, H);
  wallEnd.lineTo(-W / 2, 0);

  const hole = new THREE.Path();
  hole.moveTo(-DW, 0);
  hole.lineTo(DW, 0);
  hole.lineTo(DW, DH);
  hole.absarc(0, DH, DW, 0, Math.PI, false);
  hole.lineTo(-DW, 0);
  wallEnd.holes.push(hole);

  const endWall = new THREE.Mesh(new THREE.ShapeGeometry(wallEnd, 24), wallMat);
  endWall.position.z = DZ;
  scene.add(endWall);

  const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(DW + 0.12, 0.14, 10, 48, Math.PI), gold);
  doorFrame.position.set(0, DH, DZ + 0.05);
  scene.add(doorFrame);

  [-1, 1].forEach((s) => {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.26, DH, 0.26), gold);
    j.position.set(s * (DW + 0.12), DH / 2, DZ + 0.05);
    scene.add(j);
  });

  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.lineTo(DW, 0);
  leaf.lineTo(DW, DH + DW);
  leaf.absarc(DW, DH, DW, Math.PI / 2, Math.PI, false);
  leaf.lineTo(0, 0);

  const doorTex = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = hex(primary.clone().multiplyScalar(dark ? 0.45 : 0.7));
    x.fillRect(0, 0, w, h);
    x.strokeStyle = hex(accent);
    x.lineWidth = 6;
    x.globalAlpha = 0.85;
    x.strokeRect(24, 70, w - 48, h * 0.36);
    x.strokeRect(24, h * 0.5, w - 48, h * 0.42);
    x.globalAlpha = 0.4;
    x.lineWidth = 2;
    x.strokeRect(40, 86, w - 80, h * 0.36 - 32);
    x.strokeRect(40, h * 0.5 + 16, w - 80, h * 0.42 - 32);
  });
  doorTex.repeat.set(1 / DW, 1 / (DH + DW));

  const doorMat = new THREE.MeshStandardMaterial({
    map: doorTex,
    roughness: 0.5,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const doors = [];
  [-1, 1].forEach((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * DW, 0, DZ + 0.02);
    const g = new THREE.ExtrudeGeometry(leaf, { depth: 0.12, bevelEnabled: false, curveSegments: 20 });
    if (s > 0) g.scale(-1, 1, 1);
    pivot.add(new THREE.Mesh(g, doorMat));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), gold);
    knob.position.set(-s * (DW - 0.22), DH * 0.5, 0.16);
    pivot.add(knob);
    scene.add(pivot);
    doors.push({ pivot, s });
  });

  /* ---------- Debu Cahaya Melayang ---------- */
  const N = 360;
  const dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    dp[i * 3] = (Math.random() - 0.5) * W;
    dp[i * 3 + 1] = Math.random() * H;
    dp[i * 3 + 2] = Z0 - Math.random() * LEN;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({
      size: 0.06,
      map: sharedHalo,
      color: glow,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(dust);

  scene.add(new THREE.HemisphereLight(dark ? 0x998877 : 0xffffff, bg, dark ? 0.9 : 1.4));
  const front = new THREE.SpotLight(glow, dark ? 60 : 30, 50, 0.5, 0.6, 1.2);
  front.position.set(0, 6, 8);
  front.target.position.set(0, 1, -30);
  scene.add(front, front.target);

  /* ---------- Interaksi & Loop ---------- */
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
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < innerHeight ? 72 : 58;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  });

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let entering = null;
  let done = false;
  let running = true;
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();

  window.INV_ROOM = {
    enter(cb) {
      if (entering) return;
      entering = { t0: clock.elapsedTime, dur: innerWidth < 640 ? 3.6 : 4.2, cb };
    },
  };

  function frame() {
    if (!running) return;
    const t = clock.getDelta() && clock.elapsedTime;
    const gy = window.INV_GYRO || { x: 0, y: 0 };
    let z = START_Z;
    let p = 0;

    if (entering) {
      p = Math.min(1, (clock.elapsedTime - entering.t0) / entering.dur);
      z = START_Z + (END_Z - START_Z) * ease(p);
      const dpNorm = Math.max(0, Math.min(1, (p - 0.5) / 0.32));
      doors.forEach((d) => {
        d.pivot.rotation.y = d.s * -ease(dpNorm) * 1.85;
      });
      if (p >= 1 && !done) {
        done = true;
        entering.cb && entering.cb();
        setTimeout(stop, 900);
      }
    }

    const sway = entering ? 0.25 * (1 - p) : 1;
    camera.position.x += ((mx + gy.x * 0.4) * 1.2 * sway - camera.position.x) * 0.05;
    camera.position.y =
      EYE +
      Math.sin(t * 1.3) * 0.04 * sway +
      (entering ? Math.sin(p * Math.PI * 7) * 0.035 * (1 - p) : 0) -
      my * 0.4 * sway;
    camera.position.z = z + (entering ? 0 : Math.sin(t * 0.5) * 0.25);
    look.set(camera.position.x * 0.3, EYE + 0.2 - my * 0.3 * sway, z - 20);
    camera.lookAt(look);

    const a = dg.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += 0.004 + Math.sin(t + i) * 0.002;
      if (a[i * 3 + 1] > H) a[i * 3 + 1] = 0;
    }
    dg.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    renderer.dispose();
  }

  document.addEventListener('visibilitychange', () => {
    if (done) return;
    running = !document.hidden;
    if (running) {
      clock.getDelta();
      frame();
    }
  });

  frame();
  cover.classList.add('room-ready');
}
