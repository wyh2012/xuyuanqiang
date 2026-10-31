// POST /api/wish —— 提交愿望
// 校验：非空、≤50 字、同设备 10 秒限频（防连点/刷屏）
import { invalidateWishCache } from './wishes.js';

const MAX_LEN = 50;
const RATE_LIMIT_MS = 10000;

function json(data, status){
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context){
  const db = context.env.DB;
  let body = {};
  try { body = await context.request.json(); } catch(e){ body = {}; }
  if(typeof body.content !== 'string') return json({ ok: false, error: '愿望不能为空' }, 400);
  const content = body.content.trim();
  const clientId = typeof body.client_id === 'string' ? body.client_id.slice(0, 64) : '';

  if(!content) return json({ ok: false, error: '愿望不能为空' }, 400);
  if(content.length > MAX_LEN) return json({ ok: false, error: '愿望最多 ' + MAX_LEN + ' 个字' }, 400);

  const now = Date.now();
  // 限频：同设备 10 秒内只能许一个愿（走 idx_wishes_client 索引点查，不扫表）
  if(clientId){
    const recent = await db.prepare(
      'SELECT 1 AS x FROM wishes WHERE client_id = ? AND created_at > ? LIMIT 1'
    ).bind(clientId, now - RATE_LIMIT_MS).first();
    if(recent) return json({ ok: false, error: '流星还在飞，10 秒后再许下一个愿吧' }, 429);
  }

  const id = now + '_' + Math.random().toString(36).slice(2, 8);
  await db.prepare(
    'INSERT INTO wishes (id, content, client_id, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, content, clientId, now).run();
  invalidateWishCache(); // 提交成功立即清首屏缓存，下一位进站就能看到

  return json({ ok: true, wish: { id: id, content: content, created_at: now } });
}

export async function onRequest(){
  return json({ ok: false, error: 'method not allowed' }, 405);
}
