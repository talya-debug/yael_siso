-- Budget & Quotes — טבלאות חדשות
-- להריץ ב-Supabase SQL Editor

-- 1. קטגוריות הצעות מחיר
CREATE TABLE IF NOT EXISTS quote_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  drive_link TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quote_categories ENABLE ROW LEVEL SECURITY;

-- 2. הצעות מחיר (שורות תחת קטגוריה)
CREATE TABLE IF NOT EXISTS quote_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES quote_categories(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  amount NUMERIC,
  vat_included BOOLEAN DEFAULT false,
  notes TEXT,
  drive_link TEXT,
  selected BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  transferred BOOLEAN DEFAULT false,
  budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quote_entries ENABLE ROW LEVEL SECURITY;

-- 3. מכרזים (טבלאות השוואה)
CREATE TABLE IF NOT EXISTS tender_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  drive_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tender_tables ENABLE ROW LEVEL SECURITY;

-- 4. ספקים במכרז (עמודות) — חייב להיות לפני tender_cells
CREATE TABLE IF NOT EXISTS tender_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID REFERENCES tender_tables(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  notes TEXT,
  drive_link TEXT,
  sort_order INT DEFAULT 0
);
ALTER TABLE tender_suppliers ENABLE ROW LEVEL SECURITY;

-- 5. שורות מכרז (פריטים)
CREATE TABLE IF NOT EXISTS tender_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID REFERENCES tender_tables(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
ALTER TABLE tender_rows ENABLE ROW LEVEL SECURITY;

-- 6. תאי מכרז (מחיר פר ספק פר פריט)
CREATE TABLE IF NOT EXISTS tender_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  row_id UUID REFERENCES tender_rows(id) ON DELETE CASCADE,
  supplier_col_id UUID REFERENCES tender_suppliers(id) ON DELETE CASCADE,
  amount NUMERIC,
  notes TEXT,
  selected BOOLEAN DEFAULT false
);
ALTER TABLE tender_cells ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
DECLARE t text;
BEGIN
  FOR t IN VALUES ('quote_categories'),('quote_entries'),('tender_tables'),('tender_suppliers'),('tender_rows'),('tender_cells') LOOP
    BEGIN
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)', 'allow_all_' || t, t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
