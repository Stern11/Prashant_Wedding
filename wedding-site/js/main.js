/* ==========================================================
   Shubham ✦ Vidisha — Shubh Vivah
   GSAP 3: ScrollTrigger, ScrollTo, SplitText, DrawSVG,
   MotionPath, CustomEase, Physics2D, ScrambleText
   Native scrolling + compositor-friendly animation (transform/opacity).
   ========================================================== */
(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, CustomEase, Physics2DPlugin, ScrambleTextPlugin);
  gsap.defaults({ ease: 'power3.out', duration: 0.8 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  let lenis = null;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = innerWidth < 700;

  CustomEase.create('curtain', 'M0,0 C0.5,0 0.2,1 1,1');

  // editions: main = 23 Nov only · wedding = 24 Nov only · full = 23 + 24 Nov
  const EDITION = ['main', 'wedding', 'full'].includes(document.documentElement.dataset.edition) ? document.documentElement.dataset.edition : 'main';
  const HAS_23 = EDITION !== 'wedding';
  const HAS_24 = EDITION !== 'main';
  // countdown target: Mandha (23 only) or Gurchadi on the wedding day
  const WEDDING = new Date(HAS_24 ? '2026-11-24T08:00:00+05:30' : '2026-11-23T11:00:00+05:30');
  const PETAL_COLORS = ['#f2a516', '#e8892b', '#d9361b', '#c2185b', '#f6c453', '#e55b7a'];
  const reveal = (trigger, start = 'top 88%') => ({ trigger, start, once: true });

  /* ---------------------------------------------------------
     Mandala → rendered once as an <img> (cheap to rotate)
     --------------------------------------------------------- */
  const MANDALA_URL = (() => {
    const rings = [
      { r: 34, n: 8, len: 30, w: 13 }, { r: 70, n: 16, len: 40, w: 12 }, { r: 118, n: 24, len: 46, w: 11 },
      { r: 172, n: 36, len: 42, w: 8 }, { r: 222, n: 48, len: 34, w: 6 },
    ];
    let o = '';
    [26, 64, 112, 166, 216, 262, 282].forEach((r, i) => (o += `<circle r="${r}" stroke-opacity="${i % 2 ? 0.45 : 1}"/>`));
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (360 / ring.n) * i + (ri % 2 ? 180 / ring.n : 0);
        const { r, len, w } = ring;
        o += `<path transform="rotate(${a})" ${ri % 2 ? 'fill="rgba(212,175,105,.07)"' : ''} d="M0 ${-r} Q${w} ${-r - len * 0.55} 0 ${-r - len} Q${-w} ${-r - len * 0.55} 0 ${-r}Z"/>`;
        if (ri > 1) o += `<circle transform="rotate(${a + 180 / ring.n})" cy="${-r - len * 0.75}" r="2" stroke-opacity=".5"/>`;
      }
    });
    for (let i = 0; i < 72; i++) o += `<path stroke-opacity=".45" transform="rotate(${i * 5})" d="M-6 -262 Q0 -276 6 -262"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 600 600"><g fill="none" stroke="#d4af69" stroke-width="1.1">${o}</g></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  })();

  function mountMandalas() {
    $$('svg.mandala').forEach((svg) => {
      const img = new Image();
      img.className = 'mandala';
      img.alt = '';
      img.decoding = 'async';
      img.src = MANDALA_URL;
      svg.replaceWith(img);
    });
    $('.cover-mandala').src = MANDALA_URL;
  }

  /* ---------------------------------------------------------
     Builders
     --------------------------------------------------------- */
  function buildToran(el, spacingDesk = 42) {
    el.innerHTML = '';
    const W = el.offsetWidth || innerWidth;
    const spacing = W < 600 ? 34 : spacingDesk;
    const n = Math.ceil(W / spacing) + 1;
    let d = 'M0 10';
    for (let i = 0; i < n; i++) d += ` Q${i * spacing + spacing / 2} 30 ${(i + 1) * spacing} 10`;
    el.insertAdjacentHTML('beforeend', `<svg class="toran-rope" viewBox="0 0 ${W} 40" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="#d4af69" stroke-width="2"/></svg>`);
    const strands = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i <= n; i++) {
      const t = Math.abs(i / n - 0.5) * 2;
      const count = 3 + Math.round(3 * Math.pow(t, 1.4));
      const s = document.createElement('div');
      s.className = 'strand';
      s.style.left = `${i * spacing - 9}px`;
      s.innerHTML = Array.from({ length: count }, (_, k) => `<span class="mg${(i + k) % 3 === 0 ? ' red' : ''}"></span>`).join('') + '<span class="bell"></span>';
      frag.appendChild(s);
      strands.push(s);
      if (i < n) {
        const leaf = document.createElement('span');
        leaf.className = 'leaf';
        leaf.style.left = `${i * spacing + spacing / 2 - 11}px`;
        frag.appendChild(leaf);
        strands.push(leaf);
      }
    }
    el.appendChild(frag);
    return strands;
  }

  function swayStrands(strands) {
    strands.forEach((s) => {
      if (!s.classList.contains('strand')) return;
      s.style.setProperty('--d', gsap.utils.random(1.8, 2.8).toFixed(2) + 's');
      s.style.setProperty('--dl', (-Math.random() * 3).toFixed(2) + 's');
    });
  }

  function buildDiyas() {
    $('.diyas').innerHTML = Array.from({ length: small ? 5 : 7 }, () => '<div class="diya"><span class="flame"></span><span class="bowl"></span></div>').join('');
  }

  function buildToranArch(svg) {
    const cx = 300, cy = 250, rx = 250, ry = 222, N = 14;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const a = Math.PI - (Math.PI * i) / N;
      pts.push([cx + rx * Math.cos(a), cy - ry * Math.sin(a)]);
    }
    let d = `M${pts[0][0]} 410 L${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < N; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const nx = mx - cx, ny = my - cy, len = Math.hypot(nx, ny);
      d += ` Q${mx + (nx / len) * 22} ${my + (ny / len) * 22} ${x2} ${y2}`;
    }
    d += ` L${pts[N][0]} 410`;
    const inner = `M${cx - rx + 16} 410 L${cx - rx + 16} ${cy} A${rx - 16} ${ry - 16} 0 0 1 ${cx + rx - 16} ${cy} L${cx + rx - 16} 410`;
    let bells = '';
    for (let i = 1; i < N; i++) {
      const [x, y] = pts[i];
      const L = 26 + (i % 2) * 10;
      bells += `<g class="bell-g" data-x="${x}" data-y="${y}"><line x1="${x}" y1="${y}" x2="${x}" y2="${y + L}" stroke-width="1.2"/><circle cx="${x}" cy="${y + L + 4}" r="5"/></g>`;
    }
    svg.innerHTML = `
      <path class="ta-main" d="${d}"/>
      <path class="ta-inner" d="${inner}" stroke-opacity=".45"/>
      <line class="ta-pillar" x1="${cx - rx - 12}" y1="${cy}" x2="${cx - rx - 12}" y2="410" stroke-opacity=".6"/>
      <line class="ta-pillar" x1="${cx + rx + 12}" y1="${cy}" x2="${cx + rx + 12}" y2="410" stroke-opacity=".6"/>
      <path class="diamond" d="M${cx - rx} 404 l6 10 -6 10 -6 -10z"/>
      <path class="diamond" d="M${cx + rx} 404 l6 10 -6 10 -6 -10z"/>
      ${bells}`;
  }

  /* ---------------------------------------------------------
     Canvas layers (low DPR, sprite-based)
     --------------------------------------------------------- */
  const Petals = (() => {
    const box = $('#petals');
    const make = (once) => {
      const p = document.createElement('span');
      p.className = 'petal' + (once ? ' once' : '');
      const dur = once ? gsap.utils.random(3.5, 6) : gsap.utils.random(11, 19);
      p.style.cssText = `left:${gsap.utils.random(0, 100)}%;--dur:${dur.toFixed(1)}s;--delay:${once ? gsap.utils.random(0, 0.8).toFixed(2) : (-Math.random() * dur).toFixed(2)}s;--sway:${gsap.utils.random(2.4, 4.2).toFixed(1)}s;--c:${PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0]};scale:${gsap.utils.random(0.6, 1.1).toFixed(2)}`;
      p.innerHTML = '<i></i>';
      if (once) p.addEventListener('animationend', (e) => { if (e.target === p) p.remove(); });
      box.appendChild(p);
    };
    if (!reduce) for (let i = 0; i < (small ? 7 : 12); i++) make(false);
    return { rain: (n = 24) => { if (!reduce) for (let i = 0; i < n; i++) make(true); } };
  })();

  function heroDust() {
    if (reduce) return;
    const box = $('.dust');
    let html = '';
    for (let i = 0; i < (small ? 22 : 40); i++) {
      const dur = gsap.utils.random(14, 26);
      html += `<b style="left:${gsap.utils.random(0, 100).toFixed(1)}%;top:${gsap.utils.random(20, 110).toFixed(1)}%;--s:${gsap.utils.random(5, 13).toFixed(0)}px;--dur:${dur.toFixed(1)}s;--delay:${(-Math.random() * dur).toFixed(1)}s;--tw:${gsap.utils.random(1.4, 3.2).toFixed(1)}s"></b>`;
    }
    box.innerHTML = html;
  }

  function burst(x, y, n = 30, spread = [200, 340]) {
    if (reduce) return;
    const frag = document.createDocumentFragment();
    const els = [];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'burst-petal';
      p.style.cssText = `background:${PETAL_COLORS[i % PETAL_COLORS.length]};left:${x}px;top:${y}px`;
      frag.appendChild(p); els.push(p);
    }
    document.body.appendChild(frag);
    els.forEach((p) => {
      gsap.set(p, { scale: gsap.utils.random(0.6, 1.3), rotation: gsap.utils.random(0, 360) });
      gsap.to(p, {
        duration: gsap.utils.random(1.8, 2.8), ease: 'none',
        physics2D: { velocity: gsap.utils.random(320, 760), angle: gsap.utils.random(spread[0], spread[1]), gravity: 560, friction: 0.02 },
        rotation: '+=' + gsap.utils.random(-720, 720), onComplete: () => p.remove(),
      });
      gsap.to(p, { opacity: 0, duration: 0.6, delay: 1.3 });
    });
  }

  /* ---------------------------------------------------------
     Music button
     --------------------------------------------------------- */
  function musicUI() {
    const btn = $('.music-btn');
    ShaadiMusic.onChange((on) => { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); });
    btn.addEventListener('click', () => ShaadiMusic.toggle());
  }

  /* ---------------------------------------------------------
     Cover (curtains)
     --------------------------------------------------------- */
  function cover() {
    const gateEl = $('#gate');
    const btn = $('.gate-btn');
    const toranStrands = buildToran($('.pelmet-toran'), 52);

    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from('.curtain-l', { xPercent: -8, duration: 1.2 }, 0)
      .from('.curtain-r', { xPercent: 8, duration: 1.2 }, 0)
      .from('.pelmet', { yPercent: -100, duration: 0.8 }, 0.1)
      .from(toranStrands, { y: -120, duration: 1, stagger: { each: 0.012, from: 'center' }, ease: 'bounce.out' }, 0.3)
      .from('.cover-mandala', { scale: 0.6, opacity: 0, rotation: -40, duration: 1.6 }, 0.1)
      .from('.cover-arch path', { drawSVG: '50% 50%', duration: 1.3, stagger: 0.1, ease: 'power2.inOut' }, 0.2)
      .from('.cover-arch .ca-fill', { opacity: 0, duration: 0.8 }, 0.5)
      .from('.cover-fig', { y: 40, opacity: 0, duration: 1, stagger: 0.12 }, 0.6)
      .from('.cover-content > *', { y: 22, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.6);
    swayStrands(toranStrands);

    let opened = false;
    function open() {
      if (opened) return;
      opened = true;
      ShaadiMusic.play();
      intro.progress(1);
      gsap.to('.music-btn', { autoAlpha: 1, duration: 0.6, delay: 1 });
      const tl = gsap.timeline({
        onComplete: () => {
          gateEl.remove();
          document.body.classList.remove('is-locked');
          if (lenis) lenis.start();
          ScrollTrigger.refresh();
        },
      });
      tl.to(btn, { scale: 0.9, duration: 0.12, ease: 'power2.in' })
        .to('.cover-content > *', { y: -20, opacity: 0, duration: 0.45, stagger: 0.03, ease: 'power2.in' }, 0.08)
        .to('.cover-card, .cover-fig', { scale: 1.08, opacity: 0, duration: 0.6, ease: 'power2.in' }, 0.15)
        .to('.cover-mandala', { scale: 1.6, opacity: 0, duration: 0.9, ease: 'power2.in' }, 0.1)
        .to('.gate-glow', { opacity: 1, duration: 0.35, ease: 'power2.in' }, 0.3)
        .to('.curtain-l', { xPercent: -100, scaleX: 0.35, duration: 1.1, ease: 'curtain' }, 0.4)
        .to('.curtain-r', { xPercent: 100, scaleX: 0.35, duration: 1.1, ease: 'curtain' }, 0.4)
        .to('.pelmet', { yPercent: -110, duration: 0.8, ease: 'power2.in' }, 0.55)
        .to('.gate-bg', { opacity: 0, duration: 0.6 }, 0.6)
        .add(() => { burst(innerWidth / 2, innerHeight / 2, small ? 30 : 46, [0, 360]); Petals.rain(24); heroIntro.play(); }, 0.6)
        .to('.gate-glow', { opacity: 0, duration: 0.7, ease: 'power1.out' }, 0.75);
    }
    btn.addEventListener('click', open);
    addEventListener('keydown', (e) => { if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } });
    if (/[?&]open\b/.test(location.search)) intro.eventCallback('onComplete', open);
  }

  /* ---------------------------------------------------------
     Hero
     --------------------------------------------------------- */
  let heroIntro;
  function hero() {
    const strands = buildToran($('.toran'));
    const nameSplit = SplitText.create('.name', { type: 'chars' });

    heroIntro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    heroIntro
      .from('.hero .hero-mandala', { scale: 0.55, opacity: 0, rotation: -60, duration: 1.6 }, 0)
      .from(strands, { y: -200, duration: 1.1, stagger: { each: 0.012, from: 'center' }, ease: 'bounce.out' }, 0.05)
      .from('.hero-ganesh', { y: -30, opacity: 0, scale: 0.6, duration: 0.8, ease: 'back.out(1.8)' }, 0.15)
      .from('.hero-shri', { opacity: 0, y: 10, duration: 0.6 }, 0.3)
      .from('.hero-title', { opacity: 0, scale: 1.2, y: 10, duration: 1 }, 0.35)
      .from('.hero-sub', { opacity: 0, y: 10, duration: 0.5 }, 0.6)
      .from(nameSplit.chars, {
        opacity: 0, yPercent: 70, rotationX: -80, rotationZ: () => gsap.utils.random(-16, 16),
        transformPerspective: 600, duration: 0.8, stagger: 0.035, ease: 'back.out(1.6)',
      }, 0.65)
      .from('.amp', { scale: 0, rotation: 180, opacity: 0, duration: 0.7, ease: 'back.out(2)' }, 0.9)
      .from('.hero-date .line', { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }, 1.05)
      .from('.hero-date > div, .hero-place', { opacity: 0, y: 12, duration: 0.6, stagger: 0.1 }, 1.1)
      .from('.scroll-hint', { opacity: 0, duration: 0.6 }, 1.4)
      .to('.dock', { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.6)' }, 1.3);

    swayStrands(strands);

    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-content', { yPercent: 28, opacity: 0, scale: 0.94, ease: 'none' }, 0)
      .to('.hero .hero-mandala', { scale: 1.3, opacity: 0.12, ease: 'none' }, 0)
      .to('.toran', { y: -80, ease: 'none' }, 0);

    heroDust();
  }

  /* ---------------------------------------------------------
     Sections
     --------------------------------------------------------- */
  function sectionHeads() {
    $$('.section-head .title').forEach((t) => {
      const split = SplitText.create(t, { type: 'words', mask: 'words' });
      gsap.from(split.words, { yPercent: 110, duration: 0.8, stagger: 0.06, ease: 'power4.out', scrollTrigger: reveal(t, 'top 90%') });
    });
    $$('.section-head .eyebrow, .section-head .lead').forEach((el) => {
      gsap.from(el, { opacity: 0, y: 14, duration: 0.7, scrollTrigger: reveal(el, 'top 92%') });
    });
  }

  function blessing() {
    gsap.fromTo('.kalash', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'power3.inOut', scrollTrigger: reveal('.kalash') });
    gsap.from('.kalash-glow', { scale: 0, opacity: 0, duration: 0.6, delay: 0.7, scrollTrigger: reveal('.kalash') });
    $$('.blessing .divider').forEach((d) => gsap.from(d.querySelectorAll('path'), { drawSVG: '50% 50%', duration: 1, ease: 'power2.inOut', scrollTrigger: reveal(d, 'top 92%') }));
    $$('.reveal-words').forEach((el) => {
      const split = SplitText.create(el, { type: 'words' });
      gsap.fromTo(split.words, { opacity: 0.15, y: 6 }, {
        opacity: 1, y: 0, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 88%', end: 'bottom 62%', scrub: 0.4 },
      });
    });
    $$('.blessing .trans').forEach((el) => gsap.from(el, { opacity: 0, y: 16, scrollTrigger: reveal(el, 'top 94%') }));
    gsap.from('.blessing .corner', { scale: 0, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'back.out(1.6)', scrollTrigger: reveal('.blessing', 'top 75%') });
  }

  function invite() {
    const parchment = $('.parchment');
    const bottom = $('.roller-bottom');
    gsap.from('.roller-top', { scaleX: 0.3, opacity: 0, duration: 0.8, ease: 'back.out(1.4)', scrollTrigger: reveal('.scroll-wrap') });
    gsap.timeline({ scrollTrigger: reveal('.scroll-wrap', 'top 75%'), defaults: { duration: 1.6, ease: 'power2.inOut' } })
      .fromTo(parchment, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }, 0)
      .fromTo(bottom, { y: () => -parchment.offsetHeight + 6 }, { y: 0 }, 0);
    gsap.from('.parchment-inner > *', { opacity: 0, y: 14, duration: 0.5, stagger: 0.08, delay: 0.3, scrollTrigger: reveal('.scroll-wrap', 'top 75%') });
  }

  function couple() {
    $$('.person').forEach((p, i) => {
      const dir = i === 0 ? -1 : 1;
      const photo = p.querySelector('.photo');
      const img = photo.querySelector('img');
      const tl = gsap.timeline({ scrollTrigger: reveal(p, 'top 80%') });
      tl.from(p.querySelectorAll('.arch path'), { drawSVG: 0, duration: 1.2, stagger: 0.12, ease: 'power2.inOut' }, 0)
        .fromTo(photo.querySelector('.photo-wipe'), { scaleY: 1 }, { scaleY: 0, duration: 0.9, ease: 'power3.inOut' }, 0.35)
        .from(img, { scale: 1.35, rotation: dir * 3, duration: 1.4, ease: 'power3.out' }, 0.35)
        .from(p.querySelectorAll('.p-title, .p-name, .p-deva, .p-rel'), { opacity: 0, y: 20, stagger: 0.07, duration: 0.6 }, 0.6);
      gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.couple-knot svg > *', { drawSVG: 0, duration: 1.2, stagger: 0.1, ease: 'power2.inOut', scrollTrigger: reveal('.couple-knot') });
    gsap.to('.couple-knot svg', { rotation: 360, ease: 'none', scrollTrigger: { trigger: '.couple-stage', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function countdown() {
    buildDiyas();
    const units = ['d', 'h', 'm', 's'];
    const els = Object.fromEntries(units.map((k) => [k, $(`[data-unit="${k}"]`)]));
    const prev = {};
    let started = false, ticking = null;
    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
    const values = () => {
      const diff = Math.max(0, WEDDING - Date.now());
      return { d: pad(Math.floor(diff / 864e5)), h: pad(Math.floor(diff / 36e5) % 24), m: pad(Math.floor(diff / 6e4) % 60), s: pad(Math.floor(diff / 1e3) % 60), done: diff === 0 };
    };
    function update() {
      const v = values();
      if (v.done) $('.countdown .title').textContent = 'The auspicious day is here!';
      units.forEach((k) => {
        if (prev[k] === v[k]) return;
        els[k].textContent = v[k];
        prev[k] = v[k];
        if (started && !reduce) gsap.fromTo(els[k], { yPercent: -30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
      });
    }
    update();
    ScrollTrigger.create({
      trigger: '.cd-grid', start: 'top 90%', once: true,
      onEnter: () => {
        const v = values();
        units.forEach((k, i) => gsap.to(els[k], { duration: 0.9, delay: i * 0.08, scrambleText: { text: v[k], chars: '0123456789', speed: 0.6 } }));
        setTimeout(() => { started = true; update(); }, 1200);
      },
    });
    ScrollTrigger.create({
      trigger: '.countdown', start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { clearInterval(ticking); if (s.isActive) ticking = setInterval(update, 1000); },
    });
    gsap.from('.cd-cell', { y: 40, opacity: 0, rotationY: 35, transformPerspective: 800, stagger: 0.08, duration: 0.8, scrollTrigger: reveal('.cd-grid') });
    const flames = $$('.diya .flame');
    gsap.from('.diya', { y: 24, opacity: 0, stagger: 0.06, duration: 0.6, scrollTrigger: reveal('.diyas', 'top 94%') });
    flames.forEach((f) => { f.style.setProperty('--fd', gsap.utils.random(0.5, 0.9).toFixed(2) + 's'); f.style.setProperty('--fdl', (-Math.random()).toFixed(2) + 's'); });
    gsap.to(flames, { opacity: 1, duration: 0.4, stagger: { each: 0.12, from: 'center' }, ease: 'power2.out', scrollTrigger: reveal('.diyas', 'top 90%') });
  }

  function events() {
    const baraat = $('.baraat');
    const track = $('.procession');
    gsap.fromTo(baraat, { x: () => -baraat.offsetWidth * 0.85 }, {
      x: () => track.offsetWidth - baraat.offsetWidth * 0.15, ease: 'none',
      scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom top', scrub: 0.3, invalidateOnRefresh: true },
    });

    const tlEl = $('.timeline');
    const st = { trigger: tlEl, start: 'top 72%', end: 'bottom 72%', scrub: 0.4, invalidateOnRefresh: true };
    gsap.from('.tl-draw', { drawSVG: 0, ease: 'none', scrollTrigger: { ...st } });
    const diya = $('.tl-diya');
    gsap.to(diya, { ease: 'none', motionPath: { path: '#tlPath', align: '#tlPath', alignOrigin: [0.5, 0.75] }, scrollTrigger: { ...st } });

    $$('.ev').forEach((ev) => {
      const fromLeft = ev.classList.contains('ev-left') && innerWidth > 760;
      const card = ev.querySelector('.ev-card');
      gsap.timeline({ scrollTrigger: reveal(ev, 'top 84%') })
        .from(card, { x: fromLeft ? -90 : 90, rotation: fromLeft ? -4 : 4, opacity: 0, scale: 0.94, duration: 0.9 })
        .from(card.querySelector('.ev-icon'), { scale: 0, rotation: -90, duration: 0.6, ease: 'back.out(2.4)' }, 0.25)
        .from(card.querySelectorAll('.ev-date, .ev-time, .ev-name, .ev-en, .ev-desc'), { opacity: 0, y: 14, stagger: 0.06, duration: 0.5 }, 0.3);
    });
  }

  function venue() {
    const svg = $('.toran-arch');
    buildToranArch(svg);
    gsap.timeline({ scrollTrigger: reveal('.venue-arch', 'top 82%') })
      .from(svg.querySelectorAll('.ta-main, .ta-inner, .ta-pillar'), { drawSVG: 0, duration: 1.4, stagger: 0.12, ease: 'power2.inOut' })
      .from(svg.querySelectorAll('.diamond'), { scale: 0, transformOrigin: 'center', duration: 0.4, ease: 'back.out(3)' }, 0.9)
      .from(svg.querySelectorAll('.bell-g'), { scaleY: 0, opacity: 0, transformOrigin: '50% 0%', stagger: { each: 0.03, from: 'center' }, duration: 0.45, ease: 'back.out(2)' }, 0.7)
      .from('.venue-text > *', { opacity: 0, y: 16, stagger: 0.1, duration: 0.6 }, 0.5)
      .from('.turhi-l', { xPercent: -70, opacity: 0, duration: 0.9 }, 0.3)
      .from('.turhi-r', { xPercent: 70, opacity: 0, duration: 0.9 }, 0.3);
    svg.querySelectorAll('.bell-g').forEach((g) => {
      g.style.setProperty('--d', gsap.utils.random(1.1, 1.7).toFixed(2) + 's');
      g.style.setProperty('--dl', (-Math.random() * 1.5).toFixed(2) + 's');
    });
    gsap.from('.venue-actions .btn', { opacity: 0, y: 20, stagger: 0.1, scrollTrigger: reveal('.venue-actions', 'top 95%') });
    gsap.from('.venue-card', { opacity: 0, y: 40, scale: 0.96, duration: 0.8, stagger: 0.12, scrollTrigger: reveal('.venue-grid', 'top 92%') });

    $('#addCal').addEventListener('click', () => {
      const RALI = 'LOCATION:Prachin Shiv Mandir\\, Rali Chauhan\\, Kila Road\\, Meerut';
      const MILE = 'LOCATION:3rd Milestone\\, Meerut';
      const ev = (uid, start, end, summary, loc, extra = []) => [
        'BEGIN:VEVENT', `UID:${uid}@shubham-vidisha`, 'DTSTAMP:20261115T000000Z', start, end, `SUMMARY:${summary} — Shubham & Vidisha`, loc, ...extra, 'END:VEVENT',
      ];
      const alarm = ['BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Shubh Vivah celebrations tomorrow', 'END:VALARM'];
      const events = [];
      if (HAS_23) events.push(
        ...ev('haldi-20261120', 'DTSTART;VALUE=DATE:20261120', 'DTEND;VALUE=DATE:20261121', 'Haldi', RALI),
        ...ev('mehandi-20261123', 'DTSTART;VALUE=DATE:20261123', 'DTEND;VALUE=DATE:20261124', 'Mehandi', RALI),
        ...ev('mandha-20261123', 'DTSTART:20261123T053000Z', 'DTEND:20261123T073000Z', 'Mandha', RALI, alarm),
        ...ev('preetibhoj-20261123', 'DTSTART:20261123T073000Z', 'DTEND:20261123T100000Z', 'Preetibhoj', RALI),
      );
      if (HAS_24) events.push(
        ...ev('gurchadi-20261124', 'DTSTART:20261124T023000Z', 'DTEND:20261124T043000Z', 'Gurchadi', RALI, alarm),
        ...ev('baraat-20261124', 'DTSTART:20261124T043000Z', 'DTEND:20261124T060000Z', 'Baraat Prasthan', RALI),
        ...ev('vivah-20261124', 'DTSTART;VALUE=DATE:20261124', 'DTEND;VALUE=DATE:20261125', 'Shubh Vivah (Wedding)', MILE),
      );
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ShubhVivah//Shubham-Vidisha//EN', 'CALSCALE:GREGORIAN',
        ...events,
        'END:VCALENDAR',
      ].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'Shubham-Vidisha-Shubh-Vivah.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  function family() {
    gsap.from('.fam-card', { y: 60, opacity: 0, rotationX: -20, transformPerspective: 900, transformOrigin: '50% 0%', stagger: 0.1, duration: 0.9, scrollTrigger: reveal('.fam-grid', 'top 86%') });
    gsap.from('.fam-card li, .phones a', { opacity: 0, x: -12, stagger: 0.04, duration: 0.45, delay: 0.35, scrollTrigger: reveal('.fam-grid', 'top 86%') });
  }

  function closing() {
    gsap.from('.closing .hero-mandala', { scale: 0.6, opacity: 0, duration: 1.4, scrollTrigger: reveal('.closing', 'top 70%') });
    const names = SplitText.create('.closing-names span', { type: 'chars' });
    gsap.timeline({ scrollTrigger: reveal('.closing-inner', 'top 80%') })
      .from('.closing-ganesh', { scale: 0, rotation: -30, opacity: 0, duration: 0.7, ease: 'back.out(2)' })
      .from('.closing-deva', { opacity: 0, y: 18, duration: 0.6 }, 0.2)
      .from('.closing-en', { opacity: 0, y: 12, duration: 0.5 }, 0.35)
      .from(names.chars, { opacity: 0, y: 40, scale: 0.5, rotation: () => gsap.utils.random(-24, 24), stagger: 0.035, duration: 0.6, ease: 'back.out(2)' }, 0.45)
      .from('.closing-names i', { scale: 0, opacity: 0, duration: 0.45, ease: 'back.out(3)' }, 0.7)
      .from('.closing-date', { opacity: 0, letterSpacing: '1em', duration: 0.8 }, 0.8)
      .from('#blessBtn', { opacity: 0, y: 16, duration: 0.5 }, 1)
      .add(() => { const r = $('.closing-names').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 30); }, 1);
    $('#blessBtn').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, small ? 36 : 50, [205, 335]);
      Petals.rain(36);
      gsap.fromTo(e.currentTarget, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2,0.4)' });
    });
  }

  function nav() {
    gsap.set('.dock', { xPercent: -50, yPercent: 160, autoAlpha: 0 });
    const bar = $('.progress span');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.set(bar, { scaleX: s.progress }) });
    const links = $$('.dock a');
    const groups = { home: ['#home', '#blessing', '#invite'], couple: ['#couple', '#countdown'], events: ['#events'], venue: ['#venue'], family: ['#family', '#closing'] };
    links.forEach((a) => {
      const key = a.getAttribute('href').slice(1);
      (groups[key] || []).forEach((sel) => ScrollTrigger.create({
        trigger: sel, start: 'top 50%', end: 'bottom 50%',
        onToggle: (s) => { if (s.isActive) { links.forEach((l) => l.classList.remove('active')); a.classList.add('active'); } },
      }));
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = $(a.getAttribute('href'));
        if (lenis) lenis.scrollTo(target, { duration: 1.2 });
        else target.scrollIntoView({ behavior: 'smooth' });
      });
    });
    links[0].classList.add('active');
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function smoothScroll() {
    if (reduce || !window.Lenis) return;
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // pause CSS ambient loops for sections that are off-screen
  function pauseOffscreen() {
    $$('#smooth-content > section').forEach((sec) => {
      sec.classList.add('is-off');
      ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => sec.classList.toggle('is-off', !s.isActive) });
    });
    $('.hero').classList.remove('is-off');
  }

  function boot() {
    // drop the other edition's blocks before any animation setup
    $$('[data-only]').forEach((el) => { if (!el.dataset.only.split(/\s+/).includes(EDITION)) el.parentNode.removeChild(el); });
    smoothScroll();
    mountMandalas();
    musicUI();
    nav();
    hero();
    cover();
    sectionHeads();
    blessing();
    invite();
    couple();
    countdown();
    events();
    venue();
    family();
    closing();
    pauseOffscreen();

    let rw = innerWidth;
    addEventListener('resize', () => {
      if (Math.abs(innerWidth - rw) < 40) return;
      rw = innerWidth;
      swayStrands(buildToran($('.toran')));
    });
  }

  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(boot);
})();
