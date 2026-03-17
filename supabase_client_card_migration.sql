-- Migration: כרטיס לקוח בתוך פרויקט
-- הרץ דרך Supabase Dashboard → SQL Editor

-- טבלה ראשית — נתוני הנכס והפרויקט
CREATE TABLE IF NOT EXISTS project_client_cards (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  id_number      TEXT,
  id_photo_url   TEXT,
  address        TEXT,
  drive_link     TEXT,
  deadline       DATE,
  parking_number TEXT,
  building_code  TEXT,
  pinterest_link TEXT,
  important_notes TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- אנשי קשר — כמה לכל פרויקט
CREATE TABLE IF NOT EXISTS project_contacts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  role       TEXT DEFAULT '',
  sort_order INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE project_client_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_access_client_cards" ON project_client_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access_contacts"     ON project_contacts     FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket לקבצי מסמכים (אם לא קיים)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_documents" ON storage.objects
FOR ALL USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
