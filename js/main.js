const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("motion-ready");

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

  revealItems.forEach((item) => revealObserver.observe(item));
}

const arcadeChase = document.querySelector(".arcade-chase");

if (arcadeChase) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const actors = [
    { element: arcadeChase.querySelector(".arcade-chase__runner"), trailDistance: 0 },
    { element: arcadeChase.querySelector(".arcade-chase__chomper"), trailDistance: 0 },
  ];
  const routePoints = [
    [0, 90],
    [170, 90],
    [170, 36],
    [360, 36],
    [360, 144],
    [550, 144],
    [550, 90],
    [720, 90],
  ];
  const cycleDuration = 16000;
  let route = [];
  let routeLength = 0;
  let startTime;

  const updateRoute = () => {
    const { width, height } = arcadeChase.getBoundingClientRect();
    const actorSize = Number.parseFloat(getComputedStyle(actors[0].element).width);
    actors[1].trailDistance = Math.max(actorSize * 1.4, Math.min(width * 0.07, 52));
    const points = routePoints.map(([x, y], index) => {
      if (index === 0) return [-actorSize / 2, y * height / 180];
      if (index === routePoints.length - 1) return [width + actorSize / 2, y * height / 180];
      return [x * width / 720, y * height / 180];
    });
    const mapPoints = [[0, points[0][1]]];
    route = [];
    routeLength = 0;
    let cursor = points[0];

    const addSegment = (point) => {
      const length = Math.hypot(point[0] - cursor[0], point[1] - cursor[1]);
      if (length === 0) return;

      route.push({ start: cursor, point, length, startDistance: routeLength });
      routeLength += length;
      cursor = point;
      mapPoints.push([Math.min(width, Math.max(0, point[0])), point[1]]);
    };

    for (let index = 1; index < points.length - 1; index += 1) {
      const previous = points[index - 1];
      const corner = points[index];
      const next = points[index + 1];
      const incomingLength = Math.hypot(corner[0] - previous[0], corner[1] - previous[1]);
      const outgoingLength = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
      const radius = Math.min(18, incomingLength / 2, outgoingLength / 2);
      const before = [
        corner[0] - ((corner[0] - previous[0]) / incomingLength) * radius,
        corner[1] - ((corner[1] - previous[1]) / incomingLength) * radius,
      ];
      const after = [
        corner[0] + ((next[0] - corner[0]) / outgoingLength) * radius,
        corner[1] + ((next[1] - corner[1]) / outgoingLength) * radius,
      ];

      addSegment(before);
      const curveStart = cursor;
      for (let step = 1; step <= 8; step += 1) {
        const progress = step / 8;
        const inverse = 1 - progress;
        addSegment([
          inverse * inverse * curveStart[0] + 2 * inverse * progress * corner[0] + progress * progress * after[0],
          inverse * inverse * curveStart[1] + 2 * inverse * progress * corner[1] + progress * progress * after[1],
        ]);
      }
    }

    addSegment(points[points.length - 1]);
    const mapPath = mapPoints
      .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x * 720 / width} ${y * 180 / height}`)
      .join(" ");
    arcadeChase.querySelectorAll(".arcade-chase__track, .arcade-chase__pellets")
      .forEach((path) => path.setAttribute("d", mapPath));
  };

  const placeActor = (actor, distance) => {
    distance = (distance % routeLength + routeLength) % routeLength;
    const segment = route.find((part) => distance <= part.startDistance + part.length) ?? route[route.length - 1];
    const fraction = (distance - segment.startDistance) / segment.length;
    const x = segment.start[0] + (segment.point[0] - segment.start[0]) * fraction;
    const y = segment.start[1] + (segment.point[1] - segment.start[1]) * fraction;
    const angle = Math.atan2(segment.point[1] - segment.start[1], segment.point[0] - segment.start[0]);
    const isVisible = x >= 0 && x <= arcadeChase.clientWidth;

    actor.element.style.opacity = isVisible ? "1" : "0";
    actor.element.style.left = `${x}px`;
    actor.element.style.top = `${y}px`;
    const rotation = actor.element.classList.contains("arcade-chase__chomper") ? ` rotate(${angle}rad)` : "";
    actor.element.style.transform = `translate(-50%, -50%)${rotation}`;
  };

  const animateChase = (now) => {
    if (startTime === undefined) startTime = now;
    if (!routeLength) updateRoute();

    const elapsed = (now - startTime) % cycleDuration;
    const leaderDistance = (elapsed / cycleDuration + 0.12) * routeLength;
    actors.forEach((actor) => {
      placeActor(actor, leaderDistance - actor.trailDistance);
    });
    requestAnimationFrame(animateChase);
  };

  updateRoute();
  window.addEventListener("resize", updateRoute);
  if (reducedMotion) {
    placeActor(actors[0], 135);
    placeActor(actors[1], 135 - actors[1].trailDistance);
  } else {
    requestAnimationFrame(animateChase);
  }
}

const chatButton = document.querySelector(".chat-bubble");
const talkDialog = document.querySelector(".talk-dialog");
const talkDialogClose = document.querySelector(".talk-dialog-close");

chatButton?.addEventListener("click", () => talkDialog?.showModal());
talkDialogClose?.addEventListener("click", () => talkDialog?.close());

const supportsPointerTrail = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const supportsTouchTrail = window.matchMedia("(pointer: coarse)").matches;

if (supportsPointerTrail || supportsTouchTrail) {
  const trail = document.createElement("div");
  trail.className = "pointer-trail";
  trail.setAttribute("aria-hidden", "true");
  document.body.append(trail);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastX = 0;
  let lastY = 0;
  let hasLastPosition = false;
  let lastDotTime = 0;
  const maxGlyphs = 32;
  const addGlyph = (x, y) => {
    if (reducedMotion) return;

    const now = performance.now();
    const distance = Math.hypot(x - lastX, y - lastY);
    if (hasLastPosition && (distance < 10 || now - lastDotTime < 16)) return;

    const glyph = document.createElement("span");
    const digit = Math.random() > 0.5 ? "1" : "0";
    glyph.className = "pointer-trail__glyph";
    glyph.textContent = Math.random() > 0.45 ? `${digit}\n${digit === "1" ? "0" : "1"}` : digit;
    glyph.style.left = `${x + 8 + Math.random() * 8}px`;
    glyph.style.top = `${y + 8 + Math.random() * 8}px`;
    glyph.style.setProperty("--glyph-size", `${9 + Math.random() * 4}px`);
    glyph.style.setProperty("--glyph-drift-x", `${(Math.random() - 0.5) * 12}px`);
    glyph.style.setProperty("--glyph-drift-y", `${14 + Math.random() * 16}px`);
    trail.append(glyph);
    if (trail.childElementCount > maxGlyphs) trail.firstElementChild?.remove();
    glyph.addEventListener("animationend", () => glyph.remove(), { once: true });

    lastX = x;
    lastY = y;
    lastDotTime = now;
    hasLastPosition = true;
  };

  if (supportsPointerTrail) {
    document.addEventListener("pointermove", (event) => addGlyph(event.clientX, event.clientY));
  }

  if (supportsTouchTrail) {
    document.addEventListener("touchmove", (event) => {
      const touch = event.touches[0];
      if (touch) addGlyph(touch.clientX, touch.clientY);
    }, { passive: true });
  }
}
