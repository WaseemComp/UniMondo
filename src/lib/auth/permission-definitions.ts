export type PermissionNode = {
  key: string;
  label: string;
  children?: PermissionNode[];
};

export const PERMISSION_TREE: PermissionNode[] = [
  {
    key: "home",
    label: "Home",
    children: [
      { key: "home.view", label: "View" },
      { key: "home.edit", label: "Edit" },
      {
        key: "home.hero_slider",
        label: "Hero Slider",
        children: [
          { key: "home.hero_slider.view", label: "View" },
          { key: "home.hero_slider.create", label: "Create" },
          { key: "home.hero_slider.edit", label: "Edit" },
          { key: "home.hero_slider.delete", label: "Delete" },
        ],
      },
      {
        key: "home.stats",
        label: "Stats",
        children: [
          { key: "home.stats.view", label: "View" },
          { key: "home.stats.edit", label: "Edit" },
        ],
      },
      {
        key: "home.cta",
        label: "CTA Section",
        children: [
          { key: "home.cta.view", label: "View" },
          { key: "home.cta.edit", label: "Edit" },
        ],
      },
    ],
  },
  {
    key: "universities",
    label: "Universities",
    children: [
      { key: "universities.view", label: "View" },
      { key: "universities.create", label: "Create" },
      { key: "universities.edit", label: "Edit" },
      { key: "universities.delete", label: "Delete" },
      { key: "universities.publish", label: "Publish/Unpublish" },
    ],
  },
  {
    key: "countries",
    label: "Countries",
    children: [
      { key: "countries.view", label: "View" },
      { key: "countries.create", label: "Create" },
      { key: "countries.edit", label: "Edit" },
      { key: "countries.delete", label: "Delete" },
      { key: "countries.publish", label: "Publish/Unpublish" },
    ],
  },
  {
    key: "packages",
    label: "Packages",
    children: [
      { key: "packages.view", label: "View" },
      { key: "packages.create", label: "Create" },
      { key: "packages.edit", label: "Edit" },
      { key: "packages.delete", label: "Delete" },
      { key: "packages.publish", label: "Publish/Unpublish" },
    ],
  },
  {
    key: "courses",
    label: "Language Courses",
    children: [
      { key: "courses.view", label: "View" },
      { key: "courses.create", label: "Create" },
      { key: "courses.edit", label: "Edit" },
      { key: "courses.delete", label: "Delete" },
      { key: "courses.publish", label: "Publish/Unpublish" },
    ],
  },
  {
    key: "about",
    label: "About",
    children: [
      { key: "about.view", label: "View" },
      { key: "about.edit", label: "Edit" },
      { key: "about.publish", label: "Publish/Unpublish" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    children: [
      { key: "contact.view", label: "View" },
      { key: "contact.edit", label: "Edit" },
    ],
  },
  {
    key: "blog",
    label: "Blog",
    children: [
      { key: "blog.view", label: "View" },
      { key: "blog.create", label: "Create" },
      { key: "blog.edit", label: "Edit" },
      { key: "blog.delete", label: "Delete" },
      { key: "blog.publish", label: "Publish/Unpublish" },
    ],
  },
  {
    key: "applications",
    label: "Applications",
    children: [
      { key: "applications.view", label: "View" },
      { key: "applications.edit_status", label: "Edit status" },
    ],
  },
  {
    key: "submissions",
    label: "Submissions",
    children: [
      { key: "submissions.view", label: "View" },
      { key: "submissions.edit_status", label: "Edit status" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    children: [
      { key: "settings.view", label: "View" },
      { key: "settings.edit", label: "Edit" },
    ],
  },
  {
    key: "users",
    label: "Users",
    children: [
      { key: "users.view", label: "View" },
      { key: "users.create", label: "Create" },
      { key: "users.edit", label: "Edit" },
      { key: "users.delete", label: "Delete" },
    ],
  },
];

