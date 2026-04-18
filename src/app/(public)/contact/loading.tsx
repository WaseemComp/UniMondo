export default function ContactLoading() {
  return (
    <main className="animate-pulse bg-gradient-to-b from-[#0a1628] via-slate-100 to-white">
      <div className="h-72 bg-[#0a1628]/90 sm:h-80">
        <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4">
          <div className="h-7 w-32 rounded-full bg-white/10" />
          <div className="mt-6 h-12 w-4/5 max-w-lg rounded-lg bg-white/10" />
          <div className="mt-4 h-4 w-full max-w-md rounded bg-white/5" />
          <div className="mt-10 grid w-full max-w-2xl grid-cols-3 gap-3">
            <div className="h-24 rounded-2xl bg-white/5" />
            <div className="h-24 rounded-2xl bg-white/5" />
            <div className="h-24 rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-12 max-w-6xl space-y-8 px-4 pb-16 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-72 rounded-[1.75rem] bg-slate-200/90" />
          <div className="h-72 rounded-[1.75rem] bg-slate-200/90" />
          <div className="h-72 rounded-[1.75rem] bg-slate-200/90" />
        </div>
        <div className="h-40 rounded-[1.75rem] bg-slate-200/80" />
        <div className="h-36 rounded-[1.75rem] bg-[#0a1628]/20" />
      </div>
    </main>
  );
}
