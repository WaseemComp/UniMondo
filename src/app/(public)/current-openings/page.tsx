import { permanentRedirect } from "next/navigation";

/** Legacy route — universities and programs now live under /destinations */
export default function CurrentOpeningsRedirectPage() {
  permanentRedirect("/destinations");
}
