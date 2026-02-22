import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
import RichTextField from '../components/ui/RichTextField';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
import StateView from '../components/ui/StateView';
import { asArray } from '../lib/arrays';
import { deficiencySymptomService, diseaseService, vitaminService } from '../services';
import type { DeficiencySymptom, Disease, DiseaseProductLink, Vitamin } from '../types/entities';

interface DiseaseFormState {
  diseaseNameHe: string;
  sortOrder: string;
  diseaseCharacteristicsHe: string;
  notes: string;
  supplementIds: string[];
  deficiencySymptomIds: string[];
  productLinks: DiseaseProductLink[];
}

function createEmptyForm(): DiseaseFormState {
  return {
    diseaseNameHe: '',
    sortOrder: '',
    diseaseCharacteristicsHe: '',
    notes: '',
    supplementIds: [],
    deficiencySymptomIds: [],
    productLinks: []
  };
}

function toPayload(form: DiseaseFormState): Partial<Disease> {
  return {
    diseaseNameHe: form.diseaseNameHe.trim(),
    sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    diseaseCharacteristicsHe: form.diseaseCharacteristicsHe.trim() || undefined,
    notes: form.notes.trim() || undefined,
    supplementIds: form.supplementIds,
    deficiencySymptomIds: form.deficiencySymptomIds,
    productLinks: form.productLinks
      .map((link) => ({ productName: link.productName.trim(), productUrl: link.productUrl.trim() }))
      .filter((link) => link.productName && link.productUrl)
  };
}

export default function DiseaseEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const diseaseId = searchParams.get('id');
  const [resolvedEditId, setResolvedEditId] = useState<string | null>(null);
  const isEdit = Boolean(resolvedEditId);

  const [form, setForm] = useState<DiseaseFormState>(createEmptyForm());
  const [vitamins, setVitamins] = useState<Vitamin[]>([]);
  const [symptoms, setSymptoms] = useState<DeficiencySymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const [vitaminList, symptomList] = await Promise.all([
          vitaminService.list('vitaminNameHe asc'),
          deficiencySymptomService.list('symptomNameHe asc')
        ]);
        if (!active) return;

        setVitamins(vitaminList);
        setSymptoms(symptomList);

        if (diseaseId) {
          try {
            const disease = await diseaseService.get(diseaseId);
            if (!active) return;

            setResolvedEditId(disease.id);
            setForm({
              diseaseNameHe: disease.diseaseNameHe,
              sortOrder: disease.sortOrder?.toString() ?? '',
              diseaseCharacteristicsHe: disease.diseaseCharacteristicsHe ?? '',
              notes: disease.notes ?? '',
              supplementIds: asArray(disease.supplementIds),
              deficiencySymptomIds: asArray(disease.deficiencySymptomIds),
              productLinks: asArray(disease.productLinks)
            });
          } catch (getError) {
            const getMessage = getError instanceof Error ? getError.message : 'Unknown error';
            const isNotFound = getMessage.toLowerCase().includes('not found');
            if (!active) return;

            if (isNotFound) {
              setResolvedEditId(null);
              setForm(createEmptyForm());
              setMessage('הרשומה לא נמצאה. נפתח טופס פרוטוקול חדש.');
              navigate('/DiseaseEdit', { replace: true });
              return;
            }

            throw getError;
          }
        } else {
          setResolvedEditId(null);
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
  }, [diseaseId, navigate]);

  const vitaminOptions = useMemo(
    () => vitamins.map((item) => ({ id: item.id, label: item.vitaminNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [vitamins]
  );

  const symptomOptions = useMemo(
    () => symptoms.map((item) => ({ id: item.id, label: item.symptomNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [symptoms]
  );

  function updateProductLink(index: number, key: keyof DiseaseProductLink, value: string) {
    setForm((prev) => {
      const productLinks = [...prev.productLinks];
      productLinks[index] = { ...productLinks[index], [key]: value };
      return { ...prev, productLinks };
    });
  }

  function addProductLink() {
    setForm((prev) => ({
      ...prev,
      productLinks: [...prev.productLinks, { productName: '', productUrl: '' }]
    }));
  }

  function removeProductLink(index: number) {
    setForm((prev) => ({ ...prev, productLinks: prev.productLinks.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function onSave() {
    if (!form.diseaseNameHe.trim()) {
      setError('שם פרוטוקול בעברית הוא שדה חובה.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = toPayload(form);
      if (resolvedEditId) {
        await diseaseService.update(resolvedEditId, payload);
      } else {
        await diseaseService.create(payload);
      }
      setMessage('הרשומה נשמרה בהצלחה.');
      navigate('/Diseases');
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : 'Unknown error';
      setError(saveMessage);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!resolvedEditId) return;
    setSaving(true);
    setError(null);
    try {
      await diseaseService.delete(resolvedEditId);
      navigate('/Diseases');
    } catch (deleteError) {
      const deleteMessage = deleteError instanceof Error ? deleteError.message : 'Unknown error';
      setError(deleteMessage);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  }

  return (
    <section className="stack">
      <PageHeader title={isEdit ? 'פרוטוקולים' : 'פרוטוקול חדש'} description={isEdit ? 'עריכת פרוטוקול קיים.' : 'יצירת פרוטוקול חדש.'} />

      <StateView loading={loading} error={error} empty={false} emptyLabel="" />

      {!loading ? (
        <>
          {message ? <p className="msg ok">{message}</p> : null}
          {error ? <p className="msg err">{error}</p> : null}

          <div className="panel stack">
            <div className="form-grid">
              <label className="field half">
                <span>שם פרוטוקול*</span>
                <input
                  value={form.diseaseNameHe}
                  onChange={(event) => setForm((prev) => ({ ...prev, diseaseNameHe: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>סדר הצגה</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                />
              </label>

              <label className="field">
                <span>מאפייני מחלה</span>
                <RichTextField
                  placeholder="מאפייני מחלה..."
                  value={form.diseaseCharacteristicsHe}
                  onChange={(next) => setForm((prev) => ({ ...prev, diseaseCharacteristicsHe: next }))}
                />
              </label>
            </div>

            <label className="field">
              <span>תוספים</span>
              <SearchableMultiSelect
                selectedIds={form.supplementIds}
                options={vitaminOptions}
                placeholder="בחר תוספים..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, supplementIds: selectedIds }))}
              />
            </label>

            <label className="field">
              <span>תסמיני חסר</span>
              <SearchableMultiSelect
                selectedIds={form.deficiencySymptomIds}
                options={symptomOptions}
                placeholder="בחר תסמינים..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, deficiencySymptomIds: selectedIds }))}
              />
            </label>

            <div className="stack">
              <div className="inline-row">
                <h3 style={{ margin: 0 }}>קישורי מוצרים</h3>
                <button type="button" className="btn secondary" onClick={addProductLink}>
                  הוסף קישור
                </button>
              </div>
              {form.productLinks.length === 0 ? <p className="state-line">לא הוגדרו קישורים.</p> : null}
              {form.productLinks.map((link, index) => (
                <div key={`${link.productName}_${index}`} className="form-grid panel">
                  <label className="field half">
                    <span>שם מוצר</span>
                    <input value={link.productName} onChange={(event) => updateProductLink(index, 'productName', event.target.value)} />
                  </label>
                  <label className="field half">
                    <span>URL</span>
                    <input value={link.productUrl} onChange={(event) => updateProductLink(index, 'productUrl', event.target.value)} />
                  </label>
                  <div className="field">
                    <button type="button" className="btn danger" onClick={() => removeProductLink(index)}>
                      הסר קישור
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label className="field">
              <span>הערות</span>
              <RichTextField placeholder="הערות..." value={form.notes} onChange={(next) => setForm((prev) => ({ ...prev, notes: next }))} />
            </label>

            <div className="inline-row">
              <button type="button" className="btn primary" onClick={() => void onSave()} disabled={saving}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button type="button" className="btn ghost" onClick={() => navigate('/Diseases')} disabled={saving}>
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
        title="מחיקת פרוטוקול"
        message="האם למחוק פרוטוקול זה?"
        confirmLabel={saving ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!saving) setDeleteOpen(false);
        }}
      />
    </section>
  );
}
