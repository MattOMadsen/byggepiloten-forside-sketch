/* ByggePiloten forside sketch — light scroll depth, no Three.js (v1 spirit) */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* —— Sticky narrative beats —— */
  function initStoryBeats() {
    const beats = document.querySelectorAll(".story__beat");
    const cards = document.querySelectorAll(".beat-card");
    const dots = document.querySelectorAll(".beat-progress span");
    if (!beats.length || !cards.length) return;

    let active = 0;

    function setBeat(i) {
      if (i === active && cards[i].classList.contains("is-active")) return;
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

  /* —— Layered parallax on scroll —— */
  function initParallax() {
    if (reduceMotion) return;

    const scenes = document.querySelectorAll(".scene, .flow-hero");
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

  /* —— Soft ambient fog particles (BP sky tint) —— */
  function initFog() {
    const canvas = document.getElementById("fog");
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const particles = [];
    const COUNT = 28;

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
      p.r = 12 + Math.random() * 48;
      p.a = 0.03 + Math.random() * 0.07;
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vy = -0.04 - Math.random() * 0.08;
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
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y + p.r < 0 || p.x < -p.r || p.x > w + p.r) spawn(p);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(232,243,255,${p.a})`);
        g.addColorStop(1, "rgba(232,243,255,0)");
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

    window.addEventListener("resize", () => resize(), { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    });
  }

  /* —— Soft header shadow on scroll —— */
  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.style.boxShadow =
        window.scrollY > 8 ? "0 6px 24px rgba(12,25,41,0.06)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* —— Mock multi-step flow (sketch only) —— */
  function initFlow() {
    const root = document.querySelector("[data-flow]");
    if (!root) return;

    const panels = Array.from(root.querySelectorAll(".flow-panel"));
    const steps = Array.from(root.querySelectorAll(".flow-steps li"));
    const nextBtns = root.querySelectorAll("[data-flow-next]");
    const prevBtns = root.querySelectorAll("[data-flow-prev]");
    let i = 0;

    function show(n) {
      i = Math.max(0, Math.min(n, panels.length - 1));
      panels.forEach((p, idx) => p.classList.toggle("is-active", idx === i));
      steps.forEach((s, idx) => {
        s.classList.toggle("is-on", idx === i);
        s.classList.toggle("is-done", idx < i);
      });
    }

    nextBtns.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        show(i + 1);
      })
    );
    prevBtns.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        show(i - 1);
      })
    );

    root.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.closest(".chip-row");
        if (!group) return;
        if (group.dataset.multi === "true") {
          chip.classList.toggle("is-selected");
        } else {
          group.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-selected"));
          chip.classList.add("is-selected");
        }
      });
    });

    show(0);
  }

  initStoryBeats();
  initParallax();
  initFog();
  initHeader();
  initFlow();
})();
