/* ==========================================================
   Shaadi Music
   Plays assets/audio/ganapathy-stotram.m4a on loop.
   (File is pre-trimmed: the first 5 s of the original build-up removed;
   original kept in /source-audio.)
   ========================================================== */
window.ShaadiMusic = (() => {
  const FILE = 'assets/audio/ganapathy-stotram.m4a';
  const VOLUME = 0.9;
  const FADE_MS = 800;

  const audio = new Audio(FILE);
  audio.preload = 'auto';
  audio.loop = true;
  let playing = false, fadeRaf = 0;
  const listeners = new Set();

  function fade(to, done) {
    cancelAnimationFrame(fadeRaf);
    const from = audio.volume, t0 = performance.now();
    const step = (now) => {
      const k = Math.max(0, Math.min(1, (now - t0) / FADE_MS));
      audio.volume = from + (to - from) * k;
      if (k < 1) fadeRaf = requestAnimationFrame(step); else if (done) done();
    };
    fadeRaf = requestAnimationFrame(step);
  }

  function emit() { listeners.forEach((fn) => fn(playing)); }

  function play() {
    if (playing) return;
    playing = true;
    audio.volume = 0;
    audio.play().catch(() => {});
    fade(VOLUME);
    emit();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    fade(0, () => { if (!playing) audio.pause(); });
    emit();
  }

  let wasPlaying = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { wasPlaying = playing; pause(); }
    else if (wasPlaying) play();
  });

  return {
    play, pause,
    toggle: () => (playing ? pause() : play()),
    isPlaying: () => playing,
    onChange: (fn) => listeners.add(fn),
  };
})();
