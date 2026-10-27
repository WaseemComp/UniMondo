import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const root = fileURLToPath(new URL("../", import.meta.url));
const mock = fileURLToPath(new URL("./fixtures/cms-services.mjs", import.meta.url));
const alias = { "@": `${root}src` };
for (const name of ["admin", "server-auth"]) {
  for (const sourcePath of [`@/lib/supabase/${name}`, `${root}src/lib/supabase/${name}`, `${root}src/lib/supabase/${name}.ts`]) alias[sourcePath] = mock;
}
const jiti = createJiti(import.meta.url, { alias, fsCache: false, moduleCache: false, tryNative: false });
const path = fileURLToPath(new URL("./test-cms-foundation.mjs", import.meta.url));
await jiti.evalModule(readFileSync(path, "utf8"), { filename: path, async: true });
