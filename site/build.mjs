import {readFile,writeFile} from 'node:fs/promises';
const read = name => readFile(new URL(name,import.meta.url),'utf8');
const [template,css,core,client] = await Promise.all(['index.template.html','style.css','core.svg','client.js'].map(read));
export const page = template.replace('/* SITE_CSS */',()=>css).replace('<!-- CORE_SVG -->',()=>core).replace('/* SITE_JS */',()=>client);
await writeFile(new URL('index.html',import.meta.url),page);
