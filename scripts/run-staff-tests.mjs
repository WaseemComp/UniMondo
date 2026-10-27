import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const root = fileURLToPath(new URL("../", import.meta.url));
const mock = fileURLToPath(new URL("./fixtures/staff-services.mjs", import.meta.url));
const alias = { "@": `${root}src`, "next/cache": mock, "next/navigation": mock };
for (const path of ["lib/supabase/admin", "lib/supabase/server-auth"]) {
  alias[`@/${path}`] = mock;
  alias[`${root}src/${path}`] = mock;
  alias[`${root}src/${path}.ts`] = mock;
}
const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, alias, fsCache: false, moduleCache: false, tryNative: false });
const path = fileURLToPath(new URL("./test-staff-accounts.mjs", import.meta.url));
await jiti.evalModule(readFileSync(path, "utf8"), { filename: path, async: true });
