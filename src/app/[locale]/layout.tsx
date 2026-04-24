export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // This layout exists to provide the `[locale]` segment for routing.
  // The actual HTML/body + NextIntlClientProvider live in `src/app/layout.tsx`
  // so admin routes and locale routes share a single root layout.
  void (await params);
  return children;
}

