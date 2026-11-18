import { useAuth } from './context/AuthContext.jsx';
import { UserProvider } from './context/UserContext.jsx';
import Login from './components/Login.jsx';
import Dashboard from './Dashboard.jsx';

function Splash() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="animate-pulse text-sm text-slate-400">Loading…</div>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;
  if (!session) return <Login />;

  // Authenticated: user preferences (getMe) are only fetched once signed in.
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  );
}
