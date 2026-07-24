// frontend/src/main.jsx
import React, { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import FAB from './components/layout/FAB';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FontProvider } from './contexts/FontContext';
import OfflineIndicator from './components/shared/OfflineIndicator';
import SkeletonLoader from './components/shared/SkeletonLoader';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { offlineStorage } from './utils/storage';
import useUserStore from './stores/useUserStore';
import './styles/globals.css';
import './styles/themes.css';
import './styles/fonts.css';
import './index.css';

// ─── Viewport height ──────────────────────────────────────────────
(function initVisualVh() {
  const setVh = (h) => {
    document.documentElement.style.setProperty('--visual-vh', `${h * 0.01}px`);
  };
  if (window.visualViewport) {
    setVh(window.visualViewport.height);
    window.visualViewport.addEventListener('resize', () => {
      setVh(window.visualViewport.height);
    });
  } else {
    setVh(window.innerHeight);
  }
})();

// ─── 401 handler ──────────────────────────────────────────────────
const handleAuthFailure = () => {
  const { logout } = useUserStore.getState();
  logout();
  window.location.href = '/login';
};

// ─── React Query client ──────────────────────────────────────────
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error?.response?.status === 404) return;
      if (query?.queryKey?.[0] === 'weather') return;
      if (error?.response?.status === 401) {
        console.warn('[QueryCache] 401 – forcing logout');
        handleAuthFailure();
        return;
      }
      console.error('[Query Cache Error]:', error.message || error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error?.message === 'No claim ID') return;
      if (error?.response?.status === 401) {
        console.warn('[MutationCache] 401 – forcing logout');
        handleAuthFailure();
        return;
      }
      console.error('[Mutation Cache Error]:', error.message || error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 1;
      },
    },
  },
});

// ─── Unhandled rejection handler ──────────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason?.response?.status === 401 ||
    (reason?.message && reason.message.includes('No refresh token'))
  ) {
    event.preventDefault();
    console.warn('[UnhandledRejection] Auth failure – redirecting');
    handleAuthFailure();
    return;
  }
  console.error('[Unhandled Rejection]:', reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('[Global Error]:', event.error || event.message);
});

// ─── Offline storage init ──────────────────────────────────────────
async function initializeApp() {
  try {
    await offlineStorage.performMaintenance();
    console.log('✅ Offline storage initialized');
  } catch (err) {
    console.warn('[App] Offline storage init failed:', err);
  }
}
initializeApp();

// ─── Render ─────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <ErrorBoundary fallback={<div className="p-8 text-center">Something went wrong.</div>}>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <FontProvider>
              <AuthProvider>
                <OfflineIndicator position="top" />
                <Suspense fallback={<SkeletonLoader type="page" />}>
                  <App />
                </Suspense>
                {/* ─── FAB wrapped in dedicated container for global CSS control ─── */}
                <div id="fab-container">
                  <FAB />
                </div>
                <Toaster
                  position="top-center"
                  toastOptions={{
                    className:
                      '!bg-white dark:!bg-slate-800 !text-slate-800 dark:!text-slate-100 shadow-lg border border-black/5',
                    duration: 3000,
                  }}
                />
              </AuthProvider>
            </FontProvider>
          </ThemeProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
);

// ─── Service Worker ──────────────────────────────────────────────────
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered with scope:', registration.scope);
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('🔄 New content available, please refresh');
                  } else {
                    console.log('✅ Content cached for offline use');
                  }
                }
              };
            }
          };
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  } else if (import.meta.env.DEV) {
    console.log('📱 Service Worker not registered in development mode');
  }
};
registerServiceWorker();

export { queryClient };