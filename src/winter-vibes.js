/**
 * Winter Vibes — a small, dependency-free seasonal layer.
 * Decorations never receive pointer events or enter the accessibility tree.
 * Supply a visible Pause / Off control on the integrating site for continuous motion.
 */
export const version = '0.1.0';

const freezePreset = (palette) => Object.freeze({ ...palette, lights: Object.freeze(palette.lights) });

export const presets = Object.freeze({
  hearth: freezePreset({
    label: 'Hearth', snow: '#fffaf1', wire: '#31534b', frost: '#e3f3ef', star: '#f6d6a0',
    lights: ['#ffcc80', '#f5a88c', '#f8e7be', '#a9cbb7', '#eac58c'],
  }),
  sugarplum: freezePreset({
    label: 'Sugarplum', snow: '#fff4fb', wire: '#66516b', frost: '#f3e7ff', star: '#f8c9e5',
    lights: ['#efbbd9', '#c2b1eb', '#f3d4a5', '#d4c9f5', '#f4a9c3'],
  }),
  northern: freezePreset({
    label: 'Northern', snow: '#eaf8ff', wire: '#365462', frost: '#d7efff', star: '#c5ecf2',
    lights: ['#a9e2e2', '#d7efff', '#c2c3ef', '#b4d5cf', '#e9e1bf'],
  }),
});

const DEFAULT_EFFECTS = Object.freeze({ snow: true, lights: true, frost: false, stars: false });
const DEFAULTS = Object.freeze({
  preset: 'hearth', mode: 'overlay', density: 35, speed: 0.65, wind: 0.12,
  respectReducedMotion: true, maxFps: 30, zIndex: 20,
});
// A lease prevents two contained layers from undoing one another's positioning.
const positionLeases = new WeakMap();

function objectOption(value, name) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Winter Vibes: ${name} must be an object.`);
  }
  return value;
}

function numberOption(value, fallback, min, max) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function booleanOption(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value === 'string') return !['false', '0', 'off', 'no'].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function normalize(input, previous) {
  const source = objectOption(input, 'options');
  const base = previous || { ...DEFAULTS, effects: DEFAULT_EFFECTS };
  const preset = source.preset === undefined ? base.preset : String(source.preset);
  if (!Object.prototype.hasOwnProperty.call(presets, preset)) {
    throw new RangeError(`Winter Vibes: unknown preset "${preset}". Use hearth, sugarplum, or northern.`);
  }
  const mode = source.mode === undefined ? base.mode : source.mode;
  if (mode !== 'overlay' && mode !== 'contained') {
    throw new RangeError('Winter Vibes: mode must be "overlay" or "contained".');
  }
  const effectInput = objectOption(source.effects, 'effects');
  const effects = {};
  for (const name of Object.keys(DEFAULT_EFFECTS)) effects[name] = booleanOption(effectInput[name], base.effects[name]);
  return {
    preset, mode, effects,
    density: numberOption(source.density, base.density, 0, 100),
    speed: numberOption(source.speed, base.speed, 0.25, 2),
    wind: numberOption(source.wind, base.wind, -1, 1),
    maxFps: numberOption(source.maxFps, base.maxFps, 1, 60),
    zIndex: Math.round(numberOption(source.zIndex, base.zIndex, -2147483648, 2147483647)),
    respectReducedMotion: booleanOption(source.respectReducedMotion, base.respectReducedMotion),
    nonce: source.nonce === undefined ? base.nonce : (source.nonce == null ? undefined : String(source.nonce)),
  };
}

function resolveContainer(value) {
  if (typeof document === 'undefined') throw new Error('Winter Vibes: createWinterVibes requires a browser document. Importing the module during SSR is supported.');
  if (value === undefined) {
    if (!document.body) throw new Error('Winter Vibes: document.body is not ready. Mount after DOMContentLoaded or pass a container.');
    return document.body;
  }
  if (typeof value === 'string') {
    let element;
    try { element = document.querySelector(value); }
    catch { throw new TypeError(`Winter Vibes: invalid container selector "${value}".`); }
    if (!element) throw new Error(`Winter Vibes: no container matches "${value}".`);
    return element;
  }
  if (!value || value.nodeType !== 1 || typeof value.appendChild !== 'function' || !value.ownerDocument) {
    throw new TypeError('Winter Vibes: container must be an Element or a CSS selector.');
  }
  return value;
}

function acquirePosition(container, view) {
  let lease = positionLeases.get(container);
  if (lease) { lease.count += 1; return; }
  lease = {
    count: 1, changed: false,
    value: container.style.getPropertyValue('position'),
    priority: container.style.getPropertyPriority('position'),
  };
  const position = view.getComputedStyle(container).position;
  if (position === 'static' || !position) {
    container.style.setProperty('position', 'relative');
    lease.changed = true;
  }
  positionLeases.set(container, lease);
}

function releasePosition(container) {
  const lease = positionLeases.get(container);
  if (!lease || --lease.count > 0) return;
  // Preserve a positioning change made by the host application while mounted.
  if (lease.changed && container.style.position === 'relative' && !container.style.getPropertyPriority('position')) {
    if (lease.value) container.style.setProperty('position', lease.value, lease.priority);
    else container.style.removeProperty('position');
  }
  positionLeases.delete(container);
}

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function randomGenerator() {
  let seed = Math.floor(Math.random() * 0xffffffff) || 1;
  return () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function glowSprite(doc, color) {
  const surface = doc.createElement('canvas');
  surface.width = surface.height = 48;
  const paint = surface.getContext('2d');
  if (!paint) return null;
  const glow = paint.createRadialGradient(24, 24, 1, 24, 24, 24);
  glow.addColorStop(0, rgba(color, 0.42));
  glow.addColorStop(0.28, rgba(color, 0.19));
  glow.addColorStop(1, rgba(color, 0));
  paint.fillStyle = glow;
  paint.fillRect(0, 0, 48, 48);
  return surface;
}

function frostSprite(doc, color) {
  const surface = doc.createElement('canvas');
  surface.width = surface.height = 200;
  const paint = surface.getContext('2d');
  if (!paint) return null;
  const haze = paint.createRadialGradient(0, 0, 0, 0, 0, 192);
  haze.addColorStop(0, rgba(color, 0.22));
  haze.addColorStop(0.5, rgba(color, 0.07));
  haze.addColorStop(1, rgba(color, 0));
  paint.fillStyle = haze;
  paint.fillRect(0, 0, 200, 200);
  paint.strokeStyle = rgba(color, 0.43);
  paint.lineWidth = 0.8;
  // Small fern-like frost crystals, rather than a costly animated blur.
  for (let stem = 0; stem < 7; stem += 1) {
    const angle = 0.12 + stem * 0.22;
    const length = 94 + (stem % 3) * 27;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    paint.beginPath(); paint.moveTo(0, 0); paint.lineTo(dx * length, dy * length);
    for (let step = 2; step < 9; step += 1) {
      const at = (step / 10) * length;
      const branch = 16 * (1 - step / 11);
      const x = dx * at, y = dy * at;
      for (const sign of [-1, 1]) {
        const branchAngle = angle + sign * 0.65;
        paint.moveTo(x, y);
        paint.lineTo(x - Math.cos(branchAngle) * branch, y - Math.sin(branchAngle) * branch);
      }
    }
    paint.stroke();
  }
  return surface;
}

/** Mount an isolated seasonal layer. No network access or audio is used. */
export function createWinterVibes(options = {}) {
  const input = objectOption(options, 'options');
  let config = normalize(input);
  const container = resolveContainer(input.container);
  const containerOption = input.container;
  const doc = container.ownerDocument;
  const view = doc.defaultView;
  if (!view || typeof container.attachShadow !== 'function') throw new Error('Winter Vibes: a browser with Shadow DOM and Canvas 2D is required.');
  const host = doc.createElement('div');
  host.setAttribute('data-winter-vibes', version);
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:${config.mode === 'contained' ? 'absolute' : 'fixed'};inset:0;display:block;overflow:hidden;pointer-events:none;user-select:none;isolation:isolate;contain:strict;z-index:${config.zIndex};`;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  if (config.nonce) style.setAttribute('nonce', config.nonce);
  style.textContent = ':host{pointer-events:none!important}canvas{display:block;width:100%;height:100%;pointer-events:none!important}';
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  shadow.append(style, canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Winter Vibes: Canvas 2D is unavailable.');

  let width = 0, height = 0, dpr = 1;
  let paused = false, destroyed = false, running = false, intersecting = true;
  let frameId = null, lastPaint = null, clock = 0;
  let particles = [], palette, glows = [], frost = null;
  let resizeObserver = null, intersectionObserver = null;
  const random = randomGenerator();
  const stars = Array.from({ length: 13 }, (_, i) => ({
    x: 0.035 + random() * 0.93,
    y: i % 3 === 0 ? 0.13 + random() * 0.23 : 0.025 + random() * 0.14,
    radius: 2 + random() * 3.5,
    phase: random() * Math.PI * 2,
  }));
  const motionQuery = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = Boolean(config.respectReducedMotion && motionQuery?.matches);
  const requestFrame = typeof view.requestAnimationFrame === 'function' ? view.requestAnimationFrame.bind(view) : null;
  const cancelFrame = typeof view.cancelAnimationFrame === 'function' ? view.cancelAnimationFrame.bind(view) : null;

  function refreshArt() {
    palette = presets[config.preset];
    glows = palette.lights.map((color) => glowSprite(doc, color));
    frost = frostSprite(doc, palette.frost);
  }

  function refreshParticles() {
    const area = width * height;
    const count = config.effects.snow && area > 0
      ? Math.min(120, Math.round((Math.min(120, area / 15000 + 16) * config.density) / 100)) : 0;
    while (particles.length < count) particles.push({
      x: random(), y: random(), radius: 0.65 + random() * 2.15,
      fall: 13 + random() * 24, phase: random() * Math.PI * 2,
      opacity: 0.28 + random() * 0.45,
    });
    if (particles.length > count) particles.length = count;
  }

  function drawSnow() {
    ctx.fillStyle = palette.snow;
    for (const particle of particles) {
      ctx.globalAlpha = particle.opacity;
      ctx.beginPath();
      ctx.arc(particle.x * width, particle.y * height, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLights(time) {
    const bend = Math.min(64, Math.max(24, width * 0.045), height * 0.25);
    ctx.strokeStyle = palette.wire;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(width / 2, bend, width + 10, 4); ctx.stroke();
    const count = Math.min(34, Math.max(5, Math.floor(width / 68)));
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const x = -10 + (width + 20) * t;
      const y = 4 * (1 - t) ** 2 + 2 * (1 - t) * t * bend + 4 * t ** 2;
      const lean = (t - 0.5) * -0.34;
      const index = i % palette.lights.length;
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = palette.wire;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + lean * 7, y + 5); ctx.stroke();
      ctx.globalAlpha = 0.84 + Math.sin(time * 0.6 + i * 1.7) * 0.12;
      if (glows[index]) ctx.drawImage(glows[index], x - 23, y - 13, 46, 46);
      ctx.fillStyle = palette.lights[index];
      ctx.beginPath(); ctx.ellipse(x + lean * 7, y + 9, 3.3, 5, lean, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffaf2'; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(x - 0.8 + lean * 7, y + 7.5, 0.85, 1.7, lean, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStars(time) {
    ctx.fillStyle = palette.star;
    const count = Math.min(stars.length, Math.max(3, Math.round(width / 115)));
    for (let i = 0; i < count; i += 1) {
      const star = stars[i], x = star.x * width, y = star.y * height, r = star.radius;
      ctx.globalAlpha = 0.38 + Math.sin(time * 0.42 + star.phase) * 0.14;
      ctx.beginPath(); ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r, y);
      ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r);
      ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r, y);
      ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFrost() {
    if (!frost) return;
    const size = Math.min(200, width * 0.35, height * 0.42);
    for (const [x, y, sx, sy] of [[0, 0, 1, 1], [width, 0, -1, 1], [0, height, 1, -1], [width, height, -1, -1]]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.drawImage(frost, 0, 0, size, size); ctx.restore();
    }
  }

  function render() {
    if (destroyed || width <= 0 || height <= 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const time = reducedMotion ? 0 : clock;
    if (config.effects.frost) drawFrost();
    if (config.effects.stars) drawStars(time);
    if (config.effects.snow) drawSnow();
    if (config.effects.lights) drawLights(time);
  }

  function motionAllowed() {
    return !destroyed && !paused && !reducedMotion && doc.visibilityState !== 'hidden' && intersecting
      && width > 0 && height > 0 && Boolean(requestFrame)
      && (particles.length > 0 || config.effects.lights || config.effects.stars);
  }

  function stopLoop() {
    if (frameId !== null && cancelFrame) cancelFrame(frameId);
    frameId = null; running = false; lastPaint = null;
  }

  function tick(timestamp) {
    frameId = null;
    if (!motionAllowed()) { running = false; lastPaint = null; return; }
    const elapsed = lastPaint === null ? 0 : timestamp - lastPaint;
    if (lastPaint === null || elapsed + 0.5 >= 1000 / config.maxFps) {
      const dt = Math.min(Math.max(0.05, 1.5 / config.maxFps), Math.max(0, elapsed / 1000));
      lastPaint = timestamp;
      clock += dt * config.speed;
      for (const particle of particles) {
        particle.phase += dt * config.speed * 0.65;
        particle.x += ((config.wind * 23 + Math.sin(particle.phase) * 5) * dt * config.speed) / width;
        particle.y += (particle.fall * dt * config.speed) / height;
        if (particle.y > 1.025) { particle.y = -0.025; particle.x = random(); }
        if (particle.x < -0.025) particle.x = 1.025;
        else if (particle.x > 1.025) particle.x = -0.025;
      }
      render();
    }
    running = true;
    frameId = requestFrame(tick);
  }

  function syncLoop() {
    if (!motionAllowed()) stopLoop();
    else if (frameId === null) { lastPaint = null; running = true; frameId = requestFrame(tick); }
  }

  function resize() {
    if (destroyed) return;
    const rect = config.mode === 'contained' ? container.getBoundingClientRect() : null;
    const nextWidth = Math.max(0, rect ? container.clientWidth || rect.width : view.innerWidth || doc.documentElement.clientWidth);
    const nextHeight = Math.max(0, rect ? container.clientHeight || rect.height : view.innerHeight || doc.documentElement.clientHeight);
    const nextDpr = Math.min(2, Math.max(1, view.devicePixelRatio || 1));
    if (nextWidth !== width || nextHeight !== height || nextDpr !== dpr) {
      width = nextWidth; height = nextHeight; dpr = nextDpr;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      refreshParticles(); render();
    }
    syncLoop();
  }

  function handleVisibility() { syncLoop(); }
  function handleMotion() {
    if (destroyed) return;
    reducedMotion = Boolean(config.respectReducedMotion && motionQuery?.matches);
    render(); syncLoop();
  }

  const controller = {
    update(patch = {}) {
      if (destroyed) return controller;
      const value = objectOption(patch, 'update patch');
      if (Object.prototype.hasOwnProperty.call(value, 'container') && value.container !== containerOption && value.container !== container) {
        throw new Error('Winter Vibes: update cannot change container. Destroy this instance and create another.');
      }
      if (Object.prototype.hasOwnProperty.call(value, 'mode') && value.mode !== config.mode) {
        throw new Error('Winter Vibes: update cannot change mode. Destroy this instance and create another.');
      }
      const next = normalize(value, config);
      const changeArt = next.preset !== config.preset;
      config = next;
      host.style.zIndex = String(config.zIndex);
      if (config.nonce) style.setAttribute('nonce', config.nonce);
      else style.removeAttribute('nonce');
      if (changeArt) refreshArt();
      refreshParticles(); handleMotion();
      return controller;
    },
    pause() {
      if (!destroyed && !paused) { paused = true; stopLoop(); render(); }
      return controller;
    },
    resume() {
      if (!destroyed && paused) { paused = false; syncLoop(); }
      return controller;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; stopLoop();
      doc.removeEventListener('visibilitychange', handleVisibility);
      view.removeEventListener('resize', resize);
      view.visualViewport?.removeEventListener('resize', resize);
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener('change', handleMotion);
      else motionQuery?.removeListener?.(handleMotion);
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      host.remove();
      if (config.mode === 'contained') releasePosition(container);
      particles = []; glows = []; frost = null;
      // Release the canvas backing store while callers retain the controller.
      canvas.width = canvas.height = 1;
    },
    getState() {
      return {
        preset: config.preset, effects: { ...config.effects }, density: config.density,
        speed: config.speed, wind: config.wind, paused, reducedMotion, running, destroyed,
        particleCount: particles.length, mode: config.mode,
      };
    },
  };

  // All allocations that touch the host are cleaned up if initialization fails.
  let acquired = false;
  try {
    if (config.mode === 'contained') { acquirePosition(container, view); acquired = true; }
    container.appendChild(host);
    refreshArt();
    doc.addEventListener('visibilitychange', handleVisibility);
    view.addEventListener('resize', resize, { passive: true });
    view.visualViewport?.addEventListener('resize', resize, { passive: true });
    if (motionQuery?.addEventListener) motionQuery.addEventListener('change', handleMotion);
    else motionQuery?.addListener?.(handleMotion);
    if (typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(resize);
      resizeObserver.observe(config.mode === 'contained' ? container : doc.documentElement);
    }
    if (config.mode === 'contained' && typeof view.IntersectionObserver === 'function') {
      intersectionObserver = new view.IntersectionObserver((entries) => {
        if (destroyed) return;
        const entry = entries.find((item) => item.target === container);
        if (entry) { intersecting = entry.isIntersecting; syncLoop(); }
      });
      intersectionObserver.observe(container);
    }
    resize();
  } catch (error) {
    // releasePosition is safe even if acquirePosition never succeeded.
    if (!acquired) config = { ...config, mode: 'overlay' };
    controller.destroy();
    throw error;
  }
  return controller;
}

function registerElement() {
  if (typeof window === 'undefined' || !window.customElements || !window.HTMLElement || window.customElements.get('winter-vibes')) return;
  class WinterVibesElement extends window.HTMLElement {
    static get observedAttributes() { return ['preset', 'snow', 'lights', 'frost', 'stars', 'density', 'speed', 'wind', 'motion', 'contained']; }
    constructor() { super(); this.controller = null; }
    connectedCallback() { this._mount(); }
    disconnectedCallback() { this.controller?.destroy(); this.controller = null; }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue || !this.isConnected) return;
      if (!this.controller || name === 'contained') this._mount();
      else {
        this.controller.update(this._options());
        if (name === 'motion') {
          if (newValue === 'off') this.controller.pause();
          else this.controller.resume();
        }
      }
    }
    _options() {
      const effects = {};
      for (const name of Object.keys(DEFAULT_EFFECTS)) {
        effects[name] = this.hasAttribute(name) ? booleanOption(this.getAttribute(name), DEFAULT_EFFECTS[name]) : DEFAULT_EFFECTS[name];
      }
      return {
        preset: this.getAttribute('preset') || DEFAULTS.preset,
        effects,
        density: this.getAttribute('density') ?? DEFAULTS.density,
        speed: this.getAttribute('speed') ?? DEFAULTS.speed,
        wind: this.getAttribute('wind') ?? DEFAULTS.wind,
      };
    }
    _mount() {
      if (!this.isConnected) return;
      const wasPaused = this.controller?.getState().paused || false;
      this.controller?.destroy();
      const contained = this.hasAttribute('contained') && booleanOption(this.getAttribute('contained'), true);
      this.controller = createWinterVibes({
        ...this._options(), container: contained ? this.parentElement || this : this,
        mode: contained ? 'contained' : 'overlay',
      });
      if (wasPaused || this.getAttribute('motion') === 'off') this.controller.pause();
    }
    pause() { this.controller?.pause(); return this; }
    resume() { if (this.getAttribute('motion') !== 'off') this.controller?.resume(); return this; }
    destroy() { this.controller?.destroy(); return this; }
    getState() { return this.controller?.getState() || null; }
  }
  window.customElements.define('winter-vibes', WinterVibesElement);
}

registerElement();
