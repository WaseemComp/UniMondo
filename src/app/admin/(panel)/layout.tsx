import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <AdminSidebar />
        <main className="min-h-screen flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
