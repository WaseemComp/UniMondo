import { permanentRedirect } from "next/navigation";

/** Friendly alias — canonical program browsing is on /destinations */
export default function ProgramsAliasPage() {
  permanentRedirect("/destinations");
}
