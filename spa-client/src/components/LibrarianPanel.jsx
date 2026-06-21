import { api } from '../api';
import { EMPTY_BOOK } from '../constants';
import { useApp } from '../context/AppContext';
import { normalizeBook } from '../utils/book';
import BookForm from './BookForm';
import GoogleBooksSearch from './GoogleBooksSearch';

export default function LibrarianPanel() {
  const { allLoans, newBook, setNewBook, runSafe } = useApp();

  return (
    <section className="section">
      <h2>Panel bibliotekarza</h2>

      <GoogleBooksSearch />

      <h3>Dodaj książkę ręcznie</h3>
      <BookForm
        value={newBook}
        onChange={setNewBook}
        onSave={() => runSafe(async () => {
          await api.createBook(normalizeBook(newBook));
          setNewBook(EMPTY_BOOK);
        }, 'Dodano książkę')}
        saveLabel="Dodaj"
      />

      <h3>Wszystkie wypożyczenia</h3>
      <ul className="plain-list">
        {allLoans.map((loan) => (
          <li key={loan.id}>
            #{loan.id} — {loan.bookTitle || `książka ${loan.bookId}`} — user {loan.userId.slice(0, 8)}… — {loan.status}{' '}
            {loan.status === 'active' && (
              <button type="button" onClick={() => runSafe(() => api.returnLoan(loan.id))}>
                Zwróć
              </button>
            )}
          </li>
        ))}
        {!allLoans.length && <li>Brak wypożyczeń w systemie</li>}
      </ul>
    </section>
  );
}
