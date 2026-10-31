-- 许愿墙数据库结构（全新建库用）
CREATE TABLE IF NOT EXISTS wishes (
  id         TEXT PRIMARY KEY,
  content    TEXT NOT NULL,
  client_id  TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wishes_created ON wishes(created_at);
CREATE INDEX IF NOT EXISTS idx_wishes_client ON wishes(client_id, created_at);
