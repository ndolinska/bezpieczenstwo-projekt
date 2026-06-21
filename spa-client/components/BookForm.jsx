export default function BookForm({ value, onChange, onSave, onCancel, saveLabel = 'Zapisz' }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  return (
    <div className="row">
      <input required placeholder="Tytuł" value={value.title} onChange={set('title')} />
      <input required placeholder="Autor" value={value.author} onChange={set('author')} />
      <input placeholder="ISBN" value={value.isbn || ''} onChange={set('isbn')} />
      <input placeholder="Rok" value={value.year || ''} onChange={set('year')} />
      <input placeholder="Kategoria" value={value.category || ''} onChange={set('category')} />
      <input
        placeholder="Egzemplarze"
        type="number"
        min="1"
        value={value.copies ?? 1}
        onChange={set('copies')}
      />
      <button type="button" onClick={onSave}>{saveLabel}</button>
      {onCancel && <button type="button" onClick={onCancel}>Anuluj</button>}
    </div>
  );
}
