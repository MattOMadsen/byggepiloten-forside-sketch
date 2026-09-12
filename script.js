/* ByggePiloten forside sketch — immersive scroll-depth + BP theme */
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

  /* —— Page scroll progress —— */
  function initScrollProgress() {
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct.toFixed(2) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  /* —— Sticky narrative beats —— */
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

  /* —— Layered parallax —— */
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
        const y = progress * depth * 120;
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

  /* —— Soft ambient fog particles —— */
  function initFog() {
    const canvas = document.getElementById("fog");
    if (!canvas || reduceMotion) {
      if (canvas) canvas.style.display = "none";
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const particles = [];
    const COUNT = 26;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(p) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.r = 14 + Math.random() * 52;
      p.a = 0.025 + Math.random() * 0.06;
      p.vx = (Math.random() - 0.5) * 0.14;
      p.vy = -0.035 - Math.random() * 0.07;
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const p = {};
        spawn(p);
        particles.push(p);
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      const dark = document.documentElement.classList.contains("dark");
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y + p.r < 0 || p.x < -p.r || p.x > w + p.r) spawn(p);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        if (dark) {
          g.addColorStop(0, `rgba(77, 154, 237,${p.a * 0.7})`);
          g.addColorStop(1, "rgba(77, 154, 237,0)");
        } else {
          g.addColorStop(0, `rgba(255,255,255,${p.a})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    initParticles();
    frame();

    window.addEventListener("resize", resize, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    });
  }

  /* —— Dual opret-flow demos —— */
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

  /* —— Soft header shadow —— */
  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.style.boxShadow =
        window.scrollY > 8 ? "0 6px 24px rgba(12, 25, 41, 0.07)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  initTheme();
  initScrollProgress();
  initStoryBeats();
  initParallax();
  initFog();
  initDemos();
  initHeader();
})();
