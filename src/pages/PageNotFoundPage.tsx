import { useNavigate } from 'react-router-dom';

export default function PageNotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="page-enter">
      <header className="page-head">
        <h1>PageNotFound</h1>
        <p>העמוד שחיפשת לא קיים. אפשר לחזור דרך התפריט העליון.</p>
      </header>
      <div className="toolbar">
        <button type="button" className="btn primary" onClick={() => navigate('/Vitamins')}>
          חזרה לתוספים
        </button>
      </div>
    </section>
  );
}
