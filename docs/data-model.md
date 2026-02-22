# Data Model

## מקור
- `supplement-app-system-docs.md`
- אימות API ציבורי לישויות תוכן (Vitamin/Food/DeficiencySymptom/Disease/Article)

## ישויות

### Vitamin
- PK: `id`
- שדות מערכת: `created_date`, `updated_date`, `created_by`, `created_by_id`, `is_sample`
- שדות תוכן:
  - `vitaminNameHe` (required)
  - `vitaminNameEn`, `vitaminNickHe`, `vitaminNickEn`
  - `activeForm`, `solubility`, `source`
  - `dosageUpTo1Year`, `dosageUpTo6`, `dosageUpTo10`, `dosageUpTo18`, `dosageAdults`, `dosagePregnancy`, `dosageBirth`, `dosageRDA`
  - `actionDescription` (תצוגה: `פעולות בגוף`)
  - `labTestDeficiencyDetails` (שדה יעד פעיל לבדיקות מעבדה במצב UI מאוחד)
  - `labTestDeficiencyDescription` (legacy לקריאה בלבד; בתהליך עריכה הערך מוזג ל-`labTestDeficiencyDetails`)
  - `labTestDeficiency` (עלול להופיע בלקוחות ישנים בלבד; לא שדה persisted בסכמה הנוכחית)
  - `foodSources[]` (IDs ל-Food)
  - `deficiencySymptoms[]` (IDs ל-DeficiencySymptom)
  - `combinationVitaminIds[]` (self-reference)
  - `conflictVitamins[]` אובייקטים `{ vitaminId, explanation }`
  - `companyName`, `companyUrl`, `toxicity`, `sideEffects`, `caseStory`, `notes`

### Food
- PK: `id`
- שדות מערכת: `created_date`, `updated_date`, `created_by`, `created_by_id`, `is_sample`
- שדות תוכן:
  - `foodNameHe` (required)
  - `foodNameEn`, `foodCategory`, `dosage`, `imageUrl`
  - `description`, `notes`
  - `deficiencySymptoms[]` (IDs ל-DeficiencySymptom)

### DeficiencySymptom
- PK: `id`
- שדות מערכת: `created_date`, `updated_date`, `created_by`, `created_by_id`, `is_sample`
- שדות תוכן:
  - `symptomNameHe` (required)
  - `symptomNameEn`
  - `sortOrder` (number)
  - `vitaminIds[]` (IDs ל-Vitamin)
  - `foodIds[]` (IDs ל-Food)
  - `tags[]`
  - `notes`

### Disease
- PK: `id`
- שדות מערכת: `created_date`, `updated_date`, `created_by`, `created_by_id`, `is_sample`
- שדות תוכן:
  - `diseaseNameHe` (required)
  - `sortOrder`
  - `diseaseCharacteristicsHe`
  - `supplementIds[]` (IDs ל-Vitamin)
  - `deficiencySymptomIds[]` (IDs ל-DeficiencySymptom)
  - `productLinks[]` אובייקטים `{ productName, productUrl }`
  - `notes`

### Article
- PK: `id`
- שדות מערכת: `created_date`, `updated_date`, `created_by`, `created_by_id`, `is_sample`
- שדות תוכן:
  - `titleHe` (required)
  - `titleEn`, `url`, `summary`
  - `foodIds[]` (IDs ל-Food)

### User (Base44 built-in)
- PK: `id`
- שדות: `email`, `full_name`, `created_date`, `role`

## קשרים
- Vitamin N..N DeficiencySymptom (דרך `deficiencySymptoms[]` ו-`vitaminIds[]`)
- Food N..N DeficiencySymptom (דרך `deficiencySymptoms[]` ו-`foodIds[]`)
- Disease N..N Vitamin (דרך `supplementIds[]`)
- Disease N..N DeficiencySymptom (דרך `deficiencySymptomIds[]`)
- Article N..N Food (דרך `foodIds[]`)
- Vitamin N..N Vitamin (דרך `combinationVitaminIds[]`, `conflictVitamins[]`)

## טיפוסים וכללי חובה
- שדות חובה ידועים: `vitaminNameHe`, `foodNameHe`, `symptomNameHe`, `diseaseNameHe`, `titleHe`
- שדות יחסים נשמרים כ-`string[]` (Soft FK)
- שדות Rich Text נשמרים כמחרוזת HTML

## שדות Legacy
- Vitamin עלול להגיע ב-`v.data` (נדרש flatten)
- legacy מחסור מעבדה: `labTestDeficiencyDescription` + `labTestDeficiencyDetails`
  - כלל מיזוג: ערכים קיימים בשדות legacy חייבים לעבור ל-`labTestDeficiencyDetails` ללא אובדן מידע
  - כלל כתיבה: בעריכה חדשה כותבים רק ל-`labTestDeficiencyDetails` ומנקים `labTestDeficiencyDescription`

## אינדקסים מומלצים ל-rewrite
- על שמות לחיפוש:
  - Vitamin: `vitaminNameHe`, `vitaminNameEn`
  - Food: `foodNameHe`, `foodNameEn`
  - DeficiencySymptom: `symptomNameHe`, `symptomNameEn`
  - Disease: `diseaseNameHe`, `sortOrder`
  - Article: `titleHe`, `titleEn`
- על `created_date` למיונים כרונולוגיים

## הנחות/סיכונים
- ללא סכמת backend רשמית בקבצים מקומיים, המודל נקבע לפי המיפוי וה-API הנצפה
