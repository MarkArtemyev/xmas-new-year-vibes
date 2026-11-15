import { createWinterVibes, version } from './winter-vibes.js';

const $=(selector)=>document.querySelector(selector);
const scene=$('#scene');
const initial={preset:'hearth',effects:{snow:true,lights:true,frost:false,stars:false},density:35,speed:0.65,wind:0.12};
let settings=structuredClone(initial);
let winter=null;
let pageWinter=null;
let restorePageOverlay=false;
let paused=false;
let off=false;
let format='html';
let toastTimer;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const poems={hearth:'Пусть мир немного подождёт.',northern:'Тише снега. Ближе к звёздам.',sugarplum:'Самое тёплое — в мелочах.'};
const cdn='https://cdn.jsdelivr.net/gh/MarkArtemyev/xmas-new-year-vibes@v'+version+'/dist/';

function announce(message){
 if($('#snippet-dialog').open){$('#dialog-status').textContent=message;return;}
 const toast=$('#toast');toast.textContent=message;toast.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3200);
}
function mount(){
 winter=createWinterVibes({...settings,container:scene,mode:'contained'});
 if(paused)winter.pause();
}
function update(){
 if(winter)winter.update(settings);
 if(pageWinter)pageWinter.update(settings);
 scene.dataset.preset=settings.preset;
 $('#scene-poem').textContent=poems[settings.preset];
 for(const button of document.querySelectorAll('button[data-preset]')){
  const selected=button.dataset.preset===settings.preset;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
 }
 for(const name of ['snow','lights','frost','stars'])$('#'+name).checked=settings.effects[name];
 $('#density').value=String(settings.density);$('#density-value').textContent=settings.density+'%';
 $('#motion-status').textContent=off?'Украшения выключены':paused?'Тихий режим · на паузе':reducedMotion.matches?'Статично · бережём движение':'Движение включено';
 $('#pause').disabled=off;
 $('#pause').setAttribute('aria-pressed',String(paused));
 $('#pause').innerHTML=paused?'<span aria-hidden="true">▷</span> Продолжить':'<span aria-hidden="true">Ⅱ</span> Пауза';
 $('#off').setAttribute('aria-pressed',String(off));$('#off').textContent=off?'Включить':'Выключить';
 renderCode();
}
function configuration(){
 return `  preset: '${settings.preset}',\n  density: ${settings.density},\n  speed: ${settings.speed},\n  effects: ${JSON.stringify(settings.effects)},\n  respectReducedMotion: true`;
}
const controls=`<button type="button" id="winter-pause" aria-pressed="false">Пауза</button>\n<button type="button" id="winter-off">Выключить</button>`;
const actions=`let paused = false;\ndocument.querySelector('#winter-pause').onclick = (event) => {\n  paused = !paused;\n  winter[paused ? 'pause' : 'resume']();\n  event.currentTarget.setAttribute('aria-pressed', paused);\n  event.currentTarget.textContent = paused ? 'Продолжить' : 'Пауза';\n};\ndocument.querySelector('#winter-off').onclick = () => {\n  winter.destroy();\n  document.querySelector('#winter-pause').disabled = true;\n};`;
function snippet(){
 if(format==='html')return `${controls}\n\n<script src="${cdn}winter-vibes.min.js"></script>\n<script>\nconst winter = WinterVibes.createWinterVibes({\n${configuration()}\n});\n${actions}\n</script>`;
 return `// Добавь кнопки #winter-pause и #winter-off в HTML.\nimport { createWinterVibes } from\n  '${cdn}winter-vibes.js';\n\nconst winter = createWinterVibes({\n${configuration()}\n});\n\n${actions}\n\n// При размонтировании страницы/компонента:\n// winter.destroy();`;
}
function renderCode(){$('#code-text').textContent=snippet();}
async function copy(text){
 try{await navigator.clipboard.writeText(text);announce('Скопировано. Теперь чуть теплее и у тебя.');return true;}
 catch{
  announce('Автокопирование недоступно — выдели код и скопируй вручную.');return false;
 }
}
for(const button of document.querySelectorAll('button[data-preset]'))button.addEventListener('click',()=>{settings.preset=button.dataset.preset;update();});
for(const name of ['snow','lights','frost','stars'])$('#'+name).addEventListener('change',event=>{settings.effects[name]=event.target.checked;update();});
$('#density').addEventListener('input',event=>{settings.density=Number(event.target.value);update();});
$('#pause').addEventListener('click',()=>{
 paused=!paused;for(const instance of [winter,pageWinter])instance?.[paused?'pause':'resume']();update();
});
$('#off').addEventListener('click',()=>{
 off=!off;if(off){winter?.destroy();winter=null;pageWinter?.destroy();pageWinter=null;$('#page-off').hidden=true;}else mount();update();
});
$('#reset').addEventListener('click',()=>{
 settings=structuredClone(initial);paused=false;off=false;winter?.destroy();mount();pageWinter?.resume();update();announce('Снова тихий вечер у камина.');
});
$('#expand').addEventListener('click',()=>{
 if(pageWinter){pageWinter.destroy();pageWinter=null;$('#page-off').hidden=true;announce('Зима вернулась в окошко.');return;}
 off=false;if(!winter)mount();
 pageWinter=createWinterVibes({...settings,zIndex:50});if(paused)pageWinter.pause();$('#page-off').hidden=false;update();announce('Примерь к странице. Кнопка выключения — внизу справа.');
});
$('#page-off').addEventListener('click',()=>{pageWinter?.destroy();pageWinter=null;$('#page-off').hidden=true;});
$('#copy-code').addEventListener('click',()=>copy(snippet()));
$('#copy-kit').addEventListener('click',()=>{
 $('#connect').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'center'});copy(snippet());
});
const tabs=[...document.querySelectorAll('[role=tab]')];
function selectTab(tab){
 format=tab.dataset.format;for(const element of tabs){const chosen=tab===element;element.setAttribute('aria-selected',String(chosen));element.tabIndex=chosen?0:-1;}
 $('#code-content').setAttribute('aria-labelledby',tab.id);renderCode();
}
tabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>selectTab(tab));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const next=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];selectTab(next);next.focus();
 });
});
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
$('#timezone-label').textContent='1 января · твой часовой пояс: '+zone;
$('#countdown-pause').addEventListener('click',event=>{
 const timer=$('#new-year');const next=!timer.hasAttribute('paused');timer.toggleAttribute('paused',next);event.currentTarget.setAttribute('aria-pressed',String(next));event.currentTarget.textContent=next?'Продолжить':'Пауза';
});
const dialog=$('#snippet-dialog');
let extraSnippet='';
for(const button of document.querySelectorAll('[data-snippet]'))button.addEventListener('click',()=>{
 const component=button.dataset.snippet==='countdown'?'<winter-countdown label="До 2027 года">\n</winter-countdown>\n<!-- Полночь по местному времени посетителя -->\n<button type="button" id="timer-pause" aria-pressed="false">Пауза</button>\n<script>\ndocument.querySelector("#timer-pause").onclick = (event) => {\n  const paused = document.querySelector("winter-countdown").toggleAttribute("paused");\n  event.currentTarget.setAttribute("aria-pressed", paused);\n  event.currentTarget.textContent = paused ? "Продолжить" : "Пауза";\n};\n</script>':'<winter-postcard\n  title="Для тебя, с теплом"\n  message="Пусть будет время на маленькие радости."\n  signature="Обнимаю ♡">\n</winter-postcard>';
 extraSnippet=`<script src="${cdn}winter-vibes.min.js"></script>\n\n${component}`;
 $('#extra-code').textContent=extraSnippet;$('#dialog-status').textContent='';dialog.showModal();
});
$('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
$('#copy-extra').addEventListener('click',()=>copy(extraSnippet));
reducedMotion.addEventListener('change',update);
mount();update();
window.addEventListener('pagehide',()=>{
 restorePageOverlay=!!pageWinter;
 winter?.destroy();pageWinter?.destroy();winter=null;pageWinter=null;
});
// Restoring from the browser back/forward cache must restore the actual layer too.
window.addEventListener('pageshow',event=>{
 if(event.persisted&&!off){
  mount();
  if(restorePageOverlay){pageWinter=createWinterVibes({...settings,zIndex:50});if(paused)pageWinter.pause();}
  $('#page-off').hidden=!pageWinter;
  update();
 }
});
