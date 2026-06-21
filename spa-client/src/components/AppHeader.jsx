import { useApp } from '../context/AppContext';

export default function AppHeader() {
  const { user, roles, logout } = useApp();

  return (
    <header className="app-header">
      <h1>Biblioteka — SPA</h1>
      <div className="app-header__user">
        <span>
          {user.profile?.preferred_username} ({roles.join(', ') || 'brak ról'})
        </span>
        <button type="button" onClick={logout}>Wyloguj</button>
      </div>
    </header>
  );
}
