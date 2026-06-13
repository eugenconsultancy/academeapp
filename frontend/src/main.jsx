// frontend/src/main.jsx
import React, { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FontProvider } from './contexts/FontContext';
import OfflineIndicator from './components/shared/OfflineIndicator';
import SkeletonLoader from './components/shared/SkeletonLoader';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { offlineStorage } from './utils/storage';
import './styles/globals.css';
import './styles/themes.css';
import './styles/fonts.css';
import './index.css';

// ═══════════════════════════════════════════════════════════════
// CRITICAL-PATH VIEWPORT HEIGHT INITIALISATION to resolve the keyboard masking issues
//
// Run synchronously (before React mounts) so there is never a
// frame where --visual-vh is missing and elements flash to
// incorrect heights.
//
// Strategy:
//   • Use window.visualViewport.height when available (most
//     accurate — already excludes the keyboard).
//   • Fall back to window.innerHeight.
//   • Write --visual-vh to <html> so every CSS calc() using it
//     has a value from the very first paint.
// ═══════════════════════════════════════════════════════════════
(function initVisualVh() {
  const setVh = (h) => {
    document.documentElement.style.setProperty('--visual-vh', `${h * 0.01}px`);
  };

  if (window.visualViewport) {
    setVh(window.visualViewport.height);

    // Also listen for viewport changes (keyboard opening/closing)
    window.visualViewport.addEventListener('resize', () => {
      setVh(window.visualViewport.height);
    });
  } else {
    setVh(window.innerHeight);
  }
})();

// ═══════════════════════════════════════════════════════════════
// TANSTACK QUERY CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error?.response?.status !== 404 && query.queryKey[0] !== 'weather') {
        console.error('[Query Cache Error]:', error.message);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error.message !== 'No claim ID') {
        console.error('[Mutation Cache Error]:', error.message);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 1;
      },
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER & APP INITIALISATION
// ═══════════════════════════════════════════════════════════════
window.addEventListener('unhandledrejection', (e) =>
  console.error('[Unhandled Rejection]:', e.reason)
);

window.addEventListener('error', (e) => {
  console.error('[Global Error]:', e.error || e.message);
});

async function initializeApp() {
  try {
    await offlineStorage.performMaintenance();
    console.log('✅ Offline storage initialized');
  } catch (err) {
    console.warn('[App] Offline storage init failed:', err);
  }
}
initializeApp();

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <ErrorBoundary fallback={<div className="p-8 text-center">Something went wrong.</div>}>
      <HashRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <FontProvider>
              <AuthProvider>
                <OfflineIndicator position="top" />
                <Suspense fallback={<SkeletonLoader type="page" />}>
                  <App />
                </Suspense>
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

// ═══════════════════════════════════════════════════════════════
// PWA SERVICE WORKER (Safe Pattern - Module Aware)
// ═══════════════════════════════════════════════════════════════
const registerServiceWorker = () => {
  // Check if we're in a production environment and service workers are supported
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered with scope:', registration.scope);

          // Check for updates
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

// ═══════════════════════════════════════════════════════════════
// EXPORT FOR TESTING (optional)
// ═══════════════════════════════════════════════════════════════
export { queryClient };