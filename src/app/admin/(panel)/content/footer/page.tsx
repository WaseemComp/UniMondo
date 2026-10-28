import { redirect } from "next/navigation";
import { FooterEditor } from "@/components/admin/footer/footer-editor";
import { workflowAccess } from "@/lib/publishing/access";
import { FOOTER_RESOURCE } from "@/lib/footer/model";
import { getFooterDefaults } from "@/lib/footer/server";
export const metadata = {
  title: "Footer | UniMondo Content Studio",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const { permissions } = await workflowAccess(FOOTER_RESOURCE);
  if (!permissions.view) redirect("/admin/dashboard");
  const defaults = await getFooterDefaults(true).catch(() => null);
  if (!defaults)
    return (
      <div role="alert" className="cms-notice">
        The existing footer details could not be loaded. Reload before editing.
        Public content remains unchanged.
      </div>
    );
  return <FooterEditor defaults={defaults} />;
}
