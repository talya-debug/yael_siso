-- ===== מיגרציה מלאה - הרץ פעם אחת ב-SQL Editor של Supabase =====
-- Run this ONCE in Supabase → SQL Editor → New query → Run

-- ── 1. עדכון contents ──
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS level text DEFAULT 'task';
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES contents(id) ON DELETE CASCADE;
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS notes_text text;
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS estimated_days integer DEFAULT 7;

-- ── 2. תיקון FK של proposal_items → contents (הוסף CASCADE לאפשר מחיקת תכולות) ──
ALTER TABLE public.proposal_items DROP CONSTRAINT IF EXISTS proposal_items_content_id_fkey;
ALTER TABLE public.proposal_items
  ADD CONSTRAINT proposal_items_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE;

-- ── 3. עדכון tasks ──
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS content_ref_id uuid REFERENCES contents(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS phase_name text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS level text DEFAULT 'task';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_days integer DEFAULT 7;

-- ── 4. יומן פעילות משימות ──
CREATE TABLE IF NOT EXISTS public.task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_email text,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── 5. RLS ──
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='task_logs' AND policyname='allow all task_logs'
  ) THEN
    CREATE POLICY "allow all task_logs" ON task_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
