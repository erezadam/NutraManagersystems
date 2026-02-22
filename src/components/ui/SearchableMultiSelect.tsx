import { useEffect, useMemo, useRef, useState } from 'react';

interface Option {
  id: string;
  label: string;
}

interface SearchableMultiSelectProps {
  selectedIds: string[];
  options: Option[];
  placeholder?: string;
  noResultsLabel?: string;
  onChange: (next: string[]) => void;
}

export default function SearchableMultiSelect({
  selectedIds,
  options,
  placeholder = 'חיפוש...',
  noResultsLabel = 'לא נמצאו תוצאות.',
  onChange
}: SearchableMultiSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label, 'he'));
    if (!term) return sorted;
    return sorted.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  function removeSelected(id: string) {
    onChange(selectedIds.filter((item) => item !== id));
  }

  const labelById = useMemo(() => new Map(options.map((option) => [option.id, option.label])), [options]);
  const selectedOptions = useMemo(
    () => selectedIds.map((id) => ({ id, label: labelById.get(id) ?? id })),
    [selectedIds, labelById]
  );
  const summaryLabel = selectedIds.length > 0 ? `נבחרו ${selectedIds.length}` : placeholder;

  return (
    <div className={`multi-picker ${open ? 'is-open' : ''}`} ref={containerRef}>
      {selectedOptions.length > 0 ? (
        <div className="multi-picker-selected">
          {selectedOptions.map((option) => (
            <span key={option.id} className="chip">
              <button
                type="button"
                className="multi-picker-chip-remove"
                onClick={() => removeSelected(option.id)}
                aria-label={`הסר ${option.label}`}
                title={`הסר ${option.label}`}
              >
                ×
              </button>
              {option.label}
            </span>
          ))}
        </div>
      ) : null}

      <button type="button" className="multi-picker-trigger" onClick={() => setOpen((prev) => !prev)}>
        <span className="multi-picker-trigger-icon">⌕</span>
        <span className="multi-picker-trigger-text">{summaryLabel}</span>
        <span className="multi-picker-trigger-arrow">{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <div className="multi-picker-dropdown">
          <input
            ref={searchInputRef}
            className="multi-picker-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            type="search"
            autoComplete="off"
          />
          <div className="multi-picker-list">
            {filtered.map((option) => (
              <label key={option.id} className="multi-picker-item">
                <input type="checkbox" checked={selectedIds.includes(option.id)} onChange={() => toggle(option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
            {filtered.length === 0 ? <p className="state-line">{noResultsLabel}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
