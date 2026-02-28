# Operations

## מצב נוכחי
תיקיית הפרויקט מכילה כעת שלד אפליקציית React + Vite בר הרצה, יחד עם תיעוד מלא וסקיל עבודה.

## יעד תפעולי (Rewrite)
תיעוד זה מגדיר סטנדרט תפעולי מחייב לריצה, בנייה, בדיקות, פריסה, גיבוי ושחזור.

## דרישות מקדימות
- Node.js 20+
- npm 10+
- פרויקט Firebase פעיל (Firestore + Hosting + Storage)
- קובץ `.env` מבוסס `.env.example`

## הרצה מקומית
```bash
npm install
npm run dev
```
- כתובת ברירת מחדל: `http://localhost:5173`
- מצב ברירת מחדל לפריסה: Firebase בלבד

## בנייה
```bash
npm run build
npm run preview
```

## בדיקות
```bash
npm run test        # unit
npm run test:ui     # e2e/ui
npm run lint
npm run format:check
```

## פריסה
1. לעדכן `.firebaserc` עם מזהה פרויקט Firebase
2. לוודא משתני סביבה `VITE_FIREBASE_*` מוגדרים
3. להריץ `npm run deploy:firebase`
4. להריץ smoke test על מסכים קריטיים

## Emulators (אופציונלי)
```bash
npm run firebase:emulators
```

## גיבוי נתונים
- גיבוי אפליקטיבי דרך כפתור גיבוי (admin)
- פורמט קובץ: JSON עם entities + statistics
- תדירות מומלצת: יומי בסוף יום עבודה

## שחזור נתונים
1. לקחת קובץ גיבוי JSON תקין
2. לבצע import ישות-אחר-ישות בסדר:
   - Food
   - DeficiencySymptom
   - Vitamin
   - Disease
   - Article
3. להריץ ולידציית קשרים דו-כיווניים

## ניטור ותקלות
- כל שגיאת import נשמרת בדו"ח added/skipped
- שגיאות AI חייבות להופיע למשתמש (לא רק console)
- שגיאות build/lint/test חוסמות מיזוג

## Runbook בדיקה מהירה אחרי פריסה
1. התחברות כ-admin
2. פתיחת כל מסך ראשי פעם אחת
3. יצירה + מחיקה של רשומת בדיקה בישות אחת
4. בדיקת import/export בישות אחת
5. בדיקת גיבוי מלא

## סיכונים תפעוליים
- תלות בשירות AI חיצוני (דורש `VITE_AI_ENDPOINT_URL` במצב Firebase)
- חלק מהלוגיקות ההיסטוריות מבוססות שדות legacy
