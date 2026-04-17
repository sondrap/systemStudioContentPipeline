import { useEffect } from 'react';
import { Route, Switch, useLocation, Redirect } from 'wouter';
import { useAuth } from './useAuth';
import { useStore } from './store';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { PipelinePage } from './pages/PipelinePage';
import { ArticlePage } from './pages/ArticlePage';
import { ChatPage } from './pages/ChatPage';
import { BacklogPage } from './pages/BacklogPage';
import { ArchivePage } from './pages/ArchivePage';
import './theme.css';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const loadData = useStore((s) => s.loadData);
  const dataLoading = useStore((s) => s.loading);
  const [location] = useLocation();

  // Load pipeline data after auth
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Auth loading state
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg)' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  // Not authenticated: show login
  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={PipelinePage} />
        <Route path="/articles/:id" component={ArticlePage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/backlog" component={BacklogPage} />
        <Route path="/archive" component={ArchivePage} />
        <Route><Redirect to="/" /></Route>
      </Switch>
    </Layout>
  );
}
