/** Optional accessible seasonal components; no network or audio. */
export function registerWinterComponents(registry = typeof customElements !== 'undefined' ? customElements : null) {
  if (!registry || typeof HTMLElement === 'undefined') return;

  if (!registry.get('winter-countdown')) {
    class WinterCountdown extends HTMLElement {
      static observedAttributes = ['target','label','paused'];
      constructor() {
        super();
        this._root=this.attachShadow({mode:'open'});
        this._timer=null;
        this._announced=false;
        this._visibility=()=>this._schedule();
      }
      connectedCallback() {
        if(!this._root.firstChild) this._render();
        this.ownerDocument.addEventListener('visibilitychange',this._visibility);
        this._schedule();
      }
      disconnectedCallback() {
        clearInterval(this._timer);this._timer=null;
        this.ownerDocument.removeEventListener('visibilitychange',this._visibility);
      }
      attributeChangedCallback(name) {
        if(name==='target')this._announced=false;
        if(this.isConnected&&this._root.firstChild)this._schedule();
      }
      _render() {
        this._root.innerHTML=`<style>
          :host{display:block;color:var(--winter-text,#f9edd8);font-family:inherit}
          *{box-sizing:border-box}.label{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.65;margin:0 0 18px}
          .digits{display:flex;gap:clamp(12px,3vw,30px);font-variant-numeric:tabular-nums}.unit{min-width:36px}
          b{font:400 clamp(30px,5vw,47px)/1 Georgia,serif;display:block}small{display:block;font-size:10px;opacity:.6;margin-top:9px}
          .finish{font:italic 29px/1.2 Georgia,serif}.error{font:14px/1.5 system-ui}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
        </style><p class="label"></p><div class="digits" role="timer" aria-live="off"></div><span class="sr" role="status" aria-live="polite"></span>`;
        this._label=this._root.querySelector('.label');
        this._digits=this._root.querySelector('.digits');
        this._status=this._root.querySelector('[role=status]');
      }
      _target() {
        const value=this.getAttribute('target');
        return value===null?new Date(2027,0,1).getTime():Date.parse(value);
      }
      _schedule() {
        clearInterval(this._timer);this._timer=null;
        // paused freezes the displayed value, including during visibility changes.
        if(!this.hasAttribute('paused')||!this._digits?.childNodes.length)this._tick();
        if(!this.hasAttribute('paused')&&!this.ownerDocument.hidden&&this.dataset.phase==='future')this._timer=setInterval(()=>this._tick(),1000);
      }
      _tick() {
        const target=this._target();
        this._label.textContent=this.getAttribute('label')||'До нового года';
        if(!Number.isFinite(target)) {
          this.dataset.phase='invalid';this._digits.textContent='Укажите корректную дату';
          this._digits.removeAttribute('aria-label');
          this._digits.className='error';clearInterval(this._timer);this._timer=null;return;
        }
        const seconds=Math.max(0,Math.ceil((target-Date.now())/1000));
        if(seconds===0) {
          this.dataset.phase='reached';this._digits.className='finish';this._digits.textContent='С новым годом ✨';
          this._digits.removeAttribute('aria-label');
          if(!this._announced){this._status.textContent='С новым годом!';this._announced=true;}
          clearInterval(this._timer);this._timer=null;return;
        }
        this.dataset.phase='future';this._digits.className='digits';
        const units=[Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];
        const labels=['дней','часов','минут','секунд'];
        this._digits.replaceChildren(...units.map((number,i)=>{
          const unit=this.ownerDocument.createElement('span');unit.className='unit';
          const b=this.ownerDocument.createElement('b');b.textContent=String(number).padStart(2,'0');
          const small=this.ownerDocument.createElement('small');small.textContent=labels[i];
          unit.append(b,small);return unit;
        }));
        this._digits.setAttribute('aria-label',units.map((n,i)=>n+' '+labels[i]).join(', '));
      }
    }
    registry.define('winter-countdown',WinterCountdown);
  }

  if (!registry.get('winter-postcard')) {
    class WinterPostcard extends HTMLElement {
      static observedAttributes=['title','message','signature'];
      constructor(){super();this.attachShadow({mode:'open'});}
      connectedCallback(){this._render();}
      attributeChangedCallback(){if(this.isConnected)this._render();}
      _render(){
        const wasOpen=!!this.shadowRoot.querySelector('details[open]');
        this.shadowRoot.innerHTML=`<style>
          :host{display:block;color:var(--winter-card-ink,#573f3d);font-family:inherit}*{box-sizing:border-box}
          details{background:var(--winter-card-paper,#f6e9d6);border:1px solid #785c3a26;border-radius:3px;box-shadow:0 10px 24px #22190e0a}
          summary{cursor:pointer;list-style:none;min-height:94px;padding:25px 26px;display:flex;gap:18px;align-items:center}
          summary::-webkit-details-marker{display:none}summary:focus-visible{outline:3px solid #b36b40;outline-offset:4px}
          .star{font-size:28px;color:#bc7745}.title{font:italic 25px Georgia,serif;flex:1}.arrow{font:22px system-ui}
          details[open] .arrow{transform:rotate(45deg)}.inside{padding:0 28px 26px;border-top:1px dashed #785c3a30}
          .message{font:19px/1.65 Georgia,serif;white-space:pre-wrap;margin:20px 0}.signature{font-size:12px;opacity:.65}
        </style><details><summary><span class="star" aria-hidden="true">✳</span><span class="title"></span><span class="arrow" aria-hidden="true">↗</span></summary><div class="inside"><p class="message"></p><span class="signature"></span></div></details>`;
        const details=this.shadowRoot.querySelector('details');details.open=wasOpen;
        this.shadowRoot.querySelector('.title').textContent=this.getAttribute('title')||'Для тебя, с теплом';
        this.shadowRoot.querySelector('.message').textContent=this.getAttribute('message')||'Пусть будет время на маленькие радости. На любимых людей. И на ещё одну чашку чая.';
        this.shadowRoot.querySelector('.signature').textContent=this.getAttribute('signature')||'Зима 2026–2027';
      }
    }
    registry.define('winter-postcard',WinterPostcard);
  }
}
