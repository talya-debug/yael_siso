ALTER TABLE payments ADD COLUMN IF NOT EXISTS phase_completed_at date;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_terms_days int DEFAULT 0;

CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_logs_all" ON payment_logs;
CREATE POLICY "payment_logs_all" ON payment_logs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_payment_logs_payment ON payment_logs(payment_id);
