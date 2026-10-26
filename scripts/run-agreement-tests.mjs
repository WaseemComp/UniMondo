import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2] || "suite";
if (!["suite", "regressions"].includes(mode)) throw new Error("Unknown agreement test suite.");
const mock = fileURLToPath(new URL("./fixtures/agreement-services.mjs", import.meta.url));
const alias = { "@": `${root}src` };
if (mode === "regressions") {
  for (const modulePath of ["lib/supabase/admin", "lib/supabase/server-auth", "lib/auth/admin", "lib/auth/permissions"]) {
    alias[`@/${modulePath}`] = mock;
    alias[`${root}src/${modulePath}`] = mock;
    alias[`${root}src/${modulePath}.ts`] = mock;
  }
}
const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, alias, fsCache: false, moduleCache: false, tryNative: false });
const { readFileSync } = await import("node:fs");
const path = fileURLToPath(new URL(`./test-agreement-${mode === "suite" ? "suite" : "regressions"}.mjs`, import.meta.url));
await jiti.evalModule(readFileSync(path, "utf8"), { filename: path, async: true });
