import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExpandableText from '../components/ui/ExpandableText';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import RichTextField from '../components/ui/RichTextField';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
import StateView from '../components/ui/StateView';
import { asArray } from '../lib/arrays';
import { formatDate } from '../lib/date';
import { downloadText, toCsv } from '../lib/file-io';
import { asOptionalString, asStringArray, parseImportFile } from '../lib/import-export';
import { articleService, deficiencySymptomService, foodService, vitaminService } from '../services';
import type { Article, DeficiencySymptom, Food, Vitamin } from '../types/entities';

type DetailTarget =
  | { type: 'vitamin'; item: Vitamin }
  | { type: 'symptom'; item: DeficiencySymptom }
  | { type: 'food'; item: Food }
  | { type: 'article'; item: Article };

interface EffectsCaseRecord {
  id: string;
  phenomenonName: string;
  supplementIds: string[];
  symptomIds: string[];
  deficiencyIds: string[];
  foodIds: string[];
  articleIds: string[];
  notes: string;
  created_date: string;
  updated_date: string;
}

interface FormState {
  phenomenonName: string;
  supplementIds: string[];
  symptomIds: string[];
  deficiencyIds: string[];
  foodIds: string[];
  articleIds: string[];
  notes: string;
}

type SelectionField = 'supplementIds' | 'symptomIds' | 'deficiencyIds' | 'foodIds' | 'articleIds';

const STORAGE_KEY = 'supplements_effects_cases_v1';

function createEmptyForm(): FormState {
  return {
    phenomenonName: '',
    supplementIds: [],
    symptomIds: [],
    deficiencyIds: [],
    foodIds: [],
    articleIds: [],
    notes: ''
  };
}

function textOrDash(value?: string | null): string {
  if (!value) return '-';
  const next = value.trim();
  return next.length > 0 ? next : '-';
}

function generateId(): string {
  return `fx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadStoredCases(): EffectsCaseRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const phenomenonName = String((entry as { phenomenonName?: unknown }).phenomenonName ?? '').trim();
        if (!phenomenonName) return null;
        const created = String((entry as { created_date?: unknown }).created_date ?? new Date().toISOString());
        const updated = String((entry as { updated_date?: unknown }).updated_date ?? created);
        return {
          id: String((entry as { id?: unknown }).id ?? generateId()),
          phenomenonName,
          supplementIds: asStringArray((entry as { supplementIds?: unknown }).supplementIds),
          symptomIds: asStringArray((entry as { symptomIds?: unknown }).symptomIds),
          deficiencyIds: asStringArray((entry as { deficiencyIds?: unknown }).deficiencyIds),
          foodIds: asStringArray((entry as { foodIds?: unknown }).foodIds),
          articleIds: asStringArray((entry as { articleIds?: unknown }).articleIds),
          notes: String((entry as { notes?: unknown }).notes ?? ''),
          created_date: created,
          updated_date: updated
        } satisfies EffectsCaseRecord;
      })
      .filter((entry): entry is EffectsCaseRecord => entry !== null)
      .sort((a, b) => b.updated_date.localeCompare(a.updated_date));
  } catch {
    return [];
  }
}

function persistCases(records: EffectsCaseRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function labelsFromIds(ids: string[], nameById: Map<string, string>): string[] {
  return ids.map((id) => nameById.get(id) ?? id);
}

function labelsAsText(ids: string[], nameById: Map<string, string>): string {
  const labels = labelsFromIds(ids, nameById);
  return labels.length > 0 ? labels.join(', ') : '-';
}

export default function EffectsCasesPage() {
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [records, setRecords] = useState<EffectsCaseRecord[]>(() => loadStoredCases());
  const [vitamins, setVitamins] = useState<Vitamin[]>([]);
  const [symptoms, setSymptoms] = useState<DeficiencySymptom[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EffectsCaseRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [selectedCase, setSelectedCase] = useState<EffectsCaseRecord | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [vitaminList, symptomList, foodList, articleList] = await Promise.all([
          vitaminService.list('vitaminNameHe asc'),
          deficiencySymptomService.list('symptomNameHe asc'),
          foodService.list('foodNameHe asc'),
          articleService.list('titleHe asc')
        ]);
        if (!active) return;
        setVitamins(vitaminList);
        setSymptoms(symptomList);
        setFoods(foodList);
        setArticles(articleList);
      } catch (loadError) {
        const next = loadError instanceof Error ? loadError.message : 'Unknown error';
        if (active) setError(next);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const vitaminNameById = useMemo(() => new Map(vitamins.map((item) => [item.id, item.vitaminNameHe])), [vitamins]);
  const symptomNameById = useMemo(() => new Map(symptoms.map((item) => [item.id, item.symptomNameHe])), [symptoms]);
  const foodNameById = useMemo(() => new Map(foods.map((item) => [item.id, item.foodNameHe])), [foods]);
  const articleNameById = useMemo(() => new Map(articles.map((item) => [item.id, item.titleHe])), [articles]);

  const vitaminOptions = useMemo(
    () => vitamins.map((item) => ({ id: item.id, label: item.vitaminNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [vitamins]
  );
  const symptomOptions = useMemo(
    () => symptoms.map((item) => ({ id: item.id, label: item.symptomNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [symptoms]
  );
  const foodOptions = useMemo(
    () => foods.map((item) => ({ id: item.id, label: item.foodNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [foods]
  );
  const articleOptions = useMemo(
    () => articles.map((item) => ({ id: item.id, label: item.titleHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [articles]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => {
      const haystack = [
        record.phenomenonName,
        labelsAsText(record.supplementIds, vitaminNameById),
        labelsAsText(record.symptomIds, symptomNameById),
        labelsAsText(record.deficiencyIds, symptomNameById),
        labelsAsText(record.foodIds, foodNameById),
        labelsAsText(record.articleIds, articleNameById),
        record.notes
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [records, query, vitaminNameById, symptomNameById, foodNameById, articleNameById]);

  function openCreate() {
    setEditingId(null);
    setForm(createEmptyForm());
    setMessage(null);
    setFormOpen(true);
  }

  function openEdit(record: EffectsCaseRecord) {
    setEditingId(record.id);
    setForm({
      phenomenonName: record.phenomenonName,
      supplementIds: [...record.supplementIds],
      symptomIds: [...record.symptomIds],
      deficiencyIds: [...record.deficiencyIds],
      foodIds: [...record.foodIds],
      articleIds: [...record.articleIds],
      notes: record.notes
    });
    setMessage(null);
    setFormOpen(true);
  }

  function openDetailFromSelection(type: DetailTarget['type'], id: string) {
    if (type === 'vitamin') {
      const item = vitamins.find((entry) => entry.id === id);
      if (item) setDetailTarget({ type, item });
      return;
    }
    if (type === 'symptom') {
      const item = symptoms.find((entry) => entry.id === id);
      if (item) setDetailTarget({ type, item });
      return;
    }
    if (type === 'food') {
      const item = foods.find((entry) => entry.id === id);
      if (item) setDetailTarget({ type, item });
      return;
    }
    const item = articles.find((entry) => entry.id === id);
    if (item) setDetailTarget({ type, item });
  }

  function removeSelectedItem(field: SelectionField, id: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((selectedId) => selectedId !== id)
    }));
  }

  function saveRecords(nextRecords: EffectsCaseRecord[]) {
    const sorted = [...nextRecords].sort((a, b) => b.updated_date.localeCompare(a.updated_date));
    setRecords(sorted);
    persistCases(sorted);
  }

  function onSave() {
    const phenomenonName = form.phenomenonName.trim();
    if (!phenomenonName) {
      setMessage('שגיאה: שם התופעה הוא שדה חובה.');
      return;
    }

    const now = new Date().toISOString();
    if (editingId) {
      const current = records.find((record) => record.id === editingId);
      if (!current) {
        setMessage('שגיאה: הרשומה לעריכה לא נמצאה.');
        return;
      }
      const updated: EffectsCaseRecord = {
        ...current,
        phenomenonName,
        supplementIds: [...form.supplementIds],
        symptomIds: [...form.symptomIds],
        deficiencyIds: [...form.deficiencyIds],
        foodIds: [...form.foodIds],
        articleIds: [...form.articleIds],
        notes: form.notes,
        updated_date: now
      };
      saveRecords(records.map((record) => (record.id === editingId ? updated : record)));
      if (selectedCase?.id === editingId) {
        setSelectedCase(updated);
      }
      setMessage('הרשומה עודכנה בהצלחה.');
    } else {
      const created: EffectsCaseRecord = {
        id: generateId(),
        phenomenonName,
        supplementIds: [...form.supplementIds],
        symptomIds: [...form.symptomIds],
        deficiencyIds: [...form.deficiencyIds],
        foodIds: [...form.foodIds],
        articleIds: [...form.articleIds],
        notes: form.notes,
        created_date: now,
        updated_date: now
      };
      saveRecords([created, ...records]);
      setMessage('הרשומה נוצרה בהצלחה.');
    }

    setFormOpen(false);
    setEditingId(null);
    setForm(createEmptyForm());
  }

  function onDelete() {
    if (!deleteTarget) return;
    const next = records.filter((record) => record.id !== deleteTarget.id);
    saveRecords(next);
    if (selectedCase?.id === deleteTarget.id) {
      setSelectedCase(null);
    }
    setDeleteTarget(null);
    setMessage('הרשומה נמחקה.');
  }

  function exportJson() {
    downloadText(`effects_cases_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'phenomenonName', 'supplementIds', 'symptomIds', 'deficiencyIds', 'foodIds', 'articleIds', 'notes', 'updated_date'],
      ...filtered.map((record) => [
        record.id,
        record.phenomenonName,
        record.supplementIds.join('|'),
        record.symptomIds.join('|'),
        record.deficiencyIds.join('|'),
        record.foodIds.join('|'),
        record.articleIds.join('|'),
        record.notes,
        record.updated_date
      ])
    ]);
    downloadText(`effects_cases_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function importFile(file: File) {
    setImportMsg(null);
    const rows = await parseImportFile(file);
    const known = new Set(records.map((record) => record.phenomenonName.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    const appended: EffectsCaseRecord[] = [];

    for (const row of rows) {
      const phenomenonName = asOptionalString(row.phenomenonName);
      if (!phenomenonName || known.has(phenomenonName.toLowerCase())) {
        skipped += 1;
        continue;
      }

      appended.push({
        id: generateId(),
        phenomenonName,
        supplementIds: asStringArray(row.supplementIds),
        symptomIds: asStringArray(row.symptomIds),
        deficiencyIds: asStringArray(row.deficiencyIds),
        foodIds: asStringArray(row.foodIds),
        articleIds: asStringArray(row.articleIds),
        notes: asOptionalString(row.notes) ?? '',
        created_date: now,
        updated_date: now
      });
      known.add(phenomenonName.toLowerCase());
      added += 1;
    }

    if (appended.length > 0) {
      saveRecords([...appended, ...records]);
    }
    setImportMsg(`ייבוא הושלם: נוספו ${added}, דולגו ${skipped}.`);
  }

  function renderEditableSelectedItems(
    field: SelectionField,
    ids: string[],
    nameById: Map<string, string>,
    type: DetailTarget['type']
  ) {
    if (ids.length === 0) {
      return <p className="state-line">לא נבחרו פריטים.</p>;
    }
    return (
      <div className="chips">
        {ids.map((id) => (
          <div key={id} className="chip chip-row">
            <button type="button" className="chip-open-btn" onClick={() => openDetailFromSelection(type, id)}>
              {nameById.get(id) ?? id}
            </button>
            <button
              type="button"
              className="chip-remove-btn"
              aria-label="הסר בחירה"
              onClick={() => removeSelectedItem(field, id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderReadOnlyChips(ids: string[], nameById: Map<string, string>, type: DetailTarget['type']) {
    if (ids.length === 0) return <span>-</span>;
    return (
      <div className="chips">
        {ids.map((id) => (
          <button key={id} type="button" className="chip chip-btn" onClick={() => openDetailFromSelection(type, id)}>
            {nameById.get(id) ?? id}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="stack">
      <PageHeader title="תופעות ומקרים" description="מצב תצוגה לרשומות + מצב עדכון נפרד לכל הרשומות." />

      {message ? <p className={`msg ${message.startsWith('שגיאה') ? 'err' : 'ok'}`}>{message}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם תופעה/תוספים/תסמינים/מזונות/מאמרים..."
        />
        <button type="button" className="btn primary" onClick={openCreate}>
          תופעה חדשה
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

      <StateView loading={loading} error={error} empty={filtered.length === 0} emptyLabel="לא נמצאו רשומות תופעות ומקרים." />

      {!loading && !error && filtered.length > 0 ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky-col">שם התופעה</th>
                <th>תוספים</th>
                <th>תסימנים</th>
                <th>חוסרים</th>
                <th>מזונות</th>
                <th>מאמרים</th>
                <th>הערות</th>
                <th>עודכן</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td className="sticky-col">
                    <button type="button" className="text-link" onClick={() => setSelectedCase(record)}>
                      {record.phenomenonName}
                    </button>
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(record.supplementIds, vitaminNameById)} popupTitle="תוספים" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(record.symptomIds, symptomNameById)} popupTitle="תסימנים" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(record.deficiencyIds, symptomNameById)} popupTitle="חוסרים" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(record.foodIds, foodNameById)} popupTitle="מזונות" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(record.articleIds, articleNameById)} popupTitle="מאמרים" />
                  </td>
                  <td>
                    <ExpandableText value={record.notes} emptyLabel="-" popupTitle="הערות" />
                  </td>
                  <td>{formatDate(record.updated_date)}</td>
                  <td className="action-cell">
                    <button type="button" className="btn ghost" onClick={() => setSelectedCase(record)}>
                      תצוגה
                    </button>
                    <button type="button" className="btn ghost" onClick={() => openEdit(record)}>
                      עריכה
                    </button>
                    <button type="button" className="btn danger" onClick={() => setDeleteTarget(record)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={formOpen} title={editingId ? 'עדכון תופעה ומקרה' : 'תופעה ומקרה חדש'} onClose={() => setFormOpen(false)}>
        <div className="stack">
          <label className="field">
            <span>שם התופעה</span>
            <input
              placeholder="הכנס שם תופעה..."
              value={form.phenomenonName}
              onChange={(event) => setForm((prev) => ({ ...prev, phenomenonName: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>תוספים</span>
            <SearchableMultiSelect
              selectedIds={form.supplementIds}
              options={vitaminOptions}
              placeholder="חפש תוסף..."
              onChange={(selectedIds) => setForm((prev) => ({ ...prev, supplementIds: selectedIds }))}
            />
            {renderEditableSelectedItems('supplementIds', form.supplementIds, vitaminNameById, 'vitamin')}
          </label>

          <label className="field">
            <span>תסימנים</span>
            <SearchableMultiSelect
              selectedIds={form.symptomIds}
              options={symptomOptions}
              placeholder="חפש תסמין..."
              onChange={(selectedIds) => setForm((prev) => ({ ...prev, symptomIds: selectedIds }))}
            />
            {renderEditableSelectedItems('symptomIds', form.symptomIds, symptomNameById, 'symptom')}
          </label>

          <label className="field">
            <span>חוסרים</span>
            <SearchableMultiSelect
              selectedIds={form.deficiencyIds}
              options={symptomOptions}
              placeholder="חפש תסמין חסר..."
              onChange={(selectedIds) => setForm((prev) => ({ ...prev, deficiencyIds: selectedIds }))}
            />
            {renderEditableSelectedItems('deficiencyIds', form.deficiencyIds, symptomNameById, 'symptom')}
          </label>

          <label className="field">
            <span>מזונות</span>
            <SearchableMultiSelect
              selectedIds={form.foodIds}
              options={foodOptions}
              placeholder="חפש מזון..."
              onChange={(selectedIds) => setForm((prev) => ({ ...prev, foodIds: selectedIds }))}
            />
            {renderEditableSelectedItems('foodIds', form.foodIds, foodNameById, 'food')}
          </label>

          <label className="field">
            <span>מאמרים</span>
            <SearchableMultiSelect
              selectedIds={form.articleIds}
              options={articleOptions}
              placeholder="חפש מאמר..."
              onChange={(selectedIds) => setForm((prev) => ({ ...prev, articleIds: selectedIds }))}
            />
            {renderEditableSelectedItems('articleIds', form.articleIds, articleNameById, 'article')}
          </label>

          <label className="field">
            <span>הערות</span>
            <RichTextField placeholder="כתוב הערות..." value={form.notes} onChange={(next) => setForm((prev) => ({ ...prev, notes: next }))} />
          </label>

          <div className="inline-row">
            <button type="button" className="btn primary" onClick={onSave}>
              שמור
            </button>
            <button type="button" className="btn ghost" onClick={() => setFormOpen(false)}>
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(selectedCase)} title={selectedCase ? `תצוגת תופעה: ${selectedCase.phenomenonName}` : 'תצוגת תופעה'} onClose={() => setSelectedCase(null)}>
        {selectedCase ? (
          <div className="stack">
            <div className="detail-section">
              <h4>פרטים כלליים</h4>
              <div className="detail-kv-grid">
                <div className="detail-kv-item">
                  <h5>שם התופעה</h5>
                  <ExpandableText value={selectedCase.phenomenonName} popupTitle="שם התופעה" />
                </div>
                <div className="detail-kv-item">
                  <h5>עודכן</h5>
                  <span>{textOrDash(formatDate(selectedCase.updated_date))}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>קישורים</h4>
              <div className="detail-kv-grid">
                <div className="detail-kv-item">
                  <h5>תוספים</h5>
                  {renderReadOnlyChips(selectedCase.supplementIds, vitaminNameById, 'vitamin')}
                </div>
                <div className="detail-kv-item">
                  <h5>תסימנים</h5>
                  {renderReadOnlyChips(selectedCase.symptomIds, symptomNameById, 'symptom')}
                </div>
                <div className="detail-kv-item">
                  <h5>חוסרים</h5>
                  {renderReadOnlyChips(selectedCase.deficiencyIds, symptomNameById, 'symptom')}
                </div>
                <div className="detail-kv-item">
                  <h5>מזונות</h5>
                  {renderReadOnlyChips(selectedCase.foodIds, foodNameById, 'food')}
                </div>
                <div className="detail-kv-item detail-kv-item-full">
                  <h5>מאמרים</h5>
                  {renderReadOnlyChips(selectedCase.articleIds, articleNameById, 'article')}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>הערות</h4>
              <div className="detail-kv-grid">
                <div className="detail-kv-item detail-kv-item-full">
                  <ExpandableText value={selectedCase.notes} emptyLabel="-" popupTitle="הערות" />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={importOpen} title="יבוא תופעות ומקרים" onClose={() => setImportOpen(false)}>
        <div className="stack">
          <p>ייבוא JSON/CSV. כפילויות מזוהות לפי שם תופעה.</p>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="מחיקת תופעה ומקרה"
        message={`למחוק את "${deleteTarget?.phenomenonName}"?`}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="מחק"
      />

      <Modal
        open={Boolean(detailTarget)}
        title={detailTarget ? detailTitle(detailTarget) : 'פרטי בחירה'}
        onClose={() => setDetailTarget(null)}
      >
        {detailTarget ? (
          <DetailContent
            target={detailTarget}
            vitaminNameById={vitaminNameById}
            symptomNameById={symptomNameById}
            foodNameById={foodNameById}
          />
        ) : null}
      </Modal>
    </section>
  );
}

function detailTitle(target: DetailTarget): string {
  if (target.type === 'vitamin') return `פרטי תוסף: ${target.item.vitaminNameHe}`;
  if (target.type === 'symptom') return `פרטי תסמין: ${target.item.symptomNameHe}`;
  if (target.type === 'food') return `פרטי מזון: ${target.item.foodNameHe}`;
  return `פרטי מאמר: ${target.item.titleHe}`;
}

interface DetailContentProps {
  target: DetailTarget;
  vitaminNameById: Map<string, string>;
  symptomNameById: Map<string, string>;
  foodNameById: Map<string, string>;
}

function DetailContent({ target, vitaminNameById, symptomNameById, foodNameById }: DetailContentProps) {
  if (target.type === 'vitamin') {
    const item = target.item;
    const conflicts = asArray(item.conflictVitamins).map((conflict) => vitaminNameById.get(conflict.vitaminId) ?? conflict.vitaminId);
    return (
      <div className="stack">
        <p>
          <strong>שם בעברית:</strong> {item.vitaminNameHe}
        </p>
        <p>
          <strong>שם באנגלית:</strong> {textOrDash(item.vitaminNameEn)}
        </p>
        <p>
          <strong>שם מדעי עברית:</strong> {textOrDash(item.vitaminNickHe)}
        </p>
        <p>
          <strong>שם מדעי אנגלית:</strong> {textOrDash(item.vitaminNickEn)}
        </p>
        <p>
          <strong>צורה פעילה:</strong> {textOrDash(item.activeForm)}
        </p>
        <p>
          <strong>מסיסות:</strong> {textOrDash(item.solubility)}
        </p>
        <p>
          <strong>מקור:</strong> {textOrDash(item.source)}
        </p>
        <p>
          <strong>תיאור פעולה:</strong> {textOrDash(item.actionDescription)}
        </p>
        <p>
          <strong>תסמיני חסר:</strong> {asArray(item.deficiencySymptoms).map((id) => symptomNameById.get(id) ?? id).join(', ') || '-'}
        </p>
        <p>
          <strong>מקורות מזון:</strong> {asArray(item.foodSources).map((id) => foodNameById.get(id) ?? id).join(', ') || '-'}
        </p>
        <p>
          <strong>שילובים מומלצים:</strong> {asArray(item.combinationVitaminIds).map((id) => vitaminNameById.get(id) ?? id).join(', ') || '-'}
        </p>
        <p>
          <strong>התנגשויות:</strong> {conflicts.join(', ') || '-'}
        </p>
        <p>
          <strong>הערות:</strong> {textOrDash(item.notes)}
        </p>
        <p>
          <strong>סיפור מקרה:</strong> {textOrDash(item.caseStory)}
        </p>
      </div>
    );
  }

  if (target.type === 'symptom') {
    const item = target.item;
    return (
      <div className="stack">
        <p>
          <strong>שם תסמין:</strong> {item.symptomNameHe}
        </p>
        <p>
          <strong>שם באנגלית:</strong> {textOrDash(item.symptomNameEn)}
        </p>
        <p>
          <strong>תגיות:</strong> {asArray(item.tags).join(', ') || '-'}
        </p>
        <p>
          <strong>תוספים קשורים:</strong> {asArray(item.vitaminIds).map((id) => vitaminNameById.get(id) ?? id).join(', ') || '-'}
        </p>
        <p>
          <strong>מזונות קשורים:</strong> {asArray(item.foodIds).map((id) => foodNameById.get(id) ?? id).join(', ') || '-'}
        </p>
        <p>
          <strong>הערות:</strong> {textOrDash(item.notes)}
        </p>
      </div>
    );
  }

  if (target.type === 'food') {
    const item = target.item;
    return (
      <div className="stack">
        <p>
          <strong>שם מזון:</strong> {item.foodNameHe}
        </p>
        <p>
          <strong>שם באנגלית:</strong> {textOrDash(item.foodNameEn)}
        </p>
        <p>
          <strong>קטגוריה:</strong> {textOrDash(item.foodCategory)}
        </p>
        <p>
          <strong>מינון:</strong> {textOrDash(item.dosage)}
        </p>
        <p>
          <strong>תיאור:</strong> {textOrDash(item.description)}
        </p>
        <p>
          <strong>תסמיני חסר קשורים:</strong> {asArray(item.deficiencySymptoms).map((id) => symptomNameById.get(id) ?? id).join(', ') || '-'}
        </p>
        <p>
          <strong>הערות:</strong> {textOrDash(item.notes)}
        </p>
      </div>
    );
  }

  const item = target.item;
  return (
    <div className="stack">
      <p>
        <strong>כותרת:</strong> {item.titleHe}
      </p>
      <p>
        <strong>כותרת באנגלית:</strong> {textOrDash(item.titleEn)}
      </p>
      <p>
        <strong>קישור:</strong> {textOrDash(item.url)}
      </p>
      <p>
        <strong>תקציר:</strong> {textOrDash(item.summary)}
      </p>
      <p>
        <strong>מזונות קשורים:</strong> {asArray(item.foodIds).map((id) => foodNameById.get(id) ?? id).join(', ') || '-'}
      </p>
    </div>
  );
}
