import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const root = fileURLToPath(new URL("../", import.meta.url));
const mock = fileURLToPath(new URL("./fixtures/homepage-services.mjs", import.meta.url));
const alias = { "@": `${root}src`, "next/cache": mock, "next/navigation": mock };
for (const name of ["admin", "server", "server-auth"]) {
  for (const path of [`@/lib/supabase/${name}`, `${root}src/lib/supabase/${name}`, `${root}src/lib/supabase/${name}.ts`]) alias[path] = mock;
}
const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, alias, fsCache: false, moduleCache: false, tryNative: false });
const path = fileURLToPath(new URL("./test-homepage-editor.mjs", import.meta.url));
await jiti.evalModule(readFileSync(path, "utf8"), { filename: path, async: true });
