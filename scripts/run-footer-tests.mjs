import { mediaJiti } from "./run-media-tests.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const file = fileURLToPath(
  new URL("./test-footer-publishing.mjs", import.meta.url),
);
await mediaJiti().evalModule(readFileSync(file, "utf8"), {
  filename: file,
  async: true,
});
