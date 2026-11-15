# xmas-new-year-vibes 🎄

JavaScript-библиотека зимних эффектов для любого сайта: снег, гирлянда, иней и звёзды. Работает поверх страницы или внутри отдельной карточки, без зависимости от фреймворка.

**Версия 0.1.0 · MIT · сезон 2026–2027.** Без аналитики, звука и сетевых запросов. Дополнительно доступны HTML-компоненты отсчёта до Нового года и открытки.

## Быстрый старт: обычный HTML

Версионированная ссылка через GitHub-тег `v0.1.0` на jsDelivr работает после публикации этого тега:

```html
<button id="winter-pause" type="button" aria-pressed="false">
  Приостановить эффекты
</button>
<button id="winter-off" type="button">Выключить эффекты</button>

<script src="https://cdn.jsdelivr.net/gh/MarkArtemyev/xmas-new-year-vibes@v0.1.0/dist/winter-vibes.min.js"></script>
<script>
  const winter = WinterVibes.createWinterVibes({
    preset: 'hearth',
    density: 35,
    respectReducedMotion: true
  });

  let paused = false;
  const pauseButton = document.querySelector('#winter-pause');
  const offButton = document.querySelector('#winter-off');

  pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (paused) winter.pause();
    else winter.resume();
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused
      ? 'Продолжить эффекты'
      : 'Приостановить эффекты';
  });

  offButton.addEventListener('click', () => {
    winter.destroy();
    pauseButton.disabled = true;
    offButton.disabled = true;
  });
</script>
```

Для самостоятельного размещения скопируйте `dist/winter-vibes.min.js` на свой сервер и замените `src`. При строгой CSP встроенный `<script>` примера вынесите в разрешённый файл или снабдите nonce.

## ESM и жизненный цикл SPA

```js
import {
  createWinterVibes,
  presets,
  version,
  registerWinterComponents
} from './dist/winter-vibes.js';

const winter = createWinterVibes({
  container: document.body,
  mode: 'overlay',
  preset: 'northern',
  effects: { snow: true, lights: false, frost: true, stars: true },
  density: 30,
  speed: 0.7,
  wind: -0.15
});

winter.update({ density: 15, effects: { lights: true } });
console.log(version, Object.keys(presets), winter.getState());

// В cleanup компонента или при уходе со страницы:
winter.destroy();
```

Создавайте экземпляр после появления контейнера в DOM. При размонтировании вызывайте `destroy()`: он удаляет созданный слой и освобождает обработчики и анимацию. Повторный вызов безопасен. Для нового монтирования создайте новый экземпляр.

## Настройки

`createWinterVibes(options = {})` экспортируется из ESM и доступен как `WinterVibes.createWinterVibes()` в classic-сборке.

| Поле | Значения и назначение |
| --- | --- |
| `container` | DOM-элемент или CSS-селектор; по умолчанию `document.body`. |
| `mode` | По умолчанию `'overlay'` — поверх области просмотра; `'contained'` — внутри контейнера. |
| `preset` | `'hearth'` по умолчанию, `'sugarplum'` или `'northern'`. |
| `effects` | Флаги `snow`, `lights`, `frost`, `stars`. По умолчанию снег и огни включены, иней и звёзды выключены. |
| `density` | От `0` до `100`, по умолчанию `35`; плотность декора. |
| `speed` | От `0.25` до `2`, по умолчанию `0.65`; множитель скорости. |
| `wind` | От `-1` до `1`, по умолчанию `0.12`; направление и сила сноса снега. |
| `respectReducedMotion` | По умолчанию `true`; учитывать уменьшение движения в системе. |
| `maxFps` | От `1` до `60`, по умолчанию `30`; верхняя граница частоты анимации. |
| `zIndex` | По умолчанию `20`; уровень слоя в контексте наложения страницы. |
| `nonce` | Nonce для создаваемого библиотекой `<style>` при Content Security Policy. |

Палитры: `hearth` — тёплый свет и классические зимние акценты; `sugarplum` — конфетная праздничная палитра; `northern` — прохладная северная ночь. Экспортируемый `presets` содержит неизменяемые объекты палитр, а не наборы options. Выбор палитры не меняет флаги эффектов.

| Метод | Действие |
| --- | --- |
| `update(partialOptions)` | Меняет настройки; вложенные флаги `effects` объединяются с текущими. Числовые значения ограничиваются допустимым диапазоном. |
| `pause()` | Приостанавливает движение. |
| `resume()` | Возобновляет движение с учётом видимости страницы и reduced motion. |
| `destroy()` | Удаляет эффекты этого экземпляра и освобождает ресурсы. |
| `getState()` | Возвращает сериализуемый снимок состояния. |

`container` и `mode` задаются при создании: их изменение через `update()` вызывает ошибку. После `destroy()` методы `update()`, `pause()` и `resume()` ничего не делают. `getState()` содержит `preset`, `effects`, `density`, `speed`, `wind`, `paused`, `reducedMotion`, `running`, `destroyed`, `particleCount`, `mode`.

## Два независимых контейнера

Задайте контейнеру размеры. Лучше сразу указать `position: relative`: библиотека также может установить его для статически позиционированного контейнера и восстановит своё изменение при `destroy()`.

```html
<section id="warm-card" style="position:relative; min-height:240px">
  <h2>Тёплый вечер</h2>
</section>
<section id="night-card" style="position:relative; min-height:240px">
  <h2>Северная ночь</h2>
</section>

<script type="module">
  import { createWinterVibes } from './dist/winter-vibes.js';

  const warm = createWinterVibes({
    container: document.querySelector('#warm-card'),
    mode: 'contained', preset: 'hearth', density: 20
  });
  const night = createWinterVibes({
    container: document.querySelector('#night-card'),
    mode: 'contained', preset: 'northern', density: 45
  });

  // Управление одним экземпляром не затрагивает другой.
  warm.pause();
  // При удалении карточек: warm.destroy(); night.destroy();
</script>
```

## Custom element

Загрузка библиотеки автоматически регистрирует `<winter-vibes>`. По умолчанию он создаёт слой на весь viewport; с `contained` — внутри родительского элемента.

```html
<script type="module" src="./dist/winter-vibes.js"></script>

<section style="position:relative; min-height:280px">
  <h2>Немного зимы</h2>
  <winter-vibes
    contained
    preset="sugarplum"
    snow="true"
    lights="true"
    frost="false"
    stars="true"
    density="25"
    speed="0.6"
    wind="0.1"
    motion="auto"
  ></winter-vibes>
</section>
```

Атрибуты `snow`, `lights`, `frost`, `stars` принимают строку `"false"` для отключения; без атрибутов включены снег и огни. `motion="auto"` учитывает reduced motion, `motion="off"` отключает движение. Изменение атрибутов обновляет эффект; удаление элемента освобождает ресурсы. Для отключения `contained` удалите этот атрибут.

## Отсчёт и открытка

Эти два компонента доступны после загрузки той же сборки. Они не являются опциями `createWinterVibes()` и не требуют включения снега.

Отсчёт без `target` считает до **1 января 2027 года, 00:00 в локальном часовом поясе посетителя**:

```html
<winter-countdown label="До Нового года"></winter-countdown>
```

Для одного общего момента укажите ISO-время с явным смещением; например, полночь UTC+04:00:

```html
<winter-countdown
  target="2027-01-01T00:00:00+04:00"
  label="До полуночи UTC+04:00"
></winter-countdown>
```

`label` необязателен. Булев атрибут `paused` приостанавливает обновление: добавьте его для паузы и удалите для продолжения. Как у других булевых HTML-атрибутов, `paused="false"` всё равно означает паузу.

Открытка раскрывается нативным `details`/`summary`, доступна с клавиатуры и не воспроизводит звук:

```html
<winter-postcard
  title="Тебе, в эту зиму"
  message="Пусть рядом будут любимые люди, тёплый чай и время для себя."
  signature="С теплом, Марк"
></winter-postcard>
```

Сборка автоматически регистрирует все три элемента. Для явной регистрации двух дополнительных компонентов также экспортируется `registerWinterComponents(registry?)`; без аргумента используется текущий `customElements`. `<winter-vibes>` регистрируется модулем эффектов. Тексты, композиция страницы и объединяющие элементы управления в демо остаются кодом самого демо.

## Доступность, производительность и CSP

- Декоративный слой не перехватывает клики и прокрутку, не добавляет остановок Tab и скрыт от скринридеров. Выбирайте умеренную плотность и подходящий `zIndex`, чтобы декор не мешал читать сайт.
- По умолчанию учитывается `prefers-reduced-motion`, включая изменение настройки во время работы. Для постоянного движения добавьте заметную кнопку паузы или отключения, как в примере выше.
- Анимация останавливается в скрытой вкладке. Для слабых устройств уменьшайте `density` и `maxFps`.
- Shadow DOM изолирует собственные стили эффектов. В `contained`-режиме контейнеру может понадобиться `position: relative`.
- Для CSP передайте `nonce` в `createWinterVibes({ nonce: serverNonce })`. Сервер должен разрешить его в `style-src`; JavaScript отдельно разрешается в `script-src`. Для строгой политики предпочтительно самостоятельно размещать сборку. Nonce генерируется сервером для ответа и не хранится постоянной строкой в исходниках.
- `nonce` core относится к слою эффектов. Встроенные стили `<winter-countdown>` и `<winter-postcard>` сейчас требуют разрешения inline-стилей или соответствующих хешей в CSP; nonce core на них не распространяется.
- После загрузки сборки библиотека не загружает ресурсы, не отправляет запросы, не воспроизводит звук и не собирает аналитику. CDN-подключение делает обычный запрос к выбранному CDN.

Источники визуального направления, технические основания и сценарии проверки: [docs/research.md](docs/research.md).

## Локальная разработка

```sh
npm install
npm run build
npm test
npm run dev
```

`npm run dev` запускает локальное демо; адрес выводится в терминале. `npm run build` создаёт:

- `dist/winter-vibes.js` — ESM;
- `dist/winter-vibes.min.js` — classic/IIFE, глобальный объект `WinterVibes`;
- `dist/winter-vibes.d.ts` — TypeScript declarations.

Публикация в npm не требуется: используйте файлы `dist` локально или ссылку на версионированный GitHub-тег. Наличие репозитория не означает, что пакет опубликован в npm.

## Лицензия

[MIT](LICENSE).
