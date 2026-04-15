import { type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  IconLayoutKanban,
  IconFileText,
  IconMessageCircle,
  IconArchive,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';
import { auth } from '@mindstudio-ai/interface';

const NAV_ITEMS = [
  { path: '/', icon: IconLayoutKanban, label: 'Pipeline' },
  { path: '/backlog', icon: IconArchive, label: 'Backlog' },
  { path: '/chat', icon: IconMessageCircle, label: 'Chat' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();

  // Check which nav item is active
  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  // Article editor also highlights pipeline
  const isArticlePage = location.startsWith('/articles/');

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Rail */}
      <nav style={{
        width: 56,
        minWidth: 56,
        height: '100%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: 4,
        userSelect: 'none',
      }}>
        {/* Logo mark */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--deep-current)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <img
            src="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/eee84c19-5df7-44c3-aeed-fc6395964065.png?w=64&dpr=3"
            alt="S"
            style={{ width: 22, height: 22, filter: 'brightness(2.5)' }}
          />
        </div>

        {/* Nav icons */}
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path) || (item.path === '/' && isArticlePage);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={item.label}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active ? '#ECD8DC30' : 'transparent',
                color: active ? 'var(--deep-current)' : 'var(--text-secondary)',
                transition: 'all 150ms ease-out',
              }}
            >
              <item.icon size={20} stroke={1.5} />
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Logout */}
        <button
          onClick={() => auth.logout()}
          title="Sign out"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'all 150ms',
          }}
        >
          <IconLogout size={18} stroke={1.5} />
        </button>
      </nav>

      {/* Main content */}
      <main style={{
        flex: 1,
        height: '100%',
        overflow: 'auto',
        background: 'var(--bg)',
      }}>
        {children}
      </main>
    </div>
  );
}
