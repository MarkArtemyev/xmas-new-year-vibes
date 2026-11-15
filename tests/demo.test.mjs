// DOM integration checks only. These do not replace real-browser visual QA.
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';

const window = new Window({
  url: 'https://winter.test/', width: 1200, height: 900,
  settings: { disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: false, enableCSSFileLoading: false, enableImageFileLoading: false },
});
const savedGlobals = new Map();
for (const [name, value] of Object.entries({
  window, document: window.document, HTMLElement: window.HTMLElement,
  customElements: window.customElements,
})) {
  savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
const media = new window.EventTarget();
media.matches = false;
window.matchMedia = () => media;
savedGlobals.set('matchMedia', Object.getOwnPropertyDescriptor(globalThis, 'matchMedia'));
Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => media });

let copiedText = '';
let clipboardRejects = false;
const clipboard = { async writeText(text) { if (clipboardRejects) throw new Error('Clipboard blocked'); copiedText = text; } };
savedGlobals.set('navigator', Object.getOwnPropertyDescriptor(globalThis, 'navigator'));
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard } });
let frameId = 1;
const frames = new Map();
window.requestAnimationFrame = callback => { const id = frameId++; frames.set(id, callback); return id; };
window.cancelAnimationFrame = id => frames.delete(id);
const intervals = new Map();
let intervalId = 1;
savedGlobals.set('setInterval', Object.getOwnPropertyDescriptor(globalThis, 'setInterval'));
savedGlobals.set('clearInterval', Object.getOwnPropertyDescriptor(globalThis, 'clearInterval'));
globalThis.setInterval = callback => { const id = intervalId++; intervals.set(id, callback); return id; };
globalThis.clearInterval = id => intervals.delete(id);
const timeoutHandles = new Set();
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
savedGlobals.set('setTimeout', Object.getOwnPropertyDescriptor(globalThis, 'setTimeout'));
globalThis.setTimeout = (...args) => { const handle = originalSetTimeout(...args); handle.unref?.(); timeoutHandles.add(handle); return handle; };

const paint = new Proxy({
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : (() => {}); }, set(target, key, value) { target[key] = value; return true; } });
window.HTMLCanvasElement.prototype.getContext = () => paint;
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
const $ = selector => window.document.querySelector(selector);
$('#scene').getBoundingClientRect = () => ({ x: 0, y: 0, width: 740, height: 520, left: 0, top: 0, right: 740, bottom: 520 });
window.HTMLElement.prototype.scrollIntoView = () => {};
await import('../dist/app.js');
const flush = () => new Promise(resolve => setImmediate(resolve));
const previewLayers = () => $('#scene').querySelectorAll('[data-winter-vibes]').length;
const pageLayers = () => [...window.document.body.children].filter(element => element.hasAttribute('data-winter-vibes')).length;

beforeEach(() => {
  if (!$('#page-off').hidden) $('#page-off').click();
  $('#reset').click();
  $('#tab-html').click();
  $('#snippet-dialog').close();
  copiedText = '';
  clipboardRejects = false;
});

after(async () => {
  window.dispatchEvent(new window.Event('pagehide'));
  window.document.body.replaceChildren();
  for (const handle of timeoutHandles) originalClearTimeout(handle);
  intervals.clear();
  await window.happyDOM.abort();
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});

test('the built demo mounts one live preview and both optional components without a browser', () => {
  assert.equal(previewLayers(), 1);
  assert.equal(frames.size, 1);
  assert.equal($('#scene').dataset.preset, 'hearth');
  assert.ok($('#new-year').shadowRoot.querySelector('[role=timer]'));
  assert.ok($('winter-postcard').shadowRoot.querySelector('summary'));
  assert.match($('#code-text').textContent, /WinterVibes\.createWinterVibes/);
  assert.match($('#timezone-label').textContent, /2027|января/);
});

test('presets, effect switches and snow density keep the live state and generated configuration together', () => {
  $('button[data-preset=northern]').click();
  assert.equal($('#scene').dataset.preset, 'northern');
  assert.equal($('button[data-preset=northern]').getAttribute('aria-pressed'), 'true');
  assert.equal($('button[data-preset=hearth]').getAttribute('aria-pressed'), 'false');
  assert.match($('#code-text').textContent, /preset: 'northern'/);
  for (const name of ['snow', 'lights', 'frost', 'stars']) {
    const checkbox = $('#'+name);
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.ok($('#code-text').textContent.includes(`"${name}":${checkbox.checked}`));
  }
  $('#density').value = '68';
  $('#density').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.match($('#density-value').textContent, /68/);
  assert.match($('#code-text').textContent, /density: 68/);
  assert.equal(previewLayers(), 1, 'settings must update the existing layer instead of adding another');
  assert.equal(frames.size, 1);
});

test('pause survives settings changes, off removes the layer, and re-enable/reset restore one preview', () => {
  $('#pause').click();
  assert.equal($('#pause').getAttribute('aria-pressed'), 'true');
  assert.equal(frames.size, 0);
  $('button[data-preset=sugarplum]').click();
  assert.equal(frames.size, 0, 'preset changes should respect the visitor’s pause');
  $('#off').click();
  assert.equal(previewLayers(), 0);
  assert.equal($('#pause').disabled, true);
  $('#off').click();
  assert.equal(previewLayers(), 1);
  assert.equal(frames.size, 0, 're-enabling should retain the paused state');
  $('#reset').click();
  assert.equal(previewLayers(), 1);
  assert.equal(frames.size, 1);
  assert.equal($('#pause').getAttribute('aria-pressed'), 'false');
  assert.equal($('#scene').dataset.preset, 'hearth');
  assert.equal($('#snow').checked, true);
});

test('page-wide preview has a working independent off control and global off removes both layers', () => {
  $('#expand').click();
  assert.equal(pageLayers(), 1);
  assert.equal(previewLayers(), 1);
  assert.equal($('#page-off').hidden, false);
  $('#page-off').click();
  assert.equal(pageLayers(), 0);
  assert.equal(previewLayers(), 1);
  assert.equal($('#page-off').hidden, true);
  $('#expand').click();
  $('#off').click();
  assert.equal(pageLayers(), 0);
  assert.equal(previewLayers(), 0);
  assert.equal(frames.size, 0);
  assert.equal($('#page-off').hidden, true);
});

test('format tabs support keyboard navigation and copy the selected working integration snippet', async () => {
  $('#tab-esm').click();
  assert.equal($('#tab-esm').getAttribute('aria-selected'), 'true');
  assert.equal($('#tab-html').tabIndex, -1);
  assert.equal($('#code-content').getAttribute('aria-labelledby'), 'tab-esm');
  assert.match($('#code-text').textContent, /import \{ createWinterVibes \}/);
  assert.doesNotMatch($('#code-text').textContent, /<script>/);
  $('#copy-code').click();
  await flush();
  assert.equal(copiedText, $('#code-text').textContent);
  $('#tab-esm').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal($('#tab-html').getAttribute('aria-selected'), 'true');
  assert.equal(window.document.activeElement, $('#tab-html'));
  assert.match($('#code-text').textContent, /<script src=/);
  const template = window.document.createElement('template');
  template.innerHTML = $('#code-text').textContent;
  assert.equal(template.content.querySelector('#winter-pause').getAttribute('type'), 'button');
  assert.equal(template.content.querySelector('#winter-off').getAttribute('type'), 'button');
  $('#tab-html').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal($('#tab-esm').getAttribute('aria-selected'), 'true');
});

test('extra component dialogs expose copyable component code and close cleanly', async () => {
  for (const component of ['countdown', 'postcard']) {
    $(`[data-snippet=${component}]`).click();
    assert.equal($('#snippet-dialog').open, true);
    assert.ok($('#extra-code').textContent.includes(`<winter-${component}`));
    assert.match($('#extra-code').textContent, /winter-vibes\.min\.js/);
    if (component === 'countdown') {
      const template = window.document.createElement('template');
      template.innerHTML = $('#extra-code').textContent;
      assert.equal(template.content.querySelector('winter-countdown').hasAttribute('target'), false,
        'the default snippet should use visitor-local New Year rather than hard-code the author’s timezone');
      assert.equal(template.content.querySelector('#timer-pause').getAttribute('type'), 'button',
        'an embedded pause button must not submit an integrating form');
    }
    $('#copy-extra').click();
    await flush();
    assert.equal(copiedText, $('#extra-code').textContent);
    $('#close-dialog').click();
    assert.equal($('#snippet-dialog').open, false);
  }
});

test('clipboard failures offer a visible fallback without breaking the preview', async () => {
  clipboardRejects = true;
  $('#copy-code').click();
  await flush();
  assert.equal(copiedText, '');
  assert.match($('#toast').textContent, /вручную/);
  assert.equal(previewLayers(), 1);
});

test('copy feedback remains visible to assistive technology inside the modal dialog', async () => {
  $('[data-snippet=countdown]').click();
  const status = $('#snippet-dialog #dialog-status[role=status]');
  assert.ok(status, 'modal copy feedback needs a live status within the modal, not only behind its backdrop');
  $('#copy-extra').click();
  await flush();
  assert.match(status.textContent, /скопирован/i);
  clipboardRejects = true;
  $('#copy-extra').click();
  await flush();
  assert.match(status.textContent, /вручную/i);
});

test('back-forward cache restore does not retain a stale page-wide preview control', () => {
  $('#expand').click();
  window.dispatchEvent(new window.Event('pagehide'));
  assert.equal(frames.size, 0);
  const event = new window.Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  window.dispatchEvent(event);
  assert.equal(previewLayers(), 1);
  assert.ok($('#page-off').hidden || pageLayers() === 1,
    'a visible page-wide off control must correspond to an actual restored page overlay');
  $('#expand').click();
  assert.equal(pageLayers(), $('#page-off').hidden ? 0 : 1,
    'the first expand click after restore should not interact with a destroyed controller');
});
