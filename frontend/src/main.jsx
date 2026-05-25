// this is our main.jsx file 
import React, { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster, toast } from 'react-hot-toast';
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

// ═══════════════════════════════════════════════════════════════
// TANSTACK QUERY CONFIGURATION WITH INTELLIGENT ERROR FILTERING
// ═══════════════════════════════════════════════════════════════
// const queryClient = new QueryClient({
//   queryCache: new QueryCache({
//     onError: (error, query) => {
//       // here we ignore 404 type of errors  exptected or handled erors like weather failing
//       if (error?.response?.status !== 404 && query.querryKey[0] !== 'weather'){
//         console.error('[Query Cache Error]:', error.message);
//       }
//     }
//   })
// })
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Ignore 404s (expected) or specific handled errors like weather failing
      if (error?.response?.status !== 404 && query.queryKey[0] !== 'weather') {
        console.error('[Query Cache Error]:', error.message);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Suppress specific validation-related errors from flooding the console
      if (error.message !== 'No claim ID') {
        console.error('[Mutation Cache Error]:', error.message);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR & APP INITIALIZATION
// ═══════════════════════════════════════════════════════════════
window.addEventListener('unhandledrejection', (e) => console.error('[Unhandled Rejection]:', e.reason));

async function initializeApp() {
  try {
    await offlineStorage.performMaintenance();
  } catch (error) {
    console.warn('[App] Offline storage init failed');
  }
}
initializeApp();

// ═══════════════════════════════════════════════════════════════
// RENDER APP
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
                    className: '!bg-white dark:!bg-slate-800 !text-slate-800 dark:!text-slate-100 shadow-lg border border-black/5',
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
// PWA SERVICE WORKER REGISTRATION (fr mobile apps cmpnent)
// ═══════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}