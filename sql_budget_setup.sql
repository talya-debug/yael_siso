-- ======================================
-- מודול תקציב לקוח — הגדרת DB
-- להריץ ב-Supabase SQL Editor
-- ======================================

-- 1. שדות בנק על ספקים
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_branch text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS account_holder text;

-- 2. טבלת שורות תקציב
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  category text NOT NULL,
  planned_amount numeric DEFAULT 0,
  vat_rate numeric DEFAULT 17,
  payment_terms text,
  notes text,
  drive_link text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. טבלת תשלומים על שורת תקציב
CREATE TABLE IF NOT EXISTS budget_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_item_id uuid REFERENCES budget_items(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS — כל המשתמשים המחוברים יכולים לקרוא ולכתוב
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_items_all" ON budget_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "budget_payments_all" ON budget_payments FOR ALL USING (true) WITH CHECK (true);

-- 5. אינדקסים
CREATE INDEX IF NOT EXISTS idx_budget_items_project ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_payments_item ON budget_payments(budget_item_id);
