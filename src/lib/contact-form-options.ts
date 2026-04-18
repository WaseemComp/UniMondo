/** Options for “Nature of collaboration” on the Contact page (Work with us). */
export const WORK_WITH_US_COLLAB_OPTIONS = [
  "University partnership",
  "Agent / referral network",
  "Corporate / training collaboration",
  "Media / events",
  "Research collaboration",
  "Other",
] as const;

export type WorkWithUsCollaborationNature = (typeof WORK_WITH_US_COLLAB_OPTIONS)[number];
