// נתוני תכולות מהאקסל — לייבוא לקטלוג

const PLAN_SUBTASKS = [
  'פגישה עם שרטט',
  'העברה לאישור מנהלת פרויקט',
  'תיוק',
]

const MATERIAL_SUBTASKS = [
  'תיאום עם לקוח',
  'תיאום עם חנות',
  'שליחת רפרנסים',
  'הוצאת כמויות',
  'סיכום פגישה',
  'שליחת מייל לחנות',
  'מעבר על הצעות מחיר',
  'חתימה ותשלום',
]

export const SCOPE_TEMPLATE = [
  {
    name: 'התנעת פרויקט',
    sort_order: 1,
    tasks: [
      { name: 'שליחת הצעת מחיר למנהל פרויקט / מפקח ללקוח', estimated_days: 2, sort_order: 1, subtasks: [] },
      { name: 'שליחת הצעת מחיר', estimated_days: 1, sort_order: 2, subtasks: [] },
      { name: 'חתימת לקוח על הצעת מחיר', estimated_days: 3, sort_order: 3, subtasks: [] },
      { name: 'מילוי טופס פרטי לקוח', estimated_days: 1, sort_order: 4, subtasks: [] },
      { name: 'הצעת מחיר כמאי', estimated_days: 5, sort_order: 5, subtasks: [] },
      { name: 'בחירת מנהל פרויקט, שרטט ותלת מימד', estimated_days: 3, sort_order: 6, subtasks: [] },
      { name: 'שליחת הצעת מחיר של הדמיות תלת מימד ללקוח', estimated_days: 2, sort_order: 7, subtasks: [] },
    ],
  },
  {
    name: 'תכנון ראשוני',
    sort_order: 2,
    tasks: [
      { name: 'מדד', estimated_days: 2, sort_order: 1, subtasks: [] },
      {
        name: 'פגישת ליבון צרכים',
        estimated_days: 7, sort_order: 2,
        subtasks: ['בקשת השראות', 'שליחת קובץ ליבון', 'סיכום פגישה'],
      },
      {
        name: 'פגישה להצגת חלופות תוכניות העמדה ו look & feel',
        estimated_days: 14, sort_order: 3,
        subtasks: ['גרפיקה', 'תיקוני חלופות', 'הכנת מצגת', 'תיאום חנויות', 'אישור לקוח'],
      },
    ],
  },
  {
    name: 'תוכניות עבודה - ראשוני',
    sort_order: 3,
    tasks: [
      { name: 'יצירת כתב כמויות', estimated_days: 5, sort_order: 1, subtasks: [] },
      { name: 'תוכנית הריסה',          estimated_days: 7, sort_order: 2,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית בנייה',          estimated_days: 7, sort_order: 3,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית אינסטלציה',      estimated_days: 7, sort_order: 4,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית חשמל',           estimated_days: 7, sort_order: 5,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית חשמל חכם',       estimated_days: 7, sort_order: 6,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית תאורה',          estimated_days: 7, sort_order: 7,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית מיזוג',          estimated_days: 7, sort_order: 8,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית תקרה',           estimated_days: 7, sort_order: 9,  subtasks: PLAN_SUBTASKS },
      { name: 'תוכנית ריצוף',          estimated_days: 7, sort_order: 10, subtasks: PLAN_SUBTASKS },
      { name: 'פריסות חדרי רחצה',      estimated_days: 7, sort_order: 11, subtasks: PLAN_SUBTASKS },
    ],
  },
  {
    name: 'תוכניות עבודה - מתקדם',
    sort_order: 4,
    tasks: [
      { name: "סקיצה א' לפגישה", estimated_days: 14, sort_order: 1, subtasks: [] },
      { name: 'תוכניות נגרות',   estimated_days: 14, sort_order: 2, subtasks: PLAN_SUBTASKS },
    ],
  },
  {
    name: 'בחירת חומרים בסיסיים',
    sort_order: 5,
    tasks: [
      { name: 'בחירת כלים סניטריים',           estimated_days: 14, sort_order: 1,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת ריצוף כולל מרפסות',       estimated_days: 14, sort_order: 2,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת ריצוף וחיפוי חדרי רחצה',  estimated_days: 14, sort_order: 3,  subtasks: MATERIAL_SUBTASKS },
      { name: 'תכנון ובחירת מטבח',             estimated_days: 21, sort_order: 4,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת נגרות',                   estimated_days: 14, sort_order: 5,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת פופי תאורה',              estimated_days: 7,  sort_order: 6,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת משטח עבודה חדרי רחצה',   estimated_days: 7,  sort_order: 7,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת משטח חוץ',               estimated_days: 7,  sort_order: 8,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת שקעים ומפסקים',          estimated_days: 7,  sort_order: 9,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת אלומיניום / חלונות',     estimated_days: 14, sort_order: 10, subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת חיפוי חימום תת רצפתי',  estimated_days: 7,  sort_order: 11, subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת קרניז / פאנל / דגם',    estimated_days: 7,  sort_order: 12, subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת דלתות',                  estimated_days: 14, sort_order: 13, subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת דלת כניסה',              estimated_days: 7,  sort_order: 14, subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת אבן / חיפוי חוץ',       estimated_days: 7,  sort_order: 15, subtasks: MATERIAL_SUBTASKS },
    ],
  },
  {
    name: 'בחירת חומרים הלבשה',
    sort_order: 6,
    tasks: [
      { name: 'בחירת תאורה דקורטיבית', estimated_days: 14, sort_order: 1,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת אקססוריז',        estimated_days: 7,  sort_order: 2,  subtasks: [] },
      { name: 'בחירת אומנות',          estimated_days: 7,  sort_order: 3,  subtasks: [] },
      { name: 'בחירת כלי מטבח וסדינים', estimated_days: 7, sort_order: 4,  subtasks: [] },
      { name: 'בחירת מדפים',           estimated_days: 7,  sort_order: 5,  subtasks: [] },
      { name: 'בחירת וילונות',         estimated_days: 14, sort_order: 6,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת ריהוט',           estimated_days: 21, sort_order: 7,  subtasks: MATERIAL_SUBTASKS },
      { name: 'בחירת שטיחים',          estimated_days: 7,  sort_order: 8,  subtasks: [] },
      { name: 'בחירת אביזרי אמבטיה',  estimated_days: 7,  sort_order: 9,  subtasks: [] },
      { name: 'בחירת פריטי נוי',      estimated_days: 7,  sort_order: 10, subtasks: [] },
    ],
  },
]
