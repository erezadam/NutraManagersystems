import { useMemo, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExpandableText from '../components/ui/ExpandableText';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import RichTextField from '../components/ui/RichTextField';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
import StateView from '../components/ui/StateView';
import { useEntityList } from '../hooks/useEntityList';
import { asArray, uniqueStrings } from '../lib/arrays';
import { formatDate } from '../lib/date';
import { downloadText, toCsv } from '../lib/file-io';
import { asOptionalString, parseImportFile } from '../lib/import-export';
import { deficiencySymptomService, foodService, integrationService } from '../services';
import type { Food } from '../types/entities';

interface FoodFormState {
  foodNameHe: string;
  foodNameEn: string;
  foodCategory: string;
  dosage: string;
  imageUrl: string;
  description: string;
  notes: string;
  deficiencySymptoms: string[];
}

function createEmptyForm(): FoodFormState {
  return {
    foodNameHe: '',
    foodNameEn: '',
    foodCategory: '',
    dosage: '',
    imageUrl: '',
    description: '',
    notes: '',
    deficiencySymptoms: []
  };
}

function toPayload(form: FoodFormState): Partial<Food> {
  return {
    foodNameHe: form.foodNameHe.trim(),
    foodNameEn: form.foodNameEn.trim() || undefined,
    foodCategory: form.foodCategory.trim() || undefined,
    dosage: form.dosage.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    description: form.description.trim() || undefined,
    notes: form.notes.trim() || undefined,
    deficiencySymptoms: form.deficiencySymptoms
  };
}

export default function FoodsPage() {
  const foodsList = useEntityList(foodService, 'created_date desc');
  const symptomsList = useEntityList(deficiencySymptomService, 'symptomNameHe asc');

  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [form, setForm] = useState<FoodFormState>(createEmptyForm());
  const [initialSymptomIds, setInitialSymptomIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Food | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return foodsList.items;
    return foodsList.items.filter((food) =>
      [food.foodNameHe, food.foodNameEn, food.foodCategory]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [foodsList.items, query]);

  const symptomOptions = useMemo(
    () =>
      symptomsList.items
        .map((symptom) => ({ id: symptom.id, label: symptom.symptomNameHe }))
        .sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [symptomsList.items]
  );

  function openCreate() {
    setEditing(null);
    setForm(createEmptyForm());
    setInitialSymptomIds([]);
    setFormOpen(true);
  }

  function openEdit(food: Food) {
    setEditing(food);
    setForm({
      foodNameHe: food.foodNameHe,
      foodNameEn: food.foodNameEn ?? '',
      foodCategory: food.foodCategory ?? '',
      dosage: food.dosage ?? '',
      imageUrl: food.imageUrl ?? '',
      description: food.description ?? '',
      notes: food.notes ?? '',
      deficiencySymptoms: asArray(food.deficiencySymptoms)
    });
    setInitialSymptomIds(asArray(food.deficiencySymptoms));
    setFormOpen(true);
  }

  async function syncSymptomFoodLinks(foodId: string, beforeIds: string[], afterIds: string[]) {
    for (const symptom of symptomsList.items) {
      const had = beforeIds.includes(symptom.id);
      const has = afterIds.includes(symptom.id);
      if (had === has) continue;

      const current = asArray(symptom.foodIds);
      const next = has ? uniqueStrings([...current, foodId]) : current.filter((value) => value !== foodId);
      await deficiencySymptomService.update(symptom.id, { foodIds: next });
    }
  }

  async function onSave() {
    if (!form.foodNameHe.trim()) {
      setMsg('שגיאה: שם מזון בעברית הוא שדה חובה.');
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const payload = toPayload(form);
      let foodId = editing?.id ?? '';

      if (editing) {
        await foodService.update(editing.id, payload);
      } else {
        const created = await foodService.create(payload);
        foodId = created.id;
      }

      await syncSymptomFoodLinks(foodId, initialSymptomIds, form.deficiencySymptoms);
      await Promise.all([foodsList.reload(), symptomsList.reload()]);
      setFormOpen(false);
      setMsg('הרשומה נשמרה בהצלחה.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unknown error';
      setMsg(`שגיאה בשמירה: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setMsg(null);
    try {
      await foodService.delete(deleteTarget.id);
      await syncSymptomFoodLinks(deleteTarget.id, asArray(deleteTarget.deficiencySymptoms), []);
      await Promise.all([foodsList.reload(), symptomsList.reload()]);
      setDeleteTarget(null);
      setMsg('הרשומה נמחקה.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unknown error';
      setMsg(`שגיאה במחיקה: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  function exportJson() {
    downloadText(`foods_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'foodNameHe', 'foodNameEn', 'foodCategory', 'dosage', 'imageUrl', 'updated_date'],
      ...filtered.map((food) => [
        food.id,
        food.foodNameHe,
        food.foodNameEn ?? '',
        food.foodCategory ?? '',
        food.dosage ?? '',
        food.imageUrl ?? '',
        food.updated_date ?? ''
      ])
    ]);
    downloadText(`foods_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function importFile(file: File) {
    setImportMsg(null);
    const rows = await parseImportFile(file);
    const known = new Set(foodsList.items.map((item) => item.foodNameHe.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const foodNameHe = asOptionalString(row.foodNameHe);
      if (!foodNameHe || known.has(foodNameHe.toLowerCase())) {
        skipped += 1;
        continue;
      }

      const payload: Partial<Food> = {
        foodNameHe,
        foodNameEn: asOptionalString(row.foodNameEn),
        foodCategory: asOptionalString(row.foodCategory),
        dosage: asOptionalString(row.dosage),
        imageUrl: asOptionalString(row.imageUrl),
        description: asOptionalString(row.description),
        notes: asOptionalString(row.notes)
      };
      await foodService.create(payload);
      known.add(foodNameHe.toLowerCase());
      added += 1;
    }

    await foodsList.reload();
    setImportMsg(`ייבוא הושלם: נוספו ${added}, דולגו ${skipped}.`);
  }

  async function uploadImage(file: File) {
    setUploadBusy(true);
    try {
      const url = await integrationService.uploadFile(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setMsg('העלאת קובץ הצליחה.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      setMsg(`שגיאה בהעלאה: ${message}`);
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <section className="stack">
      <PageHeader title="Foods" description="ניהול מזונות, קטגוריות, תמונות וקשר לתסמיני חסר." />

      {msg ? <p className={`msg ${msg.startsWith('שגיאה') ? 'err' : 'ok'}`}>{msg}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש שם/קטגוריה..."
        />
        <button type="button" className="btn primary" onClick={openCreate}>
          מזון חדש
        </button>
        <button type="button" className="btn secondary" onClick={exportJson}>
          יצוא JSON
        </button>
        <button type="button" className="btn secondary" onClick={exportCsv}>
          יצוא CSV
        </button>
        <button type="button" className="btn secondary" onClick={() => setImportOpen(true)}>
          יבוא
        </button>
      </div>

      <StateView
        loading={foodsList.loading || symptomsList.loading}
        error={foodsList.error ?? symptomsList.error}
        empty={filtered.length === 0}
        emptyLabel="לא נמצאו מזונות."
      />

      {!foodsList.loading && !foodsList.error && filtered.length > 0 ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>שם אנגלי</th>
                <th>קטגוריה</th>
                <th>תיאור</th>
                <th>תסמינים</th>
                <th>עודכן</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((food) => (
                <tr key={food.id}>
                  <td>
                    <ExpandableText value={food.foodNameHe} popupTitle="שם מזון" />
                  </td>
                  <td>
                    <ExpandableText value={food.foodNameEn} emptyLabel="-" popupTitle="שם מזון באנגלית" />
                  </td>
                  <td>
                    <ExpandableText value={food.foodCategory} emptyLabel="-" popupTitle="קטגוריה" />
                  </td>
                  <td>
                    <ExpandableText value={food.description} emptyLabel="-" popupTitle="תיאור" />
                  </td>
                  <td>{food.deficiencySymptoms?.length ?? 0}</td>
                  <td>{formatDate(food.updated_date)}</td>
                  <td className="action-cell">
                    <button type="button" className="btn ghost" onClick={() => openEdit(food)}>
                      עריכה
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setDetailTarget(food)}>
                      פרטים
                    </button>
                    <button type="button" className="btn danger" onClick={() => setDeleteTarget(food)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={formOpen} title={editing ? 'עריכת מזון' : 'מזון חדש'} onClose={() => setFormOpen(false)}>
        <div className="stack">
          <div className="form-grid">
            <label className="field half">
              <span>שם מזון (עברית)*</span>
              <input value={form.foodNameHe} onChange={(event) => setForm((prev) => ({ ...prev, foodNameHe: event.target.value }))} />
            </label>

            <label className="field half">
              <span>שם מזון (אנגלית)</span>
              <input value={form.foodNameEn} onChange={(event) => setForm((prev) => ({ ...prev, foodNameEn: event.target.value }))} />
            </label>

            <label className="field half">
              <span>קטגוריה</span>
              <input
                value={form.foodCategory}
                onChange={(event) => setForm((prev) => ({ ...prev, foodCategory: event.target.value }))}
              />
            </label>

            <label className="field half">
              <span>מינון</span>
              <input value={form.dosage} onChange={(event) => setForm((prev) => ({ ...prev, dosage: event.target.value }))} />
            </label>

            <label className="field">
              <span>URL תמונה</span>
              <input value={form.imageUrl} onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))} />
            </label>

            <div className="field">
              <span>העלאת תמונה</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploadBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file);
                  event.currentTarget.value = '';
                }}
              />
            </div>

            <label className="field">
              <span>תיאור</span>
              <RichTextField
                placeholder="תיאור..."
                value={form.description}
                onChange={(next) => setForm((prev) => ({ ...prev, description: next }))}
              />
            </label>

            <label className="field">
              <span>הערות</span>
              <RichTextField placeholder="הערות..." value={form.notes} onChange={(next) => setForm((prev) => ({ ...prev, notes: next }))} />
            </label>
          </div>

          <label className="field">
            <span>תסמיני חסר קשורים</span>
            <SearchableMultiSelect
              selectedIds={form.deficiencySymptoms}
              options={symptomOptions}
              placeholder="בחר תסמינים..."
              onChange={(selectedIds) => setForm((prev) => ({ ...prev, deficiencySymptoms: selectedIds }))}
            />
          </label>

          <div className="inline-row">
            <button type="button" className="btn primary" onClick={() => void onSave()} disabled={saving || uploadBusy}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setFormOpen(false)} disabled={saving || uploadBusy}>
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="מחיקת מזון"
        message={`למחוק את "${deleteTarget?.foodNameHe}"?`}
        confirmLabel={saving ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!saving) setDeleteTarget(null);
        }}
      />

      <Modal open={importOpen} title="יבוא מזונות" onClose={() => setImportOpen(false)}>
        <div className="stack">
          <p>ייבוא JSON/CSV. כפילויות לפי foodNameHe.</p>
          <input
            type="file"
            accept=".json,.csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void importFile(file);
              event.currentTarget.value = '';
            }}
          />
          {importMsg ? <p className="msg ok">{importMsg}</p> : null}
        </div>
      </Modal>

      <Modal open={Boolean(detailTarget)} title="פרטי מזון" onClose={() => setDetailTarget(null)}>
        <div className="stack">
          <p>
            <strong>שם:</strong> {detailTarget?.foodNameHe}
          </p>
          <div>
            <strong>קטגוריה:</strong>
            <ExpandableText value={detailTarget?.foodCategory} emptyLabel="-" popupTitle="קטגוריה" />
          </div>
          <div>
            <strong>תיאור:</strong>
            <ExpandableText value={detailTarget?.description} emptyLabel="-" popupTitle="תיאור מזון" />
          </div>
          {detailTarget?.imageUrl ? (
            <p>
              <a href={detailTarget.imageUrl} target="_blank" rel="noreferrer">
                צפייה בתמונה
              </a>
            </p>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
