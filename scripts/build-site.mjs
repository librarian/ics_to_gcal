import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");

export function createUpdateManifest({
  addonId,
  version,
  updateLink,
  sha256,
  strictMinVersion,
}) {
  return {
    addons: {
      [addonId]: {
        updates: [
          {
            version,
            update_link: updateLink,
            update_hash: `sha256:${sha256}`,
            applications: {
              gecko: {
                strict_min_version: strictMinVersion,
              },
            },
          },
        ],
      },
    },
  };
}

export function renderTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (rendered, [name, value]) =>
      rendered.replaceAll(`{{${name}}}`, String(value)),
    template
  );
}

export async function buildSite(signedXpi, outputDirectory = path.join(root, "pages")) {
  const packageJson = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8")
  );
  const manifest = JSON.parse(
    await readFile(path.join(root, "src", "manifest.json"), "utf8")
  );
  const version = packageJson.version;
  const gecko = manifest.browser_specific_settings?.gecko;

  if (manifest.version !== version) {
    throw new Error(
      `Version mismatch: package.json=${version}, manifest.json=${manifest.version}`
    );
  }
  if (!gecko?.id || !gecko?.update_url || !gecko?.strict_min_version) {
    throw new Error("Firefox ID, update URL, and minimum version are required");
  }

  const xpi = await readFile(signedXpi);
  const sha256 = createHash("sha256").update(xpi).digest("hex");
  const xpiName = `ics-to-gcal-${version}.xpi`;
  const baseUrl = new URL(".", gecko.update_url).href;
  const updateLink = new URL(xpiName, baseUrl).href;

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(path.join(root, "site"), outputDirectory, { recursive: true });
  await cp(
    path.join(root, "src", "icons", "calendar.svg"),
    path.join(outputDirectory, "calendar.svg")
  );
  await writeFile(path.join(outputDirectory, xpiName), xpi);

  const updateManifest = createUpdateManifest({
    addonId: gecko.id,
    version,
    updateLink,
    sha256,
    strictMinVersion: gecko.strict_min_version,
  });
  await writeFile(
    path.join(outputDirectory, "updates.json"),
    `${JSON.stringify(updateManifest, null, 2)}\n`
  );
  await writeFile(
    path.join(outputDirectory, "SHA256SUMS"),
    `${sha256}  ${xpiName}\n`
  );

  const indexPath = path.join(outputDirectory, "index.html");
  const index = await readFile(indexPath, "utf8");
  await writeFile(
    indexPath,
    renderTemplate(index, {
      VERSION: version,
      XPI_PATH: `./${xpiName}`,
    })
  );

  console.log(`Built release site: ${outputDirectory}`);
  console.log(`Update manifest: ${gecko.update_url}`);
  console.log(`Signed package: ${updateLink}`);
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const signedXpi = process.argv[2];
  if (!signedXpi) {
    throw new Error("Usage: node scripts/build-site.mjs <signed.xpi> [output-dir]");
  }
  await buildSite(
    path.resolve(signedXpi),
    process.argv[3] ? path.resolve(process.argv[3]) : undefined
  );
}
