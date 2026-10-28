import { mediaJiti } from "./run-media-tests.mjs";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const file = fileURLToPath(
  new URL("./test-content-publishing.mjs", import.meta.url),
);
await mediaJiti().evalModule(readFileSync(file, "utf8"), {
  filename: file,
  async: true,
});
