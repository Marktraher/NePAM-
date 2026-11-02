import {mkdir,writeFile} from 'node:fs/promises';
import {page} from './build.mjs';

// GitHub Pages serves static files only, so /api/pilot does not exist there.
// The form becomes a link to a working one and keeps the chosen scenario.
const formUrl = new URL(process.env.PILOT_FORM_URL || 'https://nepam-pilot.ornatecoati2.chatgpt.site/');
if (formUrl.protocol !== 'https:') throw Error('PILOT_FORM_URL должен начинаться с https://');
const embed = `<script>
const pilotForm = ${JSON.stringify(formUrl.href)};
const card = document.createElement('div');
card.className = 'tildaPilot';
card.innerHTML = '<h3>Заявка на пилот</h3><p>Оставьте контакты, чтобы обсудить с командой NEPAM сценарий: <b></b>.</p><a class="button" href="">Перейти к заявке <b aria-hidden="true">↗</b></a>';
form.replaceWith(card);
const showScenario = () => {
  card.querySelector('p b').textContent = chosen.value;
  const url = new URL(pilotForm);
  url.searchParams.set('scenario', chosen.value);
  url.hash = 'pilot';
  card.querySelector('a').href = url.href;
};
chosen.addEventListener('change', showScenario);
showScenario();
<\/script>`;
const staticPage = page.replace('</body>',()=>embed+'</body>');
const output = new URL('../dist/',import.meta.url);
await mkdir(output,{recursive:true});
await writeFile(new URL('index.html',output),staticPage);
