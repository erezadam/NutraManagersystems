import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import RichTextField from '../components/ui/RichTextField';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
import StateView from '../components/ui/StateView';
import { asArray, uniqueStrings } from '../lib/arrays';
import { collectChoiceOptions, loadStoredOptions, mergeLabDeficiencyFields, persistStoredOptions } from '../lib/vitamin-fields';
import { deficiencySymptomService, foodService, integrationService, vitaminService } from '../services';
import type { DeficiencySymptom, Food, Vitamin, VitaminConflict } from '../types/entities';

interface VitaminFormState {
  vitaminNameHe: string;
  vitaminNameEn: string;
  vitaminNickHe: string;
  vitaminNickEn: string;
  activeForm: string;
  solubility: string;
  source: string;
  dosageUpTo1Year: string;
  dosageUpTo6: string;
  dosageUpTo10: string;
  dosageUpTo18: string;
  dosageAdults: string;
  dosagePregnancy: string;
  dosageBirth: string;
  dosageRDA: string;
  actionDescription: string;
  deficiencySymptoms: string[];
  labTestDeficiency: string;
  foodSources: string[];
  companyName: string;
  companyUrl: string;
  toxicity: string;
  sideEffects: string;
  combinationVitaminIds: string[];
  conflictVitaminIds: string[];
  notes: string;
  caseStory: string;
}

function emptyForm(): VitaminFormState {
  return {
    vitaminNameHe: '',
    vitaminNameEn: '',
    vitaminNickHe: '',
    vitaminNickEn: '',
    activeForm: '',
    solubility: '',
    source: '',
    dosageUpTo1Year: '',
    dosageUpTo6: '',
    dosageUpTo10: '',
    dosageUpTo18: '',
    dosageAdults: '',
    dosagePregnancy: '',
    dosageBirth: '',
    dosageRDA: '',
    actionDescription: '',
    deficiencySymptoms: [],
    labTestDeficiency: '',
    foodSources: [],
    companyName: '',
    companyUrl: '',
    toxicity: '',
    sideEffects: '',
    combinationVitaminIds: [],
    conflictVitaminIds: [],
    notes: '',
    caseStory: ''
  };
}

function clean(value: string): string | undefined {
  const next = value.trim();
  return next ? next : undefined;
}

function buildConflicts(ids: string[], explanationsById: Record<string, string>): VitaminConflict[] {
  return ids.map((vitaminId) => ({ vitaminId, explanation: explanationsById[vitaminId] ?? '' }));
}

function toPayload(form: VitaminFormState, explanationsById: Record<string, string>): Partial<Vitamin> {
  return {
    vitaminNameHe: form.vitaminNameHe.trim(),
    vitaminNameEn: clean(form.vitaminNameEn),
    vitaminNickHe: clean(form.vitaminNickHe),
    vitaminNickEn: clean(form.vitaminNickEn),
    activeForm: clean(form.activeForm),
    solubility: clean(form.solubility),
    source: clean(form.source),
    dosageUpTo1Year: clean(form.dosageUpTo1Year),
    dosageUpTo6: clean(form.dosageUpTo6),
    dosageUpTo10: clean(form.dosageUpTo10),
    dosageUpTo18: clean(form.dosageUpTo18),
    dosageAdults: clean(form.dosageAdults),
    dosagePregnancy: clean(form.dosagePregnancy),
    dosageBirth: clean(form.dosageBirth),
    dosageRDA: clean(form.dosageRDA),
    actionDescription: clean(form.actionDescription),
    deficiencySymptoms: form.deficiencySymptoms,
    labTestDeficiency: undefined,
    labTestDeficiencyDescription: '',
    labTestDeficiencyDetails: clean(form.labTestDeficiency),
    foodSources: form.foodSources,
    companyName: clean(form.companyName),
    companyUrl: clean(form.companyUrl),
    toxicity: clean(form.toxicity),
    sideEffects: clean(form.sideEffects),
    combinationVitaminIds: form.combinationVitaminIds,
    conflictVitamins: buildConflicts(form.conflictVitaminIds, explanationsById),
    notes: clean(form.notes),
    caseStory: clean(form.caseStory)
  };
}

const DEFAULT_SOLUBILITY_OPTIONS = ['מים', 'שמן'];
const DEFAULT_SOURCE_OPTIONS = ['הגוף', 'המזון'];
const SOLUBILITY_STORAGE_KEY = 'vitamin_solubility_options_v2';
const SOURCE_STORAGE_KEY = 'vitamin_source_options_v2';

export default function VitaminEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vitaminId = searchParams.get('id');
  const isEdit = Boolean(vitaminId);

  const [form, setForm] = useState<VitaminFormState>(emptyForm());
  const [foods, setFoods] = useState<Food[]>([]);
  const [symptoms, setSymptoms] = useState<DeficiencySymptom[]>([]);
  const [vitamins, setVitamins] = useState<Vitamin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [initialSymptomIds, setInitialSymptomIds] = useState<string[]>([]);
  const [conflictExplanationsById, setConflictExplanationsById] = useState<Record<string, string>>({});
  const [solubilityOptions, setSolubilityOptions] = useState<string[]>(() =>
    collectChoiceOptions(DEFAULT_SOLUBILITY_OPTIONS, [], loadStoredOptions(SOLUBILITY_STORAGE_KEY))
  );
  const [sourceOptions, setSourceOptions] = useState<string[]>(() =>
    collectChoiceOptions(DEFAULT_SOURCE_OPTIONS, [], loadStoredOptions(SOURCE_STORAGE_KEY))
  );
  const [newSolubilityOption, setNewSolubilityOption] = useState('');
  const [newSourceOption, setNewSourceOption] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiInfoOpen, setAiInfoOpen] = useState(false);
  const [aiInfoText, setAiInfoText] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [foodsList, symptomsList, vitaminsList] = await Promise.all([
          foodService.list('foodNameHe asc'),
          deficiencySymptomService.list('symptomNameHe asc'),
          vitaminService.list('vitaminNameHe asc')
        ]);

        if (!active) return;
        setFoods(foodsList);
        setSymptoms(symptomsList);
        setVitamins(vitaminsList);
        setSolubilityOptions((prev) =>
          collectChoiceOptions(
            DEFAULT_SOLUBILITY_OPTIONS,
            vitaminsList.map((vitamin) => vitamin.solubility),
            prev
          )
        );
        setSourceOptions((prev) =>
          collectChoiceOptions(
            DEFAULT_SOURCE_OPTIONS,
            vitaminsList.map((vitamin) => vitamin.source),
            prev
          )
        );

        if (vitaminId) {
          const vitamin = await vitaminService.get(vitaminId);
          if (!active) return;

          const conflicts = asArray(vitamin.conflictVitamins);
          const explanationMap = Object.fromEntries(conflicts.map((item) => [item.vitaminId, item.explanation ?? '']));
          setConflictExplanationsById(explanationMap);

          const nextForm: VitaminFormState = {
            vitaminNameHe: vitamin.vitaminNameHe,
            vitaminNameEn: vitamin.vitaminNameEn ?? '',
            vitaminNickHe: vitamin.vitaminNickHe ?? '',
            vitaminNickEn: vitamin.vitaminNickEn ?? '',
            activeForm: vitamin.activeForm ?? '',
            solubility: vitamin.solubility ?? '',
            source: vitamin.source ?? '',
            dosageUpTo1Year: vitamin.dosageUpTo1Year ?? '',
            dosageUpTo6: vitamin.dosageUpTo6 ?? '',
            dosageUpTo10: vitamin.dosageUpTo10 ?? '',
            dosageUpTo18: vitamin.dosageUpTo18 ?? '',
            dosageAdults: vitamin.dosageAdults ?? '',
            dosagePregnancy: vitamin.dosagePregnancy ?? '',
            dosageBirth: vitamin.dosageBirth ?? '',
            dosageRDA: vitamin.dosageRDA ?? '',
            actionDescription: vitamin.actionDescription ?? '',
            deficiencySymptoms: asArray(vitamin.deficiencySymptoms),
            labTestDeficiency: mergeLabDeficiencyFields(vitamin),
            foodSources: asArray(vitamin.foodSources),
            companyName: vitamin.companyName ?? '',
            companyUrl: vitamin.companyUrl ?? '',
            toxicity: vitamin.toxicity ?? '',
            sideEffects: vitamin.sideEffects ?? '',
            combinationVitaminIds: asArray(vitamin.combinationVitaminIds),
            conflictVitaminIds: conflicts.map((item) => item.vitaminId),
            notes: vitamin.notes ?? '',
            caseStory: vitamin.caseStory ?? ''
          };
          setForm(nextForm);
          setSolubilityOptions((prev) => collectChoiceOptions(DEFAULT_SOLUBILITY_OPTIONS, [vitamin.solubility], prev));
          setSourceOptions((prev) => collectChoiceOptions(DEFAULT_SOURCE_OPTIONS, [vitamin.source], prev));
          setInitialSymptomIds(asArray(vitamin.deficiencySymptoms));
        }
      } catch (loadError) {
        const loadMessage = loadError instanceof Error ? loadError.message : 'Unknown error';
        if (active) setError(loadMessage);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [vitaminId]);

  useEffect(() => {
    persistStoredOptions(SOLUBILITY_STORAGE_KEY, solubilityOptions);
  }, [solubilityOptions]);

  useEffect(() => {
    persistStoredOptions(SOURCE_STORAGE_KEY, sourceOptions);
  }, [sourceOptions]);

  const foodOptions = useMemo(
    () => foods.map((food) => ({ id: food.id, label: food.foodNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [foods]
  );

  const symptomOptions = useMemo(
    () =>
      symptoms
        .map((symptom) => ({ id: symptom.id, label: symptom.symptomNameHe }))
        .sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [symptoms]
  );

  const vitaminOptions = useMemo(
    () =>
      vitamins
        .filter((vitamin) => vitamin.id !== vitaminId)
        .map((vitamin) => ({ id: vitamin.id, label: vitamin.vitaminNameHe }))
        .sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [vitamins, vitaminId]
  );

  function addSolubilityOption() {
    const value = newSolubilityOption.trim();
    if (!value) return;
    setSolubilityOptions((prev) => collectChoiceOptions(DEFAULT_SOLUBILITY_OPTIONS, [value], prev));
    setForm((prev) => ({ ...prev, solubility: value }));
    setNewSolubilityOption('');
  }

  function addSourceOption() {
    const value = newSourceOption.trim();
    if (!value) return;
    setSourceOptions((prev) => collectChoiceOptions(DEFAULT_SOURCE_OPTIONS, [value], prev));
    setForm((prev) => ({ ...prev, source: value }));
    setNewSourceOption('');
  }

  async function syncSymptomLinks(targetVitaminId: string, beforeIds: string[], afterIds: string[]) {
    for (const symptom of symptoms) {
      const had = beforeIds.includes(symptom.id);
      const has = afterIds.includes(symptom.id);
      if (had === has) continue;

      const current = asArray(symptom.vitaminIds);
      const next = has ? uniqueStrings([...current, targetVitaminId]) : current.filter((value) => value !== targetVitaminId);
      await deficiencySymptomService.update(symptom.id, { vitaminIds: next });
    }
  }

  async function onSave() {
    if (!form.vitaminNameHe.trim()) {
      setError('שם הויטמין בעברית הוא שדה חובה.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = toPayload(form, conflictExplanationsById);
      let savedId = vitaminId ?? '';

      if (vitaminId) {
        await vitaminService.update(vitaminId, payload);
      } else {
        const created = await vitaminService.create(payload);
        savedId = created.id;
      }

      await syncSymptomLinks(savedId, initialSymptomIds, form.deficiencySymptoms);
      setMessage('השינויים נשמרו בהצלחה.');
      navigate('/Vitamins');
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : 'Unknown error';
      setError(saveMessage);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!vitaminId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await vitaminService.delete(vitaminId);
      await syncSymptomLinks(vitaminId, form.deficiencySymptoms, []);
      navigate('/Vitamins');
    } catch (deleteError) {
      const deleteMessage = deleteError instanceof Error ? deleteError.message : 'Unknown error';
      setError(deleteMessage);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  }

  async function showAiInfo() {
    if (!form.vitaminNameHe.trim()) {
      setError('יש להזין קודם שם ויטמין בעברית.');
      return;
    }

    const hebrewName = form.vitaminNameHe.trim();
    const englishName = form.vitaminNameEn.trim();
    const namesBlock = englishName ? `שם בעברית: ${hebrewName}\nשם באנגלית: ${englishName}` : `שם בעברית: ${hebrewName}`;

    setAiInfoOpen(true);
    setAiInfoText('');
    setAiBusy(true);
    setError(null);
    try {
      const aiPrompt = `בצע חיפוש מידע על תוסף התזונה לפי השמות הבאים:
${namesBlock}

הצג את כל המידע הקיים והרלוונטי על אותו תוסף בעברית.
החזר טקסט קריא בלבד (לא JSON), בפורמט קצר עם כותרות:
מה זה, שמות נרדפים, צורה פעילה נפוצה, שימושים עיקריים, תסמיני חוסר, מינונים מקובלים, בטיחות/רעילות, תופעות לוואי, אינטראקציות, מקורות מזון, הערות חשובות.
אם יש חוסר ודאות, ציין זאת במפורש.`;

      const response = await integrationService.invokeLLM({
        prompt: aiPrompt,
        add_context_from_internet: true
      });
      const nextText = typeof response === 'string' ? response.trim() : '';
      setAiInfoText(nextText || 'לא נמצא מידע להצגה.');
    } catch (aiError) {
      const aiMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      setAiInfoText(`שגיאת AI: ${aiMessage}`);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className="stack">
      <PageHeader title="הוספת תוסף חדש" description={isEdit ? 'עריכת תוסף קיים' : 'יצירת תוסף חדש'} />

      <StateView loading={loading} error={error} empty={false} emptyLabel="" />

      {!loading ? (
        <>
          {message ? <p className="msg ok">{message}</p> : null}
          {error ? <p className="msg err">{error}</p> : null}

          <div className="panel stack">
            <div className="form-grid">
              <label className="field half">
                <div className="inline-row field-head-row">
                  <span>שם הויטמין בעברית *</span>
                  <button
                    type="button"
                    className="btn secondary ai-trigger"
                    onClick={() => void showAiInfo()}
                    disabled={aiBusy || saving}
                    title="חיפוש AI על התוסף"
                    aria-label="חיפוש AI על התוסף"
                  >
                    {aiBusy ? '...' : '🔎'}
                  </button>
                </div>
                <input
                  placeholder="לדוגמה: ויטמין D"
                  value={form.vitaminNameHe}
                  onChange={(event) => setForm((prev) => ({ ...prev, vitaminNameHe: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>שם הויטמין באנגלית</span>
                <input
                  placeholder="e.g. Vitamin D"
                  value={form.vitaminNameEn}
                  onChange={(event) => setForm((prev) => ({ ...prev, vitaminNameEn: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>שם מדעי עברית</span>
                <input
                  placeholder="לדוגמה: D"
                  value={form.vitaminNickHe}
                  onChange={(event) => setForm((prev) => ({ ...prev, vitaminNickHe: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>שם מדעי אנגלית</span>
                <input
                  placeholder="e.g. Cholecalciferol"
                  value={form.vitaminNickEn}
                  onChange={(event) => setForm((prev) => ({ ...prev, vitaminNickEn: event.target.value }))}
                />
              </label>

              <label className="field third">
                <span>צורה פעילה</span>
                <input
                  placeholder="לדוגמה: כולקלציפרול"
                  value={form.activeForm}
                  onChange={(event) => setForm((prev) => ({ ...prev, activeForm: event.target.value }))}
                />
              </label>

              <label className="field third">
                <span>מסיסות</span>
                <select value={form.solubility} onChange={(event) => setForm((prev) => ({ ...prev, solubility: event.target.value }))}>
                  <option value="">בחר מסיסות...</option>
                  {solubilityOptions
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                <div className="inline-row">
                  <input
                    placeholder="הוסף ערך חדש..."
                    value={newSolubilityOption}
                    onChange={(event) => setNewSolubilityOption(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSolubilityOption();
                      }
                    }}
                  />
                  <button type="button" className="btn secondary" onClick={addSolubilityOption}>
                    הוסף
                  </button>
                </div>
              </label>

              <label className="field third">
                <span>נוצר</span>
                <select value={form.source} onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}>
                  <option value="">בחר מקור...</option>
                  {sourceOptions
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                <div className="inline-row">
                  <input
                    placeholder="הוסף ערך חדש..."
                    value={newSourceOption}
                    onChange={(event) => setNewSourceOption(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSourceOption();
                      }
                    }}
                  />
                  <button type="button" className="btn secondary" onClick={addSourceOption}>
                    הוסף
                  </button>
                </div>
              </label>

              <div className="field" style={{ gridColumn: 'span 12' }}>
                <strong>מינון אופטימלי</strong>
              </div>

              <label className="field third">
                <span>עד שנה:</span>
                <input value={form.dosageUpTo1Year} onChange={(event) => setForm((prev) => ({ ...prev, dosageUpTo1Year: event.target.value }))} />
              </label>

              <label className="field third">
                <span>עד גיל 6:</span>
                <input value={form.dosageUpTo6} onChange={(event) => setForm((prev) => ({ ...prev, dosageUpTo6: event.target.value }))} />
              </label>

              <label className="field third">
                <span>עד גיל 10:</span>
                <input value={form.dosageUpTo10} onChange={(event) => setForm((prev) => ({ ...prev, dosageUpTo10: event.target.value }))} />
              </label>

              <label className="field third">
                <span>עד גיל 18:</span>
                <input value={form.dosageUpTo18} onChange={(event) => setForm((prev) => ({ ...prev, dosageUpTo18: event.target.value }))} />
              </label>

              <label className="field third">
                <span>מבוגרים:</span>
                <input value={form.dosageAdults} onChange={(event) => setForm((prev) => ({ ...prev, dosageAdults: event.target.value }))} />
              </label>

              <label className="field third">
                <span>הריון:</span>
                <input
                  value={form.dosagePregnancy}
                  onChange={(event) => setForm((prev) => ({ ...prev, dosagePregnancy: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>הנקה:</span>
                <input value={form.dosageBirth} onChange={(event) => setForm((prev) => ({ ...prev, dosageBirth: event.target.value }))} />
              </label>

              <label className="field half">
                <span>RDA:</span>
                <input value={form.dosageRDA} onChange={(event) => setForm((prev) => ({ ...prev, dosageRDA: event.target.value }))} />
              </label>

              <label className="field">
                <span>פעולות בגוף</span>
                <RichTextField
                  placeholder="פעולות בגוף..."
                  value={form.actionDescription}
                  onChange={(next) => setForm((prev) => ({ ...prev, actionDescription: next }))}
                />
              </label>

              <label className="field">
                <span>חסר מתוך בדיקות מעבדה</span>
                <RichTextField
                  placeholder="חסר מתוך בדיקות מעבדה..."
                  value={form.labTestDeficiency}
                  onChange={(next) => setForm((prev) => ({ ...prev, labTestDeficiency: next }))}
                />
              </label>

              <label className="field half">
                <span>שם החברה המייצרת</span>
                <input
                  placeholder="שם החברה..."
                  value={form.companyName}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>קישור לאתר החברה</span>
                <input
                  placeholder="https://example.com"
                  value={form.companyUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyUrl: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>רעילות</span>
                <RichTextField
                  placeholder="רעילות..."
                  value={form.toxicity}
                  onChange={(next) => setForm((prev) => ({ ...prev, toxicity: next }))}
                />
              </label>

              <label className="field half">
                <span>תופעות לוואי</span>
                <RichTextField
                  placeholder="תופעות לוואי..."
                  value={form.sideEffects}
                  onChange={(next) => setForm((prev) => ({ ...prev, sideEffects: next }))}
                />
              </label>

              <label className="field">
                <span>הערות</span>
                <RichTextField placeholder="הערות..." value={form.notes} onChange={(next) => setForm((prev) => ({ ...prev, notes: next }))} />
              </label>

              <label className="field">
                <span>סיפור מקרה</span>
                <RichTextField
                  placeholder="סיפור מקרה..."
                  value={form.caseStory}
                  onChange={(next) => setForm((prev) => ({ ...prev, caseStory: next }))}
                />
              </label>
            </div>

            <label className="field">
              <span>תסמיני חסר</span>
              <SearchableMultiSelect
                selectedIds={form.deficiencySymptoms}
                options={symptomOptions}
                placeholder="חיפוש תסמיני חסר..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, deficiencySymptoms: selectedIds }))}
              />
            </label>

            <label className="field">
              <span>מקורות מזון</span>
              <SearchableMultiSelect
                selectedIds={form.foodSources}
                options={foodOptions}
                placeholder="חיפוש מקורות מזון..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, foodSources: selectedIds }))}
              />
            </label>

            <label className="field">
              <span>שילובים מומלצים</span>
              <SearchableMultiSelect
                selectedIds={form.combinationVitaminIds}
                options={vitaminOptions}
                placeholder="חיפוש תוספים לשילוב..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, combinationVitaminIds: selectedIds }))}
              />
            </label>

            <label className="field">
              <span>התנגשויות</span>
              <SearchableMultiSelect
                selectedIds={form.conflictVitaminIds}
                options={vitaminOptions}
                placeholder="חיפוש תוספים מתנגשים..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, conflictVitaminIds: selectedIds }))}
              />
            </label>

            <div className="inline-row">
              <button type="button" className="btn primary" onClick={() => void onSave()} disabled={saving}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button type="button" className="btn ghost" onClick={() => navigate('/Vitamins')} disabled={saving}>
                ביטול
              </button>
              {isEdit ? (
                <button type="button" className="btn danger" onClick={() => setDeleteOpen(true)} disabled={saving}>
                  מחיקה
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="מחיקת תוסף"
        message="האם למחוק תוסף זה? הפעולה תסיר גם שיוך לתסמינים."
        confirmLabel={saving ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!saving) setDeleteOpen(false);
        }}
      />
      <Modal open={aiInfoOpen} title="AI מידע תוסף" onClose={() => setAiInfoOpen(false)}>
        <div className="stack">
          {aiBusy ? <p className="state-line">טוען מידע...</p> : null}
          <pre className="panel" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {aiInfoText || 'אין מידע להצגה.'}
          </pre>
        </div>
      </Modal>
    </section>
  );
}
