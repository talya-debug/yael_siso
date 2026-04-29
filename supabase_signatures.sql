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
