import assert from "node:assert/strict";
import test from "node:test";

import {
  createUpdateManifest,
  renderTemplate,
} from "../scripts/build-site.mjs";

test("creates a Firefox update manifest with identity, hash, and compatibility", () => {
  const manifest = createUpdateManifest({
    addonId: "ics-to-gcal@libc6.org",
    version: "1.2.3",
    updateLink: "https://ics-to-gcal.libc6.org/ics-to-gcal-1.2.3.xpi",
    sha256: "abc123",
    strictMinVersion: "140.0",
  });

  assert.deepEqual(manifest, {
    addons: {
      "ics-to-gcal@libc6.org": {
        updates: [
          {
            version: "1.2.3",
            update_link:
              "https://ics-to-gcal.libc6.org/ics-to-gcal-1.2.3.xpi",
            update_hash: "sha256:abc123",
            applications: {
              gecko: {
                strict_min_version: "140.0",
              },
            },
          },
        ],
      },
    },
  });
});

test("renders release values into the install page", () => {
  assert.equal(
    renderTemplate("Version {{VERSION}}: {{XPI_PATH}}", {
      VERSION: "1.2.3",
      XPI_PATH: "./addon.xpi",
    }),
    "Version 1.2.3: ./addon.xpi"
  );
});
