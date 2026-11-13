import { resetDemoProfile } from '@/lib/demo/mode';

/** Shown on the static GitHub Pages build only. */
export default function DemoBanner() {
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-black">
      <span>Demo: everything runs in your browser. Leaderboard and rooms show sample data. Live races need the full server.</span>
      <button
        type="button"
        className="underline"
        onClick={() => {
          resetDemoProfile();
          window.location.reload();
        }}
      >
        Reset demo
      </button>
    </div>
  );
}
