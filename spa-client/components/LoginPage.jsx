import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { login, error } = useApp();

  return (
    <main className="app login-screen">
      <h1>Biblioteka — SPA</h1>
      <p>Zaloguj się, aby korzystać z aplikacji.</p>
      <button type="button" onClick={login}>Zaloguj przez Keycloak</button>
      {error && <p className="alert alert--error">{error}</p>}
    </main>
  );
}
