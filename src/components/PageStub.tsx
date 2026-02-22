interface PageStubProps {
  title: string;
  description: string;
}

export default function PageStub({ title, description }: PageStubProps) {
  return (
    <section className="page-enter">
      <header className="page-head">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <div className="page-grid" role="presentation">
        <article className="info-card lift delay-1">
          <h2>שלב פיתוח</h2>
          <p>שלד מסך מוכן לחיבור נתונים חיים ולוגיקה עסקית.</p>
        </article>

        <article className="info-card lift delay-2">
          <h2>מצב נתונים</h2>
          <p>המסך מחובר לראוטינג ומוכן לאינטגרציית שירותים.</p>
        </article>

        <article className="info-card accent lift delay-3">
          <h2>בדיקות</h2>
          <p>ה-UI מותאם למובייל ודסקטופ ומגובה בבדיקות smoke.</p>
        </article>
      </div>
    </section>
  );
}
