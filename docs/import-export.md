# Import / Export Contracts

## מקור
- `supplement-app-system-docs.md`

## עקרונות כלליים
- פורמטים נתמכים: JSON, CSV (תלוי ישות)
- תוצאת ייבוא סטנדרטית: `{ added: string[], skipped: string[] }`
- שדות לא מוכרים: מתעלמים
- שדות חסרים: ברירת מחדל ריקה

## Vitamins
- Export:
  - JSON: `vitamins[]` + לעיתים `foods`
  - CSV: כולל שדות טקסט ושדות מערך כסטרינג
- Duplicate rule:
  - לפי `vitaminNameHe` או `vitaminNameEn`
- הערה:
  - ייבוא לא תמיד משלים סנכרון יחסים דו-כיווני

## DeficiencySymptoms
- Export:
  - JSON/CSV
  - כולל לעיתים שדות נגזרים (כמו `relatedVitamins`)
- Duplicate rule:
  - לפי `symptomNameHe`
- מצב ייבוא יחסים:
  - תמיכה בייבוא קשר תסמין-מזון בפורמט ייעודי (מפתחות בעברית)

## Foods
- Export:
  - JSON/CSV
- Duplicate rule:
  - לפי `foodNameHe`
- הערה:
  - קיימים יצואי CSV שלא כוללים כל שדות הקשר (דורש זהירות)

## Diseases
- Export:
  - JSON enriched / CSV
- Duplicate rule:
  - לפי `diseaseNameHe`
- הערה:
  - CSV עלול לאבד חלק משדות היחסים

## Articles
- Export:
  - JSON/CSV
- Duplicate rule:
  - לפי `titleHe`
- הערה:
  - CSV לא שומר בהכרח `foodIds`

## Users
- Export בלבד (ללא import)

## דוגמאות מבנה (מינימלי)
### Vitamin JSON Row
```json
{
  "vitaminNameHe": "ויטמין D",
  "vitaminNameEn": "Vitamin D",
  "deficiencySymptoms": [],
  "foodSources": []
}
```

### Food JSON Row
```json
{
  "foodNameHe": "תפוז",
  "foodNameEn": "Orange",
  "deficiencySymptoms": []
}
```

### Disease JSON Row
```json
{
  "diseaseNameHe": "פרוטוקול לדוגמה",
  "supplementIds": [],
  "deficiencySymptomIds": [],
  "productLinks": []
}
```

## דרישות איכות ל-rewrite
- אחידות פורמט יצוא/ייבוא בין ישויות
- בדיקת סכימה לפני כתיבה
- דו"ח ייבוא אחיד עם שורות שגיאה מפורטות
- שמירה על כללי כפילויות קיימים

## הנחות/סיכונים
- חלק מפורמטי CSV הנוכחיים מאבדים שדות יחסים
