-- תיקוני פגישה 12/05/2026

-- 1. הוספת שדה drive_link ללקוחות
ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_link TEXT;

-- 2. הוספת שדה phase_trigger לתשלומים — 'start' או 'end' (ברירת מחדל)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS phase_trigger TEXT DEFAULT 'end';

-- 3. עדכון אבני דרך קיימות שצריכות טריגר על התחלת שלב
-- שאול המלך, נחמני, גאולה — "During the supervision stage" = trigger on start
-- UPDATE payments SET phase_trigger = 'start'
-- WHERE name ILIKE '%supervision%' AND phase_trigger != 'start'
-- AND project_id IN (SELECT id FROM projects WHERE name ILIKE '%shaul%' OR name ILIKE '%nachmani%' OR name ILIKE '%geula%');

-- 2. תכולות: איחוד כפילויות "אביזרים דקורטיביים" / "אביזרי בית"
-- קודם בדוק מה קיים:
-- SELECT id, name, level, parent_id FROM contents WHERE name ILIKE '%אביזר%';
-- אם יש כפילויות, מחק את אחת מהן (בהתאמה ידנית אחרי בדיקה)

-- 3. הוספת "בחירת גנן (הצעת מחיר)" לתכולות — בשלב בחירת חומרים מתקדמת
-- קודם מצא את ה-parent_id של השלב הרלוונטי:
-- SELECT id FROM contents WHERE name ILIKE '%חומרים מתקדמ%' AND level = 'phase';
-- ואז הוסף:
-- INSERT INTO contents (name, level, parent_id, sort_order)
-- VALUES ('בחירת גנן (הצעת מחיר)', 'task', '<PHASE_ID>', 99);
