// GET /api/wishes?since=<ms> —— 愿望同步
// since=0：返回最近 50 条（首次进站）
// since>0：返回该时间点之后的新愿望（轮询增量）
// 带 10 秒 isolate 缓存：多人同时进站共享一次查询；提交新愿望时由 wish.js 调 invalidateWishCache() 立即失效
const PAGE_SIZE = 50;
const CACHE_TTL_MS = 10000;

const cache = { at: 0, firstPage: null };

export function invalidateWishCache(){
  cache.at = 0;
  cache.firstPage = null;
}

function json(data, status){
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestGet(context){
  const url = new URL(context.request.url);
  let since = parseInt(url.searchParams.get('since') || '0', 10);
  if(!isFinite(since) || since < 0) since = 0;
  const now = Date.now();

  // 首屏（since=0）：命中 10s 缓存直接返回，省 D1 读取
  if(since === 0){
    if(cache.firstPage && now - cache.at < CACHE_TTL_MS){
      return json({ ok: true, wishes: cache.firstPage, server_time: now, cached: true });
    }
    const rows = await context.env.DB.prepare(
      'SELECT id, content, created_at FROM wishes ORDER BY created_at DESC LIMIT ?'
    ).bind(PAGE_SIZE).all();
    const wishes = (rows.results || []).slice().reverse(); // 旧→新，方便前端按序入队
    cache.firstPage = wishes; cache.at = now;
    return json({ ok: true, wishes: wishes, server_time: now });
  }

  // 增量：只查 since 之后的新行（走 idx_wishes_created 索引，读取行数=新增条数）
  const rows = await context.env.DB.prepare(
    'SELECT id, content, created_at FROM wishes WHERE created_at > ? ORDER BY created_at ASC LIMIT ?'
  ).bind(since, PAGE_SIZE).all();
  return json({ ok: true, wishes: rows.results || [], server_time: now });
}

export async function onRequest(){
  return json({ ok: false, error: 'method not allowed' }, 405);
}
