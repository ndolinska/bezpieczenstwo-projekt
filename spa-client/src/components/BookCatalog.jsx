import { api } from '../api';
import { useApp } from '../context/AppContext';
import { normalizeBook } from '../utils/book';
import BookForm from './BookForm';

export default function BookCatalog() {
  const {
    books,
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    editingBook,
    setEditingBook,
    isLibrarian,
    isAdmin,
    runSafe,
  } = useApp();

  return (
    <section className="section">
      <h2>Katalog książek</h2>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <input
          placeholder="Szukaj tytułu…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <input
          placeholder="Autor…"
          value={filters.author}
          onChange={(e) => setFilters({ ...filters, author: e.target.value })}
        />
        <button type="submit">Filtruj</button>
        <button type="button" onClick={clearFilters}>Wyczyść</button>
      </form>

      <ul className="book-list">
        {books.map((book) => (
          <li key={book.id} className="book-list__item">
            {editingBook?.id === book.id ? (
              <BookForm
                value={editingBook}
                onChange={setEditingBook}
                onSave={() => runSafe(async () => {
                  await api.updateBook(book.id, normalizeBook(editingBook));
                  setEditingBook(null);
                }, 'Zaktualizowano książkę')}
                onCancel={() => setEditingBook(null)}
              />
            ) : (
              <>
                <strong>{book.title}</strong> — {book.author} ({book.year}) · {book.category} · egz.: {book.copies}{' '}
                <button type="button" onClick={() => runSafe(() => api.borrow(book.id))}>
                  Wypożycz
                </button>
                {isLibrarian && (
                  <button type="button" onClick={() => setEditingBook({ ...book })}>Edytuj</button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => runSafe(() => api.deleteBook(book.id), 'Usunięto książkę')}
                  >
                    Usuń
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
