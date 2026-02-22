# AI Integration

## מקור
- `supplement-app-system-docs.md`

## נקודת AI 1: מידע על תוסף (Vitamins)
- טריגר: לחיצה על מידע AI לתוסף
- קלט:
  - `vitaminNameHe`
  - `vitaminNameEn`
- מנגנון: `Core.InvokeLLM`
- פלט: טקסט/Markdown להצגה ב-Modal
- שמירה ל-DB: לא
- טיפול שגיאה: הודעת fallback ידידותית במודל

## נקודת AI 2: תגיות לתסמין (DeficiencySymptoms)
- טריגר: "AI תגיות" לתסמין
- קלט:
  - `symptomNameHe`
  - `symptomNameEn` (אופציונלי)
- מנגנון: `Core.InvokeLLM`
- פלט: רשימת תגיות (string list) אחרי split בפסיקים
- שמירה ל-DB: כן, לשדה `tags[]` ב-DeficiencySymptom
- טיפול שגיאה: `console.error` (נדרש שיפור ב-rewrite)

## סכמת קלט/פלט (ל-rewrite מומלץ)
### Vitamin AI
- Input schema:
  - `vitaminNameHe: string`
  - `vitaminNameEn?: string`
- Output schema:
  - `content: string`

### Symptom Tags AI
- Input schema:
  - `symptomNameHe: string`
  - `symptomNameEn?: string`
- Output schema:
  - `tags: string[]`

## דרישות איכות ל-rewrite
- הוספת validation לפלט AI לפני שמירה
- הוספת retry + timeout מבוקר
- הוספת telemetry לשגיאות AI
- יישור התנהגות שגיאה בין כל נקודות AI

## הנחות/סיכונים
- תלויות צד שלישי (LLM) יכולות להחזיר תשובות לא עקביות
