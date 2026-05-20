-- שלב 2: דשבורד My Day + Default Assignee

-- 1. טבלת משימות יומיומיות
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date DATE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_tasks_all" ON daily_tasks FOR ALL USING (true) WITH CHECK (true);

-- 2. שדה מנהלת ברירת מחדל לפרויקט
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_assignee TEXT;
