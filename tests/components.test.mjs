import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { registerWinterComponents } from '../src/extras.js';

const window = new Window({ url: 'https://winter.test/' });
globalThis.HTMLElement = window.HTMLElement;
globalThis.customElements = window.customElements;
const realNow = Date.now;
const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;
let now = Date.parse('2026-12-31T23:59:00Z');
let hidden = false;
let nextTimer = 1;
const timers = new Map();
Date.now = () => now;
globalThis.setInterval = (callback) => { const id = nextTimer++; timers.set(id, callback); return id; };
globalThis.clearInterval = (id) => timers.delete(id);
Object.defineProperty(window.document, 'hidden', { configurable: true, get: () => hidden });
registerWinterComponents(window.customElements);

function countdown(target) {
  const element = window.document.createElement('winter-countdown');
  if (target !== undefined) element.setAttribute('target', target);
  window.document.body.append(element);
  return element;
}

beforeEach(() => {
  window.document.body.replaceChildren();
  timers.clear();
  hidden = false;
  now = Date.parse('2026-12-31T23:59:00Z');
});

after(async () => {
  window.document.body.replaceChildren();
  Date.now = realNow;
  globalThis.setInterval = realSetInterval;
  globalThis.clearInterval = realClearInterval;
  delete globalThis.HTMLElement;
  delete globalThis.customElements;
  await window.happyDOM.abort();
});

test('component registration is repeatable and leaves the existing definitions intact', () => {
  const original = window.customElements.get('winter-countdown');
  assert.doesNotThrow(() => registerWinterComponents(window.customElements));
  assert.equal(window.customElements.get('winter-countdown'), original);
  assert.doesNotThrow(() => registerWinterComponents(null));
});

test('countdown uses the target instant and catches up after the tab was hidden', () => {
  const element = countdown('2027-01-01T04:00:00+04:00');
  const timer = element.shadowRoot.querySelector('[role=timer]');
  assert.equal(element.dataset.phase, 'future');
  assert.deepEqual([...timer.querySelectorAll('b')].map(el => el.textContent), ['00', '00', '01', '00']);
  assert.equal(timer.getAttribute('aria-live'), 'off');
  assert.equal(timers.size, 1);

  hidden = true;
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(timers.size, 0, 'hidden tabs must not keep updating the timer');
  now += 120_000;
  hidden = false;
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(element.dataset.phase, 'reached');
  assert.match(timer.textContent, /С новым годом/);
  assert.equal(timers.size, 0, 'a completed countdown needs no polling timer');
  assert.ok(!timer.hasAttribute('aria-label') || /С новым годом/.test(timer.getAttribute('aria-label')),
    'assistive technology must not receive the previous remaining time after completion');
  assert.match(element.shadowRoot.querySelector('[role=status]').textContent, /С новым годом/);
});

test('invalid countdown dates render a safe error without retaining the previous accessible value', () => {
  const element = countdown('2027-01-01T00:00:00Z');
  const timer = element.shadowRoot.querySelector('[role=timer]');
  assert.equal(element.dataset.phase, 'future');
  element.setAttribute('target', 'not-a-date');
  assert.equal(element.dataset.phase, 'invalid');
  assert.match(timer.textContent, /корректную дату/);
  assert.equal(timers.size, 0);
  assert.ok(!timer.hasAttribute('aria-label') || /дат/.test(timer.getAttribute('aria-label')),
    'an invalid target must not expose a stale countdown label');
});

test('pausing freezes the displayed countdown and disconnecting releases its timer', () => {
  const element = countdown('2027-01-01T00:00:00Z');
  const timer = element.shadowRoot.querySelector('[role=timer]');
  const initialText = timer.textContent;
  element.setAttribute('paused', '');
  now += 30_000;
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(timer.textContent, initialText);
  assert.equal(timers.size, 0);
  element.removeAttribute('paused');
  assert.notEqual(timer.textContent, initialText);
  assert.equal(timers.size, 1);
  element.remove();
  assert.equal(timers.size, 0);
  window.document.dispatchEvent(new window.Event('visibilitychange'));
  assert.equal(timers.size, 0, 'disconnected elements must remove visibility listeners');
});

test('default target is local midnight on 1 January 2027 and past targets stop at zero', () => {
  now = new Date(2026, 11, 31, 23, 59, 0).getTime();
  const element = countdown();
  assert.equal(element.dataset.phase, 'future');
  assert.deepEqual([...element.shadowRoot.querySelectorAll('b')].map(el => el.textContent), ['00', '00', '01', '00']);
  element.setAttribute('target', '2020-01-01T00:00:00Z');
  assert.equal(element.dataset.phase, 'reached');
  assert.equal(timers.size, 0);
});

test('postcard treats attribute content as text and preserves its open state during updates', () => {
  const element = window.document.createElement('winter-postcard');
  const payload = '<img src=x onerror="globalThis.pwned=true">';
  element.setAttribute('title', payload);
  element.setAttribute('message', payload);
  element.setAttribute('signature', payload);
  window.document.body.append(element);
  assert.equal(element.shadowRoot.querySelectorAll('img, script').length, 0);
  assert.equal(element.shadowRoot.querySelector('.title').textContent, payload);
  assert.equal(element.shadowRoot.querySelector('.message').textContent, payload);
  const details = element.shadowRoot.querySelector('details');
  assert.ok(details.querySelector('summary'), 'the native details disclosure remains keyboard accessible');
  details.open = true;
  element.setAttribute('message', 'Тёплая зима');
  assert.equal(element.shadowRoot.querySelector('details').open, true);
  assert.equal(element.shadowRoot.querySelector('.message').textContent, 'Тёплая зима');
});
