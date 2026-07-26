import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const source = path.join(root, "src");
const output = path.join(root, "dist");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const manifest = JSON.parse(await readFile(path.join(source, "manifest.json"), "utf8"));
manifest.version = packageJson.version;
await writeFile(
  path.join(output, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Built unpacked extension: ${output}`);
