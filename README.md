# 流星雨许愿墙（Cloudflare Pages + Functions + D1）

愿望以流星的形式划过夜空。发出的愿望立即化作一颗流星飞过，全站所有人都能看到彼此的愿望。

## 功能

- 夜空流星雨背景（canvas 闪烁星点 + 持续划过的流星）
- 愿望文字跟随流星飞行，渐显渐隐
- 输入愿望发送：成功后弹出「许愿成功 / 你的愿望已经实现」
- 全站同步：每 15 秒轮询新愿望，别人的新愿望会化作新流星划过；回到前台立刻补拉
- 已展示过的愿望随机重播（流星持续不断）
- 限制：愿望最多 50 字；同一设备每 10 秒一个愿（防刷）

## 技术架构

- 前端：单文件 index.html（无依赖、无 CDN）
- 后端：Cloudflare Pages Functions
  - `POST /api/wish` 提交愿望（校验 + 10s 限频 + 立即清缓存）
  - `GET /api/wishes?since=<ms>` 同步：since=0 返回最近 50 条；since>0 增量返回新愿望
- 数据库：D1 单表 `wishes`（id / content / client_id / created_at）+ 2 个索引
- D1 读取优化（延续 v11.9 思路）：
  - 首屏列表 10 秒 isolate 缓存，多人同时进站共享一次查询；提交愿望立即失效
  - 增量轮询走 `idx_wishes_created` 索引，读取行数 = 新增条数
  - 限频检查走 `idx_wishes_client` 索引点查，不扫表
  - 首屏 LIMIT 50，查询成本恒定，不随数据量膨胀

## 部署（全新站点，三步）

1. 创建 D1 数据库（如果还没有）：
   ```
   npx wrangler d1 create wish-wall-db
   ```
   把返回的 database_id 填进 wrangler.toml 的 `REPLACE_WITH_YOUR_D1_DATABASE_ID`，并执行建表：
   ```
   npx wrangler d1 execute wish-wall-db --remote --file=./schema.sql
   ```
   （已建过库只补索引/表的话用 upgrade.sql，重复执行安全）

2. 部署站点（在项目目录执行）：
   ```
   npx wrangler pages deploy . --project-name wish-wall
   ```
   （首次会提示创建项目，按提示操作即可）

3. 打开站点，Ctrl+F5 强刷。

## 版本记录

### v1.0（2026-10-31）
首个版本：流星雨许愿 UI（参考图还原）、愿望提交、全站 15s 轮询同步、许愿成功弹窗、50 字限制、10s 设备限频、D1 读取优化（缓存 + 索引）。
