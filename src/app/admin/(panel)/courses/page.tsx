import { CoursesAdmin } from "@/components/admin/courses-admin";

export default function AdminCoursesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Courses</h1>
        <p className="mt-1 text-sm text-zinc-600">Create and manage language courses shown on the public site.</p>
      </div>
      <CoursesAdmin />
    </div>
  );
}

