/* Interaksi halaman undangan (frontend-only):
   tamu URL ?to=, sampul 3D, musik MP3, scroll reveal, tilt 3D, countdown, salin rekening, galeri, RSVP lokal */
(function () {
  const C = window.INV || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;
  const audio = $('#bgm');
  const btnMusic = $('#btnMusic');

  const toast = (m) => {
    const t = $('#toastI');
    if (!t) return;
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* ---------- Nama Tamu dari ?to=... ---------- */
  const params = new URLSearchParams(location.search);
  const guestParam = (params.get('to') || '').trim();
  const guestName = guestParam || 'Tamu Undangan';
  $$('[data-guest-name]').forEach((el) => {
    el.textContent = guestName;
  });
  const wishNameInput = $('#wishForm input[name="name"]');
  if (wishNameInput) {
    wishNameInput.value = guestName;
  }

  /* ---------- Musik MP3 ---------- */
  function play() {
    if (!audio) return;
    audio
      .play()
      .then(() => btnMusic && btnMusic.classList.add('spin'))
      .catch(() => {});
  }

  btnMusic &&
    btnMusic.addEventListener('click', () => {
      if (!audio) return;
      if (audio.paused) {
        play();
      } else {
        audio.pause();
        btnMusic.classList.remove('spin');
      }
    });

  /* ---------- Buka Undangan ---------- */
  let openedOnce = false;
  function openInvitation(instant) {
    if (openedOnce) return;
    openedOnce = true;
    const cover = $('#cover');
    body.classList.remove('locked');
    body.classList.add('opened');
    document.dispatchEvent(new CustomEvent('inv:open'));

    if (instant) {
      cover.classList.add('gone');
      revealAll();
      return;
    }

    if (cover.classList.contains('cover-room') && window.INV_ROOM) {
      cover.classList.add('opening');
      window.INV_ROOM.enter(() => {
        cover.classList.add('room-out');
        setTimeout(() => cover.classList.add('gone'), 900);
      });
      if (C.autoplay) play();
      requestGyro();
      return;
    }

    cover.classList.add('opening');
    setTimeout(() => {
      cover.classList.add('gone');
      body.classList.add('rv-up');
    }, 1700);
    if (C.autoplay) play();
    requestGyro();
  }

  const btnOpen = $('#btnOpen');
  btnOpen && btnOpen.addEventListener('click', () => openInvitation(false));
  if (C.opened) openInvitation(true);

  /* ---------- Reveal saat Scroll ---------- */
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (es) => {
            es.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('in');
                io.unobserve(e.target);
              }
            });
          },
          { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        )
      : null;
  $$('.rv').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
  function revealAll() {
    $$('.rv').forEach((el) => el.classList.add('in'));
  }

  /* ---------- Navigasi Bawah Aktif ---------- */
  const navLinks = $$('#bnav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.id.replace('s-', '');
            navLinks.forEach((a) => a.classList.toggle('on', a.dataset.sec === id));
          }
        }),
      { threshold: 0.4 }
    );
    navLinks.forEach((a) => {
      const s = document.getElementById('s-' + a.dataset.sec);
      s && so.observe(s);
    });
  }

  /* ---------- Tilt 3D (Mouse & Giroskop) ---------- */
  let gx = 0;
  let gy = 0;
  function applyTilt(x, y) {
    if (!C.tilt) return;
    $$('.card3d').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
  }

  if (C.tilt) {
    addEventListener(
      'mousemove',
      (e) => applyTilt(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5),
      { passive: true }
    );
  }

  function onOrient(e) {
    gx = Math.max(-1, Math.min(1, (e.gamma || 0) / 30));
    gy = Math.max(-1, Math.min(1, ((e.beta || 0) - 45) / 30));
    applyTilt(gx / 2, gy / 2);
    window.INV_GYRO = { x: gx, y: gy };
  }

  function requestGyro() {
    if (!C.tilt) return;
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      D.requestPermission()
        .then((s) => {
          if (s === 'granted') addEventListener('deviceorientation', onOrient);
        })
        .catch(() => {});
    } else if (D) {
      addEventListener('deviceorientation', onOrient);
    }
  }

  /* ---------- Countdown ---------- */
  if (C.countdown && document.querySelector('[data-cd]')) {
    const target = new Date(C.countdown.replace(' ', 'T')).getTime();
    const set = (k, v) =>
      document.querySelectorAll(`[data-cd="${k}"]`).forEach((el) => {
        el.textContent = String(v).padStart(2, '0');
      });
    const tick = () => {
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      set('d', Math.floor(s / 86400));
      s %= 86400;
      set('h', Math.floor(s / 3600));
      s %= 3600;
      set('m', Math.floor(s / 60));
      set('s', s % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Salin Rekening ---------- */
  function fallbackCopy(text) {
    const a = document.createElement('textarea');
    a.value = text;
    a.setAttribute('readonly', '');
    a.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(a);
    a.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (_) {}
    a.remove();
    return ok;
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy || '';
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      // Jangan biarkan webview menggantung jika promise clipboard tidak kunjung selesai
      Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 250)),
      ]).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    toast('Berhasil disalin ✓');
  });

  /* ---------- Galeri Lightbox ---------- */
  const lb = $('#lb');
  const imgs = $$('#gallery a');
  let cur = 0;
  const show = (i) => {
    if (!imgs.length || !lb) return;
    cur = (i + imgs.length) % imgs.length;
    lb.querySelector('img').src = imgs[cur].href;
    lb.classList.add('open');
  };
  imgs.forEach((a, i) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      show(i);
    })
  );
  lb &&
    lb.addEventListener('click', (e) => {
      const k = e.target.dataset.lb;
      if (k === 'p') show(cur - 1);
      else if (k === 'n') show(cur + 1);
      else if (k === 'x' || e.target === lb) lb.classList.remove('open');
    });
  addEventListener('keydown', (e) => {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'Escape') lb.classList.remove('open');
  });

  /* ---------- Ucapan & RSVP (Lokal via localStorage, tanpa backend) ---------- */
  const STORAGE_KEY = 'inv_wishes_risco_putri_v1';
  const defaultWishes = [
    {
      name: 'Ustadz Hasan',
      attendance: 'Hadir',
      message:
        "Barakallahu lakuma wa baraka 'alaikuma wa jama'a bainakuma fi khair. Semoga menjadi keluarga sakinah, mawaddah, warahmah.",
      time: '1 week ago',
    },
    {
      name: 'Siti & Keluarga',
      attendance: 'Hadir',
      message: 'Selamat ya Risco & Putri! Semoga lancar sampai hari H dan bahagia selalu.',
      time: '1 week ago',
    },
    {
      name: 'Rahmat',
      attendance: 'Tidak',
      message: 'Mohon maaf belum bisa hadir, doa terbaik dari jauh untuk Risco & Putri.',
      time: '1 week ago',
    },
  ];

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));

  const wishHtml = (w) => {
    const att = w.attendance ? esc(w.attendance[0].toUpperCase() + w.attendance.slice(1)) : '';
    return `<div class="wish"><b>${esc(w.name)}</b>${att ? `<span class="tag">${att}</span>` : ''}<p>${esc(
      w.message
    )}</p><time>${esc(w.time)}</time></div>`;
  };

  function loadWishes() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (_) {}
    return defaultWishes;
  }

  function renderWishes(list) {
    const box = $('#wishes');
    const cnt = $('#wishCount');
    if (box) box.innerHTML = list.map(wishHtml).join('');
    if (cnt) cnt.textContent = String(list.length);
  }

  let wishes = loadWishes();
  renderWishes(wishes);

  const form = $('#wishForm');
  form &&
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const name = String(data.name || '').trim();
      const message = String(data.message || '').trim();
      if (!name || !message) return;

      const newWish = {
        name,
        attendance: String(data.attendance || 'hadir'),
        message,
        time: 'Baru saja',
      };
      wishes = [newWish, ...wishes];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
      } catch (_) {}

      renderWishes(wishes);
      form.querySelector('textarea').value = '';
      toast('Terima kasih atas ucapan & doanya 🤍');
      document.dispatchEvent(new CustomEvent('inv:burst'));
    });

  /* ---------- Jeda Musik Otomatis Saat Tab Disembunyikan ---------- */
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden && !audio.paused) {
      audio.pause();
      audio._resume = true;
    } else if (!document.hidden && audio._resume) {
      audio._resume = false;
      play();
    }
  });
})();
