-- ===== מיגרציה - עדכון מבנה לניהול תכולות והיררכיית משימות =====

-- ── עדכון טבלת contents ──
alter table contents add column if not exists level text default 'task'; -- phase / task / subtask
alter table contents add column if not exists parent_id uuid references contents(id);
alter table contents add column if not exists notes_text text;
alter table contents add column if not exists timing text;
alter table contents add column if not exists sort_order int default 0;

-- ── עדכון טבלת tasks ──
alter table tasks add column if not exists parent_task_id uuid references tasks(id);
alter table tasks add column if not exists description text;
alter table tasks add column if not exists priority text default 'normal'; -- low / normal / high / urgent
alter table tasks add column if not exists content_ref_id uuid references contents(id);
alter table tasks add column if not exists phase_name text;
alter table tasks add column if not exists level text default 'task'; -- task / subtask

-- ── יומן פעילות משימות ──
create table if not exists task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_email text,
  note text not null,
  created_at timestamptz default now()
);

-- ── RLS (Row Level Security) - הפעלה ל task_logs ──
alter table task_logs enable row level security;
create policy if not exists "allow all task_logs" on task_logs for all using (true) with check (true);
