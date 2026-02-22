interface Option {
  id: string;
  label: string;
}

interface MultiSelectChecklistProps {
  title: string;
  options: Option[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

export default function MultiSelectChecklist({
  title,
  options,
  selectedIds,
  onChange
}: MultiSelectChecklistProps) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  return (
    <fieldset className="checklist">
      <legend>{title}</legend>
      <div className="checklist-grid">
        {options.map((option) => (
          <label key={option.id} className="check-item">
            <input
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
