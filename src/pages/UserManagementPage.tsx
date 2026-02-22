import { useEffect, useMemo, useState } from 'react';
import ExpandableText from '../components/ui/ExpandableText';
import PageHeader from '../components/ui/PageHeader';
import StateView from '../components/ui/StateView';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatDate } from '../lib/date';
import { downloadText, toCsv } from '../lib/file-io';
import { userService } from '../services';
import type { User } from '../types/entities';

export default function UserManagementPage() {
  const { loading: loadingUser, isAdmin } = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await userService.list('created_date desc');
        if (active) {
          setUsers(list);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unknown error';
        if (active) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.email, user.full_name, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [users, query]);

  async function updateRole(user: User, role: string) {
    setSavingRoleId(user.id);
    setMsg(null);
    try {
      await userService.update(user.id, { role });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, role } : item)));
      setMsg(`תפקיד המשתמש ${user.email} עודכן.`);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Unknown error';
      setMsg(`שגיאה בעדכון תפקיד: ${message}`);
    } finally {
      setSavingRoleId(null);
    }
  }

  function exportJson() {
    downloadText(`users_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  }

  function exportCsv() {
    const csv = toCsv([
      ['id', 'email', 'full_name', 'role', 'created_date'],
      ...filtered.map((user) => [user.id, user.email, user.full_name ?? '', user.role ?? '', user.created_date ?? ''])
    ]);
    downloadText(`users_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  if (loadingUser) {
    return (
      <section className="stack">
        <PageHeader title="UserManagement" description="ניהול משתמשים והרשאות מערכת." />
        <p className="state-line">טוען משתמש נוכחי...</p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="stack">
        <PageHeader title="UserManagement" description="ניהול משתמשים והרשאות מערכת." />
        <p className="msg warn">אין הרשאה לצפייה במסך זה.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <PageHeader title="UserManagement" description="ניהול משתמשים והרשאות מערכת." />

      {msg ? <p className={`msg ${msg.startsWith('שגיאה') ? 'err' : 'ok'}`}>{msg}</p> : null}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש אימייל/שם/תפקיד..."
        />
        <button type="button" className="btn secondary" onClick={exportJson}>
          יצוא JSON
        </button>
        <button type="button" className="btn secondary" onClick={exportCsv}>
          יצוא CSV
        </button>
      </div>

      <StateView loading={loading} error={error} empty={filtered.length === 0} emptyLabel="לא נמצאו משתמשים." />

      {!loading && !error && filtered.length > 0 ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>אימייל</th>
                <th>שם מלא</th>
                <th>תפקיד</th>
                <th>נוצר</th>
                <th>עדכון</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <ExpandableText value={user.email} popupTitle="אימייל" />
                  </td>
                  <td>
                    <ExpandableText value={user.full_name} emptyLabel="-" popupTitle="שם מלא" />
                  </td>
                  <td>
                    <ExpandableText value={user.role} emptyLabel="-" popupTitle="תפקיד" />
                  </td>
                  <td>{formatDate(user.created_date)}</td>
                  <td>
                    <div className="inline-row">
                      <select
                        value={user.role ?? 'user'}
                        onChange={(event) => void updateRole(user, event.target.value)}
                        disabled={savingRoleId === user.id}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
