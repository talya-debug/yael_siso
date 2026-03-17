// ===== סיד: טעינת תכולות מהאקסל לסופאבייס =====
// הרצה: node seed_contents.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ztbckbcwefnjpwgrdwkl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmNrYmN3ZWZuanB3Z3Jkd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3OTQsImV4cCI6MjA4OTE0Njc5NH0.SOjhaVVzxrFYlwVWnopo8BBUPYpZDgGCRLJ0uN9QIss'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 16 תת-משימות סטנדרטיות לבחירת חומרים
const STANDARD_16_SUBTASKS = [
  'תיאום עם הלקוח',
  'תיאום עם החנות',
  'שליחת רפרנסים מראש לחנות לצורך היכרות עם הלקוח',
  'הדפסת תוכניות לקראת הפגישה',
  'להוציא כמויות לפגישה',
  'סיכום פגישה לאחר הביקור בחנות עם תמונות',
  'שליחת מייל לחנות עם כל הפרטים והבחירות לצורך הצעת מחיר מדויקת',
  'מעבר על הצעות מחיר ווידוא שאין טעויות',
  'תיוק בתיקיית לקוח ובאקסל תקציב',
  'שליחת מייל מרוכז ללקוח עם 3 החלופות לספקים',
  'בחירת ספק על ידי הלקוח וכתב כמויות',
  'תיוק כתב כמויות',
  'שליחת מייל לספק הנבחר עם כתב הכמויות המתוקן והחומרים הנבחרים',
  'מבקשים הצעה מתוקנת',
  'חתימת לקוח ובקשת תשלום ראשון',
  'תיוק',
]

// מבנה תכולות מהאקסל
const SCOPE_TREE = [
  {
    phase: 'התנעת פרויקט', sort: 1,
    tasks: [
      { name: 'שליחת הצעת מחיר למנהל פרויקט / מפקח ללקוח', subtasks: [] },
      { name: 'שליחת הצעת מחיר', subtasks: [] },
      { name: 'חתימת לקוח על הצעת מחיר', subtasks: [] },
      { name: 'מילוי טופס פרטי לקוח', subtasks: [] },
      { name: 'הצעת מחיר כמאי', subtasks: [] },
      { name: 'בחירת מנהל פרויקט, שרטט ותלת מימד', subtasks: [] },
      { name: 'שליחת הצעת מחיר של הדמיות תלת מימד ללקוח', subtasks: [] },
    ]
  },
  {
    phase: 'תכנון ראשוני', sort: 2,
    tasks: [
      { name: 'מדד', subtasks: [] },
      {
        name: 'פגישת ליבון צרכים',
        subtasks: [
          'תיאום פגישה עם הלקוחות בת שעתיים',
          'בקשה לאיסוף השראות מפינטרסט - שליחת הודעת תיאום הכוללת הכנה לפגישה',
          'שליחת קובץ ליבון צרכים מראש',
          'שליחת סיכום פגישה במייל לאישור הלקוח',
        ]
      },
      {
        name: 'פגישה להצגת חלופות תוכניות העמדה ו-look & feel',
        subtasks: [
          'תיאום פגישה עם הלקוח להצגת החלופות',
          'תיאום פגישה צוותית לסיעור מוחות של look and feel ואופציות לתוכנית העמדה',
          'תיאום פגישה להצגת החלופות להעמדה',
          'תיקוני חלופות',
          'גרפיקה לחלופות',
          'דיוק look and feel לפי חלופות',
          'הכנת מצגת לקראת הפגישה',
          'פגישה פנימית לדיוק המצגת',
          'תיקוני מצגת לקראת פגישה',
          'תיקונים לאחר פגישה עם לקוח',
          'שליחת מצגת מתוקנת ללקוח',
          'תיוק המצגת הסופית בתיקייה',
          'תיאום יומיים מרוכזים עם הלקוח לחנויות + תיאום מעבר על צק ליסט חשמל',
        ]
      },
    ]
  },
  {
    phase: 'תוכניות עבודה - ראשוני', sort: 3,
    tasks: [
      { name: 'יצירת כתב כמויות', subtasks: [] },
      {
        name: 'תוכנית הריסה',
        subtasks: [
          'פגישה עם השרטט להעברת מידע על הפרויקט',
          'העברת התוכנית לאישור מנהלת פרויקט',
          'תיוק בתיקיית לקוח',
        ]
      },
      {
        name: 'תוכנית בנייה',
        subtasks: [
          'פגישה עם השרטט להעברת מידע על הפרויקט',
          'העברת התוכנית לאישור מנהלת פרויקט כולל ווידוא מפרט של דלתות',
          'תיוק בתיקיית לקוח',
        ]
      },
      {
        name: 'תוכנית אינסטלציה',
        subtasks: [
          'פגישה עם השרטט להעברת מידע על הפרויקט',
          'העברת התוכנית לאישור מנהלת פרויקט כולל העברת מפרטים של הכלים עצמם',
          'תיוק בתיקיית לקוח',
        ]
      },
      {
        name: 'תוכנית חשמל',
        subtasks: [
          'פגישה עם השרטט - לעבור על צק ליסט חשמל של לקוח',
          'במקרה של חשמל חכם - לקבל תוכנית מהספק',
          'קבלת הנחיות מאודיו ווידאו',
          'קבלת הנחיות מאזעקה אם יש',
          'בחירת דגם שקעים עם הלקוח',
          'סגירת תוכנית וספק מטבחים ומפרטים של מוצרי חשמל',
          'העברת התוכנית לאישור מנהלת פרויקט',
          'תיוק בתיקיית לקוח',
        ]
      },
      {
        name: 'תוכנית תאורה',
        subtasks: [
          'פגישה עם יועץ תאורה מטעם הספק + תיעוד הדגמים',
          'פגישה עם השרטט להעברת מידע על הפרויקט',
          'העברת התוכנית לאישור מנהלת פרויקט - כולל מעגלי תאורה והדלקות',
          'תיוק בתיקיית לקוח',
        ]
      },
      {
        name: 'תוכנית מיזוג',
        subtasks: [
          'קבלת תוכנית מיועץ או קבלן מיזוג - בחירת גרילים',
          'פגישה עם השרטט להעברת מידע על הפרויקט',
          'העברת התוכנית לאישור מנהלת פרויקט',
          'תיוק בתיקיית לקוח',
        ]
      },
      {
        name: 'תוכנית תקרה',
        notes: 'מיזוג + תאורה - לציין אם יש פרט ניתוק וחיזוקים בתקרה',
        subtasks: []
      },
      {
        name: 'תוכנית ריצוף',
        notes: 'לאחר בחירת ריצוף - לשים לב לשקעים רצפתיים, פרט פנאל, ספי הפרדה',
        subtasks: []
      },
      {
        name: 'פריסות חדרי רחצה',
        subtasks: [
          'לציין אביזרי אמבטייה, חימום לקירות, ניתוקים, אביזרי חשמל, פרופיל פינה, מקלחון שקוע, גודל מראה, חיזוק לארונות אמבטייה',
        ]
      },
    ]
  },
  {
    phase: 'תוכניות עבודה - מתקדם', sort: 4,
    tasks: [
      { name: 'סקיצה א׳ לפגישה', subtasks: [] },
      { name: 'תוכניות נגרות', subtasks: [] },
    ]
  },
  {
    phase: 'בחירת חומרים בסיסיים', sort: 5,
    tasks: [
      { name: 'בחירת כלים סניטריים', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת ריצוף כולל מרפסות', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת ריצוף וחיפוי חדרי רחצה', subtasks: STANDARD_16_SUBTASKS },
      { name: 'תכנון ובחירת מטבח', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת נגרות', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת פופי תאורה', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת משטח עבודה חדרי רחצה', subtasks: STANDARD_16_SUBTASKS },
      { name: 'משטח חוץ', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת שקעים ומפסקים', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת אלומיניום / חלונות', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת חיפוי חימום תת רצפתי', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת קרניז / פאנל / דגם', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת דלתות', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת דלת כניסה', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת אבן / חיפוי חוץ', subtasks: STANDARD_16_SUBTASKS },
    ]
  },
  {
    phase: 'בחירת חומרים הלבשה', sort: 6,
    tasks: [
      { name: 'בחירת תאורה דקורטיבית', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת אקססוריז להלבשת הבית', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת אומנות', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת כלי מטבח וסדינים', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת מדפים', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת וילונות', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת ריהוט', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת שטיחים', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת אביזרי אמבטיה', subtasks: STANDARD_16_SUBTASKS },
      { name: 'בחירת פריטי נוי', subtasks: STANDARD_16_SUBTASKS },
    ]
  },
]

async function seed() {
  console.log('🌱 מתחיל טעינת תכולות...')

  // מנקה קיים
  await supabase.from('proposal_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('contents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('🧹 נוקה קיים')

  for (const phaseData of SCOPE_TREE) {
    // יוצר שלב ראשי
    const { data: phase, error: phaseErr } = await supabase
      .from('contents')
      .insert({ name: phaseData.phase, level: 'phase', sort_order: phaseData.sort, category: phaseData.phase })
      .select()
      .single()

    if (phaseErr) { console.error('❌ שגיאה בשלב:', phaseData.phase, phaseErr); continue }
    console.log(`✅ שלב: ${phase.name}`)

    for (let ti = 0; ti < phaseData.tasks.length; ti++) {
      const taskData = phaseData.tasks[ti]

      // יוצר משימה (מאקרו)
      const { data: task, error: taskErr } = await supabase
        .from('contents')
        .insert({
          name: taskData.name,
          level: 'task',
          parent_id: phase.id,
          notes_text: taskData.notes || null,
          sort_order: ti,
          category: phaseData.phase,
        })
        .select()
        .single()

      if (taskErr) { console.error('  ❌ שגיאה במשימה:', taskData.name, taskErr); continue }
      console.log(`  ➤ משימה: ${task.name} (${taskData.subtasks.length} תתי-משימות)`)

      // יוצר תתי-משימות (מיקרו)
      for (let si = 0; si < taskData.subtasks.length; si++) {
        const { error: subErr } = await supabase
          .from('contents')
          .insert({
            name: taskData.subtasks[si],
            level: 'subtask',
            parent_id: task.id,
            sort_order: si,
            category: phaseData.phase,
          })

        if (subErr) console.error('    ❌ שגיאה בתת-משימה:', taskData.subtasks[si], subErr)
      }
    }
  }

  console.log('\n🎉 סיד הושלם!')
}

seed().catch(console.error)
