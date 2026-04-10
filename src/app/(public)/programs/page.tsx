import { redirect } from "next/navigation";

/** Canonical programs listing lives at /current-openings; /programs is a friendly alias. */
export default function ProgramsAliasPage() {
  redirect("/current-openings");
}
