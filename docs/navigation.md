# Navigation

## מקור
- `supplement-app-system-docs.md`

## מפת ניווט ראשית
- `Vitamins` (מסך ראשי)
- `EffectsCases` (תופעות ומקרים)
- `GlobalSearch`
- `Diseases`
- `DeficiencySymptoms`
- `Foods`
- `Articles`
- `UserManagement` (admin בלבד)
- `PageNotFound` (fallback)

## מסכי עריכה
- `VitaminEdit`
  - חדש: ללא query param
  - עריכה: `?id=<vitaminId>`
- `DiseaseEdit`
  - חדש: ללא query param
  - עריכה: `?id=<diseaseId>`
- `ArticleEdit`
  - חדש: ללא query param
  - עריכה: `?id=<articleId>`

## חוקי ניווט והרשאות
- Header sticky עם ניווט Desktop + Mobile
- קישורי admin מוצגים רק כאשר `currentUser.role === 'admin'`
- `UserManagement` מוגן ברמת UI

## מסכים מוגנים
- `UserManagement`: admin בלבד
- כפתור גיבוי ב-Layout: admin בלבד

## קישורים עמוקים (Deep Links)
- נתמכים בדפי עריכה דרך `?id=`
- מוכר פער ידוע: ממסך GlobalSearch קיים שימוש ב-`vitaminId` במקום `id` (דורש תיקון ב-rewrite)

## כללי fallback
- נתיב לא מזוהה -> `PageNotFound`

## הנחות/סיכונים
- מפת routes בפועל בקוד המקור אינה זמינה בפרויקט זה, ולכן נשענת על מסמך המיפוי בלבד
