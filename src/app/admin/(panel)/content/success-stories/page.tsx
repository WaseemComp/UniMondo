import { redirect } from "next/navigation";
import { StoriesWorkspace } from "@/components/admin/publishing/stories-workspace";
import { workflowAccess } from "@/lib/publishing/access";
import { readEditableStories } from "@/lib/admin/homepage-catalogue";
import { hasAdminPermission } from "@/lib/auth/permissions";
import type { HomepageEditorData } from "@/lib/admin/homepage-editor";
export default async function Page() {
  const { user, permissions } = await workflowAccess({
    type: "home",
    key: "testimonials",
  });
  if (!permissions.view) redirect("/admin/dashboard");
  const editableStories = await readEditableStories(user),
    [storyCreate, storyEdit, storyPublish, storyArchive] = await Promise.all(
      ["blog.create", "blog.edit", "blog.publish", "blog.delete"].map((key) =>
        hasAdminPermission(user, key),
      ),
    );
  const initial: HomepageEditorData = {
    available: editableStories.available,
    site: {},
    blocks: [],
    openings: [],
    stories: editableStories.rows
      .filter((row) => row.is_published)
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 6),
    editableStories,
    references: {
      countries: [],
      programs: [],
      universities: [],
      available: false,
    },
    permissions: {
      editHome: false,
      viewSlides: false,
      editSlides: false,
      createSlides: false,
      viewCta: false,
      editCta: false,
      storyView: true,
      storyCreate,
      storyEdit,
      storyPublish,
      storyArchive,
    },
  };
  return <StoriesWorkspace initial={initial} />;
}
