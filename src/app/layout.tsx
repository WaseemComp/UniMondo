import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-editorial",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "UniMondo | European University Admissions & Guidance",
    template: "%s | UniMondo",
  },
  description:
    "Student-focused education consultancy for European university admissions, language courses, and visa guidance.",
  keywords: [
    "Study in Europe",
    "European Universities",
    "University Admissions Consultancy",
    "Study in Germany",
    "Study in Italy",
    "Study in Poland",
    "Student Visa Guidance",
    "Language Courses Europe",
  ],
  authors: [{ name: "UniMondo" }],
  creator: "UniMondo",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "UniMondo",
    title: "UniMondo | European University Admissions & Guidance",
    description:
      "Student-focused education consultancy for European university admissions, language courses, and visa guidance.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "UniMondo",
      url: siteUrl,
      logo: `${siteUrl}/android-chrome-512x512.png`,
      description: "Student-focused education consultancy for Europe admissions.",
      sameAs: ["https://www.linkedin.com/company/unimondo"],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "UniMondo",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${dmSans.variable} ${instrumentSerif.variable} h-full antialiased`}
      style={{ ["--font-heading" as string]: "var(--font-sans)" }}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
