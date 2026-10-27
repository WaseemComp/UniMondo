"use client";

import Link from "next/link";
import { CmsEmptyState } from "@/components/admin/cms/cms-foundation";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="cms-panel" role="alert"><CmsEmptyState title="This section couldn’t be loaded" description="Try again, or return to Overview to open another section." action={<div className="cms-page-actions mt-5 justify-center"><button type="button" onClick={reset} className="cms-button-primary">Try again</button><Link href="/admin/dashboard" className="cms-button-secondary">Return to Overview</Link></div>} /></section>;
}
