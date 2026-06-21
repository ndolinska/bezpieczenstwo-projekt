import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { normalizeBook } from '../utils/book';

export default function GoogleBooksSearch() {
  const { runSafe, flash } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    try {
      const data = await api.googleBooks(q);
      setResults(data.results || []);
      setMeta({ authMode: data.authMode, count: data.count });
      if (!data.results?.length) flash('Brak wyników w Google Books');
    } catch (err) {
      setResults([]);
      setMeta(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function importBook(book) {
    runSafe(async () => {
      await api.createBook(normalizeBook({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        year: book.year || '',
        category: book.category || 'import',
        copies: 1,
      }));
    }, `Zaimportowano: ${book.title}`);
  }

  return (
    <div className="google-books">
      <h3>Import z Google Books</h3>
      <p className="google-books__hint">
        Wyszukiwanie metadanych książek przez Resource Server (OAuth2 po stronie serwera).
      </p>

      <form className="row" onSubmit={(e) => runSafe(() => handleSearch(e)).catch(() => {})}>
        <input
          placeholder="Tytuł, autor lub ISBN…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Szukam…' : 'Szukaj w Google Books'}
        </button>
      </form>

      {meta && (
        <p className="google-books__meta">
          Znaleziono: {meta.count} · tryb Google: {meta.authMode}
        </p>
      )}

      <ul className="book-list">
        {results.map((book) => (
          <li key={book.googleId} className="book-list__item google-books__item">
            {book.thumbnail && (
              <img src={book.thumbnail} alt="" className="google-books__thumb" />
            )}
            <div>
              <strong>{book.title}</strong>
              <div>{book.author} {book.year ? `(${book.year})` : ''}</div>
              {book.isbn && <div>ISBN: {book.isbn}</div>}
              {book.category && <div>Kategoria: {book.category}</div>}
              {book.description && <p className="google-books__desc">{book.description}…</p>}
              <button type="button" onClick={() => importBook(book)}>
                Dodaj do katalogu
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
