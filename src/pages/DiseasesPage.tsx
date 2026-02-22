import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExpandableText from '../components/ui/ExpandableText';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import StateView from '../components/ui/StateView';
import { formatDate } from '../lib/date';
import { downloadText, toCsv } from '../lib/file-io';
import { asOptionalString, parseImportFile } from '../lib/import-export';
import { diseaseService } from '../services';
import { useEntityList } from '../hooks/useEntityList';
import type { Disease } from '../types/entities';

export default function DiseasesPage() {
  const navigate = useNavigate();
  const { items, loading, error, reload } = useEntityList(diseaseService, 'created_date desc');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Disease | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<Disease | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((disease) =>
      [disease.diseaseNameHe, disease.diseaseCharacteristicsHe]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [items, query]);

  async function removeDisease() {
    if (!deleteTarget) return;
    setBusyDelete(true);
    setMsg(null);
    try {
      await diseaseService.delete(deleteTarget.id);
      await reload();
      setDeleteTarget(null);
      setMsg('הרשומה נמחקה.');
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Unknown error';
      setMsg(`שגיאה במחיקה: ${message}`);
    } finally {
      setBusyDelete(false);
    }
  }

  function exportJson() {
    downloadText(`diseases_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'diseaseNameHe', 'sortOrder', 'diseaseCharacteristicsHe', 'updated_date'],
      ...filtered.map((disease) => [
        disease.id,
        disease.diseaseNameHe,
        disease.sortOrder?.toString() ?? '',
        disease.diseaseCharacteristicsHe ?? '',
        disease.updated_date ?? ''
      ])
    ]);
    downloadText(`diseases_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function importFile(file: File) {
    setImportMsg(null);
    const rows = await parseImportFile(file);
    const known = new Set(items.map((item) => item.diseaseNameHe.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const diseaseNameHe = asOptionalString(row.diseaseNameHe);
      if (!diseaseNameHe || known.has(diseaseNameHe.toLowerCase())) {
        skipped += 1;
        continue;
      }

      const payload: Partial<Disease> = {
        diseaseNameHe,
        diseaseCharacteristicsHe: asOptionalString(row.diseaseCharacteristicsHe),
        notes: asOptionalString(row.notes)
      };
      await diseaseService.create(payload);
      known.add(diseaseNameHe.toLowerCase());
      added += 1;
    }

    await reload();
    setImportMsg(`ייבוא הושלם: נוספו ${added}, דולגו ${skipped}.`);
  }

  return (
    <section className="stack">
      <PageHeader title="פרוטוקל טיפול" description="פרוטוקולי טיפול וקשרים לתוספים ולתסמינים." />

      {msg ? <p className={`msg ${msg.startsWith('שגיאה') ? 'err' : 'ok'}`}>{msg}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש שם מחלה/מאפיינים..."
        />
        <button type="button" className="btn primary" onClick={() => navigate('/DiseaseEdit')}>
          פרוטוקול חדש
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

      <StateView loading={loading} error={error} empty={filtered.length === 0} emptyLabel="לא נמצאו פרוטוקולים." />

      {!loading && !error && filtered.length > 0 ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם פרוטוקול</th>
                <th>מאפיינים</th>
                <th>תוספים</th>
                <th>תסמינים</th>
                <th>עודכן</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((disease) => (
                <tr key={disease.id}>
                  <td>
                    <ExpandableText value={disease.diseaseNameHe} popupTitle="שם פרוטוקול" />
                  </td>
                  <td>
                    <ExpandableText value={disease.diseaseCharacteristicsHe} emptyLabel="-" popupTitle="מאפיינים" />
                  </td>
                  <td>{disease.supplementIds?.length ?? 0}</td>
                  <td>{disease.deficiencySymptomIds?.length ?? 0}</td>
                  <td>{formatDate(disease.updated_date)}</td>
                  <td className="action-cell">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => navigate(`/DiseaseEdit?id=${encodeURIComponent(disease.id)}`)}
                    >
                      עריכה
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setDetailTarget(disease)}>
                      פרטים
                    </button>
                    <button type="button" className="btn danger" onClick={() => setDeleteTarget(disease)}>
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
        title="מחיקת פרוטוקול"
        message={`למחוק את "${deleteTarget?.diseaseNameHe}"?`}
        confirmLabel={busyDelete ? 'מוחק...' : 'מחק'}
        onConfirm={() => void removeDisease()}
        onCancel={() => {
          if (!busyDelete) setDeleteTarget(null);
        }}
      />

      <Modal open={importOpen} title="יבוא פרוטוקולים" onClose={() => setImportOpen(false)}>
        <div className="stack">
          <p>ייבוא JSON/CSV. כפילויות לפי diseaseNameHe.</p>
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

      <Modal open={Boolean(detailTarget)} title="פרטי פרוטוקול" onClose={() => setDetailTarget(null)}>
        <div className="stack">
          <p>
            <strong>שם:</strong> {detailTarget?.diseaseNameHe}
          </p>
          <div>
            <strong>מאפיינים:</strong>
            <ExpandableText value={detailTarget?.diseaseCharacteristicsHe} emptyLabel="-" popupTitle="מאפייני מחלה" />
          </div>
          <div>
            <strong>הערות:</strong>
            <ExpandableText value={detailTarget?.notes} emptyLabel="-" popupTitle="הערות" />
          </div>
        </div>
      </Modal>
    </section>
  );
}
