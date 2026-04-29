-- ===== מיגרציה — תלויות ותזמון אוטומטי לתכולות =====
-- הרץ פעם אחת ב-Supabase → SQL Editor → New query → Run

-- ── 1. שדות חדשים לטבלת contents ──
-- סדר השלב (1-6) — לקביעת סדר פתיחת שלבים
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS stage_order int;

-- תלות — id של שלב שצריך להסתיים לפני שהשלב הזה נפתח
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS dependency_id uuid REFERENCES contents(id) ON DELETE SET NULL;

-- תנאי פתיחה: tasks_complete / dependency_complete / both
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS open_condition text DEFAULT 'tasks_complete';

-- אופסט תזמון מתחילת פרויקט (X) — בשבועות
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS start_offset_weeks int;
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS end_offset_weeks int;

-- האם השלב אופציונלי
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS is_optional boolean DEFAULT false;

-- ── 2. שדות חדשים לטבלת tasks ──
-- תלות — id של משימה שצריכה להסתיים לפני
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dependency_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;

-- קישור לשלב הראשי (content phase id)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS phase_content_id uuid REFERENCES contents(id) ON DELETE SET NULL;

-- סטטוס שלב: locked / open / completed
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS stage_status text DEFAULT 'open';
