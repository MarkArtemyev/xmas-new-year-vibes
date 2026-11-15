# Источники и решения

Проверено **15 ноября 2026 года**. Проект рассчитан на праздничный сезон **2026–2027**. Наблюдения из источников и наши проектные решения разделены: это не утверждение о доказанных трендах 2027 года.

## Визуальное направление

| Источник | Что он действительно поддерживает | Наше решение |
| --- | --- | --- |
| [Adobe Express: Design trends for 2026](https://www.adobe.com/express/learn/blog/design-trends-2026), 12.12.2025 | Прогноз выделяет чувственные фактуры, органичные несовершенства, игру и тёплый персональный визуальный язык. Это общий дизайн-прогноз, не исследование зимнего интерфейса. | Тёплые огни, мягкий снег и немного рукотворного характера вместо резкого мерцания и тяжёлых эффектов. |
| [Canva: Design trends 2026](https://www.canva.com/newsroom/news/design-trends-2026/) | Texture Check, Explorecore и Opt-Out Era выделяют тактильность, спокойное исследование, serif-шрифты и простые композиции. Это прогноз Canva, а не универсальная оценка дизайна. | Матовая бумага, небольшая иллюстрация и свободная композиция без навязчивой анимации. |
| [Pinterest Palette 2026](https://newsroom.pinterest.com/news/from-cool-blue-to-persimmon-meet-the-2026-pinterest-palette/), 14.01.2026 | Cool Blue, Jade и Plum Noir входят в официальную палитру прогнозируемых цветов 2026. | Три авторские палитры `hearth`, `sugarplum`, `northern`: янтарь с еловым, ягодный вечер и ледяной голубой. Это наша интерпретация, а не воспроизведение точных цветовых значений Pinterest. |
| [Pinterest Predicts 2026](https://newsroom.pinterest.com/en-SG/news/pinterest-predicts-nonconformity-self-preservation-and-escapism-drive-21-trends-for-2026/), 09.12.2025 | Прогноз связывает эмоциональный комфорт с ностальгией, личными ритуалами и самостоятельным выбором эстетики. | Спокойная атмосфера и индивидуальная настройка; кнопка выключения остаётся частью хорошей интеграции. |
| [Pinterest: Holiday Shopping Made Easy](https://newsroom.pinterest.com/news/2026-global-holiday-comms-plan-newsroom/), 12.11.2026 | Сезонные поисковые наблюдения описывают интерес к личным, игровым и сделанным своими руками праздничным деталям. Они относятся к аудитории Pinterest и не измеряют эффективность веб-анимации. | Дополнительные компоненты открытки и новогоднего отсчёта; основной декор остаётся независимым от них. |

Палитры и композиция — авторская интерпретация этих сигналов. Исходные иллюстрации, шаблоны и изображения Adobe, Canva и Pinterest в библиотеку не копируются. Более тёплая или игровая эстетика не отменяет читаемость и управление движением.

## Основа браузерного поведения

**Анимация.** `requestAnimationFrame()` синхронизируется с отрисовкой, является одноразовым запросом и обычно приостанавливается в фоновых вкладках. Прогресс следует считать по timestamp, иначе скорость зависит от частоты экрана. Наше решение: ограничение FPS, один цикл на экземпляр, сброс времени после паузы и отсутствие «догоняющей» симуляции. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

**Видимость.** `document.visibilityState` и `visibilitychange` дают состояние страницы; `blur` не является надёжной заменой. Наше решение: явно останавливать декоративную работу в скрытой вкладке и пересчитывать размеры при возвращении. RAF и visibility API имеют статус Baseline Widely available с 2015 года. [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [visibilityState](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).

**Canvas.** MDN рекомендует избегать лишней работы на кадре и учитывать размер backing store при высоком DPR. Наше решение: ограничивать плотность и разрешение canvas, не создавать отдельный DOM-узел на снежинку и не менять геометрию страницы на каждом кадре. Отсутствие canvas-контекста не должно ломать статический декор или сайт. [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), [getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext).

**Уменьшение движения.** `prefers-reduced-motion: reduce` означает запрос на сокращение необязательной анимации; media query имеет статус Widely available с января 2020 года. Изменение предпочтения можно отслеживать через `MediaQueryList` `change`. Наше решение: учитывать настройку по умолчанию, реагировать без перезагрузки и сохранять статическую праздничную атмосферу. Экспериментальный Preferences API для этого не требуется. [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [MediaQueryList change](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event), [W3C: Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion).

**Пауза и вспышки.** Автоматическое длительное движение рядом с основным содержимым требует механизма паузы, остановки или скрытия; reduced motion не заменяет эту возможность. Наше решение: документировать доступные кнопки паузы/выключения, избегать стробоскопических вспышек и сохранять текст страницы читаемым. [W3C: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html).

**Взаимодействие.** `pointer-events: none` пропускает указатель, но само по себе не исключает клавиатурный фокус. Наше решение: декоративное дерево без ссылок, кнопок и `tabindex`, скрытое от accessibility tree; настоящие управляющие кнопки расположены отдельно. [MDN: pointer-events](https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events).

**Изоляция.** Обычные autonomous custom elements и `attachShadow()` широко доступны с 2020 года; отдельные новые опции имеют иной уровень поддержки. Safari не поддерживает customized built-ins. Наше решение: автономные компоненты, стандартный Shadow DOM и публичный JS API без зависимости от новых scoped registries. [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements), [Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM), [attachShadow](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow).

**Позиционирование.** CSS anchor positioning уже получил статус Newly available в 2026 году, но отдельные свойства и детали поведения поддерживаются с разного времени. Наше решение: обычное позиционирование слоя; CSS anchor не является обязательной зависимостью. Для будущей привязки к произвольному элементу нужны отдельные `CSS.supports()` проверки и рабочий fallback. [MDN: anchor-name](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name), [position-anchor](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-anchor), [position-try-fallbacks](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-try-fallbacks), [CSS.supports](https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports_static).

Baseline описывает поддержку в основных браузерах, а не гарантирует работу в старых WebView или отсутствие ошибок конкретного движка. [MDN: Baseline](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility).

## Границы API и демо

`createWinterVibes()` управляет четырьмя эффектами: `snow`, `lights`, `frost`, `stars`. В нём нет таймера или текста открытки. Дополнительные `<winter-countdown>` и `<winter-postcard>` подключаются отдельно в разметке. Демо объединяет их с оформлением страницы и собственными текстами.

Полночь отсчёта по умолчанию — 1 января 2027 года в локальном часовом поясе посетителя, а не единый всемирный момент. Для общего момента используйте `target` с явным смещением. Остаток следует вычислять от текущего времени, а не уменьшать счётчик на единицу: после возврата из фоновой вкладки он должен быть актуальным. Постоянные объявления секунд скринридером не нужны: `role="timer"` имеет неактивный live region по умолчанию. [MDN: timer role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/timer_role).

Открытка использует нативные `details`/`summary`, чтобы открываться с клавиатуры без самодельной модели фокуса; звука нет. [MDN: details](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details).

В библиотеке нет аналитики, загрузки удалённых изображений и фоновых сетевых запросов. Самостоятельное размещение сборки исключает обращение к CDN. Для core предусмотрен `nonce` создаваемого `<style>`; встроенные стили дополнительных компонентов требуют отдельного разрешения CSP на inline-стили или соответствующих хешей. Nonce core на них не распространяется.

## Сценарии проверки

Это критерии проверки, а не заявление, что каждый из них уже проверен во всех браузерах. Фактические результаты дают тесты проекта и ручная проверка демо.

| Сценарий | Ожидаемый результат |
| --- | --- |
| Два `contained`-экземпляра | Разные палитры и настройки; `pause`/`destroy` одного не затрагивает второй. |
| Повторные `update`, `pause`, `resume` | Не возникают дополнительные циклы анимации или дубли обработчиков. |
| Повторный `destroy` и размонтирование SPA | Нет ошибки, созданного слоя и дальнейшей работы; чужие DOM-узлы не удалены. |
| Контейнер изначально со своим `position` | Исходное позиционирование сохраняется; собственное изменение библиотеки корректно убирается при очистке. |
| Reduced motion до загрузки и во время работы | Необязательное движение выключается без перезагрузки; настройки остаются управляемыми. |
| Скрытая вкладка и возврат через минуту | Нет фоновой декоративной работы, скачка снега и «догоняющих» кадров. |
| Экран 60/120/144 Гц | Скорость не зависит от числа кадров; соблюдается верхняя граница FPS. |
| Узкий viewport, zoom и высокий DPR | Нет горизонтального скролла, чрезмерного canvas и утраты управления страницей. |
| Клики, touch, прокрутка и Tab под эффектами | Сайт остаётся интерактивным; декор не попадает в порядок фокуса. |
| Canvas-контекст недоступен | Ошибка не ломает сайт и доступные статические эффекты. |
| Атрибуты custom element меняются, элемент удаляется | Параметры обновляются; удаление освобождает ресурсы; `"false"` отключает эффект. |
| Countdown: момент до/на/после полуночи 2027 | Нет отрицательного остатка; после background-паузы отображается актуальное время. |
| Postcard: клавиатурное открытие и повторное закрытие | Нативное управление работает; нет звука и перехвата фокуса. |
| CSP с разрешённым nonce для core | Стиль core разрешён без ослабления общей политики до `unsafe-inline`. |

Для итоговой проверки нужны современные Chromium, Firefox и WebKit, а также ручная оценка reduced motion и клавиатуры. Синтетический тест не доказывает плавность на любом телефоне.
