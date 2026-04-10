export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Contact</p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl">Get in Touch</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">General Inquiries</h2>
          <p className="mt-2 text-sm text-zinc-700">hello@unimondo.example</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Admissions Support</h2>
          <p className="mt-2 text-sm text-zinc-700">admissions@unimondo.example</p>
        </article>
      </div>
    </main>
  );
}
