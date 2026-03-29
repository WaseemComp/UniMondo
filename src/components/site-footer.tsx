export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-zinc-600 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <p>Copyright {new Date().getFullYear()} UniMondo. All rights reserved.</p>
        <p>Study in Europe with confidence and clear guidance.</p>
      </div>
    </footer>
  );
}
