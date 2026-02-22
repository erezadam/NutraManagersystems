import { NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { articleService, deficiencySymptomService, diseaseService, foodService, vitaminService } from '../services';
import { downloadText } from '../lib/file-io';
import { nowDateStamp } from '../lib/date';

const navItems = [
  { label: 'חיפוש', to: '/GlobalSearch' },
  { label: 'תוספים', to: '/Vitamins' },
  { label: 'תופעות ומקרים', to: '/EffectsCases' },
  { label: 'פרוטוקולים', to: '/Diseases' },
  { label: 'תסמינים', to: '/DeficiencySymptoms' },
  { label: 'מזונות', to: '/Foods' },
  { label: 'מאמרים', to: '/Articles' }
];

export default function AppLayout({ children }: PropsWithChildren) {
  const { user, loading, isAdmin } = useCurrentUser();
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  async function exportBackup() {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const [vitamins, diseases, symptoms, foods, articles] = await Promise.all([
        vitaminService.list(),
        diseaseService.list(),
        deficiencySymptomService.list(),
        foodService.list(),
        articleService.list()
      ]);
      const payload = {
        generatedAt: new Date().toISOString(),
        statistics: {
          vitamins: vitamins.length,
          diseases: diseases.length,
          symptoms: symptoms.length,
          foods: foods.length,
          articles: articles.length
        },
        vitamins,
        diseases,
        symptoms,
        foods,
        articles
      };
      downloadText(
        `backup_${nowDateStamp()}_${Date.now()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json'
      );
      setBackupMessage('הגיבוי נוצר והורד למחשב.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBackupMessage(`שגיאה ביצירת גיבוי: ${message}`);
    } finally {
      setBackupBusy(false);
    }
  }

  const allNavItems = isAdmin ? [...navItems, { label: 'משתמשים', to: '/UserManagement' }] : navItems;

  return (
    <div dir="rtl" className="app-shell">
      <div className="bg-layer" aria-hidden="true" />

      <header className="topbar page-enter">
        <div className="brand-block">
          <p className="brand-kicker">Supplement Database</p>
          <h1 className="brand-title">מערכת ניהול תוספים</h1>
        </div>

        <nav aria-label="Main navigation">
          <ul className="main-nav">
            {allNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="toolbar" style={{ marginTop: '0.8rem' }}>
          <p className="state-line" style={{ margin: 0 }}>
            {loading ? 'טוען משתמש...' : `משתמש: ${user?.email ?? 'לא מחובר'}`}
          </p>
          {isAdmin ? (
            <button type="button" className="btn secondary" onClick={() => void exportBackup()} disabled={backupBusy}>
              {backupBusy ? 'יוצר גיבוי...' : 'גיבוי מערכת'}
            </button>
          ) : null}
          {backupMessage ? <span className="state-line">{backupMessage}</span> : null}
        </div>
      </header>

      <main className="content-wrap">{children}</main>

      <footer className="app-footer">
        <small>Rebuild workspace · stage-driven delivery</small>
      </footer>
    </div>
  );
}
