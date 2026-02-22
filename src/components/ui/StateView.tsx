interface StateViewProps {
  loading: boolean;
  error?: string | null;
  empty: boolean;
  emptyLabel: string;
}

export default function StateView({ loading, error, empty, emptyLabel }: StateViewProps) {
  if (loading) {
    return <p className="state-line">טוען נתונים...</p>;
  }

  if (error) {
    return <p className="state-line error">שגיאה: {error}</p>;
  }

  if (empty) {
    return <p className="state-line">{emptyLabel}</p>;
  }

  return null;
}
