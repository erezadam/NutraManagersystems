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
import { articleService, foodService } from '../services';
import type { Article } from '../types/entities';

function labelsAsText(ids: string[] | undefined, nameById: Map<string, string>): string {
  const labels = asArray(ids)
    .map((id) => nameById.get(id) ?? id)
    .sort((a, b) => a.localeCompare(b, 'he'));
  return labels.join(', ');
}

export default function ArticlesPage() {
  const navigate = useNavigate();
  const { items, loading, error, reload } = useEntityList(articleService, 'created_date desc');
  const foodsList = useEntityList(foodService, 'foodNameHe asc');

  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((article) =>
      [article.titleHe, article.titleEn, article.summary]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [items, query]);

  const foodNameById = useMemo(() => new Map(foodsList.items.map((food) => [food.id, food.foodNameHe || food.foodNameEn || food.id])), [foodsList.items]);

  async function onDelete() {
    if (!deleteTarget) return;
    setBusyDelete(true);
    setMsg(null);
    try {
      await articleService.delete(deleteTarget.id);
      await reload();
      setDeleteTarget(null);
      setMsg('הרשומה נמחקה.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unknown error';
      setMsg(`שגיאה במחיקה: ${message}`);
    } finally {
      setBusyDelete(false);
    }
  }

  function exportJson() {
    downloadText(`articles_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'titleHe', 'titleEn', 'url', 'summary', 'updated_date'],
      ...filtered.map((article) => [
        article.id,
        article.titleHe,
        article.titleEn ?? '',
        article.url ?? '',
        article.summary ?? '',
        article.updated_date ?? ''
      ])
    ]);
    downloadText(`articles_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function importFile(file: File) {
    setImportMsg(null);
    const rows = await parseImportFile(file);
    const known = new Set(items.map((item) => item.titleHe.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const titleHe = asOptionalString(row.titleHe);
      if (!titleHe || known.has(titleHe.toLowerCase())) {
        skipped += 1;
        continue;
      }
      const payload: Partial<Article> = {
        titleHe,
        titleEn: asOptionalString(row.titleEn),
        url: asOptionalString(row.url),
        summary: asOptionalString(row.summary)
      };
      await articleService.create(payload);
      known.add(titleHe.toLowerCase());
      added += 1;
    }

    await reload();
    setImportMsg(`ייבוא הושלם: נוספו ${added}, דולגו ${skipped}.`);
  }

  return (
    <section className="stack">
      <PageHeader title="Articles" description="ניהול מאמרים וקישור למזונות תומכים." />

      {msg ? <p className={`msg ${msg.startsWith('שגיאה') ? 'err' : 'ok'}`}>{msg}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש כותרת/תקציר..."
        />
        <button type="button" className="btn primary" onClick={() => navigate('/ArticleEdit')}>
          מאמר חדש
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
        loading={loading || foodsList.loading}
        error={error ?? foodsList.error}
        empty={filtered.length === 0}
        emptyLabel="לא נמצאו מאמרים."
      />

      {!loading && !error && !foodsList.loading && filtered.length > 0 ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>כתובת</th>
                <th>תקציר</th>
                <th>מזונות</th>
                <th>עודכן</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.id}>
                  <td>
                    <ExpandableText value={article.titleHe} popupTitle="כותרת מאמר" />
                  </td>
                  <td>{article.url ? <a href={article.url} target="_blank" rel="noreferrer">קישור</a> : '-'}</td>
                  <td>
                    <ExpandableText value={article.summary} emptyLabel="-" popupTitle="תקציר" />
                  </td>
                  <td>
                    <ExpandableText value={labelsAsText(article.foodIds, foodNameById)} emptyLabel="-" popupTitle="מזונות" />
                  </td>
                  <td>{formatDate(article.updated_date)}</td>
                  <td className="action-cell">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => navigate(`/ArticleEdit?id=${encodeURIComponent(article.id)}`)}
                    >
                      עריכה
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setDetailTarget(article)}>
                      פרטים
                    </button>
                    <button type="button" className="btn danger" onClick={() => setDeleteTarget(article)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="מחיקת מאמר"
        message={`למחוק את "${deleteTarget?.titleHe}"?`}
        confirmLabel={busyDelete ? 'מוחק...' : 'מחק'}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!busyDelete) setDeleteTarget(null);
        }}
      />

      <Modal open={importOpen} title="יבוא מאמרים" onClose={() => setImportOpen(false)}>
        <div className="stack">
          <p>ייבוא JSON/CSV. כפילויות לפי titleHe.</p>
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

      <Modal open={Boolean(detailTarget)} title="פרטי מאמר" onClose={() => setDetailTarget(null)}>
        <div className="stack">
          <p>
            <strong>כותרת:</strong> {detailTarget?.titleHe}
          </p>
          <div>
            <strong>תקציר:</strong>
            <ExpandableText value={detailTarget?.summary} emptyLabel="-" popupTitle="תקציר מאמר" />
          </div>
          <div>
            <strong>מזונות:</strong>
            <ExpandableText value={labelsAsText(detailTarget?.foodIds, foodNameById)} emptyLabel="-" popupTitle="מזונות" />
          </div>
        </div>
      </Modal>
    </section>
  );
}
