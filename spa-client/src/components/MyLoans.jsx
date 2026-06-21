import { api } from '../api';
import { useApp } from '../context/AppContext';

export default function MyLoans() {
  const { loans, runSafe } = useApp();

  return (
    <section className="section">
      <h2>Moje wypożyczenia</h2>
      <ul className="plain-list">
        {loans.map((loan) => (
          <li key={loan.id}>
            #{loan.id} — książka {loan.bookId} — {loan.status}{' '}
            {loan.status === 'active' && (
              <button type="button" onClick={() => runSafe(() => api.returnLoan(loan.id))}>
                Zwróć
              </button>
            )}
          </li>
        ))}
        {!loans.length && <li>Brak wypożyczeń</li>}
      </ul>
    </section>
  );
}
