import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Window } from 'happy-dom';

const window = new Window({ url: 'https://winter.test/', width: 1100, height: 800 });
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.customElements = window.customElements;
let visibility = 'visible';
Object.defineProperty(window.document, 'visibilityState', { configurable: true, get: () => visibility });
Object.defineProperty(window.document, 'hidden', { configurable: true, get: () => visibility === 'hidden' });

let reduced = false;
const mediaListeners = new Set();
window.matchMedia = () => ({
  get matches() { return reduced; },
  addEventListener(type, callback) { if (type === 'change') mediaListeners.add(callback); },
  removeEventListener(type, callback) { if (type === 'change') mediaListeners.delete(callback); },
});
function setReduced(value) {
  reduced = value;
  for (const listener of [...mediaListeners]) listener({ matches: value });
}

let frameId = 1;
const frames = new Map();
window.requestAnimationFrame = callback => { const id = frameId++; frames.set(id, callback); return id; };
window.cancelAnimationFrame = id => frames.delete(id);
function frame(timestamp) {
  const batch = [...frames.values()];
  frames.clear();
  batch.forEach(callback => callback(timestamp));
}

const observers = new Set();
class ResizeObserver {
  constructor(callback) { this.callback = callback; this.targets = []; observers.add(this); }
  observe(target) { this.targets.push(target); }
  disconnect() { this.targets = []; observers.delete(this); }
}
const intersections = new Set();
class IntersectionObserver {
  constructor(callback) { this.callback = callback; this.targets = []; intersections.add(this); }
  observe(target) { this.targets.push(target); }
  disconnect() { this.targets = []; intersections.delete(this); }
}
window.ResizeObserver = ResizeObserver;
window.IntersectionObserver = IntersectionObserver;
const paint = new Proxy({
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : (() => {}); }, set(target, key, value) { target[key] = value; return true; } });
window.HTMLCanvasElement.prototype.getContext = () => paint;
const controllers = new Set();
const { createWinterVibes, presets } = await import('../src/winter-vibes.js');

function scene() {
  const parent = window.document.createElement('section');
  parent.style.position = 'static';
  parent.style.backgroundColor = 'red';
  parent.getBoundingClientRect = () => ({ x: 0, y: 0, width: 700, height: 420, top: 0, left: 0, bottom: 420, right: 700 });
  const link = window.document.createElement('a');
  link.href = '/real-content';
  link.textContent = 'Read this';
  parent.append(link);
  window.document.body.append(parent);
  return parent;
}

function mount(options) {
  const controller = createWinterVibes(options);
  controllers.add(controller);
  return controller;
}

beforeEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.clear();
  window.document.body.replaceChildren();
  frames.clear();
  reduced = false;
  visibility = 'visible';
});

after(async () => {
  for (const controller of controllers) controller.destroy();
  window.document.body.replaceChildren();
  await window.happyDOM.abort();
  for (const name of ['window', 'document', 'HTMLElement', 'customElements']) delete globalThis[name];
});

test('the entry module is SSR-safe and mounting reports a missing document clearly', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    'const m=await import("./src/index.js"); if(typeof m.createWinterVibes!=="function")process.exit(2); try{m.createWinterVibes();process.exit(3)}catch(e){if(!/document|browser/i.test(e.message))throw e}'],
  { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('mounting is isolated, updates do not duplicate animation, and destruction leaves host content untouched', () => {
  const container = scene();
  const originalHTML = container.innerHTML;
  const initialStyles = container.getAttribute('style');
  const controller = mount({ container, mode: 'contained', density: 40 });
  const host = container.querySelector('[data-winter-vibes]');
  assert.ok(host?.shadowRoot, 'decoration styles should be isolated');
  assert.equal(host.getAttribute('aria-hidden'), 'true');
  assert.equal(host.style.pointerEvents, 'none');
  assert.equal(host.shadowRoot.querySelectorAll('a,button,input,select,textarea,[tabindex]').length, 0);
  assert.equal(frames.size, 1);
  assert.equal(controller.getState().running, true);
  const state = controller.getState();
  state.effects.snow = false;
  assert.equal(controller.getState().effects.snow, true, 'state snapshots must not mutate live effects');
  controller.update({ preset: 'northern', effects: { frost: true }, density: 70 });
  controller.update({ effects: { stars: true } });
  assert.equal(frames.size, 1, 'repeated updates must keep a single RAF chain');
  assert.equal(controller.getState().effects.snow, true, 'effect patches should preserve other effects');
  frame(1000);
  frame(1034);
  assert.equal(frames.size, 1);
  controller.pause().pause();
  assert.equal(frames.size, 0);
  assert.equal(controller.getState().running, false);
  controller.update({ density: 5 });
  assert.equal(frames.size, 0, 'updating settings must not silently unpause a visitor');
  controller.resume().resume();
  assert.equal(frames.size, 1);
  controller.destroy();
  controller.destroy();
  controller.resume();
  controller.update({ effects: { snow: true } });
  assert.equal(controller.getState().destroyed, true);
  assert.equal(frames.size, 0);
  assert.equal(observers.size, 0);
  assert.equal(intersections.size, 0);
  assert.equal(mediaListeners.size, 0);
  assert.equal(container.innerHTML, originalHTML);
  assert.equal(container.getAttribute('style'), initialStyles);
});

test('multiple layers release shared container positioning only after the last instance is destroyed', () => {
  const container = scene();
  const first = mount({ container, mode: 'contained' });
  const second = mount({ container, mode: 'contained', preset: 'sugarplum' });
  assert.equal(frames.size, 2);
  first.pause();
  assert.equal(second.getState().running, true);
  first.destroy();
  assert.equal(container.style.position, 'relative');
  assert.equal(container.querySelectorAll('[data-winter-vibes]').length, 1);
  second.destroy();
  assert.equal(container.style.position, 'static');
  assert.equal(frames.size, 0);
});

test('destroy preserves positioning changed by the integrating application', () => {
  const container = scene();
  const controller = mount({ container, mode: 'contained' });
  container.style.position = 'sticky';
  controller.destroy();
  assert.equal(container.style.position, 'sticky');
});

test('OS motion changes, hidden tabs and offscreen containers stop and resume the existing animation', () => {
  const container = scene();
  const controller = mount({ container, mode: 'contained' });
  setReduced(true);
  assert.equal(controller.getState().reducedMotion, true);
  assert.equal(frames.size, 0);
  setReduced(false);
  assert.equal(frames.size, 1);
  visibility = 'hidden';
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(frames.size, 0);
  visibility = 'visible';
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(frames.size, 1);
  const observer = [...intersections][0];
  observer.callback([{ target: container, isIntersecting: false }]);
  assert.equal(frames.size, 0);
  observer.callback([{ target: container, isIntersecting: true }]);
  assert.equal(frames.size, 1);
  controller.destroy();
  setReduced(true);
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(frames.size, 0, 'listeners must not restart a destroyed instance');
});

test('invalid options fail before mounting and numeric inputs are bounded', () => {
  assert.throws(() => createWinterVibes({ container: '.missing' }), /container|match/i);
  assert.throws(() => createWinterVibes({ container: '[' }), /selector/i);
  assert.throws(() => createWinterVibes({ preset: 'unknown' }), /preset/i);
  assert.throws(() => createWinterVibes({ effects: [] }), /effects/i);
  assert.equal(window.document.querySelectorAll('[data-winter-vibes]').length, 0);
  const controller = mount({ density: 10000, speed: -2, wind: 99 });
  const state = controller.getState();
  assert.equal(state.density, 100);
  assert.equal(state.speed, 0.25);
  assert.equal(state.wind, 1);
  assert.ok(state.particleCount <= 120);
  assert.throws(() => controller.update({ container: scene() }), /container/i);
  assert.throws(() => controller.update({ mode: 'contained' }), /mode/i);
  assert.ok(Object.isFrozen(presets));
});

test('missing Canvas 2D support fails without leaking a layer or altering the page', () => {
  const container = scene();
  const oldGetContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = () => null;
  try {
    assert.throws(() => createWinterVibes({ container, mode: 'contained' }), /canvas/i);
    assert.equal(container.querySelectorAll('[data-winter-vibes]').length, 0);
    assert.equal(container.style.position, 'static');
    assert.equal(frames.size, 0);
  } finally {
    window.HTMLCanvasElement.prototype.getContext = oldGetContext;
  }
});

test('declarative motion changes apply at runtime and disconnect destroys the layer', () => {
  const parent = scene();
  const element = window.document.createElement('winter-vibes');
  element.setAttribute('contained', '');
  parent.append(element);
  assert.ok(element.controller);
  assert.equal(element.getState().running, true);
  element.setAttribute('motion', 'off');
  assert.equal(element.getState().paused, true, 'motion="off" must pause an already connected element');
  assert.equal(frames.size, 0);
  element.removeAttribute('motion');
  assert.equal(element.getState().running, true, 'removing motion="off" should restore automatic motion');
  element.setAttribute('snow', 'false');
  assert.equal(element.getState().effects.snow, false);
  const controller = element.controller;
  element.remove();
  assert.equal(controller.getState().destroyed, true);
  assert.equal(parent.querySelectorAll('[data-winter-vibes]').length, 0);
  assert.equal(frames.size, 0);
});
