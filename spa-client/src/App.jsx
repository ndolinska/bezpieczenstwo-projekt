import './App.css';
import { useApp } from './context/AppContext';
import AdminPanel from './components/AdminPanel';
import AlertMessages from './components/AlertMessages';
import AppHeader from './components/AppHeader';
import BookCatalog from './components/BookCatalog';
import LibrarianPanel from './components/LibrarianPanel';
import LoginPage from './components/LoginPage';
import MyLoans from './components/MyLoans';
import StatsPanel from './components/StatsPanel';

export default function App() {
  const { user, authReady, isLibrarian, isAdmin } = useApp();

  if (!authReady) {
    return <main className="app"><p>Ładowanie…</p></main>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <main className="app">
      <AppHeader />
      <AlertMessages />
      <BookCatalog />
      <MyLoans />
      {isLibrarian && <LibrarianPanel />}
      {isLibrarian && <StatsPanel />}
      {isAdmin && <AdminPanel />}
    </main>
  );
}
