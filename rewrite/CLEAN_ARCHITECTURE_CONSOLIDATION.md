# 3D Lite Clean Rewrite — Architecture Consolidation

This document defines the clean-rewrite authority boundary after legacy removal.

## Authoritative runtime

The `rewrite/` tree is the new 3D Lite application architecture. Historical files outside `rewrite/` are reference material, regression evidence, or renderer implementation sources; they are not application-state authorities for the clean rewrite.

## Ownership

- `ThreeDLiteMainCore` is the sole authority for mutable application state.
- `GeometryStore` owns editable authoring geometry.
- `SceneGraph` owns scene hierarchy.
- `MaterialStore` and `AssetStore` own materials and assets.
- `CommandStack` owns undo/redo command history.
- `DerivedGeometryEvaluator` owns derived/evaluated geometry caches.
- `ViewportPort` owns editor view/tool state only.
- `UIController` owns ephemeral UI/panel/tool intent state only.
- `RenderScenePort` compiles immutable render-scene descriptors.
- `LitePixRendererPort` owns renderer-local state and consumes render descriptors.
- `ProjectSerializer` owns stable persistence conversion, not runtime state.
- `DiagnosticsRegistry` and `RecoveryManager` validate and recover authoritative state.

## Explicitly removed from the clean runtime

The clean rewrite must not depend on historical application globals (`window.scene`, `window.objects`, `window.camera`), the previous Main Core v1 compatibility surface, historical MaxPix ownership, migration bridges, or a global `ThreeDLiteRewrite` application-state object.

The old monolithic editor/build files remain preserved as historical evidence and recovery references. They are not imported by the clean runtime.

## LitePix boundary

LitePix remains the renderer inside 3D Lite. Existing LitePix production algorithms may be reused behind the renderer adapter, but only `litepix-renderer-port.mjs` may access existing LitePix browser runtime globals. Application code consumes the renderer through the clean port contract.

## Consolidation rule

No compatibility layer becomes permanent architecture. If a temporary adapter is required during development, it must terminate at a named port, must not own authoring state, and must be removable without changing Main Core ownership.

## L3N readiness

The clean rewrite is ready for full L3N passes only while the legacy-isolation gate, architecture contract, syntax checks, subsystem smoke tests, startup/recovery gates, and renderer boundary gates all pass.
