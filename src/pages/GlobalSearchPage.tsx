import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExpandableText from '../components/ui/ExpandableText';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import StateView from '../components/ui/StateView';
import { articleService, deficiencySymptomService, diseaseService, foodService, vitaminService } from '../services';
import type { Article, DeficiencySymptom, Disease, Food, Vitamin } from '../types/entities';

interface SearchCollections {
  vitamins: Vitamin[];
  diseases: Disease[];
  symptoms: DeficiencySymptom[];
  foods: Food[];
  articles: Article[];
}

interface ResultItem {
  id: string;
  label: string;
  subtitle?: string;
}

function includesTerm(value: string | undefined, term: string): boolean {
  return Boolean(value && value.toLowerCase().includes(term));
}

export default function GlobalSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [collections, setCollections] = useState<SearchCollections | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  async function runSearch() {
    const term = query.trim();
    if (term.length < 2) return;

    setLoading(true);
    setError(null);
    try {
      const [vitamins, diseases, symptoms, foods, articles] = await Promise.all([
        vitaminService.list(),
        diseaseService.list(),
        deficiencySymptomService.list(),
        foodService.list(),
        articleService.list()
      ]);
      setCollections({ vitamins, diseases, symptoms, foods, articles });
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!collections || term.length < 2) {
      return {
        vitamins: [] as ResultItem[],
        diseases: [] as ResultItem[],
        symptoms: [] as ResultItem[],
        foods: [] as ResultItem[],
        articles: [] as ResultItem[]
      };
    }

    return {
      vitamins: collections.vitamins
        .filter((item) => includesTerm(item.vitaminNameHe, term) || includesTerm(item.vitaminNameEn, term))
        .map((item) => ({ id: item.id, label: item.vitaminNameHe, subtitle: item.vitaminNameEn })),
      diseases: collections.diseases
        .filter((item) => includesTerm(item.diseaseNameHe, term) || includesTerm(item.diseaseCharacteristicsHe, term))
        .map((item) => ({ id: item.id, label: item.diseaseNameHe, subtitle: item.diseaseCharacteristicsHe })),
      symptoms: collections.symptoms
        .filter(
          (item) =>
            includesTerm(item.symptomNameHe, term) ||
            includesTerm(item.symptomNameEn, term) ||
            asTagText(item.tags).toLowerCase().includes(term)
        )
        .map((item) => ({ id: item.id, label: item.symptomNameHe, subtitle: asTagText(item.tags) })),
      foods: collections.foods
        .filter((item) => includesTerm(item.foodNameHe, term) || includesTerm(item.foodNameEn, term) || includesTerm(item.description, term))
        .map((item) => ({ id: item.id, label: item.foodNameHe, subtitle: item.foodCategory })),
      articles: collections.articles
        .filter((item) => includesTerm(item.titleHe, term) || includesTerm(item.titleEn, term) || includesTerm(item.summary, term))
        .map((item) => ({ id: item.id, label: item.titleHe, subtitle: item.summary }))
    };
  }, [collections, query]);

  const totalResults =
    grouped.vitamins.length + grouped.diseases.length + grouped.symptoms.length + grouped.foods.length + grouped.articles.length;

  function findFoodById(id: string): Food | null {
    return collections?.foods.find((food) => food.id === id) ?? null;
  }

  return (
    <section className="stack">
      <PageHeader title="GlobalSearch" description="חיפוש רוחבי על פני כל הישויות במערכת." />

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="הקלד לפחות 2 תווים..."
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void runSearch();
            }
          }}
        />
        <button type="button" className="btn primary" onClick={() => void runSearch()}>
          חפש
        </button>
      </div>

      <StateView loading={loading} error={error} empty={false} emptyLabel="" />

      {!loading && !error && query.trim().length >= 2 ? (
        <p className="state-line">נמצאו {totalResults} תוצאות.</p>
      ) : null}

      {!loading && !error && query.trim().length >= 2 ? (
        <div className="group-list">
          <GroupSection
            title="תוספים"
            items={grouped.vitamins}
            onOpen={(id) => navigate(`/VitaminEdit?id=${encodeURIComponent(id)}`)}
            emptyLabel="אין התאמות בתוספים."
          />

          <GroupSection
            title="פרוטוקולים"
            items={grouped.diseases}
            onOpen={(id) => navigate(`/DiseaseEdit?id=${encodeURIComponent(id)}`)}
            emptyLabel="אין התאמות בפרוטוקולים."
          />

          <GroupSection
            title="תסמיני חסר"
            items={grouped.symptoms}
            onOpen={() => navigate('/DeficiencySymptoms')}
            emptyLabel="אין התאמות בתסמינים."
          />

          <GroupSection
            title="מזונות"
            items={grouped.foods}
            onOpen={(id) => setSelectedFood(findFoodById(id))}
            emptyLabel="אין התאמות במזונות."
          />

          <GroupSection
            title="מאמרים"
            items={grouped.articles}
            onOpen={(id) => navigate(`/ArticleEdit?id=${encodeURIComponent(id)}`)}
            emptyLabel="אין התאמות במאמרים."
          />
        </div>
      ) : null}

      <Modal open={Boolean(selectedFood)} title="FoodDetail" onClose={() => setSelectedFood(null)}>
        <div className="stack">
          <p>
            <strong>שם:</strong> {selectedFood?.foodNameHe}
          </p>
          <p>
            <strong>קטגוריה:</strong> {selectedFood?.foodCategory || '-'}
          </p>
          <p>
            <strong>תיאור:</strong> {selectedFood?.description || '-'}
          </p>
          <div className="inline-row">
            <button type="button" className="btn ghost" onClick={() => navigate('/Foods')}>
              מעבר למסך מזונות
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function asTagText(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return '';
  return tags.join(', ');
}

interface GroupSectionProps {
  title: string;
  items: ResultItem[];
  emptyLabel: string;
  onOpen: (id: string) => void;
}

function GroupSection({ title, items, emptyLabel, onOpen }: GroupSectionProps) {
  return (
    <section className="group-card">
      <h3>{title}</h3>
      {items.length === 0 ? <p className="state-line">{emptyLabel}</p> : null}
      <div className="stack">
        {items.map((item) => (
          <div key={item.id} className="inline-row">
            <strong>{item.label}</strong>
            {item.subtitle ? <ExpandableText value={item.subtitle} popupTitle={`תיאור ${title}`} /> : null}
            <button type="button" className="btn ghost" onClick={() => onOpen(item.id)}>
              פתח
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
