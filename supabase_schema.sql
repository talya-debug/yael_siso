-- ===== מסד נתונים - מערכת Motiv =====

-- קטלוג תכולות (השירותים/משימות שהמשרד מציע)
create table contents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  estimated_days int default 0,
  created_at timestamptz default now()
);

-- לקוחות
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz default now()
);

-- הצעות מחיר
create table proposals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  status text default 'draft', -- draft / sent / approved / rejected
  notes text,
  created_at timestamptz default now()
);

-- פריטים בהצעה (תכולות שנבחרו)
create table proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references proposals(id) on delete cascade,
  content_id uuid references contents(id),
  notes text
);

-- פרויקטים (נפתחים אוטומטית עם אישור הצעה)
create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  proposal_id uuid references proposals(id),
  name text not null,
  status text default 'active', -- active / completed / on_hold
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- משימות בפרויקט (עם חתימת לקוח)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  status text default 'pending', -- pending / in_progress / done
  due_date date,
  assigned_to text,
  client_signed boolean default false,
  client_signed_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- גבייה מלקוחות
create table billing_clients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  client_id uuid references clients(id),
  description text,
  amount numeric(10,2) default 0,
  due_date date,
  paid_at date,
  status text default 'pending', -- pending / paid / overdue
  created_at timestamptz default now()
);

-- גבייה מספקים
create table billing_vendors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  vendor_name text not null,
  description text,
  amount numeric(10,2) default 0,
  due_date date,
  paid_at date,
  status text default 'pending',
  created_at timestamptz default now()
);

-- יומן עבודה
create table work_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  user_email text,
  work_date date default current_date,
  hours numeric(4,1),
  description text,
  created_at timestamptz default now()
);

-- ריכוז ידע
create table knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  category text,
  created_at timestamptz default now()
);
