-- migration: הוסף start_date ו-estimated_days לטבלאות
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_days integer DEFAULT 7;
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS estimated_days integer DEFAULT 7;
