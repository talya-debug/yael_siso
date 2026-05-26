-- Google Tasks — טבלאות חדשות

-- 1. טוקנים לכל משתמש
CREATE TABLE IF NOT EXISTS google_task_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  task_list_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE google_task_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_task_tokens_all" ON google_task_tokens FOR ALL USING (true) WITH CHECK (true);

-- 2. שדה google_task_id בטבלת tasks לקישור
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_task_id TEXT;
