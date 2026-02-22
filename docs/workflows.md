# Workflows

## מקור
- `supplement-app-system-docs.md`

## Workflow 1: יצירה/עדכון תוסף
1. משתמש פותח `VitaminEdit` (חדש או `?id=`)
2. המערכת קוראת:
   - `Vitamin` (אם עריכה)
   - `Food.list()`
   - `DeficiencySymptom.list()`
3. המשתמש מעדכן טופס ושומר
4. כתיבה:
   - `Vitamin.create` או `Vitamin.update`
   - סנכרון `DeficiencySymptom.vitaminIds[]` בהתאם ל-`deficiencySymptoms[]`
5. Invalidations:
   - `['vitamins']`
   - `['symptoms']`
6. ניווט חזרה לרשימת Vitamins

## Workflow 2: עדכון תסמין וסנכרון מזונות
1. משתמש פותח `DeficiencySymptoms` ובוחר עריכה
2. המערכת קוראת `DeficiencySymptom`, `Food`, `Vitamin`
3. שמירה מבצעת `DeficiencySymptom.update`
4. סנכרון דו-כיווני:
   - הוספת symptom ל-`Food.deficiencySymptoms[]` עבור כל `foodId` חדש
   - הסרת symptom ממזונות שהוסרו
5. Invalidations:
   - `['symptoms']`
   - `['foods']`

## Workflow 3: יצירה/עדכון פרוטוקול מחלה
1. משתמש פותח `DiseaseEdit`
2. המערכת קוראת `Disease` (אם עריכה), `Vitamin`, `DeficiencySymptom`
3. בחירת תוספים/תסמינים וקישורי מוצרים
4. כתיבה: `Disease.create` או `Disease.update`
5. Invalidations: `['diseases']`
6. ניווט חזרה ל-`Diseases`

## Workflow 4: יבוא/יצוא
1. משתמש פותח מודל import/export לפי ישות
2. export: יצירת JSON/CSV והורדה מקומית
3. import: parsing קובץ, בדיקת כפילויות, יצירת רשומות חדשות
4. פלט תוצאה: `added[]`, `skipped[]`
5. Invalidations בהתאם לישות

## Workflow 5: גיבוי מערכת (admin)
1. admin לוחץ "גיבוי"
2. קריאה מקבילית לכל הישויות המרכזיות
3. בניית JSON עם metadata + statistics
4. הורדת קובץ `backup_YYYY-MM-DD_timestamp.json`

## נקודות סיכון בזרימות
- סנכרון דו-כיווני תלוי לולאות עוקבות ועלול להיות איטי
- יבוא מסוים לא משלים סנכרון יחסים דו-כיווני
- שגיאות AI בחלק מהמסכים שקטות (console בלבד)
