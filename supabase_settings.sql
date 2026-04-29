-- טבלת הגדרות כלליות (Gmail token וכו')
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON settings;
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
