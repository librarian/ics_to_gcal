import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

const packageJson = await readJson("package.json");
const packageLock = await readJson("package-lock.json");
const manifest = await readJson("src/manifest.json");

const versions = new Map([
  ["package.json", packageJson.version],
  ["package-lock.json", packageLock.version],
  ["package-lock.json root package", packageLock.packages?.[""]?.version],
  ["src/manifest.json", manifest.version]
]);
const mismatches = [...versions].filter(
  ([, version]) => version !== packageJson.version
);

if (mismatches.length > 0) {
  console.error(
    `Version mismatch: expected ${packageJson.version}; ` +
      mismatches.map(([source, version]) => `${source} is ${version}`).join(", ")
  );
  process.exit(1);
}

const releaseTag = process.argv[2];
if (releaseTag) {
  const expectedTag = `v${packageJson.version}`;
  if (releaseTag !== expectedTag) {
    console.error(
      `Release tag ${releaseTag} does not match extension version ${expectedTag}.`
    );
    process.exit(1);
  }
}

console.log(`Version metadata is consistent: ${packageJson.version}`);
