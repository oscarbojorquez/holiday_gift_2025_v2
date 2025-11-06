// impact-panel.js — true dotted lines that fully draw in/out on scroll (no glow, no opacity residue)
(function () {
  const { gsap } = window;
  if (!gsap || !window.ScrollTrigger) {
    console.error("GSAP and ScrollTrigger required.");
    return;
  }
  gsap.registerPlugin(window.ScrollTrigger);

  const SVG_NS = "http://www.w3.org/2000/svg";
  let maskIdCounter = 0;

  /**
   * Prepares the path so it can animate its strokeDasharray "reveal" length.
   * This preserves the dotted pattern while allowing full draw/erase.
   */
  function prepDottedPath(path, svg) {
    if (!path || !path.getTotalLength || !svg) return null;
    const len = path.getTotalLength();
    path.dataset.length = len;

    // Dotted pattern comes from CSS (e.g., stroke-dasharray: 0 var(--dot-gap))
    // We'll override dasharray during animation to "grow" visible length.
    path.style.strokeDasharray = `0 var(--dot-gap)`;
    path.style.strokeDashoffset = 0;
    path.style.opacity = 1;

    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NS, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }

    if (!path.dataset.maskId) {
      const maskSuffix = maskIdCounter++;
      path.dataset.maskId = `impact-mask-${maskSuffix}`;
      path.dataset.maskPathId = `impact-mask-path-${maskSuffix}`;
    }

    const maskId = path.dataset.maskId;
    const maskPathId = path.dataset.maskPathId;

    let mask = svg.querySelector(`#${maskId}`);
    if (!mask) {
      mask = document.createElementNS(SVG_NS, "mask");
      mask.setAttribute("id", maskId);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      defs.appendChild(mask);
    }

    let maskPath = mask.querySelector(`#${maskPathId}`);
    if (!maskPath) {
      maskPath = document.createElementNS(SVG_NS, "path");
      maskPath.setAttribute("id", maskPathId);
      mask.appendChild(maskPath);
    }

    maskPath.setAttribute("d", path.getAttribute("d") || "");
    maskPath.setAttribute("fill", "none");
    maskPath.setAttribute("stroke", "#fff");
    maskPath.setAttribute("stroke-linecap", path.getAttribute("stroke-linecap") || "round");
    maskPath.setAttribute("stroke-linejoin", path.getAttribute("stroke-linejoin") || "round");
    maskPath.setAttribute("stroke-width", path.getAttribute("stroke-width") || 6);
    maskPath.setAttribute("stroke-dasharray", `${len}`);
    maskPath.setAttribute("stroke-dashoffset", `${len}`);
    maskPath.dataset.length = len;

    path.setAttribute("mask", `url(#${maskId})`);

    return {
      path,
      maskPath,
      length: len,
    };
  }

  function mount(section) {
    const duration = parseInt(section.dataset.duration || "2600", 10);
    const svg = section.querySelector(".naming-animation");
    if (!svg) return;

    const inner = section.querySelector(".inner");
    const toast = section.querySelector(".toast");
    const header = section.querySelector(".impact-headline");
    const introducing = svg.querySelector(".introducing");

    const paths = [
      svg.querySelector(".path-to-our"),
      svg.querySelector(".path-to-new"),
      svg.querySelector(".path-to-name"),
      svg.querySelector(".path-to-logo"),
    ];
    const texts = [
      svg.querySelector(".introducing"),
      svg.querySelector(".our"),
      svg.querySelector(".new"),
      svg.querySelector(".name"),
    ];
    const logoWrap = svg.querySelector(".logo-wrap");
    const logoGraphic = logoWrap ? logoWrap.querySelector(".logo") : null;

    const preparedLines = paths.map((path) => prepDottedPath(path, svg));
    gsap.set(texts, { opacity: 0, y: 20 });
    if (logoWrap) {
      gsap.set(logoWrap, { opacity: 0, y: 20, transformOrigin: "50% 50%" });
    }
    const alignHeaderSpacing = () => {
      if (!header || !introducing) return false;
      const desiredGap = parseFloat(getComputedStyle(section).getPropertyValue("--intro-gap")) || 65;
      const headerRect = header.getBoundingClientRect();
      const introRect = introducing.getBoundingClientRect();
      const currentGap = introRect.top - headerRect.bottom;
      const delta = desiredGap - currentGap;
      if (Math.abs(delta) < 0.5) return false;
      const currentTop = parseFloat(svg.style.top || getComputedStyle(svg).top) || 0;
      svg.style.top = `${currentTop + delta}px`;
      return true;
    };

    const alignFooterSpacing = () => {
      if (!inner || !toast || !logoWrap) return false;
      const targetGap = parseFloat(getComputedStyle(section).getPropertyValue("--footer-gap")) || 25;
      const boundsTarget = logoGraphic || logoWrap;
      const logoRect = boundsTarget.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const toastRect = toast.getBoundingClientRect();
      const desiredTop = logoRect.bottom - innerRect.top + targetGap;
      const currentTop = parseFloat(toast.style.top || getComputedStyle(toast).top) || toastRect.top - innerRect.top;
      if (Math.abs(desiredTop - currentTop) < 0.5) return false;
      toast.style.top = `${desiredTop}px`;
      return true;
    };

    let layoutSyncScheduled = false;

    const runLayoutSync = () => {
      layoutSyncScheduled = false;
      let iterations = 0;
      const maxIterations = 6;
      const step = () => {
        iterations += 1;
        const headerAdjusted = alignHeaderSpacing();
        const footerAdjusted = alignFooterSpacing();
        if ((headerAdjusted || footerAdjusted) && iterations < maxIterations) {
          requestAnimationFrame(step);
        }
      };
      step();
    };
    const scheduleLayoutSync = () => {
      if (layoutSyncScheduled) return;
      layoutSyncScheduled = true;
      requestAnimationFrame(runLayoutSync);
    };

    gsap.delayedCall(0, scheduleLayoutSync);
    window.addEventListener("resize", scheduleLayoutSync);

    // Scroll-linked master timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: `+=${duration}`,
        scrub: true,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // markers: true, // debug markers
      },
      onUpdate: scheduleLayoutSync,
      defaults: { ease: "none" },
    });

    // Timing sequence
    const t = {
      introIn: 0.0,
      lineA: 0.2,
      ourIn: 0.6,
      lineB: 1.4,
      newIn: 1.8,
      lineC: 2.6,
      nameIn: 3.0,
      lineD: 3.8,
      logoIn: 4.9,
    };

    // === Animation Flow ===
    tl.to(texts[0], { opacity: 1, y: 0, duration: 0.4 }, t.introIn);

    if (preparedLines[0]) {
      tl.fromTo(
        preparedLines[0].maskPath,
        { strokeDashoffset: () => preparedLines[0].length },
        { strokeDashoffset: 0, duration: 1.0 },
        t.lineA
      );
    }

    tl.to(texts[1], { opacity: 1, y: 0, duration: 0.4 }, t.ourIn);

    if (preparedLines[1]) {
      tl.fromTo(
        preparedLines[1].maskPath,
        { strokeDashoffset: () => preparedLines[1].length },
        { strokeDashoffset: 0, duration: 1.0 },
        t.lineB
      );
    }

    tl.to(texts[2], { opacity: 1, y: 0, duration: 0.4 }, t.newIn);

    if (preparedLines[2]) {
      tl.fromTo(
        preparedLines[2].maskPath,
        { strokeDashoffset: () => preparedLines[2].length },
        { strokeDashoffset: 0, duration: 1.0 },
        t.lineC
      );
    }

    tl.to(texts[3], { opacity: 1, y: 0, duration: 0.4 }, t.nameIn);

    if (preparedLines[3]) {
      tl.fromTo(
        preparedLines[3].maskPath,
        { strokeDashoffset: () => preparedLines[3].length },
        { strokeDashoffset: 0, duration: 1.0 },
        t.lineD
      );
    }

      if (logoWrap) {
        tl.fromTo(logoWrap, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, t.logoIn);
      }

    // Refresh behavior for responsive layouts
    window.ScrollTrigger.addEventListener("refreshInit", () => {
      paths.forEach((path, index) => {
        const updated = prepDottedPath(path, svg);
        if (updated && preparedLines[index]) {
          preparedLines[index].maskPath = updated.maskPath;
          preparedLines[index].length = updated.length;
        }
      });
      scheduleLayoutSync();
    });
    window.ScrollTrigger.addEventListener("refresh", scheduleLayoutSync);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-impact-panel]").forEach(mount);
  });
})();
