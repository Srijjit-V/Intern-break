import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, createBrowserRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import AiroErrorBoundary from '../export-plugins/AiroErrorBoundary';
import CookieBannerErrorBoundary from '@/components/CookieBannerErrorBoundary';
import RootLayout from './layouts/RootLayout';
import Spinner from './components/Spinner';
import { routes } from './routes';
import { DEMO } from './lib/demo/mode';
import DemoBanner from './components/DemoBanner';
const CookieBanner = lazy(() => import('@/components/CookieBanner').catch(error => {
  console.warn('Failed to load CookieBanner:', error);
  return {
    default: () => null
  };
}));
const SpinnerFallback = () => <div className="flex justify-center py-8 h-screen items-center">
    <Spinner />
  </div>;
const rootElement = <Suspense fallback={<SpinnerFallback />}>
    <RootLayout>
      <Outlet />
    </RootLayout>
  </Suspense>;

// Wrap the agent-editable flat `routes` array in a layout route so ScrollRestoration
// + shared chrome live once above every page. Keeping the wrap here (instead of
// in routes.tsx) preserves the agent's simple flat-route contract. The dev
// boundary must live inside the route element so React Router doesn't replace it
// with its default route error UI before our boundary can catch render errors.
//
// `captureGlobalErrors={false}`: the ROOT boundary in main.tsx owns the global
// window.onerror/unhandledrejection handlers. This inner boundary only catches
// route render errors via componentDidCatch — installing window handlers here
// too would double-forward async errors and stack a second overlay.
const routeTree: RouteObject[] = [{
  element: import.meta.env.MODE === 'development' ? <AiroErrorBoundary captureGlobalErrors={false}>{rootElement}</AiroErrorBoundary> : rootElement,
  children: routes
}];
const router = createBrowserRouter(routeTree, { basename: import.meta.env.BASE_URL });
/** The server render has no cookie banner, so mount it only after hydration (avoids React error #418). */
function AfterHydration({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}
export default function App() {
  return <>
      {DEMO && <DemoBanner />}
      <RouterProvider router={router} />
      {/*
        CookieBanner reads document.cookie and subscribes to browser events.
        App.tsx is client-only (entry-server.tsx renders the route tree
        directly without importing App), so no SSR gate is needed here.
       */}
      {/* No cookie banner in the demo: it loads no third-party analytics. */}
      {!DEMO && <AfterHydration>
        <CookieBannerErrorBoundary>
          <Suspense fallback={null}>
            <CookieBanner />
          </Suspense>
        </CookieBannerErrorBoundary>
      </AfterHydration>}
    </>;
}
