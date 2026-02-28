import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExpandableText from '../components/ui/ExpandableText';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import StateView from '../components/ui/StateView';
import { useEntityList } from '../hooks/useEntityList';
import { asArray } from '../lib/arrays';
import { formatDate } from '../lib/date';
import { downloadText, toCsv } from '../lib/file-io';
import { asOptionalString, parseImportFile } from '../lib/import-export';
import { labelsFromConflictsWithDetails, mergeLabDeficiencyFields } from '../lib/vitamin-fields';
import { deficiencySymptomService, foodService, integrationService, vitaminService } from '../services';
import type { Vitamin } from '../types/entities';

function byHebrew(a: string, b: string): number {
  return a.localeCompare(b, 'he');
}

function hasHebrew(value: string): boolean {
  return /[\u0590-\u05FF]/.test(value);
}

function stripParentheses(value: string): string {
  return value.replace(/\([^)]*\)/g, ' ');
}

function shortenHebrewSupplementName(value: string): string {
  const compact = stripParentheses(value).replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!compact) return '';

  const hyphenMatch = compact.match(/(?<=[\u0590-\u05FF])\s*[-–—]\s*(?=[\u0590-\u05FF])/u);
  if (hyphenMatch && hyphenMatch.index !== undefined) {
    return compact.slice(0, hyphenMatch.index).trim();
  }

  return compact.trim();
}

function isPlaceholderText(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return /^[-–—]+$/.test(normalized);
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (isPlaceholderText(trimmed)) continue;
    return trimmed;
  }
  return '';
}

function resolveVitaminNameHe(vitamin: Vitamin): string {
  const row = vitamin as unknown as Record<string, unknown>;
  const legacy = typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : undefined;
  return firstNonEmptyString(
    row.vitaminNameHe,
    legacy?.vitaminNameHe,
    row.vitamin_name_he,
    legacy?.vitamin_name_he,
    row.nameHe,
    legacy?.nameHe,
    row.name_he,
    legacy?.name_he,
    row.vitaminNickHe,
    legacy?.vitaminNickHe,
    row.name,
    row.vitaminNameEn,
    legacy?.vitaminNameEn,
    row.nameEn
  );
}

function resolveVitaminNameEn(vitamin: Vitamin): string {
  const row = vitamin as unknown as Record<string, unknown>;
  const legacy = typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : undefined;
  return firstNonEmptyString(
    row.vitaminNameEn,
    legacy?.vitaminNameEn,
    row.vitamin_name_en,
    legacy?.vitamin_name_en,
    row.nameEn,
    legacy?.nameEn,
    row.name_en
  );
}

function resolveActiveForm(vitamin: Vitamin): string {
  const row = vitamin as unknown as Record<string, unknown>;
  const legacy = typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : undefined;
  return firstNonEmptyString(row.activeForm, legacy?.activeForm, row.active_form, legacy?.active_form);
}

function resolveVitaminNickHe(vitamin: Vitamin): string {
  const row = vitamin as unknown as Record<string, unknown>;
  const legacy = typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : undefined;
  return firstNonEmptyString(
    row.vitaminNickHe,
    legacy?.vitaminNickHe,
    row.vitamin_nick_he,
    legacy?.vitamin_nick_he,
    row.scientificNameHe,
    legacy?.scientificNameHe,
    resolveVitaminNameHe(vitamin)
  );
}

function resolveVitaminNickEn(vitamin: Vitamin): string {
  const row = vitamin as unknown as Record<string, unknown>;
  const legacy = typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : undefined;
  return firstNonEmptyString(
    row.vitaminNickEn,
    legacy?.vitaminNickEn,
    row.vitamin_nick_en,
    legacy?.vitamin_nick_en,
    row.scientificNameEn,
    legacy?.scientificNameEn,
    resolveVitaminNameEn(vitamin)
  );
}

function resolveDisplayNameHe(vitamin: Vitamin): string {
  const primary = resolveVitaminNameHe(vitamin);
  const scientificHe = resolveVitaminNickHe(vitamin);
  if (primary && hasHebrew(primary)) return shortenHebrewSupplementName(primary);
  if (scientificHe && hasHebrew(scientificHe)) return shortenHebrewSupplementName(scientificHe);
  return firstNonEmptyString(
    shortenHebrewSupplementName(primary),
    shortenHebrewSupplementName(scientificHe),
    resolveVitaminNameEn(vitamin),
    resolveVitaminNickEn(vitamin),
    vitamin.id
  );
}

function labelsFromIds(ids: string[] | undefined, nameById: Map<string, string>): string[] {
  return asArray(ids)
    .map((id) => nameById.get(id) ?? id)
    .sort(byHebrew);
}

function renderExpandableCell(value?: string | null, popupTitle = 'תוכן מלא') {
  return <ExpandableText value={value} emptyLabel="-" popupTitle={popupTitle} />;
}

export default function VitaminsPage() {
  const navigate = useNavigate();
  const { items, loading, error, reload } = useEntityList(vitaminService);
  const symptomsList = useEntityList(deficiencySymptomService, 'symptomNameHe asc');
  const foodsList = useEntityList(foodService, 'foodNameHe asc');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Vitamin | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiTargetId, setAiTargetId] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((vitamin) =>
      [
        resolveDisplayNameHe(vitamin),
        resolveVitaminNameEn(vitamin),
        resolveVitaminNickHe(vitamin),
        resolveVitaminNickEn(vitamin),
        resolveActiveForm(vitamin)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [items, query]);

  const visibleItems = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const nameA = firstNonEmptyString(resolveDisplayNameHe(a), resolveVitaminNameEn(a), a.id);
      const nameB = firstNonEmptyString(resolveDisplayNameHe(b), resolveVitaminNameEn(b), b.id);
      return byHebrew(nameA, nameB);
    });
  }, [filtered]);

  const symptomNameById = useMemo(
    () => new Map(symptomsList.items.map((symptom) => [symptom.id, symptom.symptomNameHe])),
    [symptomsList.items]
  );

  const foodNameById = useMemo(() => new Map(foodsList.items.map((food) => [food.id, food.foodNameHe])), [foodsList.items]);

  const vitaminNameById = useMemo(() => new Map(items.map((vitamin) => [vitamin.id, resolveDisplayNameHe(vitamin)])), [items]);

  async function onDeleteConfirm() {
    if (!deleteTarget) return;
    setBusyDelete(true);
    setNote(null);
    try {
      await vitaminService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
      setNote('הרשומה נמחקה בהצלחה.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unknown error';
      setNote(`שגיאה במחיקה: ${message}`);
    } finally {
      setBusyDelete(false);
    }
  }

  function exportJson() {
    downloadText(`vitamins_${Date.now()}.json`, JSON.stringify(visibleItems, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'vitaminNameHe', 'vitaminNameEn', 'activeForm', 'solubility', 'updated_date'],
      ...visibleItems.map((vitamin) => [
        vitamin.id,
        resolveDisplayNameHe(vitamin),
        resolveVitaminNameEn(vitamin),
        resolveActiveForm(vitamin),
        vitamin.solubility ?? '',
        vitamin.updated_date ?? ''
      ])
    ]);
    downloadText(`vitamins_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function importFile(file: File) {
    setImportResult(null);
    const rows = await parseImportFile(file);
    const knownByName = new Set(
      items
        .flatMap((vitamin) => [resolveDisplayNameHe(vitamin), resolveVitaminNameEn(vitamin)])
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
    );
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const nameHe = asOptionalString(row.vitaminNameHe);
      const nameEn = asOptionalString(row.vitaminNameEn);
      const keyHe = nameHe?.toLowerCase() ?? '';
      const keyEn = nameEn?.toLowerCase() ?? '';
      if (!nameHe || knownByName.has(keyHe) || (keyEn && knownByName.has(keyEn))) {
        skipped += 1;
        continue;
      }

      const payload: Partial<Vitamin> = {
        vitaminNameHe: nameHe,
        vitaminNameEn: nameEn,
        activeForm: asOptionalString(row.activeForm),
        solubility: asOptionalString(row.solubility),
        source: asOptionalString(row.source),
        notes: asOptionalString(row.notes)
      };
      await vitaminService.create(payload);
      knownByName.add(keyHe);
      if (keyEn) knownByName.add(keyEn);
      added += 1;
    }

    await reload();
    setImportResult(`ייבוא הסתיים: נוספו ${added}, דולגו ${skipped}.`);
  }

  async function runAi() {
    setAiBusy(true);
    setAiResponse('');
    try {
      const aiTargetVitamin = items.find((item) => item.id === aiTargetId);
      const suffix = aiTargetVitamin
        ? `\n\nהתמקד בתוסף: ${aiTargetVitamin.vitaminNameHe}${aiTargetVitamin.vitaminNameEn ? ` (${aiTargetVitamin.vitaminNameEn})` : ''}`
        : '';
      const answer = await integrationService.invokeLLM({
        prompt: `${aiPrompt.trim()}${suffix}`,
        add_context_from_internet: false
      });
      setAiResponse(answer);
    } catch (aiError) {
      const message = aiError instanceof Error ? aiError.message : 'Unknown error';
      setAiResponse(`שגיאת AI: ${message}`);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className="stack">
      <PageHeader title="תוספים" description="ניהול תוספים, סינון, מיון ופעולות יבוא/יצוא." />

      {note ? <p className={`msg ${note.startsWith('שגיאה') ? 'err' : 'ok'}`}>{note}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם/צורה פעילה..."
        />
        <button type="button" className="btn primary" onClick={() => navigate('/VitaminEdit')}>
          תוסף חדש
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
        <button type="button" className="btn secondary" onClick={() => setAiOpen(true)}>
          AI
        </button>
      </div>

      <StateView loading={loading} error={error} empty={visibleItems.length === 0} emptyLabel="לא נמצאו תוספים." />

      {!loading && !error && visibleItems.length > 0 ? (
        <div className="panel table-wrap sticky-head-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky-col">שם בעברית</th>
                <th>שם באנגלית</th>
                <th>שם מדעי עברית</th>
                <th>שם מדעי אנגלית</th>
                <th>צורה פעילה</th>
                <th>מסיסות</th>
                <th>נוצר</th>
                <th>עד שנה</th>
                <th>עד גיל 6</th>
                <th>עד גיל 10</th>
                <th>עד גיל 18</th>
                <th>מבוגרים</th>
                <th>הריון</th>
                <th>הנקה</th>
                <th>RDA</th>
                <th>פעולות בגוף</th>
                <th>תסמיני חסר</th>
                <th>חסר מתוך בדיקות מעבדה</th>
                <th>מקורות מזון</th>
                <th>שם החברה</th>
                <th>אתר החברה</th>
                <th>רעילות</th>
                <th>תופעות לוואי</th>
                <th>שילובים מומלצים</th>
                <th>התנגשויות</th>
                <th>הערות</th>
                <th>סיפור מקרה</th>
                <th>עודכן</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((vitamin) => {
                const symptoms = labelsFromIds(vitamin.deficiencySymptoms, symptomNameById).join(', ');
                const foods = labelsFromIds(vitamin.foodSources, foodNameById).join(', ');
                const combinations = labelsFromIds(vitamin.combinationVitaminIds, vitaminNameById).join(', ');
                const conflicts = labelsFromConflictsWithDetails(vitamin.conflictVitamins, vitaminNameById).join(', ');
                const mergedLabDeficiency = mergeLabDeficiencyFields(vitamin);

                return (
                  <tr key={vitamin.id}>
                    <td className="sticky-col">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => navigate(`/VitaminEdit?id=${encodeURIComponent(vitamin.id)}`)}
                      >
                        {firstNonEmptyString(resolveDisplayNameHe(vitamin), resolveVitaminNameEn(vitamin), '-')}
                      </button>
                    </td>
                    <td>{renderExpandableCell(resolveVitaminNameEn(vitamin), 'שם באנגלית')}</td>
                    <td>{renderExpandableCell(resolveVitaminNickHe(vitamin), 'שם מדעי עברית')}</td>
                    <td>{renderExpandableCell(resolveVitaminNickEn(vitamin), 'שם מדעי אנגלית')}</td>
                    <td>{renderExpandableCell(resolveActiveForm(vitamin), 'צורה פעילה')}</td>
                    <td>{renderExpandableCell(vitamin.solubility, 'מסיסות')}</td>
                    <td>{renderExpandableCell(vitamin.source, 'נוצר')}</td>
                    <td>{renderExpandableCell(vitamin.dosageUpTo1Year, 'עד שנה')}</td>
                    <td>{renderExpandableCell(vitamin.dosageUpTo6, 'עד גיל 6')}</td>
                    <td>{renderExpandableCell(vitamin.dosageUpTo10, 'עד גיל 10')}</td>
                    <td>{renderExpandableCell(vitamin.dosageUpTo18, 'עד גיל 18')}</td>
                    <td>{renderExpandableCell(vitamin.dosageAdults, 'מבוגרים')}</td>
                    <td>{renderExpandableCell(vitamin.dosagePregnancy, 'הריון')}</td>
                    <td>{renderExpandableCell(vitamin.dosageBirth, 'הנקה')}</td>
                    <td>{renderExpandableCell(vitamin.dosageRDA, 'RDA')}</td>
                    <td>{renderExpandableCell(vitamin.actionDescription, 'פעולות בגוף')}</td>
                    <td>{renderExpandableCell(symptoms, 'תסמיני חסר')}</td>
                    <td>{renderExpandableCell(mergedLabDeficiency, 'חסר מתוך בדיקות מעבדה')}</td>
                    <td>{renderExpandableCell(foods, 'מקורות מזון')}</td>
                    <td>{renderExpandableCell(vitamin.companyName, 'שם חברה')}</td>
                    <td>{renderExpandableCell(vitamin.companyUrl, 'אתר חברה')}</td>
                    <td>{renderExpandableCell(vitamin.toxicity, 'רעילות')}</td>
                    <td>{renderExpandableCell(vitamin.sideEffects, 'תופעות לוואי')}</td>
                    <td>{renderExpandableCell(combinations, 'שילובים מומלצים')}</td>
                    <td>{renderExpandableCell(conflicts, 'התנגשויות')}</td>
                    <td>{renderExpandableCell(vitamin.notes, 'הערות')}</td>
                    <td>{renderExpandableCell(vitamin.caseStory, 'סיפור מקרה')}</td>
                    <td>{formatDate(vitamin.updated_date)}</td>
                    <td className="action-cell">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => navigate(`/VitaminEdit?id=${encodeURIComponent(vitamin.id)}`)}
                      >
                        עריכה
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => navigate(`/VitaminEdit?id=${encodeURIComponent(vitamin.id)}`)}
                      >
                        פרטים
                      </button>
                      <button type="button" className="btn danger" onClick={() => setDeleteTarget(vitamin)}>
                        מחיקה
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="מחיקת תוסף"
        message={`למחוק את "${deleteTarget ? firstNonEmptyString(resolveDisplayNameHe(deleteTarget), resolveVitaminNameEn(deleteTarget), deleteTarget.id) : ''}"?`}
        confirmLabel={busyDelete ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDeleteConfirm()}
        onCancel={() => {
          if (!busyDelete) setDeleteTarget(null);
        }}
      />

      <Modal open={importOpen} title="יבוא תוספים" onClose={() => setImportOpen(false)}>
        <div className="stack">
          <p>ניתן לייבא קובץ JSON/CSV. כפילויות מזוהות לפי שם עברי/אנגלי.</p>
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
          {importResult ? <p className="msg ok">{importResult}</p> : null}
        </div>
      </Modal>

      <Modal open={aiOpen} title="AI מידע תוסף" onClose={() => setAiOpen(false)}>
        <div className="stack">
          <label className="field">
            <span>פרומפט</span>
            <textarea
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="לדוגמה: כתוב סיכום קצר על בטיחות שימוש."
            />
          </label>
          <label className="field">
            <span>תוסף ממוקד (אופציונלי)</span>
            <select
              value={aiTargetId}
              onChange={(event) => setAiTargetId(event.target.value)}
            >
              <option value="">ללא</option>
              {visibleItems.map((vitamin) => (
                <option key={vitamin.id} value={vitamin.id}>
                  {firstNonEmptyString(resolveDisplayNameHe(vitamin), resolveVitaminNameEn(vitamin), vitamin.id)}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-row">
            <button type="button" className="btn primary" disabled={!aiPrompt.trim() || aiBusy} onClick={() => void runAi()}>
              {aiBusy ? 'מריץ...' : 'הרץ AI'}
            </button>
          </div>
          {aiResponse ? (
            <pre className="panel" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {aiResponse}
            </pre>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
