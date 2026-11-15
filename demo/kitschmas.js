import { createWinterVibes } from "./winter-vibes.js";
const $ = (selector) => document.querySelector(selector);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let paused = false;
let extra = false;
let lights = true;
let winter;
let cleanupTimer;
let burstFrame = null;
let burstCanvas = null;
let burstParticles = [];
const layer = $("#party-layer");
function mount() {
  winter = createWinterVibes({ density: extra ? 65 : 24, speed: 0.45, preset: "hearth", effects: { snow: true, lights: false, frost: false, stars: true }, zIndex: 55 });
  if (paused) winter.pause();
}
function announce(message) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.add("visible");
  clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => notice.classList.remove("visible"), 3e3);
}
function stopBurst() {
  if (burstFrame !== null) cancelAnimationFrame(burstFrame);
  burstFrame = null;
  burstCanvas?.remove();
  burstCanvas = null;
  burstParticles = [];
}
function sparkle() {
  stopBurst();
  if (paused || reduced.matches) {
    announce("\u0411\u043B\u0435\u0441\u043A \u043D\u0430 \u043C\u0435\u0441\u0442\u0435. \u0414\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u043E\u0442\u0434\u044B\u0445\u0430\u0435\u0442 \u2737");
    return;
  }
  burstCanvas = document.createElement("canvas");
  layer.append(burstCanvas);
  const context = burstCanvas.getContext("2d");
  if (!context) {
    stopBurst();
    return;
  }
  const width = innerWidth, height = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  burstCanvas.width = width * dpr;
  burstCanvas.height = height * dpr;
  context.scale(dpr, dpr);
  const palette = ["#dfb647", "#f3ebd4", "#aac9db", "#d15a88", "#2c9366", "#c13540"];
  burstParticles = Array.from({ length: Math.min(90, Math.round(width / 12)) }, (_, i) => ({ x: width * 0.5, y: height * 0.4, vx: (Math.random() - 0.5) * 350, vy: -120 - Math.random() * 240, r: 2 + Math.random() * 4, rotation: Math.random() * Math.PI, color: palette[i % palette.length] }));
  let start, last;
  const draw = (time) => {
    if (start === void 0) start = last = time;
    const elapsed = (time - start) / 1e3, dt = Math.min(0.04, (time - last) / 1e3);
    last = time;
    context.clearRect(0, 0, width, height);
    for (const particle of burstParticles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 230 * dt;
      particle.rotation += dt;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.globalAlpha = Math.max(0, 1 - elapsed / 2.6);
      context.fillStyle = particle.color;
      context.fillRect(-particle.r, -particle.r, particle.r * 2, particle.r * 0.7);
      context.restore();
    }
    if (elapsed < 2.6) burstFrame = requestAnimationFrame(draw);
    else stopBurst();
  };
  burstFrame = requestAnimationFrame(draw);
}
$("#more").addEventListener("click", (event) => {
  extra = !extra;
  document.body.classList.toggle("extra", extra);
  event.currentTarget.setAttribute("aria-pressed", String(extra));
  winter?.update({ density: extra ? 65 : 24 });
  sparkle();
  announce(extra ? "\u0414\u0430, \u0435\u0449\u0451 \u043E\u0434\u043D\u0443 \u0433\u0438\u0440\u043B\u044F\u043D\u0434\u0443. \u0418 \u0435\u0449\u0451 \u0447\u0443\u0442\u044C-\u0447\u0443\u0442\u044C \u0431\u043B\u0435\u0441\u043A\u0430." : "\u041E\u0441\u0442\u0430\u0432\u0438\u043C \u043B\u044E\u0431\u0438\u043C\u044B\u0439 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u0447\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u0431\u043E\u0440.");
});
$("#lights-toggle").addEventListener("click", (event) => {
  lights = !lights;
  document.body.dataset.lights = lights ? "on" : "off";
  event.currentTarget.setAttribute("aria-pressed", String(lights));
  event.currentTarget.innerHTML = (lights ? "\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043E\u0433\u043E\u043D\u044C\u043A\u0438" : "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043E\u0433\u043E\u043D\u044C\u043A\u0438") + ' <span aria-hidden="true">\u2197</span>';
});
$("#shuffle").addEventListener("click", () => {
  $(".ornaments").classList.toggle("rearranged");
  announce("\u0412\u043E\u0442 \u0442\u0435\u043F\u0435\u0440\u044C \u0442\u043E\u0447\u043D\u043E \u0442\u0430 \u0441\u0430\u043C\u0430\u044F \u043A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u044F.");
});
$("#sparkle").addEventListener("click", () => {
  sparkle();
  if (!paused && !reduced.matches) announce("\u0422\u0435\u043F\u0435\u0440\u044C \u043C\u0438\u0448\u0443\u0440\u0430 \u0442\u043E\u0447\u043D\u043E \u043D\u0430\u0439\u0434\u0451\u0442\u0441\u044F \u0432 \u0444\u0435\u0432\u0440\u0430\u043B\u0435.");
});
$("#pause-motion").addEventListener("click", (event) => {
  paused = !paused;
  winter?.[paused ? "pause" : "resume"]();
  document.body.classList.toggle("paused", paused);
  event.currentTarget.setAttribute("aria-pressed", String(paused));
  event.currentTarget.innerHTML = paused ? '<span aria-hidden="true">\u25B7</span> \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u044D\u0444\u0444\u0435\u043A\u0442\u044B' : '<span aria-hidden="true">\u2161</span> \u041F\u0430\u0443\u0437\u0430 \u044D\u0444\u0444\u0435\u043A\u0442\u043E\u0432';
  if (paused) stopBurst();
});
$("#timer-pause").addEventListener("click", (event) => {
  const isPaused = $("#kitsch-countdown").toggleAttribute("paused");
  event.currentTarget.setAttribute("aria-pressed", String(isPaused));
  event.currentTarget.textContent = isPaused ? "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043E\u0442\u0441\u0447\u0451\u0442" : "\u041F\u0430\u0443\u0437\u0430 \u043E\u0442\u0441\u0447\u0451\u0442\u0430";
});
const dialog = $("#gift-dialog");
$("#open-gift").addEventListener("click", () => {
  $("#open-gift").classList.add("opened");
  dialog.showModal();
});
function closeGift() {
  dialog.close();
  $("#open-gift").classList.remove("opened");
}
$("#close-gift").addEventListener("click", closeGift);
$("#hug").addEventListener("click", () => {
  closeGift();
  sparkle();
  announce("\u0412\u0437\u0430\u0438\u043C\u043D\u043E. \u0421\u0430\u043C\u043E\u0433\u043E \u0442\u0451\u043F\u043B\u043E\u0433\u043E \u0442\u0435\u0431\u0435 \u043D\u043E\u0432\u043E\u0433\u043E \u0433\u043E\u0434\u0430 \u2661");
});
dialog.addEventListener("close", () => $("#open-gift").classList.remove("opened"));
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeGift();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopBurst();
});
reduced.addEventListener("change", () => {
  if (reduced.matches) stopBurst();
  $("#motion-note").textContent = reduced.matches ? "\u0441\u0442\u0430\u0442\u0438\u0447\u043D\u043E \xB7 reduced motion" : "\u0431\u0435\u0437 \u0437\u0432\u0443\u043A\u0430 \u0438 \u0440\u0435\u0437\u043A\u0438\u0445 \u0432\u0441\u043F\u044B\u0448\u0435\u043A";
});
window.addEventListener("pagehide", () => {
  winter?.destroy();
  winter = null;
  stopBurst();
  clearTimeout(cleanupTimer);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && !winter) mount();
});
$("#motion-note").textContent = reduced.matches ? "\u0441\u0442\u0430\u0442\u0438\u0447\u043D\u043E \xB7 reduced motion" : "\u0431\u0435\u0437 \u0437\u0432\u0443\u043A\u0430 \u0438 \u0440\u0435\u0437\u043A\u0438\u0445 \u0432\u0441\u043F\u044B\u0448\u0435\u043A";
mount();
