import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';
import {page} from './build.mjs';
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8080);
const database = process.env.NEPAM_DB || fileURLToPath(new URL('./data/pilots.sqlite',import.meta.url));
mkdirSync(dirname(resolve(database)),{recursive:true});
const db = new DatabaseSync(database);
db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8').replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
if (process.argv.includes('--leads')) {
  console.log(JSON.stringify(db.prepare('SELECT created_at,name,company,email,scenario FROM pilot_requests ORDER BY created_at DESC').all(),null,2));
  db.close();
} else {
  const env = {DB: {prepare: sql => ({bind:(...values)=>({run:()=>db.prepare(sql).run(...values)})})}};
  const server = http.createServer(async(req,res)=>{
    try {
      const origin = process.env.PUBLIC_ORIGIN || 'http://' + req.headers.host;
      const url = new URL(req.url,origin);
      if (url.pathname === '/' && req.method === 'GET') {
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(page);return;
      }
      if (url.pathname !== '/api/pilot' || req.method !== 'POST') {res.writeHead(404);res.end();return}
      const chunks=[];let bytes=0;
      for await(const chunk of req) {
        bytes+=chunk.length;if(bytes>4096){res.writeHead(413);res.end();return}chunks.push(chunk);
      }
      const request=new Request(url,{method:'POST',headers:req.headers,body:Buffer.concat(chunks)});
      const response=await worker.fetch(request,env);
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
    } catch {
      if (!res.headersSent) res.writeHead(500);res.end();
    }
  });
  server.listen(port,host,()=>console.log('NEPAM: http://'+host+':'+port));
}
