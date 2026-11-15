// DOM interaction smoke tests. Canvas painting and visual browser QA are separate.
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';

const window = new Window({
  url: 'https://winter.test/kitschmas.html', width: 1200, height: 900,
  settings: { disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: false, enableCSSFileLoading: false, enableImageFileLoading: false },
});
const originals = new Map();
function expose(name, value) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
for (const [name, value] of Object.entries({
  window, document: window.document, HTMLElement: window.HTMLElement,
  customElements: window.customElements, innerWidth: 1200, innerHeight: 900, devicePixelRatio: 1,
})) expose(name, value);

const media = new window.EventTarget();
media.matches = false;
window.matchMedia = () => media;
expose('matchMedia', () => media);
function setReduced(value) { media.matches = value; media.dispatchEvent(new window.Event('change')); }
let hidden = false;
Object.defineProperty(window.document, 'hidden', { configurable: true, get: () => hidden });
Object.defineProperty(window.document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });

let frameId = 1;
const frames = new Map();
const requestFrame = callback => { const id = frameId++; frames.set(id, callback); return id; };
const cancelFrame = id => frames.delete(id);
window.requestAnimationFrame = requestFrame;
window.cancelAnimationFrame = cancelFrame;
expose('requestAnimationFrame', requestFrame);
expose('cancelAnimationFrame', cancelFrame);
function stepFrame(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); }

const intervals = new Map();
let intervalId = 1;
expose('setInterval', callback => { const id = intervalId++; intervals.set(id, callback); return id; });
expose('clearInterval', id => intervals.delete(id));
const timeoutHandles = new Set();
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
expose('setTimeout', (...args) => { const handle = originalSetTimeout(...args); handle.unref?.(); timeoutHandles.add(handle); return handle; });
const paint = new Proxy({
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : (() => {}); }, set(target, key, value) { target[key] = value; return true; } });
window.HTMLCanvasElement.prototype.getContext = () => paint;
const html = await readFile(new URL('../dist/kitschmas.html', import.meta.url), 'utf8');
window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
await import('../dist/kitschmas.js');
const $ = selector => window.document.querySelector(selector);
const layers = () => window.document.querySelectorAll('[data-winter-vibes]').length;
const burstCanvases = () => $('#party-layer').querySelectorAll('canvas').length;

beforeEach(() => {
  hidden = false;
  setReduced(false);
  if ($('#gift-dialog').open) $('#close-gift').click();
  if ($('#more').getAttribute('aria-pressed') === 'true') $('#more').click();
  if ($('#lights-toggle').getAttribute('aria-pressed') === 'false') $('#lights-toggle').click();
  if ($('.ornaments').classList.contains('rearranged')) $('#shuffle').click();
  if ($('#kitsch-countdown').hasAttribute('paused')) $('#timer-pause').click();
  if ($('#pause-motion').getAttribute('aria-pressed') === 'false') $('#pause-motion').click();
  $('#pause-motion').click();
  $('#notice').textContent = '';
});

after(async () => {
  window.dispatchEvent(new window.Event('pagehide'));
  window.document.body.replaceChildren();
  for (const handle of timeoutHandles) originalClearTimeout(handle);
  intervals.clear();
  await window.happyDOM.abort();
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});

test('Kitschmas boots with one decorative layer, an accessible countdown and usable controls', () => {
  assert.equal(layers(), 1);
  assert.equal(frames.size, 1);
  assert.ok($('#hero-title').textContent.trim().length > 0);
  assert.ok($('#hero-image').getAttribute('alt').length > 0);
  assert.ok($('#kitsch-countdown').shadowRoot.querySelector('[role=timer]'));
  assert.equal($('#party-layer').getAttribute('aria-hidden'), 'true');
  for (const id of ['more', 'lights-toggle', 'shuffle', 'sparkle', 'pause-motion', 'open-gift', 'hug']) {
    assert.equal($('#'+id).getAttribute('type'), 'button', `${id} should not submit an embedding form`);
  }
});

test('more sparkle is reversible, never duplicates a burst, and obeys the visitor’s pause', () => {
  $('#more').click();
  assert.equal($('#more').getAttribute('aria-pressed'), 'true');
  assert.equal(window.document.body.classList.contains('extra'), true);
  assert.equal(burstCanvases(), 1);
  assert.equal(frames.size, 2, 'one background RAF plus one bounded burst');
  $('#sparkle').click();
  assert.equal(burstCanvases(), 1);
  assert.equal(frames.size, 2);
  stepFrame(0);
  stepFrame(3000);
  assert.equal(burstCanvases(), 0, 'the short interaction burst should clean itself up');
  assert.equal(frames.size, 1);
  $('#pause-motion').click();
  $('#more').click();
  assert.equal($('#more').getAttribute('aria-pressed'), 'false');
  assert.equal(window.document.body.classList.contains('extra'), false);
  assert.equal($('#pause-motion').getAttribute('aria-pressed'), 'true');
  assert.equal(window.document.body.classList.contains('paused'), true);
  assert.equal(burstCanvases(), 0);
  assert.equal(frames.size, 0, 'changing density must not override the pause');
});

test('lights and ornament shuffle update reversible visible states and ARIA consistently', () => {
  $('#lights-toggle').click();
  assert.equal($('#lights-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(window.document.body.dataset.lights, 'off');
  assert.match($('#lights-toggle').textContent, /Включить/);
  $('#lights-toggle').click();
  assert.equal($('#lights-toggle').getAttribute('aria-pressed'), 'true');
  assert.equal(window.document.body.dataset.lights, 'on');
  $('#shuffle').click();
  assert.equal($('.ornaments').classList.contains('rearranged'), true);
  $('#shuffle').click();
  assert.equal($('.ornaments').classList.contains('rearranged'), false);
  assert.ok($('#notice[role=status]').textContent.length > 0);
});

test('the gift dialog opens, closes and sends its hug feedback after returning to the page', () => {
  $('#open-gift').click();
  assert.equal($('#gift-dialog').open, true);
  assert.equal($('#open-gift').classList.contains('opened'), true);
  assert.equal($('#gift-dialog').getAttribute('aria-labelledby'), $('#gift-dialog-title').id);
  $('#close-gift').click();
  assert.equal($('#gift-dialog').open, false);
  assert.equal($('#open-gift').classList.contains('opened'), false);
  $('#open-gift').click();
  $('#hug').click();
  assert.equal($('#gift-dialog').open, false);
  assert.equal($('#open-gift').classList.contains('opened'), false);
  assert.match($('#notice[role=status]').textContent, /Взаимно/);
});

test('the countdown has its own pause without stopping the decorative layer', () => {
  $('#timer-pause').click();
  assert.equal($('#kitsch-countdown').hasAttribute('paused'), true);
  assert.equal($('#timer-pause').getAttribute('aria-pressed'), 'true');
  assert.match($('#timer-pause').textContent, /Продолжить/);
  assert.equal(frames.size, 1);
  $('#timer-pause').click();
  assert.equal($('#kitsch-countdown').hasAttribute('paused'), false);
  assert.equal($('#timer-pause').getAttribute('aria-pressed'), 'false');
});

test('reduced motion and page lifecycle stop glitter and never recreate duplicate background loops', () => {
  $('#sparkle').click();
  setReduced(true);
  assert.equal(burstCanvases(), 0);
  assert.equal(frames.size, 0);
  assert.match($('#motion-note').textContent, /статично/);
  $('#sparkle').click();
  assert.equal(burstCanvases(), 0);
  assert.equal(frames.size, 0);
  setReduced(false);
  assert.equal(frames.size, 1);
  $('#sparkle').click();
  hidden = true;
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(burstCanvases(), 0);
  assert.equal(frames.size, 0);
  hidden = false;
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(frames.size, 1);
  window.dispatchEvent(new window.Event('pagehide'));
  assert.equal(layers(), 0);
  assert.equal(frames.size, 0);
  const restore = new window.Event('pageshow');
  Object.defineProperty(restore, 'persisted', { value: true });
  window.dispatchEvent(restore);
  window.dispatchEvent(restore);
  assert.equal(layers(), 1);
  assert.equal(frames.size, 1);
});
