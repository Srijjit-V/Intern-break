import { Link } from "react-router";
import { Helmet } from '@dr.pogodin/react-helmet';
import { Search, Wrench, ArrowLeft } from 'lucide-react';
export default function NotFoundPage() {
  return <>
      <Helmet>
        <title>404: Intern Not Found | Intern Break Space</title>
        <meta name="description" content="Restore your route to the Intern Break Space portal." />
        <link rel="canonical" href="https://sprtslp.com/404" />
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-center">
      <section className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-8 shadow-lg md:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
          <Search size={38} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-primary">404: Intern Not Found</p>
        <h1 className="mt-2 text-5xl font-bold text-foreground">Restore the page</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          A broken link sent this intern off the map. Head back to the portal and help restore the route.
        </p>
        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            <Wrench size={17} aria-hidden="true" /> Restore the portal
          </Link>
          <button type="button" onClick={() => window.history.back()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground hover:bg-muted">
            <ArrowLeft size={17} aria-hidden="true" /> Go back
          </button>
        </div>
      </section>
      </main>
    </>;
}
