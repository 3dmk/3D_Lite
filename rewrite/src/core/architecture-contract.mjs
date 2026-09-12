export const ARCHITECTURE_CONTRACT_VERSION = 1;

export const ArchitectureOwnership = deepFreeze({
  applicationState: 'ThreeDLiteMainCore',
  editableGeometry: 'GeometryStore',
  hierarchy: 'SceneGraph',
  materials: 'MaterialStore',
  assets: 'AssetStore',
  commands: 'CommandStack',
  derivedGeometry: 'DerivedGeometryEvaluator',
  viewportState: 'ViewportPort',
  uiEphemeralState: 'UIController',
  renderSceneCompilation: 'RenderScenePort',
  rendererState: 'LitePixRendererPort',
  persistence: 'ProjectSerializer',
  diagnostics: 'DiagnosticsRegistry',
  recovery: 'RecoveryManager'
});

export const ArchitectureBoundaries = deepFreeze({
  uiMayMutateApplicationStateOnlyThrough: ['Main Core public APIs','CommandStack','ViewportPort intents'],
  viewportMayOwn: ['editor camera/view','tool','gizmo space','pick intent'],
  viewportMayNotOwn: ['scene entities','editable geometry','materials','selection authority'],
  rendererMayConsume: ['immutable render-scene descriptors','compiled materials','evaluated geometry','camera descriptors'],
  rendererMayNotOwn: ['editable scene state','selection','authoring geometry','application camera authority'],
  persistenceUsesStableReferences: true,
  asyncResultsRequireGenerationValidation: true,
  legacyRuntimeIsReferenceOnly: true
});

export const ForbiddenLegacyRuntimeSurfaces = deepFreeze([
  'window.scene',
  'window.objects',
  'window.camera',
  'ThreeDLiteMainCoreV1',
  'MaxPix',
  'LegacyMigrationBridge',
  'ThreeDLiteRewrite'
]);

export function architectureManifest() {
  return deepFreeze({
    schema: 1,
    contractVersion: ARCHITECTURE_CONTRACT_VERSION,
    authoritativeCore: 'ThreeDLiteMainCore',
    renderer: 'LitePix',
    pattern: 'DCAMP modular application kernel with ports/adapters',
    ownership: structuredClone(ArchitectureOwnership),
    boundaries: structuredClone(ArchitectureBoundaries),
    forbiddenLegacyRuntimeSurfaces: ForbiddenLegacyRuntimeSurfaces.slice()
  });
}

export function validateArchitectureRuntime({ core, viewport, renderScene, renderer = null } = {}) {
  const failures = [];
  if (!core || core.constructor?.name !== 'ThreeDLiteMainCore') failures.push('authoritative Main Core missing');
  if (!renderScene || typeof renderScene.compile !== 'function') failures.push('Render Scene Port missing');
  if (!viewport || typeof viewport.frame !== 'function') failures.push('Viewport Port missing');
  if (renderer && (typeof renderer.compile !== 'function' || typeof renderer.submit !== 'function')) failures.push('Renderer Port contract invalid');
  if (core && viewport && core === viewport) failures.push('viewport cannot be application-state authority');
  if (core && renderer && core === renderer) failures.push('renderer cannot be application-state authority');
  return deepFreeze({ schema:1, passed:failures.length === 0, failures });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
