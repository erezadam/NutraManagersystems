import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
import RichTextField from '../components/ui/RichTextField';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
import StateView from '../components/ui/StateView';
import { asArray } from '../lib/arrays';
import { articleService, foodService } from '../services';
import type { Article, Food } from '../types/entities';

interface ArticleFormState {
  titleHe: string;
  titleEn: string;
  url: string;
  summary: string;
  foodIds: string[];
}

function emptyForm(): ArticleFormState {
  return {
    titleHe: '',
    titleEn: '',
    url: '',
    summary: '',
    foodIds: []
  };
}

function toPayload(form: ArticleFormState): Partial<Article> {
  return {
    titleHe: form.titleHe.trim(),
    titleEn: form.titleEn.trim() || undefined,
    url: form.url.trim() || undefined,
    summary: form.summary.trim() || undefined,
    foodIds: form.foodIds
  };
}

export default function ArticleEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('id');
  const isEdit = Boolean(articleId);

  const [form, setForm] = useState<ArticleFormState>(emptyForm());
  const [foods, setFoods] = useState<Food[]>([]);
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
      try {
        const foodList = await foodService.list('foodNameHe asc');
        if (!active) return;
        setFoods(foodList);

        if (articleId) {
          const article = await articleService.get(articleId);
          if (!active) return;
          setForm({
            titleHe: article.titleHe,
            titleEn: article.titleEn ?? '',
            url: article.url ?? '',
            summary: article.summary ?? '',
            foodIds: asArray(article.foodIds)
          });
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
  }, [articleId]);

  const foodOptions = useMemo(
    () => foods.map((food) => ({ id: food.id, label: food.foodNameHe })).sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [foods]
  );

  async function onSave() {
    if (!form.titleHe.trim()) {
      setError('שם המאמר בעברית הוא שדה חובה.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = toPayload(form);
      if (articleId) {
        await articleService.update(articleId, payload);
      } else {
        await articleService.create(payload);
      }
      setMessage('הרשומה נשמרה בהצלחה.');
      navigate('/Articles');
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : 'Unknown error';
      setError(saveMessage);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!articleId) return;
    setSaving(true);
    setError(null);
    try {
      await articleService.delete(articleId);
      navigate('/Articles');
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
      <PageHeader title={isEdit ? 'עריכת מאמר' : 'הוספת מאמר חדש'} description={isEdit ? 'עדכון פרטי מאמר קיים.' : ''} />

      <StateView loading={loading} error={error} empty={false} emptyLabel="" />

      {!loading ? (
        <>
          {message ? <p className="msg ok">{message}</p> : null}
          {error ? <p className="msg err">{error}</p> : null}

          <div className="panel stack">
            <div className="form-grid">
              <label className="field half">
                <span>שם המאמר בעברית *</span>
                <input
                  placeholder="הזן שם מאמר בעברית"
                  value={form.titleHe}
                  onChange={(event) => setForm((prev) => ({ ...prev, titleHe: event.target.value }))}
                />
              </label>

              <label className="field half">
                <span>שם המאמר באנגלית</span>
                <input
                  placeholder="Enter article title in English"
                  value={form.titleEn}
                  onChange={(event) => setForm((prev) => ({ ...prev, titleEn: event.target.value }))}
                />
              </label>

              <label className="field">
                <span>קישור למאמר</span>
                <input
                  placeholder="https://example.com/article"
                  value={form.url}
                  onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                />
              </label>
            </div>

            <label className="field">
              <span>מזונות</span>
              <div className="inline-row">
                <button type="button" className="btn secondary" onClick={() => navigate('/Foods')}>
                  הוסף מזון חדש
                </button>
              </div>
              <SearchableMultiSelect
                selectedIds={form.foodIds}
                options={foodOptions}
                placeholder="בחר מזונות..."
                onChange={(selectedIds) => setForm((prev) => ({ ...prev, foodIds: selectedIds }))}
              />
            </label>

            <label className="field">
              <span>תקציר</span>
              <RichTextField
                placeholder=""
                value={form.summary}
                onChange={(next) => setForm((prev) => ({ ...prev, summary: next }))}
              />
            </label>

            <div className="inline-row">
              <button type="button" className="btn primary" onClick={() => void onSave()} disabled={saving}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button type="button" className="btn ghost" onClick={() => navigate('/Articles')} disabled={saving}>
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
        title="מחיקת מאמר"
        message="האם למחוק מאמר זה?"
        confirmLabel={saving ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!saving) setDeleteOpen(false);
        }}
      />
    </section>
  );
}
