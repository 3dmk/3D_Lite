# 3DLite Master AI Handoff

## Product
3DLite is an evolving 3D editor/rendering application. The project includes browser/editor code, a Tauri desktop shell/installer path, Main Core architecture work, and the LitePix renderer direction.

## Architectural direction
The target foundation is ONE authoritative **3DLite Main Core**: a data-centric modular application kernel. Mutable application state has one owner. UI, tool controllers, viewport and LitePix sit outside/at stable boundaries.

Main Core domains should include core data, geometry, scene, selection, materials/assets/modifiers, commands/transactions/deltas/undo, dependency/evaluation/dirty generations/cache/derived data, tasks/jobs/workers, resources, interfaces/ports, validation/diagnostics/recovery/telemetry/versioning.

Preferred patterns where appropriate: Data-Centric Agnostic Modular Pipeline (DCAMP), modular monolith/application kernel, Ports & Adapters, ECS + scene graph, half-edge editable geometry, data-oriented derived/render data, Command + Transaction + Delta/Undo, dependency/evaluation graph, dirty flags/generation counters, task graph/job workers, generational resource handles, typed events, render graph, versioned serialization/migrations, validation/recovery/telemetry.

Language direction is design guidance, not a claim about every current file: TypeScript 6 for application/UI orchestration where appropriate; Rust for shared performance/core modules and WASM browser builds; WGSL/WebGPU for GPU work; optional C++23/Qt native shell; Python for L3N/studio automation. Verify current implementation before migration.

## LitePix
LitePix is the renderer subsystem combining responsibilities historically discussed as LiteTrace/MaxPix. Rendering responsibilities include ray/path tracing, acceleration/BVH/SAH, traversal, visibility/occlusion, lighting/GI and related rendering work. Do not assume uninspected internals. Inspect actual source first.

Previously planned/implemented LitePix concepts include SurfaceInteraction, ShadingFrame, MaterialData, TextureData/TextureSampler, BSDF interfaces, lighting/visibility/MIS, LightData/LightSampler, traceAny, DirectLightIntegrator, PathState, iterative PathIntegrator, unified AOV/Film, adaptive sampling, denoiser architecture and telemetry. Verify what is actually present in the current repository.

## State ownership rules
- Main Core is sole authority for mutable application state.
- One owner per mutable state.
- No raw UI mesh edits.
- Renderer does not own editable scene data.
- Viewport is not source of truth.
- Mutations flow through commands/transactions.
- Authoring data is separate from derived/render data.
- Strict dependency direction.
- Async results are generation-stamped.
- Validate at boundaries.
- Startup dependency order is explicit.
- L3N is an external evolution/improvement layer, not hidden production-runtime authority.

## Gen3 / Len3 / L3N
Generation passes are cumulative. Gen1 starts from the previous verified Gen3 baseline. Gen2 analyzes/tests/corrects Gen1 using prior lessons. Gen3 combines Gen1+Gen2+historical lessons into a cleaner implementation and replaces obsolete logic rather than layering patches.

One Len3 = four consecutive Gen3 passes, each using the previous result. A complete L3N = 20 Len3 iterations = 80 Gen3 passes. The method improves the whole software while preserving UI/features/controls/workflows/intended outputs unless fixing confirmed bugs.

Historical lessons are part of the baseline: successful patterns, failed patterns, repairs, obsolete approaches, subsystem ownership, conventions, risky areas, dependencies, minimum implementation scope, regression checks and release gates.

## Version/baseline handling
Never assume this handoff's v4.46.0 label is the latest repository state. At handoff creation time, GitHub `main` already contained later development (visible repository history included v4.49.5 work). Inspect `main` and recent commits first. Preserve newer verified work.

Historical protected/recovery baselines mentioned during development include the original uploaded recovery master, browser-confirmed Gen3 baselines, and later versioned builds. Treat a baseline as protected only after confirming it exists and matches the claimed state in repository/history.

## Working procedure
For each requested update: inspect -> map ownership/dependencies -> reproduce/measure when applicable -> implement on a versioned branch/copy -> syntax/static checks -> startup gate -> functional checks -> regression checks -> browser/runtime validation -> commit -> report.

Never promote a build because code merely parses. Browser/runtime confirmation is required for runtime-sensitive changes.

## Transfer principle
The GitHub repository is the transfer medium because some AI environments cannot access ZIP binary contents. A receiving AI should use repository-native search/read tools and Git history rather than asking for thousands of files pasted into a prompt.
