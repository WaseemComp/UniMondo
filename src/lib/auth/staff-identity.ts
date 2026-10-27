type StaffIdentityUser = {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

/** Assigned identity is server-managed. Legacy accounts retain their existing display details. */
export function staffIdentity(user: StaffIdentityUser): { fullName: string; designation: string } {
  const assigned = user.app_metadata?.staff_identity;
  if (assigned && typeof assigned === "object" && !Array.isArray(assigned)) {
    const profile = assigned as Record<string, unknown>;
    return {
      fullName: typeof profile.full_name === "string" ? profile.full_name : "",
      designation: typeof profile.designation === "string" ? profile.designation : "",
    };
  }
  return {
    fullName: String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || ""),
    designation: String(user.user_metadata?.designation || ""),
  };
}
