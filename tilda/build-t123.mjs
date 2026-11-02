import {gzipSync} from 'node:zlib';
import {writeFile} from 'node:fs/promises';
import {page} from '../site/build.mjs';

// node tilda/build-t123.mjs #rec123456789 подставляет ID штатной формы в готовый код.
const nativeForm = process.argv[2] || '';
if (nativeForm && !/^#rec[0-9]+$/.test(nativeForm)) throw Error('ID формы задаётся в виде #rec123456789');

// Keep the Tilda snippet small. The editable page is in ../site/.
const embedHead = `<script>try{window.nepamHost=parent.location}catch{}<\/script>
<style>body{display:flow-root}html{overflow:hidden}</style>`;
const embed = `<script>
const originalForm = document.querySelector('#leadForm');
const card = document.createElement('div');
card.className = 'tildaPilot';
card.innerHTML = '<h3>Заявка на пилот</h3><p>Оставьте контакты, чтобы обсудить с командой NEPAM сценарий: <b></b>.</p><button class="button" type="button">Перейти к заявке <b aria-hidden="true">↗</b></button>';
originalForm.replaceWith(card);
const cardScenario = card.querySelector('p b');
const showScenario = () => { cardScenario.textContent = chosen.value; };
chosen.addEventListener('change', showScenario);
showScenario();
card.querySelector('button').onclick = () => parent.postMessage({nepam:'pilot',scenario:chosen.value},'*');
function resizeEmbed() { parent.postMessage({nepam:'height',height:Math.ceil(document.body.getBoundingClientRect().height)},'*'); }
new ResizeObserver(resizeEmbed).observe(document.body);
function scrollHost(id) {
  const section=document.getElementById(id);
  // The host needs the full height first, otherwise it clamps the scroll to the unfinished iframe.
  resizeEmbed();
  if (section) parent.postMessage({nepam:'scroll',y:section.getBoundingClientRect().top+scrollY},'*');
  return Boolean(section);
}
document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href^="#"]');
  if (anchor && scrollHost(anchor.getAttribute('href').slice(1))) event.preventDefault();
});
if (window.nepamHost) {
  const followHash=()=>setTimeout(()=>scrollHost(nepamHost.hash.slice(1)),150);
  parent.addEventListener('hashchange',followHash);
  if (nepamHost.hash) followHash();
}
<\/script>`;
const embeddedPage = page.replace('</head>',()=>embedHead+'</head>').replace('</body>',()=>embed+'</body>');
const payload=gzipSync(Buffer.from(embeddedPage),{level:9}).toString('base64');
const snippet = `<!-- NEPAM. Вставьте код целиком в T123. Для штатной формы Tilda укажите её #rec… в NATIVE_FORM. -->
<div class="nepam-embed"></div>
<script>
(async function(mount){
  const NATIVE_FORM = '${nativeForm}';
  const hostedPilot = 'https://nepam-pilot.ornatecoati2.chatgpt.site/';
  const iframe=document.createElement('iframe');
  iframe.title='NEPAM — платформа защищённого доступа';
  iframe.style.cssText='border:0;width:100%;display:block;height:800px;background:#090909';
  const scrollToY=y=>window.scrollTo({top:y,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  window.addEventListener('message',event=>{
    if(event.source!==iframe.contentWindow || event.origin!==location.origin || !event.data)return;
    const msg=event.data;
    if(msg.nepam==='height' && Number.isFinite(msg.height)) iframe.style.height=Math.max(100,msg.height)+'px';
    if(msg.nepam==='scroll' && Number.isFinite(msg.y))scrollToY(iframe.getBoundingClientRect().top+scrollY+msg.y);
    if(msg.nepam==='pilot'){
      const native=/^#rec[0-9]+$/.test(NATIVE_FORM)?document.querySelector(NATIVE_FORM):null;
      if(native){
        const scenario=native.querySelector('[name="scenario"]');
        if(scenario){scenario.value=msg.scenario;scenario.dispatchEvent(new Event('change',{bubbles:true}));}
        scrollToY(native.getBoundingClientRect().top+scrollY);
      } else {
        const url=new URL(hostedPilot);url.searchParams.set('scenario',msg.scenario);url.hash='pilot';location.assign(url.href);
      }
    }
  });
  try {
    const bytes=Uint8Array.from(atob('${payload}'),c=>c.charCodeAt(0));
    iframe.srcdoc=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    mount.append(iframe);
  } catch {
    const link=document.createElement('a');link.href=hostedPilot;link.textContent='Открыть лендинг NEPAM';mount.append(link);
  }
})(document.currentScript.previousElementSibling);
<\/script>`;
await writeFile(new URL('T123.html',import.meta.url),snippet,'utf8');
