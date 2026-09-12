import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';
import { ViewportPort } from '../src/ports/viewport-port.mjs';
import { architectureManifest, validateArchitectureRuntime } from '../src/core/architecture-contract.mjs';

const root = new URL('../src/', import.meta.url);
const files = await listMjs(root);
const violations = [];
const forbidden = [
  /window\.scene/,
  /window\.objects/,
  /window\.camera/,
  /ThreeDLiteMainCoreV1/,
  /MaxPix/,
  /LegacyMigrationBridge/,
  /ThreeDLiteRewrite/,
  /from\s+['"][^'"]*(?:\/3dlite\/|\/builds\/)/
];

for (const fileUrl of files) {
  const text = await readFile(fileUrl, 'utf8');
  const path = relative(new URL('../', root).pathname, fileUrl.pathname);
  const isContract = fileUrl.pathname.endsWith('/core/architecture-contract.mjs');
  if (!isContract) for (const pattern of forbidden) if (pattern.test(text)) violations.push(`${path}: ${pattern}`);
  const isRendererBoundary = fileUrl.pathname.endsWith('/ports/litepix-renderer-port.mjs');
  if (!isRendererBoundary && !isContract && /LitePixSceneCompiler|LitePixCore8Production443|LitePixNative/.test(text)) {
    violations.push(`${path}: LitePix runtime global escaped renderer boundary`);
  }
}

assert.deepEqual(violations, []);

const core = new ThreeDLiteMainCore({ validator:value => !!value && typeof value === 'object' });
const renderScene = new RenderScenePort(core);
const viewport = new ViewportPort(core, renderScene);
const runtime = validateArchitectureRuntime({ core, renderScene, viewport });
assert.equal(runtime.passed, true);

const manifest = architectureManifest();
assert.equal(manifest.authoritativeCore, 'ThreeDLiteMainCore');
assert.equal(manifest.renderer, 'LitePix');
assert.equal(manifest.boundaries.legacyRuntimeIsReferenceOnly, true);
assert.equal(Object.isFrozen(manifest), true);

console.log(JSON.stringify({ passed:true, filesScanned:files.length, contractVersion:manifest.contractVersion, ownership:manifest.ownership }, null, 2));

async function listMjs(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes:true });
  const out = [];
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) out.push(...await listMjs(child));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) out.push(child);
  }
  return out;
}
