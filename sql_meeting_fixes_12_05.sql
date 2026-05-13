-- תיקוני פגישה 12/05/2026

-- 1. הוספת שדה drive_link ללקוחות
ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_link TEXT;

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
