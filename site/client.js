const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// In the Tilda embed the page lives in a srcdoc iframe, so the address comes from the host page.
const entry = window.nepamHost || location;

const appear = new IntersectionObserver(items => {
  for (const item of items) {
    if (!item.isIntersecting) continue;
    item.target.classList.add('in');
    appear.unobserve(item.target);
  }
}, {threshold: .08, rootMargin: '0px 0px -6% 0px'});
for (const item of document.querySelectorAll('.kicker,.sectionTitle,.features article,.console,.scene h2,.scene .sub,.selector,.case,.pilotGrid>div,.pilotGrid>form')) appear.observe(item);
const hero = document.querySelector('.hero');
new IntersectionObserver(([item]) => hero.classList.toggle('paused', !item.isIntersecting)).observe(hero);
const gateway = document.querySelector('.gateway');
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  hero.addEventListener('pointermove', event => {
    if (reducedMotion()) return;
    const box = hero.getBoundingClientRect();
    gateway.style.setProperty('--tilt-x', ((event.clientX - box.left) / box.width - .5).toFixed(3));
    gateway.style.setProperty('--tilt-y', ((event.clientY - box.top) / box.height - .5).toFixed(3));
  });
}
document.querySelectorAll('.pilotMotif path').forEach((path, index) => path.style.setProperty('--i', index));

const scenarios = [
  [
    "01",
    "Доступ подрядчика",
    "Подрядчик",
    "Внешний шлюз",
    "Сервисная ИС",
    "Разрешите подрядчику работу с одной системой на согласованный срок. В пилоте проверим, как закрыть маршрут после завершения работ."
  ],
  [
    "02",
    "Администрирование",
    "Администратор",
    "Внутренний шлюз",
    "Целевой сервер",
    "Определите, кто может открыть сессию по SSH или RDP. В пилоте проверим правила подключения и сведения о сессии в журнале."
  ],
  [
    "03",
    "Интеграция по API",
    "Приложение",
    "Шлюз интеграции",
    "Целевой API",
    "Опишите разрешённые методы для сервисной учётной записи. На тестовом вызове проверим, какая политика сработала и что увидит ИБ."
  ]
];
const chosen = document.querySelector('#chosen');
const form = document.querySelector('#leadForm');
const routeIcons = [['badge','portal','server'],['terminal','key','rack'],['app','mesh','api']];
const sceneButtons = Array.from(document.querySelectorAll('[data-scene]'));
const flowNodes = Array.from(document.querySelectorAll('.flow > div'));
const caseDescription = document.querySelector('.casedesc');
let active = 0;
function selectScene(index, animated = true) {
  active = index;
  const item = scenarios[active];
  sceneButtons.forEach((option, position) => option.setAttribute('aria-pressed', String(position === active)));
  flowNodes.forEach((node, pos) => {
    node.querySelector('strong').textContent = item[pos + 2];
    node.querySelector('use').setAttribute('href', '#glass-' + routeIcons[active][pos]);
    if (animated && !reducedMotion()) node.animate([{opacity:0,transform:'translateY(12px) scale(.84)'},{opacity:1,transform:'none'}],{duration:440,delay:pos * 90,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
  });
  document.querySelector('#caseTitle').textContent = item[1];
  document.querySelector('#caseText').textContent = item[5];
  if (animated && !reducedMotion()) caseDescription.animate([{opacity:0,transform:'translateX(14px)'},{opacity:1,transform:'none'}],{duration:380,easing:'ease-out'});
  if (chosen.value !== item[1]) {
    chosen.value = item[1];
    chosen.dispatchEvent(new Event('change',{bubbles:true}));
  }
}
sceneButtons.forEach((button, index) => button.addEventListener('click', () => selectScene(index)));
chosen.addEventListener('change', () => {
  const index = scenarios.findIndex(item => item[1] === chosen.value);
  if (index >= 0 && index !== active) selectScene(index);
});
const requestedScenario = new URLSearchParams(entry.search).get('scenario');
const requestedIndex = scenarios.findIndex(item => item[1] === requestedScenario);
if (requestedIndex >= 0) selectScene(requestedIndex, false);
document.querySelector('#useScenario').addEventListener('click', () => {
  selectScene(active, false);
  if (!reducedMotion()) chosen.animate([{boxShadow:'0 0 0 0 #ff503c'},{boxShadow:'0 0 0 5px #ff503c66',offset:.35},{boxShadow:'0 0 0 0 #ff503c00'}],{duration:1100,delay:650,easing:'ease-out'});
});
const newId = () => crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
let submissionId;
form.addEventListener('input', () => { submissionId = undefined; });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  if (button.disabled) return;
  const message = document.querySelector('#feedback');
  const data = Object.fromEntries(new FormData(form));
  submissionId ??= newId();
  button.disabled = true;
  form.dataset.result = 'sending';
  message.textContent = 'Сохраняем заявку…';
  try {
    const response = await fetch('/api/pilot', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...data, id: submissionId}) });
    if (!response.ok) {
      if (response.status === 400) throw Error('Проверьте имя, компанию, рабочую почту и согласие.');
      throw Error('Сейчас не удалось сохранить заявку. Попробуйте ещё раз.');
    }
    const receipt = await response.json();
    if (receipt.saved !== true) throw Error('Сохранение не подтверждено. Попробуйте ещё раз.');
    form.reset();
    chosen.value = data.scenario;
    submissionId = undefined;
    form.dataset.result = 'saved';
    message.textContent = 'Заявка принята. Свяжемся с вами по указанной почте, чтобы обсудить пилот.';
  } catch (error) {
    form.dataset.result = 'failed';
    message.textContent = error instanceof TypeError ? 'Нет соединения с сервером. Проверьте связь и повторите отправку.' : error.message;
  } finally { button.disabled = false; }
});

const OPEN = 540, CLOSE = 1080, DAY = 1440;
const clock = minute => String(Math.floor(minute / 60)).padStart(2,'0') + ':' + String(minute % 60).padStart(2,'0');
const toMinutes = value => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };
const span = minutes => [Math.floor(minutes / 60) && Math.floor(minutes / 60) + ' ч', minutes % 60 && minutes % 60 + ' мин'].filter(Boolean).join(' ');

const demo = document.querySelector('#demoConsole');
const methods = document.querySelector('#demoMethods');
const runDemo = document.querySelector('#runDemo');
const historyList = document.querySelector('#labHistory');
const labFeedback = document.querySelector('#labFeedback');
const labs = {
  time: {
    title: 'Окно доступа подрядчика', description: 'Подрядчик обслуживает сервер по SSH. Его пропуск действует с 09:00 до 18:00. Запрос всегда один и тот же, меняется только время.',
    legend: 'Время подключения', options: [['14:30','Днём'],['20:15','Вечером']], rule: 'EXT-02', policy: 'Допуск с 09:00 до 18:00',
    request: value => 'SSH · ' + value, steps: ['Время','Шкала','Граница','Решение'],
    outcomes: ['14:30 входит в окно допуска. Шлюз разрешил SSH-сессию.', 'В 20:15 срок допуска истёк. Шлюз отклонил SSH-сессию.']
  },
  api: {
    title: 'Доступ к каталогу', description: 'Сервису заявок разрешено читать каталог оборудования. Проверьте, сможет ли он добавить новую запись.',
    legend: 'Метод запроса', options: [['GET','Прочитать'],['POST','Добавить']], rule: 'CAT-01', policy: 'Разрешить только GET',
    request: value => value + ' /catalog', steps: ['Метод','Пакет','Фильтр','Решение'],
    outcomes: ['Метод GET разрешён. Запрос передан каталогу.', 'Метод POST запрещён. Шлюз остановил запрос.']
  }
};
const labButtons = Array.from(document.querySelectorAll('[data-lab-choice]'));
const radios = Array.from(methods.querySelectorAll('input'));
const stepItems = Array.from(demo.querySelectorAll('.steps li'));
const selectedValue = () => methods.querySelector(':checked').value;
const timeStage = demo.querySelector('.timeStage');
const timeDigits = timeStage.querySelector('.timeDigits');
const dayFlag = timeStage.querySelector('.dayFlag');
const lockPulse = timeStage.querySelector('.lockPulse');
const apiRoute = demo.querySelector('#apiRoute');
const apiPacket = demo.querySelector('.apiPacket');
const verdictTitle = demo.querySelector('#verdictTitle');
const verdictText = demo.querySelector('#verdictText');
// Share of the wire and of the API route at which a request meets the lock and the filter.
const PULSE_AT_LOCK = -23.7, PULSE_LENGTH = 7, PACKET_AT_FILTER = .24;
const tried = new Set();
let runId = 0;
let shownMinute = OPEN;

// One clock drives every moving part. The timer finishes the step if the browser pauses animation frames.
function tween(duration, paint, id) {
  return new Promise(resolve => {
    const started = performance.now();
    let guard;
    const frame = now => {
      if (guard === undefined) return;
      if (id !== runId) { clearTimeout(guard); guard = undefined; resolve(false); return; }
      const progress = Math.min(Math.max((now - started) / duration, 0), 1);
      paint(progress);
      if (progress < 1) { requestAnimationFrame(frame); return; }
      clearTimeout(guard);
      guard = undefined;
      resolve(true);
    };
    guard = setTimeout(() => frame(started + duration), duration + 90);
    requestAnimationFrame(frame);
  });
}
const pause = (duration, id) => tween(duration, () => {}, id);
function stage(state, step, title, detail) {
  demo.dataset.state = state;
  stepItems.forEach((item, index) => {
    item.classList.toggle('done', index < step - 1);
    item.classList.toggle('now', index === step - 1);
  });
  verdictTitle.textContent = title;
  verdictText.textContent = detail;
}
function paintMinute(value) {
  const minute = Math.round(value);
  shownMinute = minute;
  timeDigits.textContent = dayFlag.textContent = clock(minute);
  timeStage.style.setProperty('--marker', (100 * minute / DAY) + '%');
  timeStage.style.setProperty('--span-left', (100 * Math.min(minute, CLOSE) / DAY) + '%');
  timeStage.style.setProperty('--span-width', (100 * Math.abs(minute - CLOSE) / DAY) + '%');
  timeStage.classList.toggle('past', minute > CLOSE);
}
const paintPulse = offset => { lockPulse.style.strokeDashoffset = offset; };
const pulseShare = share => PULSE_LENGTH + (PULSE_AT_LOCK - PULSE_LENGTH) * share;
function movePacket(share) {
  const point = apiRoute.getPointAtLength(apiRoute.getTotalLength() * share);
  apiPacket.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
}
function timeResult(minute) {
  const allowed = minute >= OPEN && minute < CLOSE;
  if (allowed) return [true, 'Сессия открыта', 'До конца допуска ещё ' + span(CLOSE - minute) + '.'];
  return [false, 'Доступ закрыт', minute < OPEN ? 'Окно откроется через ' + span(OPEN - minute) + '.' : 'Окно закрылось ' + span(minute - CLOSE) + ' назад.'];
}
const apiResult = value => value === 'GET'
  ? [true, 'Запрос передан', 'Метод GET разрешён. Каталог ответил 200 OK.']
  : [false, 'Запрос заблокирован', 'Метод ' + value + ' запрещён правилом CAT-01.'];

// Selected time, marker travel, window check and decision run as one sequence.
async function playTime(value, id) {
  const target = toMinutes(value);
  // A repeated attempt starts over from the opening of the window, so the marker still travels.
  const from = shownMinute === target ? OPEN : shownMinute;
  const [allowed] = timeResult(target);
  stage('incoming', 1, 'Выбрано ' + value, 'Тот же SSH-запрос, другое время.');
  paintMinute(from);
  paintPulse(PULSE_LENGTH);
  if (!await pause(170, id)) return false;
  const travel = Math.min(Math.max(Math.abs(target - from) * 1.7, 620), 1150);
  const crosses = (from - CLOSE) * (target - CLOSE) < 0;
  const before = Math.abs(CLOSE - from) / Math.abs(target - from);
  const legs = crosses
    ? [[from, CLOSE, travel * before, p => p ** 1.5], [CLOSE, CLOSE, 240, p => p], [CLOSE, target, travel * (1 - before) + 120, p => 1 - (1 - p) ** 2]]
    : [[from, target, travel, p => 1 - (1 - p) ** 3]];
  const total = legs.reduce((sum, leg) => sum + leg[2], 0);
  let passed = 0;
  stage('incoming', 2, 'Маркер идёт по шкале', 'Попытка подключения в ' + value + '.');
  for (const [start, end, duration, ease] of legs) {
    const held = start === end;
    timeStage.classList.toggle('crossing', held);
    if (held) stage('incoming', 2, 'Граница 18:00', 'Здесь окно допуска закрывается.');
    const done = await tween(duration, progress => {
      paintMinute(start + (end - start) * ease(progress));
      paintPulse(pulseShare((passed + duration * progress) / total));
    }, id);
    if (!done) return false;
    passed += duration;
  }
  timeStage.classList.remove('crossing');
  stage('checking', 3, 'Шлюз проверяет границу', 'Допуск действует с 09:00 до 18:00.');
  if (!await pause(460, id)) return false;
  if (!allowed) return true;
  stage('forwarding', 4, 'Шлюз открывается', 'Импульс проходит к серверу.');
  return tween(620, progress => paintPulse(PULSE_AT_LOCK + (-100 - PULSE_AT_LOCK) * progress), id);
}
async function playApi(value, id) {
  const [allowed] = apiResult(value);
  stage('incoming', 1, 'Метод ' + value, 'Запрос ' + value + ' /catalog отправлен.');
  movePacket(0);
  if (!await pause(170, id)) return false;
  stage('incoming', 2, 'Пакет идёт к фильтру', 'Шлюз получает запрос от сервиса заявок.');
  if (!await tween(560, progress => movePacket(PACKET_AT_FILTER * (1 - (1 - progress) ** 2)), id)) return false;
  stage('checking', 3, 'Фильтр сверяет метод', 'Правило CAT-01 разрешает только GET.');
  if (!await pause(520, id)) return false;
  if (!allowed) return true;
  stage('forwarding', 4, 'Фильтр пропускает пакет', 'Запрос идёт к каталогу.');
  return tween(640, progress => movePacket(PACKET_AT_FILTER + (1 - PACKET_AT_FILTER) * progress ** 1.4), id);
}
function finishAttempt(lab, value, id) {
  const isTime = lab === labs.time;
  const [allowed, title, detail] = isTime ? timeResult(toMinutes(value)) : apiResult(value);
  if (isTime) {
    paintMinute(toMinutes(value));
    paintPulse(allowed ? -100 : PULSE_AT_LOCK);
  } else movePacket(allowed ? 1 : PACKET_AT_FILTER);
  timeStage.classList.remove('crossing');
  stage(allowed ? 'allowed' : 'denied', 4, title, detail);
  historyList.querySelector('.emptyLog')?.remove();
  const row = document.createElement('li');
  row.className = 'eventRow ' + (allowed ? 'allow' : 'deny');
  for (const [tag, text] of [['time',new Date().toLocaleTimeString('ru-RU')],['code',lab.request(value)],['b',allowed ? 'Разрешено' : 'Отказ'],['small',lab.rule]]) {
    const cell = document.createElement(tag);
    cell.textContent = text;
    row.append(cell);
  }
  historyList.prepend(row);
  while (historyList.children.length > 4) historyList.lastElementChild.remove();
  labFeedback.textContent = lab.outcomes[allowed ? 0 : 1];
  tried.add(value);
  radios.forEach(radio => radio.closest('label').classList.toggle('nudge', !radio.checked && !tried.has(radio.value)));
}
// Every attempt takes a new id, so an unfinished one stops at its next frame and never reaches the log.
async function attempt() {
  attemptPending = false;
  const id = ++runId;
  const lab = labs[demo.dataset.lab];
  const value = selectedValue();
  demo.querySelector('#endpoint').textContent = lab.request(value);
  if (lab === labs.api) apiPacket.querySelector('text').textContent = value;
  labFeedback.textContent = '';
  timeStage.classList.remove('crossing');
  radios.forEach(radio => radio.closest('label').classList.remove('nudge'));
  demo.dataset.state = 'idle';
  void demo.offsetWidth;
  if (!reducedMotion() && !document.hidden) {
    const finished = await (lab === labs.time ? playTime(value, id) : playApi(value, id));
    if (!finished || id !== runId) return;
  }
  finishAttempt(lab, value, id);
}
function selectLab(name) {
  if (demo.dataset.lab === name) return;
  demo.dataset.lab = name;
  const lab = labs[name];
  for (const tab of labButtons) tab.setAttribute('aria-pressed', String(tab.dataset.labChoice === name));
  demo.querySelector('.controls h3').textContent = lab.title;
  demo.querySelector('.controls p').textContent = lab.description;
  methods.querySelector('legend').textContent = lab.legend;
  radios.forEach((radio,index) => {
    const [value,label] = lab.options[index];
    radio.value = value;
    radio.checked = index === 0;
    radio.nextElementSibling.querySelector('b').textContent = value;
    radio.nextElementSibling.lastChild.textContent = ' ' + label;
  });
  demo.querySelector('.policy code').textContent = lab.rule;
  demo.querySelector('.policy strong').textContent = lab.policy;
  stepItems.forEach((item, index) => { item.textContent = lab.steps[index]; });
}
for (const button of labButtons) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    selectLab(button.dataset.labChoice);
    attempt();
  });
}
methods.addEventListener('change', attempt);
runDemo.addEventListener('click', attempt);

// The first attempt waits for the visitor to reach the demo.
let demoInView = false;
let attemptPending = true;
function requestAttempt() {
  attemptPending = !demoInView;
  if (demoInView) attempt();
}
new IntersectionObserver(([item]) => {
  demoInView = item.isIntersecting;
  if (demoInView && attemptPending) requestAttempt();
}, {threshold: .35}).observe(demo.querySelector('.monitor'));
paintMinute(OPEN);
function openTimeDemo() {
  if (entry.hash !== '#demo-time') return;
  selectLab('time');
  requestAttempt();
}
(window.nepamHost ? parent : window).addEventListener('hashchange', openTimeDemo);
openTimeDemo();
