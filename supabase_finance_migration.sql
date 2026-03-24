-- ===== מיגרציה פיננסית - דשבורד ניהולי =====

-- הוספת שדות פיננסיים לטבלת פרויקטים
alter table projects
  add column if not exists project_price    numeric(10,2) default 0,
  add column if not exists profit_target_pct numeric(5,2) default 40,
  add column if not exists adi_pct          numeric(5,2) default 30;

-- תעריפי עובדים לפרויקט (מוזן ידנית בדשבורד הניהולי)
create table if not exists project_rates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  worker_name text not null,
  hourly_rate numeric(10,2) default 0,
  created_at  timestamptz default now(),
  unique(project_id, worker_name)
);

-- הוצאות ישירות לפרויקט (תוכניות נגרות, תוכניות עבודה וכו')
create table if not exists project_expenses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  description text not null,
  amount      numeric(10,2) default 0,
  created_at  timestamptz default now()
);
