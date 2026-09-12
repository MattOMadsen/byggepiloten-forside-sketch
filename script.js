/* ByggePiloten forside sketch — BP theme, light scroll depth, dual-flow demos */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* —— Theme toggle —— */
  function initTheme() {
    const btn = document.getElementById("themeToggle");
    const root = document.documentElement;
    try {
      if (localStorage.getItem("bp-sketch-dark") === "1") {
        root.classList.add("dark");
      }
    } catch (_) {}
    if (!btn) return;
    btn.addEventListener("click", () => {
      root.classList.toggle("dark");
      try {
        localStorage.setItem(
          "bp-sketch-dark",
          root.classList.contains("dark") ? "1" : "0"
        );
      } catch (_) {}
    });
  }

  /* —— Sticky how-it-works beats —— */
  function initStoryBeats() {
    const beats = document.querySelectorAll(".story__beat");
    const cards = document.querySelectorAll(".beat-card");
    const dots = document.querySelectorAll(".beat-progress span");
    if (!beats.length || !cards.length) return;

    let active = 0;

    function setBeat(i) {
      if (i === active && cards[i] && cards[i].classList.contains("is-active")) return;
      active = i;
      cards.forEach((c, idx) => c.classList.toggle("is-active", idx === i));
      dots.forEach((d, idx) => d.classList.toggle("is-on", idx === i));
    }

    if (reduceMotion) {
      cards.forEach((c) => c.classList.add("is-active"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = Number(entry.target.getAttribute("data-beat"));
          if (!Number.isNaN(i)) setBeat(i);
        });
      },
      { root: null, threshold: 0.45, rootMargin: "-10% 0px -25% 0px" }
    );

    beats.forEach((b) => io.observe(b));
  }

  /* —— Soft parallax on mesh blobs —— */
  function initParallax() {
    if (reduceMotion) return;

    const scenes = document.querySelectorAll(".scene");
    const layers = [];

    scenes.forEach((scene) => {
      scene.querySelectorAll("[data-depth]").forEach((el) => {
        layers.push({
          el,
          depth: parseFloat(el.getAttribute("data-depth")) || 0,
          scene,
        });
      });
    });

    if (!layers.length) return;

    let ticking = false;

    function update() {
      ticking = false;
      const vh = window.innerHeight;
      layers.forEach(({ el, depth, scene }) => {
        const rect = scene.getBoundingClientRect();
        const progress = (vh * 0.35 - rect.top) / (rect.height + vh * 0.2);
        const y = progress * depth * 100;
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  /* —— Dual opret-flow demo steppers —— */
  function initDemos() {
    const state = { privat: 0, firma: 0 };

    function show(kind, index) {
      const panel = document.querySelector(`.demo-panel[data-demo="${kind}"]`);
      if (!panel) return;
      const steps = panel.querySelectorAll(".demo-steps > li");
      if (!steps.length) return;
      const i = ((index % steps.length) + steps.length) % steps.length;
      state[kind] = i;
      steps.forEach((li, idx) => li.classList.toggle("is-active", idx === i));
    }

    document.querySelectorAll("[data-demo-next]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.getAttribute("data-demo-next");
        show(kind, state[kind] + 1);
      });
    });
    document.querySelectorAll("[data-demo-prev]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.getAttribute("data-demo-prev");
        show(kind, state[kind] - 1);
      });
    });
  }

  /* —— Soft header shadow on scroll —— */
  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.style.boxShadow =
        window.scrollY > 8 ? "0 6px 24px rgba(12, 25, 41, 0.06)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  initTheme();
  initStoryBeats();
  initParallax();
  initDemos();
  initHeader();
})();
