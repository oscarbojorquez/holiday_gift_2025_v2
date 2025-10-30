// impact-panel.js – Reusable “impact reveal” component
// Mounts any <section class="c-impact" data-impact-panel> with GSAP + ScrollTrigger.
// Optional Lottie elements: <div class="lottie" data-lottie-src="…json" data-start="0.5" data-end="1.5"></div>

(function () {
  const { gsap } = window;
  if (!gsap) { console.error('[c-impact] GSAP not found.'); return; }
  if (!window.ScrollTrigger) { console.error('[c-impact] ScrollTrigger not found.'); return; }
  gsap.registerPlugin(window.ScrollTrigger);

  const HAS_DRAWSVG = !!window.DrawSVGPlugin;
  if (HAS_DRAWSVG) gsap.registerPlugin(window.DrawSVGPlugin);

  // Free fallback: prepare a path/line to "draw" using strokeDashoffset
  function prepPath(el) {
    if (!el) return { len: 0 };
    if (HAS_DRAWSVG) {
      gsap.set(el, { drawSVG: '0% 0%' });
      return { len: tryLen(el) };
    }
    const len = tryLen(el);
    el.style.strokeDashoffset = String(len);
    el.dataset.len = String(len);
    return { len };
  }

  function tryLen(el) {
    try { return el.getTotalLength(); } catch { return 1000; }
  }

  function tweenDraw(el) {
    if (HAS_DRAWSVG) {
      return (tl, at, dur = 1.0) => tl.to(el, { drawSVG: '0% 100%', ease: 'none', duration: dur }, at);
    }
    const len = Number(el?.dataset?.len || tryLen(el));
    return (tl, at, dur = 1.0) => {
      tl.set(el, { strokeDashoffset: len }, at);
      tl.to(el, { strokeDashoffset: 0, ease: 'none', duration: dur }, at);
    };
  }

  // Optional Lottie sync (no-op if lottie or mounts not present)
  function attachLottieDrivers(root, tl) {
    if (!window.lottie) return;
    const mounts = Array.from(root.querySelectorAll('.lottie[data-lottie-src]'));
    if (!mounts.length) return;

    mounts.forEach((el) => {
      const src  = el.getAttribute('data-lottie-src');
      const t0   = parseFloat(el.getAttribute('data-start') || '0');
      const t1   = parseFloat(el.getAttribute('data-end')   || '1.0');
      const loop = (el.getAttribute('data-loop') || 'false') === 'true';

      try {
        const anim = window.lottie.loadAnimation({
          container: el, renderer: 'svg', loop: false, autoplay: false, path: src
        });

        anim.addEventListener('DOMLoaded', () => {
          const total = (anim.totalFrames || (anim.getDuration(true) || 1));
          const proxy = { p: 0 };
          const dur   = Math.max(0.01, t1 - t0);

          const render = () => {
            let frame = proxy.p * (total - 1);
            if (loop) frame = frame % total;
            anim.goToAndStop(frame, true);
          };

          tl.to(proxy, {
            p: 1, duration: dur, ease: 'none',
            onUpdate: render,
            onStart: () => { if (!loop) anim.goToAndStop(0, true); },
            onReverseComplete: () => { if (!loop) anim.goToAndStop(0, true); }
          }, t0);
        });
      } catch (e) {
        console.warn('[c-impact] Lottie load failed:', e);
      }
    });
  }

  function mount(section) {
    const duration = parseInt(section.getAttribute('data-duration') || '2500', 10);
    const shouldPin = (section.getAttribute('data-pin') || 'true') !== 'false';

    const intro = section.querySelector('.w-introducing');
    const our   = section.querySelector('.w-our');
    const anew  = section.querySelector('.w-new');
    const name  = section.querySelector('.w-name');
    const logo  = section.querySelector('.logo-wrap');

    const lineA = section.querySelector('#lineA'); // Line 22 mapped
    const lineB = section.querySelector('#lineB'); // Line 23 mapped
    const lineC = section.querySelector('#lineC'); // Ellipse 11 curve
    const lineD = section.querySelector('#lineD'); // Line 24 mapped

    // Prepare lines so they can “draw”
    [lineA, lineB, lineC, lineD].forEach(prepPath);

    // Master timeline bound to scroll
    const tl = gsap.timeline({
      defaults: { duration: 1, ease: 'power1.out' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${duration}`,
        scrub: true,
        pin: shouldPin,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // markers: true,
      }
    });

    // Sequence timings (adjust to taste)
    const t = {
      introIn: 0.00,  lineAStart: 0.18,
      ourIn:   0.55,  lineBStart: 0.78,
      newIn:   1.10,  lineCStart: 1.34,
      nameIn:  1.70,  lineDStart: 1.92,
      logoIn:  2.30
    };

    // Words + lines
    tl.fromTo(intro, {opacity:0, y:20}, {opacity:1, y:0}, t.introIn);
    tweenDraw(lineA)(tl, t.lineAStart, 1.0);

    tl.fromTo(our,   {opacity:0, y:20}, {opacity:1, y:0}, t.ourIn);
    tweenDraw(lineB)(tl, t.lineBStart, 1.0);

    tl.fromTo(anew,  {opacity:0, y:20}, {opacity:1, y:0}, t.newIn);
    // IMPORTANT: if you want perfect curve from your Ellipse 11 asset,
    // replace #lineC's 'd' attribute in index.html with your exact path data.
    tweenDraw(lineC)(tl, t.lineCStart, 1.1);

    tl.fromTo(name,  {opacity:0, y:20}, {opacity:1, y:0}, t.nameIn);
    tweenDraw(lineD)(tl, t.lineDStart, 1.0);

    tl.fromTo(logo,  {opacity:0, y:20}, {opacity:1, y:0}, t.logoIn);

    // Optional Lottie sync
    attachLottieDrivers(section, tl);

    // Refresh dash lengths on reflow/resize for responsive SVG
    window.ScrollTrigger.addEventListener('refreshInit', () => {
      [lineA, lineB, lineC, lineD].forEach(prepPath);
    });

    section._impactTL = tl;
  }

  function unmount(section) {
    if (section?._impactTL) {
      section._impactTL.scrollTrigger && section._impactTL.scrollTrigger.kill();
      section._impactTL.kill();
      section._impactTL = null;
    }
  }

  function boot() {
    const sections = document.querySelectorAll('[data-impact-panel]');
    sections.forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.ImpactPanel = { mount, unmount };
})();
