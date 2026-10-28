import { mediaJiti } from "./run-media-tests.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const path = fileURLToPath(new URL("./test-post-launch.mjs", import.meta.url));
await mediaJiti().evalModule(readFileSync(path, "utf8"), {
  filename: path,
  async: true,
});
