const allowedScenarios = new Set(["Подберём вместе","Доступ подрядчика","Администрирование","Интеграция по API"]);
const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json = (value, status = 200) => Response.json(value, {status, headers});
const html = value => new Response(value,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
async function receive(request, env) {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return json({},403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({},415);
  if (Number(request.headers.get('Content-Length')) > 4096) return json({},413);
  const raw = await request.text();
  if (raw.length > 4096) return json({},413);
  let data;
  try { data = JSON.parse(raw); } catch { return json({},400); }
  if (!data || !field(data.name,100) || !field(data.company,160) || !field(data.email,254) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || data.agree !== 'on' ||
      !allowedScenarios.has(data.scenario) || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(data.id)) return json({},400);
  await env.DB.prepare('INSERT INTO pilot_requests (id,name,company,email,scenario) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
    .bind(data.id,data.name.trim(),data.company.trim(),data.email.trim(),data.scenario).run();
  return json({saved:true});
}
async function requests(request,env) {
  const email = request.headers.get('oai-authenticated-user-email');
  if (!email) return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2Frequests',request.url),302);
  if (!env.OWNER_EMAIL || email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) return new Response('Доступ только для владельца',{status:403,headers});
  const {results} = await env.DB.prepare('SELECT created_at,name,company,email,scenario FROM pilot_requests ORDER BY created_at DESC').all();
  const rows = results.map(row => '<tr>'+[row.created_at,row.name,row.company,row.email,row.scenario].map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('');
  return html('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Заявки на пилот NEPAM</title><style>body{margin:5%;font:16px/1.5 system-ui;color:#141d2e}main{overflow:auto}table{border-collapse:collapse}td,th{padding:12px;border:1px solid #c5cbd3;text-align:left}</style><a href="/">← NEPAM</a><h1>Заявки на пилот</h1><main>'+(rows?'<table><tr><th>Дата (UTC)</th><th>Имя</th><th>Компания</th><th>Почта</th><th>Сценарий</th></tr>'+rows+'</table>':'Пока заявок нет.')+'</main></html>');
}
export default {async fetch(request,env) {
  const {pathname} = new URL(request.url);
  // PAGE is injected by the hosting build. server.mjs answers GET / on its own.
  if (pathname === '/' && request.method === 'GET' && typeof PAGE === 'string') return html(PAGE);
  try {
    if (pathname === '/api/pilot' && request.method === 'POST') return await receive(request,env);
    if (pathname === '/requests' && request.method === 'GET') return await requests(request,env);
  } catch { return json({error:'temporarily_unavailable'},503); }
  return new Response('Страница не найдена',{status:404,headers});
}};
