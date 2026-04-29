ALTER TABLE clients ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_price numeric;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS price numeric;

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'team' CHECK (role IN ('admin', 'team')),
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON user_roles;
CREATE POLICY "Allow all" ON user_roles FOR ALL USING (true) WITH CHECK (true);

INSERT INTO user_roles (email, role, name) VALUES
  ('sisoyael@gmail.com', 'admin', 'Yael Siso'),
  ('hello@yaelsiso.com', 'admin', 'Chloe'),
  ('talya@talyaosher.com', 'admin', 'Talya Osher')
ON CONFLICT (email) DO NOTHING;
