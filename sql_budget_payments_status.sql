-- הוספת עמודת סטטוס לטבלת תשלומים
-- להריץ ב-Supabase SQL Editor
ALTER TABLE budget_payments ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid'));
