import Link from "next/link";
import { ArrowUpRight, ChevronRight, Leaf } from "lucide-react";
import type { CmsNavItem } from "@/lib/admin/navigation";
import type { CmsOverview } from "@/lib/admin/overview";
import { CmsIcon } from "./cms-icons";
import { CmsEmptyState, CmsNotice, CmsPageHeader, CmsStatusBadge } from "./cms-foundation";

const shortDescriptions: Record<string, string> = {
  home: "Manage your website’s first impression", applications: "Review incoming student applications", agreements: "Open agreements and revision history",
  universities: "Manage universities and programs", destinations: "Manage study destinations", courses: "Manage language courses", stories: "Edit student success stories",
  blog: "Manage articles and updates", packages: "Manage consultancy packages", about: "Edit your story and team", contact: "Manage contact information", submissions: "Review website submissions",
  team: "Manage your existing staff team", settings: "Your account and password",
};

export function CmsOverviewContent({ data, items, firstName }: { data: CmsOverview; items: CmsNavItem[]; firstName: string }) {
  const home = items.find(item => item.id === "home");
  const shortcuts = ["home", "applications", "agreements", "universities", "destinations", "courses", "stories", "blog", "packages", "about", "contact", "submissions", "team", "settings"]
    .map(id => items.find(item => item.id === id)).filter((item): item is CmsNavItem => Boolean(item)).slice(0, 5);
  return <>
    <CmsPageHeader eyebrow="YOUR WORKSPACE" title="Overview" description="A clear view of your content and daily work. Everything you can access, together in one place." actions={<a href="/" target="_blank" rel="noopener noreferrer" className="cms-button-secondary">View website<ArrowUpRight size={15} aria-hidden /></a>} />
    <section className="cms-overview-hero" aria-label="Welcome">
      <span className="cms-hero-icon"><Leaf size={29} strokeWidth={1.5} aria-hidden /></span>
      <div className="cms-hero-copy"><p className="cms-eyebrow">SPACE TO DO YOUR BEST WORK</p><h2>Welcome back{firstName ? `, ${firstName}` : ""}.</h2><p>{home ? "Keep your website fresh, review what’s coming in and pick up where you left off." : "Review your available sections and pick up where you left off."}</p></div>
      {home && <Link href={home.href} className="cms-button-secondary">Manage website<ChevronRight size={15} aria-hidden /></Link>}
    </section>
    {data.unavailable && <CmsNotice>Some overview information is unavailable right now. You can still open your sections below; unavailable totals are shown as a dash.</CmsNotice>}
    {data.stats.length > 0 && <section className="cms-stats-grid" aria-label="Current records">{data.stats.map(stat => <Link className="cms-stat-card" key={stat.id} href={stat.href}><div className="cms-stat-top">{stat.label}<span><CmsIcon name={stat.icon} size={17} /></span></div><p className="cms-stat-number" aria-label={stat.count === null ? "Unavailable" : undefined}>{stat.count === null ? "—" : stat.count.toLocaleString("en-GB")}</p><p className="cms-stat-detail">{stat.count === null ? "Currently unavailable" : "Current records"}</p></Link>)}</section>}
    <div className="cms-overview-columns">
      <section className="cms-panel" aria-labelledby="cms-recent-title"><div className="cms-panel-heading"><h2 id="cms-recent-title">Recently updated content</h2><span className="cms-eyebrow" style={{ margin: 0 }}>LATEST SAVED CHANGES</span></div>
        {data.recent.length ? <ul className="cms-recent-list">{data.recent.map(item => <li key={item.id}><Link href={item.href} className="cms-recent-item"><span className="cms-shortcut-icon"><CmsIcon name={item.icon} size={18} /></span><span className="cms-recent-copy"><strong>{item.title}</strong><small>{item.section}</small></span><CmsStatusBadge status={item.status} /><time className="cms-recent-date" dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time></Link></li>)}</ul> : <CmsEmptyState title={data.unavailable ? "Recent content is unavailable" : "Your content updates will appear here"} description={data.unavailable ? "Open an available section to continue your work." : "Saved updates from your available website sections are shown here when available."} />}
      </section>
      <div className="cms-side-stack"><section className="cms-panel" aria-labelledby="cms-quick-title"><div className="cms-panel-heading"><h2 id="cms-quick-title">Your shortcuts</h2><ArrowUpRight size={16} aria-hidden /></div><div className="cms-quick-links">{shortcuts.map(item => <Link href={item.href} key={item.id}><span className="cms-shortcut-icon"><CmsIcon name={item.icon} size={17} /></span><span><strong>{item.id === "home" ? "Website pages" : item.label}</strong><small>{shortDescriptions[item.id]}</small></span><ChevronRight size={15} aria-hidden /></Link>)}</div></section>
        {data.queue.length > 0 && <section className="cms-panel" aria-labelledby="cms-queue-title"><div className="cms-panel-heading"><h2 id="cms-queue-title">Work in progress</h2><CmsIcon name="applications" size={16} /></div><div className="cms-queue">{data.queue.map(item => <Link key={item.label} href={item.href}><span><strong>{item.label}</strong><small>Open section to review</small></span><strong>{item.count.toLocaleString("en-GB")}</strong></Link>)}</div></section>}
      </div>
    </div>
  </>;
}
