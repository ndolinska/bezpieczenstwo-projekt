import { useApp } from '../context/AppContext';

export default function StatsPanel() {
  const { stats } = useApp();
  if (!stats) return null;

  return (
    <section className="section stats-grid">
      <h2>Statystyki</h2>
      <p>Książek w katalogu: <strong>{stats.ksiazkiWKatalogu}</strong></p>
      <p>Aktywne wypożyczenia: <strong>{stats.aktywneWypozyczenia}</strong></p>

      <h3>Najczęściej wypożyczane</h3>
      <ul className="plain-list">
        {stats.najczesciejWypozyczane?.map((item, i) => (
          <li key={i}>{item.book} — {item.wypozyczen}×</li>
        ))}
        {!stats.najczesciejWypozyczane?.length && <li>Brak danych</li>}
      </ul>
    </section>
  );
}
