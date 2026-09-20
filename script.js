/* ByggePiloten forside sketch — light scroll depth, no Three.js (v1 spirit) */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* —— Sticky narrative beats + horizontal snap carousel —— */
  function initStoryBeats() {
    const beats = document.querySelectorAll(".story__beat");
    const stack = document.querySelector(".card-stack");
    const cards = Array.from(document.querySelectorAll(".beat-card"));
    const dots = Array.from(document.querySelectorAll(".beat-progress [data-i]"));
    if (!stack || !cards.length) return;

    let active = 0;
    let syncingFromRail = false;
    let syncingFromScroll = false;

    function setActive(i, { scrollCarousel = false, scrollRail = false } = {}) {
      if (i < 0 || i >= cards.length) return;
      active = i;
      cards.forEach((c, idx) => c.classList.toggle("is-active", idx === i));
      dots.forEach((d, idx) => {
        const on = idx === i;
        d.classList.toggle("is-on", on);
        if (d.hasAttribute("aria-current") || d.tagName === "BUTTON") {
          if (on) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        }
      });
      const visual = document.querySelector(".story__visual");
      if (visual) visual.setAttribute("data-beat", String(i));

      if (scrollCarousel) {
        syncingFromRail = true;
        const card = cards[i];
        const left =
          card.offsetLeft - (stack.clientWidth - card.clientWidth) / 2;
        stack.scrollTo({
          left: Math.max(0, left),
          behavior: reduceMotion ? "auto" : "smooth",
        });
        window.setTimeout(() => {
          syncingFromRail = false;
        }, reduceMotion ? 50 : 420);
      }

      if (scrollRail && beats[i] && !reduceMotion) {
        syncingFromScroll = true;
        beats[i].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        window.setTimeout(() => {
          syncingFromScroll = false;
        }, 500);
      }
    }

    function nearestCardIndex() {
      const mid = stack.scrollLeft + stack.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, idx) => {
        const cMid = card.offsetLeft + card.clientWidth / 2;
        const dist = Math.abs(cMid - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx;
        }
      });
      return best;
    }

    let scrollTick = false;
    stack.addEventListener(
      "scroll",
      () => {
        if (syncingFromRail) return;
        if (scrollTick) return;
        scrollTick = true;
        requestAnimationFrame(() => {
          scrollTick = false;
          const i = nearestCardIndex();
          if (i !== active) setActive(i);
        });
      },
      { passive: true }
    );

    let drag = null;
    stack.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      drag = {
        id: e.pointerId,
        startX: e.clientX,
        startScroll: stack.scrollLeft,
        moved: false,
      };
      stack.setPointerCapture(e.pointerId);
    });
    stack.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 4) drag.moved = true;
      stack.scrollLeft = drag.startScroll - dx;
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      drag = null;
      if (wasMoved) {
        const i = nearestCardIndex();
        setActive(i, { scrollCarousel: true });
      }
    }
    stack.addEventListener("pointerup", endDrag);
    stack.addEventListener("pointercancel", endDrag);

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const i = Number(dot.getAttribute("data-i"));
        if (Number.isNaN(i)) return;
        setActive(i, { scrollCarousel: true, scrollRail: true });
      });
    });

    if (reduceMotion) {
      cards.forEach((c) => c.classList.add("is-active"));
      return;
    }

    if (beats.length) {
      const io = new IntersectionObserver(
        (entries) => {
          if (syncingFromScroll) return;
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const i = Number(entry.target.getAttribute("data-beat"));
            if (!Number.isNaN(i) && i !== active) {
              setActive(i, { scrollCarousel: true });
            }
          });
        },
        { root: null, threshold: 0.45, rootMargin: "-10% 0px -25% 0px" }
      );
      beats.forEach((b) => io.observe(b));
    }

    setActive(0);
  }

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

  function initFog() {
    const canvas = document.getElementById("fog");
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0;
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
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(frame);
    });
  }

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

  function initFlow() {
    const root = document.querySelector("[data-flow]");
    if (!root) return;
    const panels = Array.from(root.querySelectorAll(".flow-panel"));
    const steps = Array.from(root.querySelectorAll(".flow-steps li"));
    const nextBtns = root.querySelectorAll("[data-flow-next]");
    const prevBtns = root.querySelectorAll("[data-flow-prev]");
    let i = 0;
    const progressLabel = root.querySelector(".flow-progress__current");
    function show(n) {
      i = Math.max(0, Math.min(n, panels.length - 1));
      panels.forEach((p, idx) => p.classList.toggle("is-active", idx === i));
      steps.forEach((s, idx) => {
        s.classList.toggle("is-on", idx === i);
        s.classList.toggle("is-done", idx < i);
      });
      if (progressLabel && steps[i]) {
        const label = steps[i].dataset.label || "";
        progressLabel.innerHTML =
          "<strong>Trin " + (i + 1) + "</strong>" + (label ? " — " + label : "");
      }
    }
    nextBtns.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        show(i + 1);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );
    prevBtns.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        show(i - 1);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );
    function syncChipPressed(group) {
      group.querySelectorAll(".chip").forEach((c) => {
        c.setAttribute("aria-pressed", c.classList.contains("is-selected") ? "true" : "false");
      });
    }
    root.querySelectorAll(".chip-row").forEach((group) => syncChipPressed(group));
    root.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.closest(".chip-row");
        if (!group) return;
        if (group.dataset.multi === "true") {
          /* Multi: free toggle — including first/preselected (e.g. Murer) */
          chip.classList.toggle("is-selected");
        } else if (chip.classList.contains("is-selected")) {
          /* Single: allow clearing the active chip (no locked first pick) */
          chip.classList.remove("is-selected");
        } else {
          group.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-selected"));
          chip.classList.add("is-selected");
        }
        syncChipPressed(group);
      });
    });
    show(0);
  }

  function initScrollCue() {
    document.querySelectorAll("[data-scroll-to]").forEach((cue) => {
      cue.addEventListener("click", (e) => {
        const sel = cue.getAttribute("data-scroll-to");
        const target = sel && document.querySelector(sel);
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    });
  }

  initStoryBeats();
  initParallax();
  initFog();
  initHeader();
  initFlow();
  initScrollCue();
})();
