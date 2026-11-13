import assert from "node:assert/strict";
const base = "https://slrxm.github.io/Meta-Tracker/";
let lastError;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const response = await fetch(base + "?verify=" + Date.now());
    assert.equal(response.status, 200, "Published page");
    const html = await response.text();
    assert.ok(html.includes("META TRACKER"), "Published brand");
    const refs = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(x => x[1]);
    for (const ref of refs) {
      const asset = await fetch(new URL(ref, base));
      assert.equal(asset.status, 200, ref);
      assert.ok((await asset.arrayBuffer()).byteLength > 0, ref);
    }
    console.log("PUBLIC SITE VERIFIED: " + base + " and " + refs.length + " assets");
    process.exit(0);
  } catch (error) {
    lastError = error;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
throw lastError;

