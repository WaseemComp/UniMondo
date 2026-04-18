export default function AboutLoading() {
  return (
    <main className="mx-auto max-w-4xl animate-pulse px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-9 w-2/3 max-w-md rounded bg-slate-200" />
      <div className="mt-6 space-y-2">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
      </div>
      <div className="mt-12 space-y-8">
        <div className="h-7 w-48 rounded bg-slate-200" />
        <div className="h-24 w-full rounded-xl bg-slate-100" />
        <div className="h-7 w-48 rounded bg-slate-200" />
        <div className="h-24 w-full rounded-xl bg-slate-100" />
      </div>
    </main>
  );
}
