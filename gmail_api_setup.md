## הגדרת Gmail API — הוראות לקלואי

### שלב 1: כניסה
נכנסים לאתר **console.cloud.google.com**
מתחברים עם **הג'ימייל האישי שלך** (לא hello@yaelsiso.com)

### שלב 2: יצירת פרויקט
למעלה משמאל, לוחצים על **"Select a project"** ואז **"New Project"**
שם הפרויקט: **Yael Siso Studio**
ב-Parent resource לוחצים **Browse** ובוחרים **No organization**
לוחצים **Create**

### שלב 3: הפעלת Gmail API
בשורת החיפוש למעלה, כותבים **Gmail API**
לוחצים על התוצאה ואז על הכפתור הכחול **"Enable"**

### שלב 4: הגדרת מסך הרשאות
בתפריט השמאלי: **APIs & Services** ואז **OAuth consent screen**
לוחצים **Get Started**
שם האפליקציה: **Yael Siso Studio**
מייל: **הג'ימייל האישי שלך** (אותו מייל שנכנסת איתו)
קהל: **External**
שומרים ועוברים הלאה

### שלב 5: יצירת מפתחות
בתפריט השמאלי: **APIs & Services** ואז **Credentials**
לוחצים **"+ Create Credentials"** ואז **"OAuth client ID"**
סוג: **Web application**
שם: **Yael Siso App**
תחת **Authorized redirect URIs** לוחצים **"+ Add URI"** ומכניסים:
**https://yaelsiso.vercel.app/auth/callback**
לוחצים **Create**

### שלב 6: שליחה
קופץ חלון עם **Client ID** ו-**Client Secret**
מעתיקים את שניהם ושולחים לטליה

זהו!
