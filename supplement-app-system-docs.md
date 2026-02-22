# 📦 מיפוי מערכת מלא — מאגר תוספים (Supplement Database App)

> **מטרת המסמך:** העברת ידע מלאה למפתח חדש. מסמך זה מתאר את כל הארכיטקטורה, המסכים, הרכיבים, וזרימת הנתונים של האפליקציה.

---

## 🧱 סטאק טכנולוגי

| שכבה | טכנולוגיה |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | react-router-dom v6 |
| State Management | @tanstack/react-query v5 |
| Rich Text | react-quill |
| Icons | lucide-react |
| Backend / DB | Base44 BaaS (entities + auth + integrations) |
| AI | Base44 `Core.InvokeLLM` (OpenAI via Base44) |
| File Storage | Base44 `Core.UploadFile` |
| Notifications | sonner (toast) |
| Language / Direction | עברית, RTL (dir="rtl") |

---

## 👥 תפקידי משתמשים (Roles)

| Role | הרשאות |
|---|---|
| `admin` | כל הגישה — ניהול משתמשים, גיבוי, CRUD מלא, AI |
| `user` | קריאה + עריכה של תוכן (אין גישה לניהול משתמשים) |
| `מטפל` / `מנהל תוכן` | תפקידים מותאמים — ניתן להגדיר ב-entities/User.json |

> **הערה:** בדיקת תפקיד מתבצעת בצד לקוח בלבד (currentUser?.role === 'admin'). אין middleware backend.

---

## 🗃️ ישויות מסד נתונים (Entities)

### 1. `Vitamin`
שדות מרכזיים: `vitaminNameHe`, `vitaminNameEn`, `vitaminNickHe`, `vitaminNickEn`, `activeForm`, `solubility` (מים/שמן), `source` (הגוף/מזון), `dosageUpTo1Year`, `dosageUpTo6`, `dosageUpTo10`, `dosageUpTo18`, `dosageAdults`, `dosagePregnancy`, `dosageBirth`, `dosageRDA`, `actionDescription`, `deficiencySymptoms[]`, `labTestDeficiencyDescription`, `labTestDeficiencyDetails`, `foodSources[]`, `combinationVitaminIds[]`, `conflictVitamins[]` (אובייקט עם `vitaminId` + `explanation`), `toxicity`, `sideEffects`, `caseStory`, `notes`, `companyName`, `companyUrl`

### 2. `DeficiencySymptom`
שדות: `symptomNameHe`, `symptomNameEn`, `sortOrder`, `vitaminIds[]`, `foodIds[]`, `notes`

### 3. `Food`
שדות: `foodNameHe`, `foodNameEn`, `foodCategory`, `dosage`, `imageUrl`, `description`, `deficiencySymptoms[]`, `notes`

### 4. `Disease`
שדות: `diseaseNameHe`, `sortOrder`, `diseaseCharacteristicsHe`, `supplementIds[]`, `deficiencySymptomIds[]`, `productLinks[]` (אובייקט `productName` + `productUrl`), `notes`

### 5. `Article`
שדות: `titleHe`, `titleEn`, `url`, `summary`, `foodIds[]`

### 6. `User` (מובנה ב-Base44)
שדות מובנים: `id`, `email`, `full_name`, `created_date`
שדות עריכה: `role` (admin / user / custom)

---

## 📄 רשימת מסכים

| # | שם מסך | קובץ | גישה |
|---|---|---|---|
| 1 | חיפוש כללי | GlobalSearch | כל המשתמשים |
| 2 | תוספים | Vitamins | כל המשתמשים |
| 3 | עריכת תוסף | VitaminEdit | כל המשתמשים |
| 4 | פרוטוקול טיפול (מחלות) | Diseases | כל המשתמשים |
| 5 | עריכת מחלה | DiseaseEdit | כל המשתמשים |
| 6 | תסמיני חוסר | DeficiencySymptoms | כל המשתמשים |
| 7 | מזונות | Foods | כל המשתמשים |
| 8 | מאמרים | Articles | כל המשתמשים |
| 9 | עריכת מאמר | ArticleEdit | כל המשתמשים |
| 10 | ניהול משתמשים | UserManagement | admin בלבד |
| 11 | 404 | PageNotFound | כולם |

---

## 📱 פירוט מסכים

### 1. GlobalSearch — חיפוש כללי
**מטרה:** חיפוש cross-entity אחד על פני כל הישויות במערכת.

**רכיבים מרכזיים:**
- Input — שדה חיפוש
- FoodDetailModal — מודל פירוט מזון
- כרטיסיות תוצאות לפי קטגוריה (תוספים / מזונות / תסמינים / מאמרים / מחלות)

**ישויות נקראות:** Vitamin, Food, DeficiencySymptom, Article, Disease

**לוגיקת סינון:** useMemo על searchQuery — בדיקת toLowerCase().includes(query) על שדות טקסט מרכזיים

**State מקומי:**
```js
searchQuery: string
selectedFood: Food | null
```

**קישורים:** תוספים → VitaminEdit?id=X, מחלות → DiseaseEdit?id=X, מאמרים → ArticleEdit?id=X

---

### 2. Vitamins — מסך תוספים
**מטרה:** ניהול מלא של רשימת תוספים — צפייה, עריכה, מחיקה, ייבוא/ייצוא, AI.

**רכיבים:**
- VitaminTable — טבלה לדסקטופ (sortable + filterable)
- VitaminCard — כרטיסייה למובייל
- VitaminDetailModal — מודל פירוט מלא
- AIInfoModal — מודל מידע AI
- ImportExportModal (vitamins)
- ColumnSortFilter — פילטר/מיון לכל עמודה

**ישויות נקראות:** Vitamin, Food, DeficiencySymptom, Article, Disease
**ישויות מתעדכנות:** Vitamin (מחיקה)

**AI Integration:**
- קורא ל-Core.InvokeLLM עם prompt על שם הוויטמין
- מחזיר JSON מובנה עם תיאור פעולה, תסמיני חוסר, מקורות מזון וכו'
- מעדכן את ישות Vitamin עם הנתונים

**State מקומי:**
```js
searchQuery: string
sortConfig: { column, direction, filter } | null
columnFilters: object
selectedVitamin: Vitamin | null
detailModalOpen: boolean
aiModalOpen: boolean
deleteVitamin: Vitamin | null
importExportOpen: boolean
```

**ניווט:** כפתור "עריכה" → VitaminEdit?id=X, כפתור "חדש" → VitaminEdit

---

### 3. VitaminEdit — עריכת תוסף
**מטרה:** יצירה ועריכה של רשומת תוסף.

**רכיבים:** VitaminForm, AlertDialog

**ישויות נקראות:** Vitamin (לפי ID), Food, DeficiencySymptom
**ישויות מתעדכנות:** Vitamin (create / update / delete)

**URL Params:** ?id=VITAMIN_ID (אם אין → יצירה חדשה)

**Mutations:** createMutation, updateMutation, deleteMutation → invalidateQueries(['vitamins']) → redirect to Vitamins

---

### 4. Diseases — פרוטוקול טיפול
**מטרה:** הצגת פרוטוקולי טיפול לפי מחלות, כולל קשר לתוספים ותסמינים.

**רכיבים:**
- טבלה (דסקטופ) + DiseaseCard (מובייל)
- DiseaseDetailModal
- VitaminDetailModal
- ImportExportModal (diseases)
- ColumnSortFilter

**ישויות נקראות:** Disease, Vitamin, DeficiencySymptom

**State:**
```js
searchQuery: string
selectedDisease: Disease | null
detailModalOpen: boolean
selectedVitaminForDetails: Vitamin | null
vitaminDetailModalOpen: boolean
importExportOpen: boolean
sortConfig: object | null
```

**ניווט:** כפתור עריכה → DiseaseEdit?id=X, כפתור חדש → DiseaseEdit

---

### 5. DiseaseEdit — עריכת מחלה
**מטרה:** יצירה ועריכה של פרוטוקול מחלה.

**רכיבים:** DiseaseForm, AlertDialog

**ישויות נקראות:** Disease (by ID), Vitamin, DeficiencySymptom
**ישויות מתעדכנות:** Disease (create / update / delete)

**URL Params:** ?id=DISEASE_ID

---

### 6. DeficiencySymptoms — תסמיני חוסר
**מטרה:** ניהול תסמיני חוסר עם קישור דו-כיווני לתוספים ומזונות.

**רכיבים:**
- טבלה (דסקטופ) + כרטיסיות (מובייל)
- Dialog — טופס הוספה/עריכה inline
- VitaminDetailModal
- FoodForm — עריכת מזון מתוך המסך
- ImportExportModal (symptoms)
- ColumnSortFilter

**ישויות נקראות:** DeficiencySymptom, Vitamin, Food
**ישויות מתעדכנות:** DeficiencySymptom (create/update/delete), Food (סינכרון דו-כיווני)

**⚠️ לוגיקה מיוחדת — סינכרון דו-כיווני:**
```
כשמעדכנים symptom עם foodIds חדשים →
  עוברים על כל Food ומוסיפים symptomId אם לא קיים
  עוברים על כל Food שהוסר ממנו → מסירים symptomId
```

**AI Integration:**
- כפתור "AI תגיות" לכל תסמין
- שולח symptomNameHe ל-InvokeLLM
- מחזיר { vitaminIds: [], foodIds: [] } ומעדכן את הישות

**State:**
```js
formOpen: boolean
editingSymptom: Symptom | null
deleteSymptom: Symptom | null
generatingTags: string | null  // symptom ID
importExportOpen: boolean
searchQuery: string
expandedRows: { [key]: boolean }
selectedVitamin: Vitamin | null
selectedFood: Food | null
foodFormOpen: boolean
sortConfig: object | null
isMigratingVitamins: boolean
isMigratingFoods: boolean
```

---

### 7. Foods — מזונות
**מטרה:** ניהול רשימת מזונות עם תמונות, קטגוריות, ומינונים.

**רכיבים:**
- טבלה (דסקטופ) + כרטיסיות (מובייל)
- FoodForm — הוספה/עריכה (dialog inline)
- FoodDetailModal
- ImportExportModal (foods)
- ColumnSortFilter

**ישויות נקראות:** Food, DeficiencySymptom
**ישויות מתעדכנות:** Food (create/update/delete)

**File Upload:** Core.UploadFile לתמונת מזון → שומר imageUrl

---

### 8. Articles — מאמרים
**מטרה:** ניהול מאמרים מדעיים עם קישור למזונות.

**רכיבים:**
- טבלה (דסקטופ) + ArticleCard (מובייל)
- Dialog פירוט מאמר
- FoodForm — עריכת מזון מקושר
- ImportExportModal (articles)
- ColumnSortFilter

**ישויות נקראות:** Article, Food
**ישויות מתעדכנות:** Article (delete), Food (update)

**ניווט:** כפתור "ערוך" → ArticleEdit?id=X, כפתור "חדש" → ArticleEdit

---

### 9. ArticleEdit — עריכת מאמר
**מטרה:** יצירה ועריכה של מאמר.

**רכיבים:** ArticleForm, AlertDialog

**ישויות נקראות:** Article (by ID), Food
**ישויות מתעדכנות:** Article (create/update/delete)

---

### 10. UserManagement — ניהול משתמשים
**מטרה:** הצגת כל המשתמשים ושינוי תפקידים. גישה: admin בלבד.

**רכיבים:**
- Table — רשימת משתמשים
- Select — שינוי תפקיד inline
- ImportExportModal (users)
- Guard component — הצגת הודעת חסימה אם לא admin

**ישויות נקראות:** User
**ישויות מתעדכנות:** User (update role)

**Mutation:** updateRoleMutation → base44.entities.User.update(userId, { role })

**ערכי Role תקינים:** admin, user (+ כל custom role שיוגדר ב-User.json)

---

## 🧭 מפת ניווט (Routing)

```
Layout (Sticky Header Nav)
├── GlobalSearch
├── Vitamins
│   ├── VitaminEdit (New)
│   └── VitaminEdit?id=X (Edit)
├── Diseases
│   ├── DiseaseEdit (New)
│   └── DiseaseEdit?id=X (Edit)
├── DeficiencySymptoms
├── Foods
├── Articles
│   ├── ArticleEdit (New)
│   └── ArticleEdit?id=X (Edit)
├── UserManagement (Admin Only)
└── 404 PageNotFound (fallback)
```

**הערות routing:**
- אין nested routing — כל הדפים flat תחת /pages/
- ניווט עם createPageUrl(pageName) מ-utils.js
- URL params: ?id=X לעריכה
- אין PrivateRoute wrapper — הגנה מתבצעת בתוך כל קומפוננט

---

## 🔄 זרימת נתונים

```
Vitamins     ←→ CRUD    ← Vitamin entity
Diseases     ←→ CRUD    ← Disease entity + Vitamin (read)
DefSymptoms  ←→ CRUD    ← DeficiencySymptom + Food (bidir sync)
Foods        ←→ CRUD    ← Food entity
Articles     ←→ CRUD    ← Article + Food (update)
UserMgmt     ←→ R+Update ← User entity
GlobalSearch → Read All ← All entities

AI Layer (InvokeLLM):
  Vitamins    → prompt → update Vitamin
  DefSymptoms → prompt → update DeficiencySymptom
```

---

## 🏗️ היררכיית רכיבים

```
Layout.js
├── Header (sticky, gradient purple)
│   ├── Logo + Title
│   ├── Desktop Nav (hidden md:flex)
│   │   ├── NavLinks (createPageUrl)
│   │   └── Backup Button (admin only)
│   └── Mobile Menu (hamburger)
│
├── pages/Vitamins
│   ├── Header Section (search + filters + actions)
│   ├── VitaminTable (desktop)
│   │   ├── ColumnSortFilter (per column)
│   │   └── ExpandableCell (long text)
│   ├── VitaminCard[] (mobile)
│   ├── VitaminDetailModal
│   ├── AIInfoModal
│   └── ImportExportModal
│
├── pages/DeficiencySymptoms
│   ├── Header Section
│   ├── Table (desktop) + ColumnSortFilter
│   ├── Cards (mobile)
│   ├── Dialog [Form - Add/Edit]
│   ├── VitaminDetailModal
│   ├── FoodForm (Dialog)
│   └── ImportExportModal
│
├── pages/Diseases
│   ├── Table (desktop) / DiseaseCard[] (mobile)
│   ├── DiseaseDetailModal
│   ├── VitaminDetailModal
│   └── ImportExportModal
│
├── pages/Foods
│   ├── Table / Cards
│   ├── FoodForm (Dialog)
│   ├── FoodDetailModal
│   └── ImportExportModal
│
├── pages/Articles
│   ├── Table / ArticleCard[]
│   ├── Article Detail Dialog
│   ├── FoodForm (Dialog)
│   └── ImportExportModal
│
└── pages/UserManagement
    ├── Access Guard (admin check)
    ├── Table (users + role select)
    └── ImportExportModal
```

### רכיבים לשימוש חוזר (Shared)

| רכיב | שימוש |
|---|---|
| VitaminDetailModal | Vitamins, DeficiencySymptoms, Diseases |
| FoodForm | Foods, DeficiencySymptoms, Articles |
| FoodDetailModal | Foods, GlobalSearch |
| ImportExportModal | כל מודול (גרסה נפרדת לכל entity) |
| ColumnSortFilter | כל מסך טבלה |
| ExpandableCell | VitaminTable |

---

## 🧠 ניהול מצב (State Management)

### מצב גלובלי (React Query Cache)
```js
queryKey: ['vitamins']        // Vitamin[]
queryKey: ['foods']           // Food[]
queryKey: ['symptoms']        // DeficiencySymptom[]
queryKey: ['articles']        // Article[]
queryKey: ['diseases']        // Disease[]
queryKey: ['users']           // User[]
queryKey: ['currentUser']     // User (auth.me())
queryKey: ['vitamin', id]     // Vitamin (single)
```

**Invalidation pattern:** כל mutation מבצע invalidateQueries לאחר הצלחה.

### מצב מקומי (per-page useState)
- searchQuery — בכל מסך
- sortConfig — { column, direction: 'asc'|'desc', filter: 'all'|'filled'|'empty' }
- selectedX — ישות נבחרת לmodal
- *Open — boolean לפתיחת dialog/modal
- expandedRows — { [symptomId-type]: boolean } ב-DeficiencySymptoms

### מצב מחושב (useMemo)
- filteredVitamins / filteredDiseases / filteredSymptoms — פילטור ומיון
- searchResults ב-GlobalSearch — cross-entity search

---

## 🤖 נקודות לוגיקת AI

### 1. AI תוסף (Vitamins → AIInfoModal)
```
Input:  vitaminNameHe, vitaminNameEn
Prompt: בקשה למידע מדעי מפורט על הוויטמין
Output JSON Schema: {
  actionDescription: string,
  deficiencySymptoms: string[],
  foodSources: string[],
  toxicity: string,
  sideEffects: string,
  dosageAdults: string,
  ...
}
→ Update: Vitamin entity
```

### 2. AI תגיות תסמינים (DeficiencySymptoms)
```
Input:  symptomNameHe
Prompt: אילו תוספים ומזונות קשורים לתסמין זה?
Output JSON Schema: {
  vitaminIds: string[],  // IDs קיימים מהDB
  foodIds: string[]      // IDs קיימים מהDB
}
→ Update: DeficiencySymptom entity
```

### 3. Backup (Layout → handleBackup)
```
אין AI — פעולת export JSON בלבד
קורא לכל הישויות במקביל (Promise.all)
יוצר JSON blob ומוריד למחשב
```

---

## 💾 גיבוי מערכת

**מיקום:** Layout.js → handleBackup()

**תהליך:**
1. Promise.all → קריאת כל 6 הישויות
2. בניית אובייקט JSON עם backup_date, backup_version, entities, statistics
3. יצירת Blob → URL.createObjectURL → download אוטומטי
4. שם קובץ: backup_YYYY-MM-DD_timestamp.json

**גישה:** admin בלבד (הכפתור מוסתר למשתמשים אחרים)

---

## ⚠️ מצבי קצה חשובים

| מצב | טיפול |
|---|---|
| משתמש לא admin ניגש ל-UserManagement | Guard component — מסך "אין הרשאה" |
| Vitamin עם data nested vs flat | לוגיקת migration ב-VitaminEdit + Diseases |
| labTestDeficiency (שדה ישן) | migration לשני שדות: labTestDeficiencyDescription + labTestDeficiencyDetails |
| תסמין עם vitaminIds / foodIds ריקים | הצגת "-" במקום רכיב ריק |
| AI loading state | generatingTags / isBackingUp state + toast.loading |
| מובייל — טבלות רחבות | כל מסך טבלה מחזיר כרטיסיות במובייל |

---

## 🔑 נקודות ארכיטקטורה חשובות למפתח חדש

1. **Base44 SDK** — כל קריאות ה-DB דרך base44.entities.EntityName.list/create/update/delete
2. **RTL** — כל הממשק בעברית, dir="rtl" על ה-Layout wrapper
3. **Bi-directional sync** — DeficiencySymptom ↔ Food מסונכרנים ידנית בקוד (לא ב-DB)
4. **Vitamin data flattening** — חלק מהרשומות הישנות שמרו נתונים תחת vitamin.data.X, הקוד מבצע { ...vitamin, ...vitamin.data } בכמה מקומות
5. **Import/Export** — כל entity יש ImportExportModal נפרד בתיקיית components/[entity]/
6. **Pages = flat** — אסור תיקיות תחת pages/
7. **Components = nested OK** — components/vitamins/, components/foods/ וכו'

---

---

## 1️⃣ Inventory מלא של Entities

### Entity: Vitamin

| שם שדה | Type | Required | Default | Nullable | Enum | Relation | Constraint |
|---|---|---|---|---|---|---|---|
| `id` | string | ✅ auto | auto | ❌ | — | — | PK, unique |
| `created_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `updated_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `created_by` | string (email) | ✅ auto | current user email | ❌ | — | → User.email | — |
| `vitaminNameHe` | string | ✅ | — | ❌ | — | — | — |
| `vitaminNameEn` | string | ❌ | — | ✅ | — | — | — |
| `vitaminNickHe` | string | ❌ | — | ✅ | — | — | — |
| `vitaminNickEn` | string | ❌ | — | ✅ | — | — | — |
| `activeForm` | string | ❌ | — | ✅ | — | — | — |
| `solubility` | string (enum) | ❌ | — | ✅ | מים, שמן | — | — |
| `source` | string (enum) | ❌ | — | ✅ | הגוף, מזון | — | — |
| `dosageUpTo1Year` | string | ❌ | — | ✅ | — | — | — |
| `dosageUpTo6` | string | ❌ | — | ✅ | — | — | — |
| `dosageUpTo10` | string | ❌ | — | ✅ | — | — | — |
| `dosageUpTo18` | string | ❌ | — | ✅ | — | — | — |
| `dosageAdults` | string | ❌ | — | ✅ | — | — | — |
| `dosagePregnancy` | string | ❌ | — | ✅ | — | — | — |
| `dosageBirth` | string | ❌ | — | ✅ | — | — | — |
| `dosageRDA` | string | ❌ | — | ✅ | — | — | — |
| `actionDescription` | string (HTML/rich text) | ❌ | — | ✅ | — | — | — |
| `deficiencySymptoms` | string[] | ❌ | [] | ✅ | — | → DeficiencySymptom.id[] | soft FK |
| `labTestDeficiencyDescription` | string | ❌ | — | ✅ | — | — | new field |
| `labTestDeficiencyDetails` | string | ❌ | — | ✅ | — | — | new field |
| `labTestDeficiency` | string | ❌ | — | ✅ | — | — | **LEGACY** deprecated |
| `foodSources` | string[] | ❌ | [] | ✅ | — | → Food.id[] | soft FK |
| `combinationVitaminIds` | string[] | ❌ | [] | ✅ | — | → Vitamin.id[] | self-ref |
| `conflictVitamins` | object[] | ❌ | [] | ✅ | — | — | — |
| `conflictVitamins[].vitaminId` | string | ❌ | — | ✅ | — | → Vitamin.id | — |
| `conflictVitamins[].explanation` | string | ❌ | — | ✅ | — | — | — |
| `companyName` | string | ❌ | — | ✅ | — | — | — |
| `companyUrl` | string (URL) | ❌ | — | ✅ | — | — | — |
| `toxicity` | string | ❌ | — | ✅ | — | — | — |
| `sideEffects` | string | ❌ | — | ✅ | — | — | — |
| `caseStory` | string | ❌ | — | ✅ | — | — | — |
| `notes` | string | ❌ | — | ✅ | — | — | — |

> ⚠️ **Legacy note:** חלק מרשומות ישנות שומרות שדות תחת `vitamin.data.X` (nested object). הקוד עושה `{ ...v, ...v.data }` בכל מקום שקורא Vitamin.

---

### Entity: DeficiencySymptom

| שם שדה | Type | Required | Default | Nullable | Enum | Relation | Constraint |
|---|---|---|---|---|---|---|---|
| `id` | string | ✅ auto | auto | ❌ | — | — | PK |
| `created_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `updated_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `created_by` | string | ✅ auto | current user | ❌ | — | → User.email | — |
| `symptomNameHe` | string | ✅ | — | ❌ | — | — | — |
| `symptomNameEn` | string | ❌ | — | ✅ | — | — | — |
| `sortOrder` | number | ❌ | — | ✅ | — | — | controls list order |
| `vitaminIds` | string[] | ❌ | [] | ✅ | — | → Vitamin.id[] | soft FK, bi-dir |
| `foodIds` | string[] | ❌ | [] | ✅ | — | → Food.id[] | soft FK, bi-dir |
| `tags` | string[] | ❌ | [] | ✅ | — | — | AI-generated strings |
| `notes` | string | ❌ | — | ✅ | — | — | — |

> ⚠️ **sortOrder:** `Vitamin.list('sortOrder')` — ה-API מקבל sort parameter. אם sortOrder=null, מוצג אחרי הממוספרים.

---

### Entity: Food

| שם שדה | Type | Required | Default | Nullable | Enum | Relation | Constraint |
|---|---|---|---|---|---|---|---|
| `id` | string | ✅ auto | auto | ❌ | — | — | PK |
| `created_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `updated_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `created_by` | string | ✅ auto | current user | ❌ | — | → User.email | — |
| `foodNameHe` | string | ✅ | — | ❌ | — | — | — |
| `foodNameEn` | string | ❌ | — | ✅ | — | — | — |
| `foodCategory` | string | ❌ | — | ✅ | — | — | free text, no enum |
| `dosage` | string | ❌ | — | ✅ | — | — | — |
| `imageUrl` | string (URL) | ❌ | — | ✅ | — | — | Base44 CDN URL |
| `description` | string (HTML) | ❌ | — | ✅ | — | — | rich text |
| `deficiencySymptoms` | string[] | ❌ | [] | ✅ | — | → DeficiencySymptom.id[] | soft FK, bi-dir |
| `notes` | string | ❌ | — | ✅ | — | — | — |

---

### Entity: Disease

| שם שדה | Type | Required | Default | Nullable | Enum | Relation | Constraint |
|---|---|---|---|---|---|---|---|
| `id` | string | ✅ auto | auto | ❌ | — | — | PK |
| `created_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `updated_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `created_by` | string | ✅ auto | current user | ❌ | — | → User.email | — |
| `diseaseNameHe` | string | ✅ | — | ❌ | — | — | maxLength: 120 |
| `sortOrder` | number | ❌ | — | ✅ | — | — | controls display order |
| `diseaseCharacteristicsHe` | string | ❌ | — | ✅ | — | — | — |
| `supplementIds` | string[] | ❌ | [] | ✅ | — | → Vitamin.id[] | soft FK |
| `deficiencySymptomIds` | string[] | ❌ | [] | ✅ | — | → DeficiencySymptom.id[] | soft FK |
| `productLinks` | object[] | ❌ | [] | ✅ | — | — | — |
| `productLinks[].productName` | string | ❌ | — | ✅ | — | — | — |
| `productLinks[].productUrl` | string | ❌ | — | ✅ | — | — | — |
| `notes` | string | ❌ | — | ✅ | — | — | — |

---

### Entity: Article

| שם שדה | Type | Required | Default | Nullable | Enum | Relation | Constraint |
|---|---|---|---|---|---|---|---|
| `id` | string | ✅ auto | auto | ❌ | — | — | PK |
| `created_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `updated_date` | datetime | ✅ auto | now() | ❌ | — | — | — |
| `created_by` | string | ✅ auto | current user | ❌ | — | → User.email | — |
| `titleHe` | string | ✅ | — | ❌ | — | — | — |
| `titleEn` | string | ❌ | — | ✅ | — | — | — |
| `url` | string (URL) | ❌ | — | ✅ | — | — | — |
| `summary` | string (HTML) | ❌ | — | ✅ | — | — | rich text |
| `foodIds` | string[] | ❌ | [] | ✅ | — | → Food.id[] | soft FK |

---

### Entity: User (Built-in Base44)

| שם שדה | Type | Required | Default | Nullable | Editable | Notes |
|---|---|---|---|---|---|---|
| `id` | string | ✅ auto | auto | ❌ | ❌ | PK |
| `email` | string | ✅ | — | ❌ | ❌ | unique, set at registration |
| `full_name` | string | ✅ | — | ❌ | ❌ | set at registration |
| `created_date` | datetime | ✅ auto | now() | ❌ | ❌ | — |
| `role` | string | ❌ | 'user' | ❌ | ✅ admin only | enum: admin, user |

---

## 2️⃣ Access Control אמיתי

> **חשוב:** Base44 מאפשר ל-User entity הגנה מובנית. כל שאר ה-Entities — **אין הגנה בצד שרת**. כל המחובר יכול לבצע כל פעולה.

| Entity | List/Read | Create | Update | Delete | הגנת שרת |
|---|---|---|---|---|---|
| Vitamin | כל מחובר | כל מחובר | כל מחובר | כל מחובר | ❌ אין |
| DeficiencySymptom | כל מחובר | כל מחובר | כל מחובר | כל מחובר | ❌ אין |
| Food | כל מחובר | כל מחובר | כל מחובר | כל מחובר | ❌ אין |
| Disease | כל מחובר | כל מחובר | כל מחובר | כל מחובר | ❌ אין |
| Article | כל מחובר | כל מחובר | כל מחובר | כל מחובר | ❌ אין |
| User (list) | admin בלבד | ❌ (Base44 invite only) | admin (role field) / self (own data) | ❌ | ✅ Base44 built-in |
| User (read own) | כל מחובר | — | כל מחובר (self) | ❌ | ✅ Base44 built-in |

> **הגנת UI בלבד (frontend guard):**
> - UserManagement page: `if (currentUser?.role !== 'admin') → render access denied`
> - UserManagement useQuery: `enabled: currentUser?.role === 'admin'`
> - Backup button: `{currentUser?.role === 'admin' && <Button>}`
> - SystemDocs nav: `adminOnly: true` ב-allNavItems

---

## 3️⃣ Triggers, Automations, Integrations

> **אין** scheduled jobs, webhooks, או automations בפרויקט.
> אין backend functions.
> כל לוגיקה רצה בצד לקוח בלבד.

### פעולות ה"אוטומציה" הקיימות (client-side triggers):

| טריגר | מתי רץ | מה עושה | כותב ל-DB |
|---|---|---|---|
| Vitamin create/update | שמירת טופס ב-VitaminEdit | מעדכן DeficiencySymptom.vitaminIds[] דו-כיווני | ✅ DeficiencySymptom |
| Food create/update | שמירת FoodForm | מעדכן DeficiencySymptom.foodIds[] דו-כיווני | ✅ DeficiencySymptom |
| DeficiencySymptom update | שמירת form ב-DeficiencySymptoms | מעדכן Food.deficiencySymptoms[] דו-כיווני | ✅ Food |
| AI tags generate | לחיצת "AI תגיות" | קורא InvokeLLM → שומר tags[] | ✅ DeficiencySymptom.tags |
| AI info fetch | לחיצת "מידע AI" ב-Vitamins | קורא InvokeLLM → מציג בלבד | ❌ (display only) |
| Backup | לחיצת "גיבוי" | קורא כל entities → יוצר JSON → download | ❌ (read only) |
| migrateVitamins | לחיצה ידנית ב-DeficiencySymptoms header | batch update vitaminIds לפי vitamin.deficiencySymptoms[] | ✅ DeficiencySymptom |
| migrateFoods | לחיצה ידנית ב-DeficiencySymptoms header | batch update foodIds לפי food.deficiencySymptoms[] | ✅ DeficiencySymptom, Food |

---

## 4️⃣ Auth & Session

### Login Flow
```
1. משתמש לא מחובר ← Base44 מנהל redirect לדף login מובנה
2. Base44 מאמת credentials
3. Session נשמרת (cookie/token מנוהל ע"י Base44)
4. Redirect חזרה לאפליקציה
```

### Logout Flow
```
base44.auth.logout(redirectUrl?) → מנקה session → redirect
(לא בשימוש בפרויקט זה — אין כפתור logout גלוי בממשק)
```

### Session Handling
- ניהול session: **מלא ע"י Base44** — האפליקציה לא מנהלת tokens ישירות
- קריאת משתמש נוכחי: `base44.auth.me()` — Promise מחזיר User object
- נשמר ב-React Query cache: `queryKey: ['currentUser']`
- **לא נשמר ב-localStorage/sessionStorage** ע"י הקוד

### Roles Source
- Role מוגדר ב-Base44 `User` entity בשדה `role`
- ברירת מחדל: `'user'`
- שינוי role: דרך UserManagement → `base44.entities.User.update(id, { role })`
- ערכים תקינים בקוד: `'admin'`, `'user'`

### כשלון Auth
```
base44.auth.me() → throw error if not authenticated
→ Base44 מנהל redirect לדף login אוטומטית
→ האפליקציה לא מכילה error boundary ספציפי לauth
→ אם currentUser undefined: admin-only features מוסתרות (guards)
```

---

## 5️⃣ File Storage

### שימושים ב-UploadFile בפרויקט

| מיקום בקוד | Entity קשור | שדה יעד | מה מועלה | מבנה URL |
|---|---|---|---|---|
| `components/foods/FoodForm.js` | Food | `imageUrl` | קובץ תמונה (image/*) | Base44 CDN URL |

### תהליך Upload
```js
// FoodForm.js - handleImageUpload()
const { file_url } = await base44.integrations.Core.UploadFile({ file });
handleChange('imageUrl', file_url);
// → שומר file_url על food.imageUrl
```

### מגבלות ידועות מהקוד
- **אין** הגבלת גודל מוגדרת בקוד (Base44 מגביל בצד שרת)
- **אין** validation של סוג קובץ מעבר ל-`accept="image/*"`
- **error handling:** `console.error('Upload failed:', error)` בלבד — שגיאה שקטה למשתמש
- הרשאות גישה לקבצים: public URL (כל מי שיש לו את ה-URL יכול לגשת)

### Entities עם imageUrl
| Entity | שדה | איך מושג ה-URL |
|---|---|---|
| Food | `imageUrl` | UploadFile → URL ישיר |

---

## 6️⃣ AI Layer — כל שימושי InvokeLLM

### 1. AI מידע תוסף — `pages/Vitamins.js → handleAiInfo()`

**Prompt Template:**
```
ספק מידע מקיף בעברית על {vitamin.vitaminNameHe} ({vitamin.vitaminNameEn || ''}).
         
כלול את הנושאים הבאים:
1. תפקידים עיקריים בגוף
2. מקורות תזונתיים בולטים
3. כמות יומית מומלצת
4. תסמיני חוסר
5. אזהרות כלליות (אם קיימות)

הצג את המידע בצורה ברורה ומסודרת.
```

| פרמטר | ערך |
|---|---|
| `add_context_from_internet` | `true` |
| `response_json_schema` | ❌ אין — מחזיר string |
| Parsing | `setAiInfo(response)` — מוצג כ-Markdown בלבד |
| כותב ל-DB | ❌ לא |
| כישלון | catch → `setAiInfo('לא הצלחנו להביא מידע. נסה שוב מאוחר יותר.')` |
| Retry | ❌ אין |

---

### 2. AI תגיות תסמין — `pages/DeficiencySymptoms.js → generateTags()`

**Prompt Template:**
```
עבור התסמין הרפואי "{symptom.symptomNameHe}" (symptom.symptomNameEn אם קיים), 
צור רשימה של עד 10 מילים נרדפות, מונחים קשורים או חלקי גוף שיכולים להיות מושפעים - בעברית בלבד.
         
דוגמאות:
- עבור "ידיים קרות" הוסף: גפיים, אצבעות, כפות ידיים, קור בגפיים, קור בידיים
- עבור "עייפות" הוסף: תשישות, חולשה, אפיסת כוחות, עייפות כרונית, חוסר אנרגיה

החזר רק את המילים מופרדות בפסיקים, ללא הסברים נוספים.
```

| פרמטר | ערך |
|---|---|
| `add_context_from_internet` | ❌ לא מוגדר (false) |
| `response_json_schema` | ❌ אין — מחזיר string |
| Parsing | `response.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)` |
| כותב ל-DB | ✅ `DeficiencySymptom.update(id, { ...symptom, tags: tagsArray })` |
| כישלון | catch → `console.error('Failed to generate tags:', error)` — **שגיאה שקטה** |
| Retry | ❌ אין |

---

## 7️⃣ Import/Export Contracts

### Vitamins ImportExportModal

**Export JSON:**
```json
{
  "vitamins": [
    {
      "vitaminNameEn": "Vitamin D",
      "vitaminNameHe": "ויטמין D",
      "vitaminNickHe": "",
      "vitaminNickEn": "",
      "activeForm": "D3",
      "solubility": "שמן",
      "source": "הגוף",
      "dosageUpTo1Year": "400 IU",
      "dosageUpTo6": "600 IU",
      "dosageUpTo10": "600 IU",
      "dosageUpTo18": "600 IU",
      "dosageAdults": "1000-2000 IU",
      "dosageRDA": "600 IU",
      "actionDescription": "<p>...</p>",
      "deficiencySymptoms": ["symptomId1", "symptomId2"],
      "labTestDeficiencyDescription": "25(OH)D",
      "labTestDeficiencyDetails": "...",
      "foodSources": ["foodId1"],
      "companyName": "",
      "companyUrl": "",
      "toxicity": "",
      "sideEffects": "",
      "caseStory": "",
      "notes": "",
      "combinationVitaminIds": [],
      "conflictVitamins": []
    }
  ],
  "foods": [...]
}
```

**Import:**
- פורמט: JSON (`{ vitamins: [] }`) או CSV
- Duplicate detection: לפי `vitaminNameHe` **ו/או** `vitaminNameEn` (OR condition)
- שדה חסר: נשמר כ-`''` (ריק)
- שדה נוסף: מתעלם — Base44 שומר רק שדות entity ידועים
- relations (IDs): מיובאים כמחרוזות — אם ה-IDs לא קיימים ביעד → dangling references
- **סינכרון bi-dir לא מתבצע ביבוא Vitamins!**

---

### DeficiencySymptoms ImportExportModal — שני מצבי יבוא

**Export JSON:**
```json
{
  "symptoms": [
    {
      "symptomNameHe": "עייפות",
      "symptomNameEn": "Fatigue",
      "sortOrder": 1,
      "tags": ["תשישות", "חולשה"],
      "notes": "",
      "relatedVitamins": ["ויטמין B12", "ויטמין D"]
    }
  ]
}
```
> ⚠️ **relatedVitamins** הוא שדה export-only (נגזר מ-vitamins.deficiencySymptoms[]). **מוסר ביבוא** (`const { relatedVitamins, ...rest } = s`).

**יבוא מצב 1 — תסמינים רגיל:**
- Duplicate: לפי `symptomNameHe`
- שדה חסר: ריק/ברירת מחדל

**יבוא מצב 2 — Relations (קישור תסמין-מזון):**
- מזוהה כאשר `data[0].תסמין_חוסר` קיים (Hebrew key!)
- `data[0].מזון` קיים
- מחפש symptom לפי `symptomNameHe / symptomNameEn`
- מחפש food לפי `foodNameHe / foodNameEn`
- לא נמצא → מוסף לקובץ `not_imported_YYYY-MM-DD.json` ומוריד אוטומטית

---

### Foods ImportExportModal

**Export JSON:**
```json
{
  "foods": [
    {
      "foodNameHe": "תפוז",
      "foodNameEn": "Orange",
      "foodCategory": "פירות",
      "dosage": "100 גרם",
      "imageUrl": "https://...",
      "notes": "",
      "created_date": "2025-01-01T00:00:00Z"
    }
  ]
}
```
> ⚠️ Export **לא כולל** `description` ו-`deficiencySymptoms[]` — שדות אלה נחתכים ביצוא.
> Duplicate: לפי `foodNameHe` בלבד.
> **סינכרון bi-dir לא מתבצע ביבוא Foods!** (רק ב-create דרך FoodForm).

---

### Diseases ImportExportModal

**Export JSON (enriched):**
```json
[
  {
    "id": "...",
    "diseaseNameHe": "יתר לחץ דם",
    "sortOrder": 1,
    "diseaseCharacteristicsHe": "...",
    "supplementIds": ["vitId1"],
    "deficiencySymptomIds": ["symId1"],
    "productLinks": [{"productName": "...", "productUrl": "..."}],
    "notes": "",
    "supplementNames": ["ויטמין D"],
    "symptomNames": ["עייפות"]
  }
]
```
> `supplementNames` ו-`symptomNames` — export-only, לא מיובאים.
> Import CSV: מזוהים רק שדות `diseaseNameHe, sortOrder, diseaseCharacteristicsHe, notes` — supplementIds מאבדים.
> Duplicate: לפי `diseaseNameHe`.
> Toast: `toast.success()`, `toast.warning()`, `toast.error()`.

---

### Articles ImportExportModal

**Export JSON:**
```json
[
  {
    "id": "...",
    "titleHe": "כותרת",
    "titleEn": "Title",
    "url": "https://...",
    "summary": "<p>...</p>",
    "foodIds": ["foodId1"]
  }
]
```
> Duplicate: לפי `titleHe`.
> CSV Import: מזוהים רק `titleHe, titleEn, url, summary` — foodIds מאבדים.
> Toast: `toast.success()`, `toast.warning()`, `toast.error()`.

---

### Users ImportExportModal

> **יצוא בלבד** — אין יבוא.
> CSV headers: שם, אימייל, הרשאה, תאריך הצטרפות
> Toast: `toast.success('הקובץ יוצא בהצלחה')`

---

## 8️⃣ UI Side Effects Registry

### Toast Messages (sonner)

| טקסט מדויק | סוג | מסך/קובץ | אירוע |
|---|---|---|---|
| `'אוסף נתונים לגיבוי...'` | loading (id='backup') | Layout.js | לחיצת גיבוי |
| `'הגיבוי הושלם בהצלחה!'` | success (id='backup') | Layout.js | גיבוי הצליח |
| `'שגיאה ביצירת גיבוי: ' + error.message` | error (id='backup') | Layout.js | גיבוי נכשל |
| `'הקובץ יוצא בהצלחה'` | success | diseases/articles/users ImportExportModal | לחיצת export |
| `'בחר קובץ לייבוא'` | error | diseases/articles ImportExportModal | לחיצת import ללא קובץ |
| `'שגיאה בקריאת הקובץ: ' + error.message` | error | diseases/articles ImportExportModal | JSON.parse נכשל |
| `'יובאו X פרוטוקולים/מאמרים בהצלחה'` | success | diseases/articles ImportExportModal | import הצליח |
| `'X פרוטוקולים/מאמרים דולגו (כבר קיימים)'` | warning | diseases/articles ImportExportModal | duplicates |

### Alert (browser native)
| טקסט מדויק | מסך | אירוע |
|---|---|---|
| `'לכל התסמינים כבר יש תגיות'` | DeficiencySymptoms | generateAllTags() כשלכולם יש tags |
| `'עודכנו X תסמינים עם תוספים!'` | DeficiencySymptoms | migrateVitamins() הושלם |
| `'עודכנו X תסמינים ו-X מזונות!'` | DeficiencySymptoms | migrateFoods() הושלם |

### Confirm (browser native)
| טקסט מדויק | מסך | אירוע |
|---|---|---|
| `'האם לייצר תגיות עבור X תסמינים?'` | DeficiencySymptoms | generateAllTags() |
| `'האם למלא את שדות התוספים מהנתונים הקיימים?'` | DeficiencySymptoms | migrateVitamins() |
| `'האם למלא את שדות המזונות מהנתונים הקיימים?'` | DeficiencySymptoms | migrateFoods() |

### AlertDialog (Radix UI — inline ב-JSX)
| כותרת | תיאור | מסך |
|---|---|---|
| `'מחיקת תוסף'` | `'האם אתה בטוח שברצונך למחוק את {vitamin.vitaminNameHe}? פעולה זו לא ניתנת לביטול.'` | VitaminEdit |
| `'מחיקת פרוטוקול טיפול'` | `'האם אתה בטוח שברצונך למחוק את הפרוטוקול {disease.diseaseNameHe}? פעולה זו לא ניתנת לביטול.'` | DiseaseEdit |
| `'מחיקת תוסף'` | `'האם למחוק תוסף זה?'` | Vitamins |
| `'מחיקת תסמין'` | `'האם למחוק את התסמין {symptom.symptomNameHe}?'` | DeficiencySymptoms |
| `'מחיקת מזון'` | `'האם למחוק את {food.foodNameHe}?'` | Foods |
| `'מחיקת מאמר'` | `'האם למחוק את {article.titleHe}?'` | Articles |

### Alert Component (shadcn — ב-ImportExportModal)
| מסך | סוג | תוכן |
|---|---|---|
| vitamins/symptoms/foods ImportExportModal | success/destructive | תוצאות יבוא — `נוספו X / דולגו X` |

---

## 9️⃣ Known Edge Cases From Code

### A. Vitamin Data Flattening
```js
// ⚠️ מתבצע בכל מקום שקורא Vitamin:
const data = v.data || v;
// או:
return { ...v, ...(v.data || {}) };

// מיקומים: Vitamins.js queryFn, Diseases.js queryFn,
//           DiseaseEdit.js queryFn, VitaminEdit.js queryFn,
//           GlobalSearch.js (data = v.data || v inline)
```
**סיבה:** רשומות ישנות שמרו שדות תחת `vitamin.data = { vitaminNameHe, ... }`.
**אם מוסירים את ה-flatten:** כל שדות הוויטמין יוחזרו כ-`undefined`.

---

### B. labTestDeficiency Migration
```js
// שדה ישן: labTestDeficiency (string עם newlines)
// שדות חדשים: labTestDeficiencyDescription + labTestDeficiencyDetails
if (vitaminData.labTestDeficiency && !vitaminData.labTestDeficiencyDescription) {
  const lines = oldLabTest.split('
').filter(Boolean);
  return {
    ...vitaminData,
    labTestDeficiencyDescription: lines[0] || '',
    labTestDeficiencyDetails: lines.slice(1).join('
') || '',
  };
}
// מיקום: Vitamins.js queryFn, VitaminEdit.js queryFn
// ⚠️ המיגרציה היא in-memory בלבד — לא כותבת לDB!
// כל פעם שנטען הוויטמין, המיגרציה רצה מחדש.
```

---

### C. Bi-Directional Sync — DeficiencySymptom ↔ Food
```
DeficiencySymptoms.updateMutation:
  1. DeficiencySymptom.update(id, data)
  2. Food.list() — fresh fetch (not from cache!)
  3. For each foodId in data.foodIds → Food.update if symptomId missing
  4. For each food with symptomId → Food.update if foodId removed
  ⚠️ Sequential await — slow with many foods
  ⚠️ If Food.list() fails mid-loop — partial state

Foods.createMutation:
  1. Food.create(data)
  2. For each symptomId → DeficiencySymptom.update (add foodId)
  ⚠️ Uses DeficiencySymptom.list() inside loop (N+1 queries!)

Foods.updateMutation:
  1. Food.update(id, data)
  2. DeficiencySymptom.list() — fresh fetch
  3. Add/remove foodId from symptoms bi-directionally
```

**מצב קצה חשוב:** VitaminEdit sync (Vitamin ↔ DeficiencySymptom):
```
createMutation: Vitamin.create → DeficiencySymptom.list() inside loop (N+1!)
updateMutation: removes vitaminId from symptoms no longer associated
⚠️ לא מעדכן Food.deficiencySymptoms — רק Symptom.vitaminIds
```

---

### D. Import לא מבצע Bi-Dir Sync
```
Vitamins handleImport → Vitamin.create(item) → ❌ NO symptom sync
Foods handleImport → Food.create(item) → ❌ NO symptom sync
DeficiencySymptoms handleImport → DeficiencySymptom.create(item) → ❌ NO food sync
```
**תוצאה:** אחרי import, ה-relations חד-כיווניים. נדרשת מיגרציה ידנית.

---

### E. GlobalSearch — URL Parameters
```js
// GlobalSearch → vitamin click:
<Link to={createPageUrl('VitaminEdit') + '?vitaminId=' + v.id}>

// VitaminEdit קורא:
const vitaminId = urlParams.get('id');
// ⚠️ MISMATCH! GlobalSearch שולח ?vitaminId= אבל VitaminEdit מצפה ל-?id=
// תוצאה: ניווט מ-GlobalSearch לתוסף יפתח VitaminEdit במצב "חדש" ולא "עריכה"
```

---

### F. UserManagement — useQuery enabled guard
```js
const { data: users = [] } = useQuery({
  queryKey: ['users'],
  queryFn: () => base44.entities.User.list(),
  enabled: currentUser?.role === 'admin',
});
// ⚠️ אם currentUser טוען (undefined), enabled=false → users=[]
// לאחר שcurrentUser נטען ו-role='admin' → query מופעל אוטומטית
```

---

### G. sortConfig — field naming inconsistency
```js
// Diseases.js: sortConfig = { field, order, filter }
// Vitamins.js: sortConfig = { column, direction, filter }
// ⚠️ שני formats שונים! אל תניח שהם זהים בין מסכים.
```

---

### H. Foods Export — שדות חסרים
```js
// Foods ImportExportModal — export לא כולל:
// - description (HTML rich text)
// - deficiencySymptoms[] (IDs)
// ⚠️ import של food export לא ישמר את הקשרים לתסמינים!
```

---

### I. Symptoms Relations Import — Hebrew Keys
```js
// מזהה relations import לפי:
if (Array.isArray(data) && data.length > 0 && data[0].תסמין_חוסר && data[0].תוסף)
// ⚠️ Keys הם בעברית: 'תסמין_חוסר' ו-'מזון'
// ⚠️ data[0].תוסף לא בשימוש — תמיד data[0].מזון
```

---

### J. AI Tags → שדה tags לא מוגדר ב-Entity Schema
```js
// DeficiencySymptom entity schema לא מכיל שדה tags
// אבל הקוד שומר: DeficiencySymptom.update(id, { ...symptom, tags: tagsArray })
// Base44 מקבל שדות לא מוגדרים ושומר אותם
// ⚠️ שדה orphan — לא מוצג ב-UI בשום מקום (רק משפיע על חיפוש עתידי)
```

---

*מסמך זה הופק אוטומטית מניתוח הקוד. תאריך: פברואר 2026.*

---

## 🗂️ Modal Registry — רשימת כל ה-Dialogs וה-Modals

| שם רכיב | מסכים פותחים | Props מתקבלים | State שולט בפתיחה | ישויות נקראות | ישויות מתעדכנות | Reusable |
|---|---|---|---|---|---|---|
| `VitaminDetailModal` | Vitamins, DeficiencySymptoms, Diseases | `vitamin`, `isOpen`, `onClose`, `foods`, `symptoms`, `allVitamins`, `searchQuery` | `selectedVitamin` + `detailModalOpen / vitaminDetailModalOpen` | Vitamin (prop), Food (prop), DeficiencySymptom (prop) | — | ✅ כן |
| `AIInfoModal` | Vitamins | `vitamin`, `isOpen`, `onClose`, `aiInfo`, `isLoading` | `aiVitamin` + `aiLoading` | — | — | ❌ Vitamins בלבד |
| `ImportExportModal (vitamins)` | Vitamins | `isOpen`, `onClose`, `vitamins`, `onImport` | `importExportOpen` | Vitamin | Vitamin (create) | ❌ |
| `ImportExportModal (symptoms)` | DeficiencySymptoms | `isOpen`, `onClose`, `symptoms`, `vitamins`, `foods`, `onImport` | `importExportOpen` | DeficiencySymptom | DeficiencySymptom (create/update) | ❌ |
| `ImportExportModal (foods)` | Foods | `isOpen`, `onClose`, `foods`, `symptoms`, `onImport` | `importExportOpen` | Food | Food (create) | ❌ |
| `ImportExportModal (diseases)` | Diseases | `isOpen`, `onClose`, `diseases`, `onImport` | `importExportOpen` | Disease | Disease (create) | ❌ |
| `ImportExportModal (articles)` | Articles | `isOpen`, `onClose`, `articles`, `foods`, `onImport` | `importExportOpen` | Article | Article (create) | ❌ |
| `ImportExportModal (users)` | UserManagement | `isOpen`, `onClose`, `users` | `importExportOpen` | User | — | ❌ |
| `FoodDetailModal` | Foods, GlobalSearch | `food`, `isOpen`, `onClose`, `symptoms` | `selectedFood` + boolean | DeficiencySymptom (prop) | — | ✅ כן |
| `FoodForm (Dialog)` | DeficiencySymptoms, Foods, Articles | `food`, `symptoms`, `onSave`, `onCancel` | `foodFormOpen` + `selectedFood` | DeficiencySymptom (prop) | Food (create/update) | ✅ כן |
| `DiseaseDetailModal` | Diseases | `disease`, `isOpen`, `onClose`, `vitamins`, `symptoms`, `onVitaminClick` | `selectedDisease` + `detailModalOpen` | — (all via props) | — | ❌ |
| `AlertDialog (delete confirm)` | Vitamins, Foods, DeficiencySymptoms, Diseases, Articles, ArticleEdit, VitaminEdit, DiseaseEdit | `open`, `onOpenChange` + confirm/cancel buttons | `deleteX` state (מכיל אובייקט לא null) | — | entity.delete | ❌ (inline בכל מסך) |
| `Dialog (symptom form)` | DeficiencySymptoms | — (inline, no separate component) | `formOpen` | Vitamin (prop), Food (prop) | DeficiencySymptom | ❌ |
| `Dialog (article detail)` | Articles | — (inline) | `selectedArticle` | Food (prop) | Food (update) | ❌ |
| `Dialog (company iframe)` | Vitamins (VitaminTable) | `url`, `name` | internal VitaminTable state | — | — | ❌ |
| `Dialog (symptom detail)` | Vitamins (VitaminTable) | `symptom`, `vitamins`, `foods` | internal VitaminTable state | — | — | ❌ |

---

## 🖱️ Button and Action Map

### מסך: Vitamins

| כפתור | מיקום | תנאי הצגה (Role) | Mutation | Query Invalidation | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|---|
| הוסף תוסף | Header | כל משתמש | — | — | VitaminEdit | — | — |
| יצוא/יבוא | Header | כל משתמש | — | — | — | — | — |
| מחק (אייקון) | כל שורה | כל משתמש | deleteMutation | ['vitamins'] | — | — | שגיאה תיזרק |
| AI מידע | כל שורה | כל משתמש | — (InvokeLLM) | — | — | — | setAiInfo('לא הצלחנו...') |
| עריכה | כל שורה | כל משתמש | — | — | VitaminEdit?id=X | — | — |
| מיין לפי תאריך | Header | כל משתמש | — | — | — | — | — |

### מסך: DeficiencySymptoms

| כפתור | מיקום | תנאי הצגה (Role) | Mutation | Query Invalidation | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|---|
| הוסף תסמין | Header | כל משתמש | createMutation | ['symptoms'] | — | — | throw |
| שמור (form) | Dialog | כל משתמש | createMutation / updateMutation | ['symptoms'], ['foods'] | — | — | throw |
| מחק | כל שורה | כל משתמש | deleteMutation | ['symptoms'] | — | — | throw |
| AI תגיות | כל שורה | כל משתמש | — (InvokeLLM) | ['symptoms'] | — | — | console.error |
| AI לכל תסמין | Header | כל משתמש | — (InvokeLLM, sequential) | ['symptoms'] | — | — | console.error |
| העתק תוספים | Header | כל משתמש | — (batch update) | ['symptoms'] | — | alert() | console.error |
| העתק מזונות | Header | כל משתמש | — (batch update) | ['symptoms'], ['foods'] | — | alert() | console.error |
| יצוא/יבוא | Header | כל משתמש | — | — | — | — | — |

### מסך: Diseases

| כפתור | מיקום | תנאי הצגה (Role) | Mutation | Query Invalidation | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|---|
| הוסף פרוטוקול | Header | כל משתמש | — | — | DiseaseEdit | — | — |
| יצוא/יבוא | Header | כל משתמש | — | — | — | — | — |
| עריכה | כל שורה | כל משתמש | — | — | DiseaseEdit?id=X | — | — |

### מסך: Foods

| כפתור | מיקום | תנאי הצגה (Role) | Mutation | Query Invalidation | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|---|
| הוסף מזון | Header | כל משתמש | createMutation | ['foods'] | — | — | throw |
| שמור (form) | Dialog | כל משתמש | createMutation / updateMutation | ['foods'] | — | — | throw |
| מחק | כל שורה | כל משתמש | deleteMutation | ['foods'] | — | — | throw |
| יצוא/יבוא | Header | כל משתמש | — | — | — | — | — |

### מסך: Articles

| כפתור | מיקום | תנאי הצגה (Role) | Mutation | Query Invalidation | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|---|
| הוסף מאמר | Header | כל משתמש | — | — | ArticleEdit | — | — |
| מחק | כל שורה | כל משתמש | deleteMutation | ['articles'] | — | — | throw |
| יצוא/יבוא | Header | כל משתמש | — | — | — | — | — |
| עריכה | כל שורה | כל משתמש | — | — | ArticleEdit?id=X | — | — |

### מסך: UserManagement

| כפתור | מיקום | תנאי הצגה (Role) | Mutation | Query Invalidation | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|---|
| שינוי תפקיד (Select) | כל שורה | admin בלבד | updateRoleMutation | ['users'] | — | — | throw |
| יצוא/יבוא | Header | admin בלבד | — | — | — | — | — |

### Layout — גיבוי

| כפתור | מיקום | תנאי הצגה (Role) | פעולה | Redirect | Toast | כישלון |
|---|---|---|---|---|---|---|
| גיבוי | Navbar | admin בלבד | Promise.all (read all) → Blob download | — | toast.loading → toast.success | toast.error |

---

## 📋 Field Schema Definition

### Entity: Vitamin

| שם שדה | Type | Required | Default | Enum | Relation | Max Length | Nullable |
|---|---|---|---|---|---|---|---|
| `vitaminNameHe` | string | ✅ | — | — | — | — | ❌ |
| `vitaminNameEn` | string | ❌ | — | — | — | — | ✅ |
| `vitaminNickHe` | string | ❌ | — | — | — | — | ✅ |
| `vitaminNickEn` | string | ❌ | — | — | — | — | ✅ |
| `activeForm` | string | ❌ | — | — | — | — | ✅ |
| `solubility` | string | ❌ | — | מים, שמן | — | — | ✅ |
| `source` | string | ❌ | — | הגוף, מזון | — | — | ✅ |
| `dosageUpTo1Year` | string | ❌ | — | — | — | — | ✅ |
| `dosageUpTo6` | string | ❌ | — | — | — | — | ✅ |
| `dosageUpTo10` | string | ❌ | — | — | — | — | ✅ |
| `dosageUpTo18` | string | ❌ | — | — | — | — | ✅ |
| `dosageAdults` | string | ❌ | — | — | — | — | ✅ |
| `dosagePregnancy` | string | ❌ | — | — | — | — | ✅ |
| `dosageBirth` | string | ❌ | — | — | — | — | ✅ |
| `dosageRDA` | string | ❌ | — | — | — | — | ✅ |
| `actionDescription` | string (rich text) | ❌ | — | — | — | — | ✅ |
| `deficiencySymptoms` | string[] | ❌ | [] | — | → DeficiencySymptom.id | — | ✅ |
| `labTestDeficiencyDescription` | string | ❌ | — | — | — | — | ✅ |
| `labTestDeficiencyDetails` | string | ❌ | — | — | — | — | ✅ |
| `labTestDeficiency` | string | ❌ (שדה ישן) | — | — | — | — | ✅ |
| `foodSources` | string[] | ❌ | [] | — | → Food.id | — | ✅ |
| `combinationVitaminIds` | string[] | ❌ | [] | — | → Vitamin.id | — | ✅ |
| `conflictVitamins` | object[] | ❌ | [] | — | — | — | ✅ |
| `conflictVitamins[].vitaminId` | string | ❌ | — | — | → Vitamin.id | — | ✅ |
| `conflictVitamins[].explanation` | string | ❌ | — | — | — | — | ✅ |
| `companyName` | string | ❌ | — | — | — | — | ✅ |
| `companyUrl` | string | ❌ | — | — | — | — | ✅ |
| `toxicity` | string | ❌ | — | — | — | — | ✅ |
| `sideEffects` | string | ❌ | — | — | — | — | ✅ |
| `caseStory` | string | ❌ | — | — | — | — | ✅ |
| `notes` | string | ❌ | — | — | — | — | ✅ |

### Entity: DeficiencySymptom

| שם שדה | Type | Required | Default | Enum | Relation | Max Length | Nullable |
|---|---|---|---|---|---|---|---|
| `symptomNameHe` | string | ✅ | — | — | — | — | ❌ |
| `symptomNameEn` | string | ❌ | — | — | — | — | ✅ |
| `sortOrder` | number | ❌ | — | — | — | — | ✅ |
| `vitaminIds` | string[] | ❌ | [] | — | → Vitamin.id | — | ✅ |
| `foodIds` | string[] | ❌ | [] | — | → Food.id | — | ✅ |
| `tags` | string[] | ❌ | [] | — | — | — | ✅ |
| `notes` | string | ❌ | — | — | — | — | ✅ |

### Entity: Food

| שם שדה | Type | Required | Default | Enum | Relation | Max Length | Nullable |
|---|---|---|---|---|---|---|---|
| `foodNameHe` | string | ✅ | — | — | — | — | ❌ |
| `foodNameEn` | string | ❌ | — | — | — | — | ✅ |
| `foodCategory` | string | ❌ | — | — | — | — | ✅ |
| `dosage` | string | ❌ | — | — | — | — | ✅ |
| `imageUrl` | string (URL) | ❌ | — | — | — | — | ✅ |
| `description` | string (rich text) | ❌ | — | — | — | — | ✅ |
| `deficiencySymptoms` | string[] | ❌ | [] | — | → DeficiencySymptom.id | — | ✅ |
| `notes` | string | ❌ | — | — | — | — | ✅ |

### Entity: Disease

| שם שדה | Type | Required | Default | Enum | Relation | Max Length | Nullable |
|---|---|---|---|---|---|---|---|
| `diseaseNameHe` | string | ✅ | — | — | — | 120 | ❌ |
| `sortOrder` | number | ❌ | — | — | — | — | ✅ |
| `diseaseCharacteristicsHe` | string | ❌ | — | — | — | — | ✅ |
| `supplementIds` | string[] | ❌ | [] | — | → Vitamin.id | — | ✅ |
| `deficiencySymptomIds` | string[] | ❌ | [] | — | → DeficiencySymptom.id | — | ✅ |
| `productLinks` | object[] | ❌ | [] | — | — | — | ✅ |
| `productLinks[].productName` | string | ❌ | — | — | — | — | ✅ |
| `productLinks[].productUrl` | string | ❌ | — | — | — | — | ✅ |
| `notes` | string | ❌ | — | — | — | — | ✅ |

### Entity: Article

| שם שדה | Type | Required | Default | Enum | Relation | Max Length | Nullable |
|---|---|---|---|---|---|---|---|
| `titleHe` | string | ✅ | — | — | — | — | ❌ |
| `titleEn` | string | ❌ | — | — | — | — | ✅ |
| `url` | string (URL) | ❌ | — | — | — | — | ✅ |
| `summary` | string (rich text) | ❌ | — | — | — | — | ✅ |
| `foodIds` | string[] | ❌ | [] | — | → Food.id | — | ✅ |

### Entity: User (Built-in)

| שם שדה | Type | Required | Default | Enum | Editable | Nullable |
|---|---|---|---|---|---|---|
| `id` | string | ✅ (auto) | auto | — | ❌ | ❌ |
| `email` | string | ✅ (auto) | — | — | ❌ | ❌ |
| `full_name` | string | ✅ (auto) | — | — | ❌ | ❌ |
| `created_date` | datetime | ✅ (auto) | auto | — | ❌ | ❌ |
| `role` | string | ❌ | user | admin, user | ✅ | ❌ |

---

## 🔐 Permission Matrix

| פעולה | admin | user | הגנה ב-UI | הגנה ב-Server |
|---|---|---|---|---|
| Read (כל entity) | ✅ | ✅ | — | ❌ |
| Create Vitamin | ✅ | ✅ | ❌ | ❌ |
| Update Vitamin | ✅ | ✅ | ❌ | ❌ |
| Delete Vitamin | ✅ | ✅ | ❌ | ❌ |
| Create Disease | ✅ | ✅ | ❌ | ❌ |
| Update Disease | ✅ | ✅ | ❌ | ❌ |
| Delete Disease | ✅ | ✅ | ❌ | ❌ |
| Create Symptom | ✅ | ✅ | ❌ | ❌ |
| Update Symptom | ✅ | ✅ | ❌ | ❌ |
| Delete Symptom | ✅ | ✅ | ❌ | ❌ |
| Create Food | ✅ | ✅ | ❌ | ❌ |
| Update Food | ✅ | ✅ | ❌ | ❌ |
| Delete Food | ✅ | ✅ | ❌ | ❌ |
| Create Article | ✅ | ✅ | ❌ | ❌ |
| Delete Article | ✅ | ✅ | ❌ | ❌ |
| Import (כל entity) | ✅ | ✅ | ❌ | ❌ |
| Export (כל entity) | ✅ | ✅ | ❌ | ❌ |
| AI Invoke | ✅ | ✅ | ❌ | ❌ |
| Backup | ✅ | ❌ | ✅ (כפתור מוסתר) | ❌ |
| ניהול משתמשים (UserManagement) | ✅ | ❌ | ✅ (Guard component) | ✅ (Base44 built-in) |
| Update User Role | ✅ | ❌ | ✅ (guard) | ✅ (Base44 built-in) |
| תיעוד מערכת | ✅ | ❌ | ✅ (nav hidden) | ❌ |

> ⚠️ **חשוב:** כל הגנות ה-UI מבוססות על `currentUser?.role === 'admin'`. אם JavaScript מושבת או המשתמש יודע את ה-URL, ניתן לגשת לדפים. ההגנה האמיתית קיימת רק ב-Base44 עבור User entity.

---

## ⚡ Event Flow per Screen

### Vitamins — Event Flow

```
1. LOAD:
   useQuery(['vitamins']) → Vitamin.list() → flatten (v.data || v) → migrate labTestDeficiency
   useQuery(['foods']) → Food.list()
   useQuery(['symptoms']) → DeficiencySymptom.list('sortOrder')
   useQuery(['articles']) → Article.list()
   useQuery(['diseases']) → Disease.list()

2. RENDER:
   filteredVitamins = useMemo([vitamins, searchQuery, columnFilters, sortConfig, symptomFilter, labTestFilter])
   isLoading=true → Loader2 spinner
   isLoading=false → VitaminTable (md+) / VitaminCard[] (mobile)

3. SEARCH:
   onChange → setSearchQuery → useMemo recalculates → rerender list

4. DELETE:
   click Trash icon → setDeleteVitamin(vitamin) → AlertDialog opens
   confirm → deleteMutation.mutate(id) → Vitamin.delete(id)
   onSuccess → invalidateQueries(['vitamins']) → setDeleteVitamin(null) → rerender

5. AI:
   click AI button → setAiVitamin(v) → setAiLoading(true) → AIInfoModal opens
   InvokeLLM(prompt) → setAiInfo(response) → setAiLoading(false)
   error → setAiInfo('לא הצלחנו...')

6. LOADING STATE:
   vitaminsLoading=true → spinner shown
   deleteMutation.isPending → AlertDialog confirm button disabled

7. IMPORT:
   ImportExportModal → handleImport(data) → loop: check duplicate by name
   found → skipped[], notfound → Vitamin.create(item)
   invalidateQueries(['vitamins'])
```

### DeficiencySymptoms — Event Flow

```
1. LOAD:
   useQuery(['symptoms']) → DeficiencySymptom.list('sortOrder')
   useQuery(['vitamins']) → Vitamin.list()
   useQuery(['foods']) → Food.list()

2. RENDER:
   isLoading=true → Loader2
   isLoading=false → Table (hidden md:block) / Cards (md:hidden)

3. ADD/EDIT:
   click "הוסף" → setFormOpen(true), setEditingSymptom(null)
   click "עריכה" → setEditingSymptom(symptom), setFormOpen(true)
   Dialog opens with form fields

4. SAVE (create):
   handleSave() → createMutation.mutate(formData)
   onSuccess → invalidateQueries(['symptoms']) → setFormOpen(false)

5. SAVE (update) — BI-DIRECTIONAL SYNC:
   updateMutation.mutate({id, data})
   → DeficiencySymptom.update(id, data)
   → Food.list() (fresh fetch)
   → for each foodId in data.foodIds:
       if food.deficiencySymptoms doesn't include id → Food.update(foodId, {..., deficiencySymptoms: [..., id]})
   → for each food that had this symptom but not in new foodIds:
       Food.update(food.id, {..., deficiencySymptoms: filter out id})
   onSuccess → invalidateQueries(['symptoms'], ['foods'])

6. DELETE:
   click Trash → setDeleteSymptom(symptom) → AlertDialog
   confirm → deleteMutation.mutate(id)
   onSuccess → invalidateQueries(['symptoms']) → setDeleteSymptom(null)

7. AI TAGS:
   click "AI תגיות" → setGeneratingTags(symptom.id)
   InvokeLLM(prompt) → split by comma → tags array
   DeficiencySymptom.update(id, {..., tags: tagsArray})
   invalidateQueries(['symptoms'])
   finally → setGeneratingTags(null)

8. ERROR:
   createMutation / updateMutation / deleteMutation → error thrown (no catch in UI)
   generateTags → console.error (silent fail)
```

### Diseases — Event Flow

```
1. LOAD:
   useQuery(['diseases']) → Disease.list()
   useQuery(['vitamins']) → Vitamin.list() → flatten
   useQuery(['symptoms']) → DeficiencySymptom.list()

2. RENDER:
   filteredDiseases = useMemo: sort by sortOrder, then alpha
   diseasesLoading=true → spinner
   false → Table (md+) / DiseaseCard[] (mobile)

3. DETAIL MODAL:
   click row/card → setSelectedDisease(disease) → setDetailModalOpen(true)
   vitamin badge click → handleVitaminClick(id) → setSelectedVitaminForDetails → setVitaminDetailModalOpen(true)

4. IMPORT:
   handleImport → loop → check by diseaseNameHe → create or skip
   invalidateQueries(['diseases'])

5. ERROR: errors thrown (no UI catch)
```

### Foods — Event Flow

```
1. LOAD:
   useQuery(['foods']) → Food.list()
   useQuery(['symptoms']) → DeficiencySymptom.list()

2. ADD/EDIT:
   FoodForm Dialog → onSave(data)
   create: Food.create(data) → invalidate ['foods']
   update: Food.update(id, data) → invalidate ['foods']

3. IMAGE UPLOAD:
   FoodForm → file input → Core.UploadFile(file) → imageUrl saved on food

4. DELETE:
   AlertDialog → Food.delete(id) → invalidate ['foods']

5. ERROR: errors thrown
```

### Articles — Event Flow

```
1. LOAD:
   useQuery(['articles']) → Article.list()
   useQuery(['foods']) → Food.list()

2. DELETE:
   Article.delete(id) → invalidate ['articles']

3. FOOD EDIT (from article detail dialog):
   Food.update(id, data) → invalidate ['foods']

4. ERROR: errors thrown
```

### UserManagement — Event Flow

```
1. LOAD:
   currentUser = base44.auth.me() → check role
   role !== 'admin' → render Guard (access denied component)
   role === 'admin' → useQuery(['users']) → User.list()

2. ROLE CHANGE:
   Select onChange → updateRoleMutation.mutate({id, role})
   User.update(id, {role}) → invalidate ['users'] → rerender

3. ERROR: errors thrown
```

---

## 🛡️ Error Handling Strategy

| מצב | טיפול | Retry | Fallback UI | Toast |
|---|---|---|---|---|
| useQuery error | שגיאה תיזרק לגבול שגיאות של React | ✅ (React Query default: 3x) | ❌ (אין ErrorBoundary מוגדר) | ❌ |
| useMutation error | שגיאה תיזרק — אין catch ברמת הקומפוננט | ❌ | ❌ | ❌ |
| InvokeLLM error (Vitamins) | catch → setAiInfo('לא הצלחנו...'). | ❌ | ✅ (message in modal) | ❌ |
| InvokeLLM error (DeficiencySymptoms) | console.error, generatingTags=null | ❌ | ❌ (silent) | ❌ |
| Backup error (Layout) | catch → toast.error('שגיאה ביצירת גיבוי') | ❌ | ✅ (toast) | toast.error |
| UploadFile error (FoodForm) | שגיאה תיזרק | ❌ | ❌ | ❌ |
| Import error (all) | try/catch per item → skipped[] | ❌ | ✅ (skipped list shown) | ❌ |

> ⚠️ **Race Condition אפשרי:** בסינכרון דו-כיווני של DeficiencySymptom ↔ Food — הלולאה היא sequential (await בתוך for), אז אין race condition, אבל ביצועים איטיים עם הרבה foods.

> ⚠️ **אין ErrorBoundary גלובלי** — שגיאות runtime ישברו את ה-UI ללא הודעה ידידותית.

---

## 📦 Component Contract

### VitaminDetailModal

| Input Prop | Type | Required | תיאור |
|---|---|---|---|
| `vitamin` | Vitamin object | ✅ | הוויטמין להצגה |
| `isOpen` | boolean | ✅ | האם המודל פתוח |
| `onClose` | () => void | ✅ | סגירת המודל |
| `foods` | Food[] | ✅ | לפענוח foodSources |
| `symptoms` | DeficiencySymptom[] | ✅ | לפענוח deficiencySymptoms |
| `allVitamins` | Vitamin[] | ✅ | לפענוח combinations/conflicts |
| `searchQuery` | string | ❌ | לsearch highlighting |
| `onAiInfo` | (v) => void | ❌ | callback לפתיחת AIInfoModal |
| `onEdit` | (v) => void | ❌ | callback לניווט לעריכה |

**Internal State:** none significant (display only)
**Side Effects:** none
**Edge Cases:** vitamin.data נested — הקוד עושה `{ ...vitamin, ...vitamin.data }`

---

### FoodForm

| Input Prop | Type | Required | תיאור |
|---|---|---|---|
| `food` | Food object or null | ❌ | null = יצירה חדשה |
| `symptoms` | DeficiencySymptom[] | ✅ | לבחירת תסמינים |
| `onSave` | (data) => void | ✅ | callback עם הנתונים |
| `onCancel` | () => void | ✅ | ביטול |

**Internal State:** formData (כל שדות Food), imageUploading (boolean)
**Side Effects:** Core.UploadFile בעת העלאת תמונה
**Edge Cases:** food=null → כל שדות ריקים, imageUrl=null → אין תצוגת תמונה

---

### FoodDetailModal

| Input Prop | Type | Required | תיאור |
|---|---|---|---|
| `food` | Food object | ✅ | המזון להצגה |
| `isOpen` | boolean | ✅ | — |
| `onClose` | () => void | ✅ | — |
| `symptoms` | DeficiencySymptom[] | ✅ | לפענוח IDs |

**Internal State:** none
**Side Effects:** none
**Edge Cases:** deficiencySymptoms=[] → מציג "אין תסמינים"

---

### ImportExportModal (כל גרסה)

| Input Prop | Type | Required | תיאור |
|---|---|---|---|
| `isOpen` | boolean | ✅ | — |
| `onClose` | () => void | ✅ | — |
| `[entities]` | Entity[] | ✅ | הרשימה הנוכחית לייצוא |
| `onImport` | (data[]) => Promise<{added, skipped}> | ✅ | callback לייבוא |

**Internal State:** activeTab ('import'/'export'), importData, importResult
**Side Effects:** JSON parse, JSON stringify, Blob download
**Edge Cases:** קובץ לא תקין → parse error יזרק

---

### ColumnSortFilter

| Input Prop | Type | Required | תיאור |
|---|---|---|---|
| `fieldName` | string | ✅ | שם השדה למיון/פילטור |
| `sortConfig` | object or null | ✅ | הגדרת מיון נוכחי |
| `onSortChange` | (config) => void | ✅ | callback לשינוי |
| `hideSort` | boolean | ❌ | הסתרת אפשרויות מיון |
| `isArrayField` | boolean | ❌ | שדה מסוג array (משנה אפשרויות) |

**Internal State:** open (Popover)
**Side Effects:** none
**Edge Cases:** sortConfig=null → כפתור "נקה" לא מוצג

---

## 🔄 Data Migration Notes

| שדה ישן | שדה חדש | לוגיקה | מיקום בקוד | מצב קצה |
|---|---|---|---|---|
| `vitamin.data.X` | `vitamin.X` | `{ ...v, ...v.data }` | Vitamins.js queryFn, Diseases.js queryFn | אם `v.data` לא קיים → spread של undefined (בטוח) |
| `labTestDeficiency` (string) | `labTestDeficiencyDescription` + `labTestDeficiencyDetails` | split('
') → שורה ראשונה = description, שאר = details | Vitamins.js queryFn, VitaminEdit.js | אם השדה ריק → שניהם '' |
| `DeficiencySymptom.vitaminIds` (ריק בישנים) | `vitaminIds` מאוכלס | migrateVitamins(): מחפש vitamins שמציינים symptomId ב-`deficiencySymptoms[]` | DeficiencySymptoms.js → migrateVitamins() | תוסף שלא מצביע על התסמין לא יועתק |
| `DeficiencySymptom.foodIds` (ריק בישנים) | `foodIds` מאוכלס | migrateFoods(): מחפש foods שמציינים symptomId ב-`deficiencySymptoms[]` | DeficiencySymptoms.js → migrateFoods() | מזון שלא מצביע על התסמין לא יועתק |

**⚠️ הערת sync:** הסינכרון DeficiencySymptom ↔ Food הוא חד-כיווני בזמן save של Symptom.
אם מעדכנים Food ישירות ב-FoodForm, הסינכרון לא מתבצע אוטומטית.

---

## ✅ Claude Code Handoff Integrity Checklist

### ❌ מה אסור לשנות

| כלל | הסבר |
|---|---|
| אל תשנה את לוגיקת ה-flatten `{ ...v, ...v.data }` | רשומות ישנות תלויות בה |
| אל תשנה את מנגנון ה-BI-DIRECTIONAL SYNC ב-updateMutation של DeficiencySymptoms | הוא שומר על עקביות Food ↔ Symptom |
| אל תשנה את `queryKey` strings | ['vitamins'], ['foods'], ['symptoms'], ['articles'], ['diseases'], ['users'] — שינוי ישבור invalidation |
| אל תשנה את שם הפונקציה `createPageUrl` | בשימוש בכל קובץ ניווט |
| אל תסיר `adminOnly: true` מ-UserManagement ו-SystemDocs ב-Layout | גנה על גישה |
| אל תשנה את מבנה `sortConfig` `{ field, order, filter }` | ColumnSortFilter תלוי בו |

---

### ⚠️ קבצים רגישים

| קובץ | למה רגיש |
|---|---|
| `Layout.js` | ניווט, גיבוי, הגדרת CSS גלובלי, בדיקת admin |
| `pages/DeficiencySymptoms.js` | מכיל את לוגיקת הסינכרון הדו-כיווני |
| `pages/Vitamins.js` | מכיל migrate logic ו-flatten קריטי |
| `components/vitamins/VitaminDetailModal` | נפתח מ-3 מסכים שונים — props חייבים להיות תואמים |
| `components/foods/FoodForm` | נפתח מ-3 מסכים — שינוי props ישבור את כולם |
| `entities/User.json` | שינוי role enum ישפיע על כל guard בMערכת |

---

### 🔍 ישויות הדורשות בדיקה לפני שינוי

| Entity | למה לבדוק | מה לבדוק |
|---|---|---|
| `Vitamin` | נתוני legacy, flatten, labTestDeficiency migration | האם v.data קיים? האם labTestDeficiency קיים? |
| `DeficiencySymptom` | סינכרון דו-כיווני | foodIds תקינים? vitaminIds תקינים? |
| `Food` | deficiencySymptoms מסונכרן | האם deficiencySymptoms[] מכיל symptomIds קיימים? |
| `Disease` | sortOrder — משפיע על סדר תצוגה | האם ממוספר נכון? |

---

### 🧩 Patterns חייבים להישמר

```js
// 1. כל שדה מ-Vitamin חייב flatten לפני שימוש:
const data = vitamin.data || vitamin;

// 2. כל mutation חייב invalidateQueries:
onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entityName'] }); }

// 3. כל פעולה על User.role חייבת לבדוק:
currentUser?.role === 'admin'

// 4. סינכרון דו-כיווני — לאחר כל עדכון Symptom.foodIds:
// חייבים לעדכן גם Food.deficiencySymptoms

// 5. כל ImportExportModal חייב להחזיר:
return { added: string[], skipped: string[] };

// 6. כל useQuery עם entity חדש חייב queryKey ייחודי:
queryKey: ['entityName']
```

---

### 📏 Definition of Done לשינוי במסך

לפני סגירת PR / סיום שינוי בכל מסך, יש לאמת:

- [ ] כל useQuery משתמש ב-queryKey הנכון
- [ ] כל mutation מבצע invalidateQueries לאחר הצלחה
- [ ] לוגיקת flatten (v.data || v) לא הוסרה מ-Vitamins ו-Diseases
- [ ] הסינכרון הדו-כיווני Symptom↔Food נשמר ב-DeficiencySymptoms
- [ ] כל Dialog / Modal מקבל את כל ה-props הנדרשים
- [ ] הממשק תומך ב-RTL (dir="rtl")
- [ ] Mobile: טבלאות מוחלפות בכרטיסיות (hidden md:block / md:hidden)
- [ ] Admin-only features מוסתרות ל-role !== 'admin'
- [ ] שגיאות AI מטופלות בצד ה-catch (לא silent fail)
- [ ] לא נוספו dependencies חדשות שאינן ב-installed packages

---

*מסמך זה הופק אוטומטית מניתוח הקוד. תאריך: פברואר 2026.*
