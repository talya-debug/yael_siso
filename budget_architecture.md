# ארכיטקטורת מודול ניהול תקציב לקוח

## דרישות הלקוחה (מה קלואי אמרה)
1. טבלת תקציב פר לקוח — כמו אקסל BITTON BUDGET
2. 10-15 לקוחות פעילים במקביל
3. מייל בקשת תשלום אוטומטי ללקוח
4. הלקוח רואה סקירת תקציב כללית (כמה שולם, כמה נשאר)
5. חשבוניות — PDF מהספק, הבנות מעלות, הלקוח מוריד
6. פרטי בנק נשמרים על הספק פעם אחת

---

## Database — טבלאות חדשות

### טבלה: `budgets`
תקציב כולל לפרויקט.

| עמודה | סוג | הסבר |
|-------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | לאיזה פרויקט |
| public_token | text UNIQUE | טוקן ללינק הציבורי של הלקוח |
| created_at | timestamptz | |

קשר: project 1 → 1 budget

### טבלה: `budget_items`
שורה בתקציב = ספק/תחום עבודה.

| עמודה | סוג | הסבר |
|-------|------|-------|
| id | uuid PK | |
| budget_id | uuid FK → budgets | |
| supplier_id | uuid FK → suppliers (nullable) | ספק מהמערכת (אופציונלי) |
| subject | text | נושא (חשמל, נגרות, מזגנים...) |
| price_excl_vat | numeric | מחיר לפני מע"מ |
| vat_rate | numeric DEFAULT 18 | אחוז מע"מ |
| price_incl_vat | numeric GENERATED | חישוב אוטומטי |
| payment_terms | text | תנאי תשלום (טקסט חופשי) |
| notes | text | הערות |
| sort_order | int | סדר הצגה |
| created_at | timestamptz | |

קשר: budget 1 → N budget_items

### טבלה: `budget_payments`
לוג תשלומים — כל תשלום חלקי שבוצע.

| עמודה | סוג | הסבר |
|-------|------|-------|
| id | uuid PK | |
| budget_item_id | uuid FK → budget_items | לאיזו שורה |
| amount | numeric | סכום ששולם |
| payment_date | date | תאריך תשלום |
| notes | text | הערה (מספר חשבונית וכו') |
| created_at | timestamptz | |

קשר: budget_item 1 → N budget_payments
סה"כ שולם = SUM(amount) מכל ה-payments של השורה
יתרה = price_incl_vat - סה"כ שולם
סטטוס = נגזר: 0 שולם → ממתין, חלקי → מקדמה שולמה, מלא → שולם במלואו

### טבלה: `budget_invoices`
חשבוניות/קבלות מצורפות.

| עמודה | סוג | הסבר |
|-------|------|-------|
| id | uuid PK | |
| budget_item_id | uuid FK → budget_items | לאיזו שורה |
| file_path | text | נתיב בStorage |
| file_name | text | שם הקובץ המקורי |
| uploaded_at | timestamptz | |

קשר: budget_item 1 → N budget_invoices
קבצים נשמרים ב-Supabase Storage בbucket: `invoices`

### שינוי בטבלה קיימת: `suppliers`
הוספת שדות פרטי בנק.

| עמודה חדשה | סוג | הסבר |
|------------|------|-------|
| bank_name | text | שם הבנק |
| bank_branch | text | סניף |
| bank_account | text | מספר חשבון |
| bank_iban | text | IBAN |
| bank_swift | text | SWIFT |
| bank_holder | text | שם בעל החשבון |

---

## קשרים בין טבלאות

```
projects (קיים)
  └── budgets (1:1)
        └── budget_items (1:N)
              ├── budget_payments (1:N)
              ├── budget_invoices (1:N)
              └── suppliers (N:1, קיים)
                    └── פרטי בנק (שדות חדשים)
```

---

## Backend — API endpoints

### Vercel Serverless Functions

**שליחת מייל בקשת תשלום:**
`POST /api/send-payment-request`
- מקבל: budget_item_id, client_email
- שולף: שם ספק, סכום, פרטי בנק
- שולח מייל מ-hello@yaelsiso.com דרך Gmail API (כבר מוכן)
- שומר לוג שנשלחה בקשה

**דף ציבורי — API:**
`GET /api/budget/[token]`
- מקבל: public_token
- מחזיר: סיכום תקציב + שורות + חשבוניות
- בלי אותנטיקציה — הטוקן הוא הגישה

**העלאת חשבונית:**
`POST /api/upload-invoice`
- מעלה PDF ל-Supabase Storage
- שומר רשומה ב-budget_invoices

**הורדת חשבונית (ציבורי):**
`GET /api/invoice/[id]`
- מחזיר signed URL מ-Storage
- מוודא שהגישה דרך token תקין

---

## Frontend — מסכים חדשים

### 1. מסך תקציב פרויקט (פנימי — בנות צוות + אדמין)
נגיש מתוך דף פרויקט או כמודול נפרד בסיידבר.

**מה יש בו:**
- סיכום למעלה: סה"כ תקציב / שולם / נשאר / אחוז
- טבלת שורות: נושא, ספק, מחיר (לפני/אחרי מע"מ), שולם, נשאר, סטטוס
- לחיצה על שורה פותחת פאנל עם:
  - לוג תשלומים (הוספה + היסטוריה)
  - חשבוניות מצורפות (העלאה + צפייה)
  - תנאי תשלום + הערות
  - כפתור "שלח בקשת תשלום" → מייל ללקוח
- כפתור הוספת שורה
- כפתור ייבוא מאקסל

**הרשאות:**
- admin: הכל
- team: צפייה + העלאת חשבוניות + סימון תשלום (ללא מחיקה)

### 2. דף ציבורי ללקוח
נתיב: `/budget/[token]`
דף עצמאי, לא דורש התחברות.

**מה הלקוח רואה:**
- לוגו + שם הפרויקט
- סיכום: סה"כ תקציב / שולם / נשאר
- טבלה: נושא, ספק, סטטוס (שולם/ממתין), סכום
- בקשות תשלום פתוחות: סכום + פרטי בנק
- חשבוניות להורדה

**מה הלקוח לא רואה:**
- הערות פנימיות
- אחוזי עמלה
- מידע על לקוחות אחרים

### 3. שדות בנק בכרטיס ספק
הוספת טאב/סקשן "פרטי בנק" בדף ספקים הקיים.

---

## Storage

**Supabase Storage — bucket: `invoices`**
- מבנה תיקיות: `invoices/{budget_item_id}/{filename}`
- הרשאות: העלאה רק למשתמשים מחוברים, הורדה דרך signed URL
- גודל: 1GB חינם (מספיק לאלפי PDFs)

---

## מה כבר קיים ומה חדש

### קיים ומוכן:
- Gmail API (credentials + serverless functions)
- טבלת suppliers עם 319 ספקים
- מבנה פרויקטים ולקוחות
- Pattern של דף ציבורי (worklog, signature)
- Pattern של פאנל צד (TaskPanel בprojects)
- Vercel serverless functions

### חדש לבנות:
- 4 טבלאות DB + שדות בנק על suppliers
- Supabase Storage bucket
- מסך תקציב (frontend)
- דף ציבורי ללקוח (frontend)
- 4 API endpoints
- ייבוא אקסל
