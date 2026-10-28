type StaffIdentityUser = {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

/** Assigned identity is server-managed. Legacy accounts retain their existing display details. */
export function staffIdentity(user: StaffIdentityUser): {
  fullName: string;
  designation: string;
} {
  const assigned = user.app_metadata?.staff_identity;
  if (assigned && typeof assigned === "object" && !Array.isArray(assigned)) {
    const profile = assigned as Record<string, unknown>;
    return {
      fullName: typeof profile.full_name === "string" ? profile.full_name : "",
      designation:
        typeof profile.designation === "string" ? profile.designation : "",
    };
  }
  return {
    fullName: String(
      user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "",
    ),
    designation: String(user.user_metadata?.designation || ""),
  };
}

/** Self-editable presentation only; never used for authorization or assigned legal identity. */
export function staffDisplayName(user: StaffIdentityUser): string {
  const display = user.user_metadata?.display_name;
  if (
    typeof display === "string" &&
    display.trim() &&
    display.trim().length <= 160
  )
    return display.trim();
  const assigned = staffIdentity(user).fullName.trim();
  return assigned.includes("@")
    ? assigned.split("@")[0]
    : assigned || "UniMondo staff";
}
