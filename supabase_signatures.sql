CREATE TABLE IF NOT EXISTS signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  signer_name text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signed_at timestamptz,
  signature_data text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON signatures FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket לקבצים מצורפים לחתימות
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_attachments" ON storage.objects
FOR ALL USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

-- RLS על tasks — נדרש כדי שדף חתימה ציבורי יוכל לעדכן סטטוס
-- (או לחילופין להשתמש ב-API endpoint עם service role key)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS על task_logs
DO $$ BEGIN
  CREATE POLICY "allow_all_task_logs_v2" ON task_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
