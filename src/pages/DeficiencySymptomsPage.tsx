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
import { asOptionalNumber, asOptionalString, asStringArray, parseImportFile } from '../lib/import-export';
import { deficiencySymptomService, foodService, integrationService, vitaminService } from '../services';
import type { DeficiencySymptom, Food, Vitamin } from '../types/entities';

interface SymptomFormState {
  symptomNameHe: string;
  symptomNameEn: string;
  notes: string;
  vitaminIds: string[];
  foodIds: string[];
}

function emptyForm(): SymptomFormState {
  return {
    symptomNameHe: '',
    symptomNameEn: '',
    notes: '',
    vitaminIds: [],
    foodIds: []
  };
}

function toPayload(form: SymptomFormState): Partial<DeficiencySymptom> {
  return {
    symptomNameHe: form.symptomNameHe.trim(),
    symptomNameEn: form.symptomNameEn.trim() || undefined,
    notes: form.notes.trim() || undefined,
    vitaminIds: form.vitaminIds,
    foodIds: form.foodIds
  };
}

function labelsAsText(ids: string[] | undefined, nameById: Map<string, string>): string {
  const labels = asArray(ids)
    .map((id) => nameById.get(id) ?? id)
    .sort((a, b) => a.localeCompare(b, 'he'));
  return labels.join(', ');
}

export default function DeficiencySymptomsPage() {
  const symptomsList = useEntityList(deficiencySymptomService, 'created_date desc');
  const foodsList = useEntityList(foodService, 'foodNameHe asc');
  const vitaminsList = useEntityList(vitaminService, 'vitaminNameHe asc');

  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeficiencySymptom | null>(null);
  const [form, setForm] = useState<SymptomFormState>(emptyForm());
  const [initialFoodIds, setInitialFoodIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeficiencySymptom | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return symptomsList.items;
    return symptomsList.items.filter((symptom) =>
      [symptom.symptomNameHe, symptom.symptomNameEn, ...(symptom.tags ?? [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [symptomsList.items, query]);

  const vitaminOptions = useMemo(
    () =>
      vitaminsList.items
        .map((vitamin: Vitamin) => ({ id: vitamin.id, label: vitamin.vitaminNameHe }))
        .sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [vitaminsList.items]
  );

  const foodOptions = useMemo(
    () =>
      foodsList.items
        .map((food: Food) => ({ id: food.id, label: food.foodNameHe }))
        .sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [foodsList.items]
  );

  const vitaminNameById = useMemo(
    () => new Map(vitaminsList.items.map((vitamin) => [vitamin.id, vitamin.vitaminNameHe || vitamin.vitaminNameEn || vitamin.vitaminNickHe || vitamin.id])),
    [vitaminsList.items]
  );

  const foodNameById = useMemo(
    () => new Map(foodsList.items.map((food) => [food.id, food.foodNameHe || food.foodNameEn || food.id])),
    [foodsList.items]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setInitialFoodIds([]);
    setFormOpen(true);
  }

  function openEdit(symptom: DeficiencySymptom) {
    setEditing(symptom);
    setForm({
      symptomNameHe: symptom.symptomNameHe,
      symptomNameEn: symptom.symptomNameEn ?? '',
      notes: symptom.notes ?? '',
      vitaminIds: asArray(symptom.vitaminIds),
      foodIds: asArray(symptom.foodIds)
    });
    setInitialFoodIds(asArray(symptom.foodIds));
    setFormOpen(true);
  }

  async function syncFoodsBySymptom(symptomId: string, beforeIds: string[], afterIds: string[]) {
    for (const food of foodsList.items) {
      const had = beforeIds.includes(food.id);
      const has = afterIds.includes(food.id);
      if (had === has) continue;
      const current = asArray(food.deficiencySymptoms);
      const next = has ? uniqueStrings([...current, symptomId]) : current.filter((value) => value !== symptomId);
      await foodService.update(food.id, { deficiencySymptoms: next });
    }
  }

  async function onSave() {
    if (!form.symptomNameHe.trim()) {
      setMsg('שגיאה: שם תסמין בעברית הוא שדה חובה.');
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const payload = toPayload(form);
      let symptomId = editing?.id ?? '';

      if (editing) {
        await deficiencySymptomService.update(editing.id, payload);
      } else {
        const created = await deficiencySymptomService.create(payload);
        symptomId = created.id;
      }

      await syncFoodsBySymptom(symptomId, initialFoodIds, form.foodIds);
      await Promise.all([symptomsList.reload(), foodsList.reload()]);
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
      await deficiencySymptomService.delete(deleteTarget.id);
      await syncFoodsBySymptom(deleteTarget.id, asArray(deleteTarget.foodIds), []);
      await Promise.all([symptomsList.reload(), foodsList.reload()]);
      setDeleteTarget(null);
      setMsg('הרשומה נמחקה.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unknown error';
      setMsg(`שגיאה במחיקה: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function runAiTags(symptom: DeficiencySymptom) {
    setAiBusyId(symptom.id);
    setMsg(null);
    try {
      const response = await integrationService.invokeLLM({
        prompt: `Generate 5 short Hebrew tags for deficiency symptom: ${symptom.symptomNameHe}. Return comma separated only.`,
        add_context_from_internet: false
      });
      const tags = response
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 10);

      await deficiencySymptomService.update(symptom.id, { tags });
      await symptomsList.reload();
      setMsg('תגיות AI עודכנו.');
    } catch (aiError) {
      const message = aiError instanceof Error ? aiError.message : 'Unknown error';
      setMsg(`שגיאת AI: ${message}`);
    } finally {
      setAiBusyId(null);
    }
  }

  async function migrateSymptomFoodLinks() {
    setMigrationBusy(true);
    setMsg(null);
    try {
      const foodMap = new Map(foodsList.items.map((food) => [food.id, food]));
      for (const symptom of symptomsList.items) {
        for (const foodId of asArray(symptom.foodIds)) {
          const food = foodMap.get(foodId);
          if (!food) continue;
          const next = uniqueStrings([...asArray(food.deficiencySymptoms), symptom.id]);
          if (next.length !== asArray(food.deficiencySymptoms).length) {
            await foodService.update(food.id, { deficiencySymptoms: next });
          }
        }
      }
      await foodsList.reload();
      setMsg('מיגרציית קשרים הושלמה.');
    } catch (migrationError) {
      const message = migrationError instanceof Error ? migrationError.message : 'Unknown error';
      setMsg(`שגיאה במיגרציה: ${message}`);
    } finally {
      setMigrationBusy(false);
    }
  }

  function exportJson() {
    downloadText(`symptoms_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'symptomNameHe', 'symptomNameEn', 'sortOrder', 'tags', 'updated_date'],
      ...filtered.map((symptom) => [
        symptom.id,
        symptom.symptomNameHe,
        symptom.symptomNameEn ?? '',
        symptom.sortOrder?.toString() ?? '',
        asArray(symptom.tags).join('|'),
        symptom.updated_date ?? ''
      ])
    ]);
    downloadText(`symptoms_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function importFile(file: File) {
    setImportMsg(null);
    const rows = await parseImportFile(file);
    const known = new Set(symptomsList.items.map((item) => item.symptomNameHe.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const symptomNameHe = asOptionalString(row.symptomNameHe);
      if (!symptomNameHe || known.has(symptomNameHe.toLowerCase())) {
        skipped += 1;
        continue;
      }

      const payload: Partial<DeficiencySymptom> = {
        symptomNameHe,
        symptomNameEn: asOptionalString(row.symptomNameEn),
        sortOrder: asOptionalNumber(row.sortOrder),
        tags: asStringArray(row.tags),
        notes: asOptionalString(row.notes)
      };
      await deficiencySymptomService.create(payload);
      known.add(symptomNameHe.toLowerCase());
      added += 1;
    }

    await symptomsList.reload();
    setImportMsg(`ייבוא הושלם: נוספו ${added}, דולגו ${skipped}.`);
  }

  return (
    <section className="stack">
      <PageHeader title="DeficiencySymptoms" description="ניהול תסמיני חסר וקשרים לתוספים ולמזונות." />

      {msg ? <p className={`msg ${msg.startsWith('שגיאה') ? 'err' : 'ok'}`}>{msg}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש תסמין/תגית..."
        />
        <button type="button" className="btn primary" onClick={openCreate}>
          תסמין חדש
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
        <button type="button" className="btn secondary" onClick={() => void migrateSymptomFoodLinks()} disabled={migrationBusy}>
          {migrationBusy ? 'מסנכרן...' : 'מיגרציית קשרים'}
        </button>
      </div>

      <StateView
        loading={symptomsList.loading || foodsList.loading || vitaminsList.loading}
        error={symptomsList.error ?? foodsList.error ?? vitaminsList.error}
        empty={filtered.length === 0}
        emptyLabel="לא נמצאו תסמינים."
      />

      {!symptomsList.loading && !symptomsList.error && filtered.length > 0 ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>תגיות</th>
                <th>תוספים</th>
                <th>מזונות</th>
                <th>עודכן</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((symptom) => (
                <tr key={symptom.id}>
                  <td>
                    <ExpandableText value={symptom.symptomNameHe} popupTitle="שם תסמין" />
                  </td>
                  <td>
                    <ExpandableText value={asArray(symptom.tags).join(', ')} emptyLabel="-" popupTitle="תגיות" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(symptom.vitaminIds, vitaminNameById)} emptyLabel="-" popupTitle="תוספים" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(symptom.foodIds, foodNameById)} emptyLabel="-" popupTitle="מזונות" />
                  </td>
                  <td>{formatDate(symptom.updated_date)}</td>
                  <td className="action-cell">
                    <button type="button" className="btn ghost" onClick={() => openEdit(symptom)}>
                      עריכה
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => void runAiTags(symptom)}
                      disabled={aiBusyId === symptom.id}
                    >
                      {aiBusyId === symptom.id ? 'AI...' : 'AI תגיות'}
                    </button>
                    <button type="button" className="btn danger" onClick={() => setDeleteTarget(symptom)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={formOpen} title={editing ? 'עריכת תסמין' : 'תסמין חדש'} onClose={() => setFormOpen(false)}>
        <div className="stack">
          <div className="form-grid">
            <label className="field half">
              <span>שם בעברית *</span>
              <input
                value={form.symptomNameHe}
                onChange={(event) => setForm((prev) => ({ ...prev, symptomNameHe: event.target.value }))}
              />
            </label>

            <label className="field half">
              <span>שם באנגלית</span>
              <input
                value={form.symptomNameEn}
                onChange={(event) => setForm((prev) => ({ ...prev, symptomNameEn: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>הערות</span>
              <RichTextField placeholder="הערות..." value={form.notes} onChange={(next) => setForm((prev) => ({ ...prev, notes: next }))} />
            </label>

            <label className="field">
              <span>תוספים קשורים</span>
              <SearchableMultiSelect
                selectedIds={form.vitaminIds}
                options={vitaminOptions}
                placeholder="בחר תוספים..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, vitaminIds: selectedIds }))}
              />
              <small className="state-line">בחירה מרובה: ניתן לבחור יותר מתוסף אחד.</small>
            </label>

            <label className="field">
              <span>מזונות קשורים</span>
              <SearchableMultiSelect
                selectedIds={form.foodIds}
                options={foodOptions}
                placeholder="בחר מזונות..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, foodIds: selectedIds }))}
              />
              <small className="state-line">בחירה מרובה: ניתן לבחור יותר ממזון אחד.</small>
            </label>
          </div>

          <div className="inline-row">
            <button type="button" className="btn primary" onClick={() => void onSave()} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="מחיקת תסמין"
        message={`למחוק את "${deleteTarget?.symptomNameHe}"?`}
        confirmLabel={saving ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!saving) setDeleteTarget(null);
        }}
      />

      <Modal open={importOpen} title="יבוא תסמינים" onClose={() => setImportOpen(false)}>
        <div className="stack">
          <p>ייבוא JSON/CSV. כפילויות לפי symptomNameHe.</p>
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
    </section>
  );
}
