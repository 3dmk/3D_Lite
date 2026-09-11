# 3D Lite Master Development Execution Matrix

This matrix turns the 70-section master development specification into one automatic development sequence. It is an execution contract, not permission to add architecture. The governing order is **understand → remove → merge → simplify → reuse → correct → improve → optimize → add**.

| # | Requirement | Automatic execution mechanism |
|---:|---|---|
| 1 | Mission | Optimize useful capability per unit of complexity; gate additions. |
| 2 | Preserve 3D Lite | Browser regression gate protects UI/viewport/render behavior. |
| 3 | Old code is evidence | Structural scanner inventories current code; migration replaces implementation without treating it as authority. |
| 4 | Architectural foundation | DCAMP is declared by Main Core v2 and kept minimal. |
| 5 | One Main Core | `ThreeDLiteMainCore` is the sole application-kernel migration target. |
| 6 | Lean architecture gate | New responsibilities first check reuse/merge/direct implementation. |
| 7 | Avoid architecture inflation | No manager/service/controller hierarchy was introduced. |
| 8 | Single ownership | Generation domains and command boundary establish explicit ownership targets. |
| 9 | Canonical data | Domain adapters expose only necessary scene/object/selection/render views during migration. |
| 10 | Authoring vs derived | `derive()` uses generation-stamped disposable derived values. |
| 11 | Minimize data duplication | Adapters reference existing authoritative data instead of copying it. |
| 12 | Controlled mutation | `executeCommand()` → transaction → validation → dirty generations. |
| 13 | Undo / Redo | Command packets support compact undo/redo operations. |
| 14 | Geometry | Geometry representation remains unchanged until verified requirements justify replacement. |
| 15 | Modeling principle | Future geometry commands must perform minimum topology change and pass topology validation. |
| 16 | Scene | Scene remains legacy-backed during migration; no speculative ECS replacement. |
| 17 | Dependency evaluation | Generation counters drive incremental derived-data recomputation. |
| 18 | Incremental first | Dirty domains and generation checks skip unchanged work. |
| 19 | Task / Job execution | Existing renderer/job systems are reused; no second scheduler added. |
| 20 | Resource management | Small generational-handle resource primitive added without a large manager. |
| 21 | Ports & adapters | Domain adapters and render-scene view form replaceable boundaries. |
| 22 | LitePix | LitePix remains separately inspected/verified; Main Core does not claim editable-state ownership for it. |
| 23 | LitePix integration | Render boundary records Main Core generations while LitePix remains renderer authority. |
| 24 | Language strategy | Current implementation remains verified JavaScript; TS/Rust/WASM/WGSL are target options only when evidence justifies them. |
| 25 | Language selection | No new production language boundary is introduced in this migration stage. |
| 26 | Structural sheet | Generated automatically from `index.html`, Main Core and LitePix source. |
| 27 | Structural depth | Scanner indexes verified declarations with source file/line; deeper analysis is added only where useful. |
| 28 | Compiler/hardware depth | Reserved for measured performance-critical paths; not applied to ordinary UI code. |
| 29 | Important-node questions | Classification/reporting records ownership, necessity and migration decision evidence. |
| 30 | Function registry | Scanner produces a verified declaration registry for the current codebase. |
| 31 | Current-system classification | Core files and monolith are classified KEEP/IMPROVE/REWRITE/MOVE/SIMPLIFY. |
| 32 | Competitive study | Only triggered by a verified 3D Lite problem; not a feature shopping list. |
| 33 | Competitor research rule | External systems remain evidence, never requirements. |
| 34 | Study sheets | Created only for concrete problem areas selected by later L3N evidence. |
| 35 | New release research | New releases are ignored unless they solve a matching verified problem. |
| 36 | Open-source/research study | Used only when implementation evidence can improve a real requirement. |
| 37 | Technology radar | Any new technology is classified ADOPT/TRIAL/ASSESS/HOLD before use. |
| 38 | Research reduces complexity | Research candidates must reduce work, memory, code, coupling or defects. |
| 39 | Performance philosophy | Algorithm/work elimination precedes hardware escalation. |
| 40 | Lean performance score | Promotion weighs correctness, memory, complexity, coupling and startup reliability, not speed alone. |
| 41 | L3N | Existing L3N release gate remains the promotion authority. |
| 42 | Gen3/Len3/L3N | Improvement candidates may promote/reject/leave unchanged; no forced edits. |
| 43 | L3N knowledge | Known startup/render failure rules remain release requirements. |
| 44 | Research → L3N | Research creates candidates only; gates decide promotion. |
| 45 | Release gate | Duplicate IDs, malformed script tags, extra animation loop, browser errors and renderer regressions block promotion. |
| 46 | Startup rule | Current explicit dependency order is protected; Main Core extension loads after Main Core v1 and before runtime use. |
| 47 | Validation | Command validators and release-boundary validation protect state. |
| 48 | Recovery | Transactions rollback via packet undo on failure. |
| 49 | Serialization | `projectEnvelope()` provides versioned schema metadata without serializing transient caches. |
| 50 | Events | Small direct event primitive is used only for decoupled notifications. |
| 51 | Viewport | Browser gate verifies viewport remains presentation/interaction and still exists. |
| 52 | UI | Migration does not move geometry algorithms into UI. |
| 53 | Tool lifecycle | `beginTool()` supports begin/update/preview/commit/cancel. |
| 54 | Target Weld example | Target Weld migration must use the tool/command/transaction pattern when that feature is moved. |
| 55 | Main Core public surface | Core exposes a compact surface: transactions, commands, adapters, derivation, resources, tools, project envelope and render view. |
| 56 | Architecture quality test | Replaceability, ownership, regeneration and rollback are exercised by the browser gate. |
| 57 | Code quality | Small direct implementation is preferred over framework expansion. |
| 58 | No premature generalization | Registries exist only where current migration requires replaceability or reuse. |
| 59 | No premature GPU migration | No Main Core work was moved to GPU without benchmark evidence. |
| 60 | No premature caching | Only generation-stamped derived values are cached; invalidation is explicit. |
| 61 | No premature parallelism | Existing jobs/workers are retained; no new Main Core parallel scheduler. |
| 62 | No premature features | This sequence changes architecture/ownership, not product scope. |
| 63 | Post-LitePix rebuild | Current 3D Lite + actual LitePix + known-good behavior feed structural extraction, classification and progressive Main Core migration. |
| 64 | Classification before rewrite | Scanner/report performs classification before later code ownership moves. |
| 65 | Improvement order | Delete/merge/simplify/reuse/correct precedes new subsystem creation. |
| 66 | Optimization equation | Promotion requires net useful value after complexity/memory/failure cost. |
| 67 | Ultimate development question | Every migration asks for the cheapest correct representation. |
| 68 | Ultimate research question | Research is problem-first and complexity-aware. |
| 69 | Ultimate architecture | Main Core v2 establishes lean DCAMP foundations while keeping LitePix behind a clean boundary. |
| 70 | Final rule | The automatic sequence must make 3D Lite smaller/clearer/faster or leave it unchanged; it must not grow architecture for its own sake. |

## Automatic sequence

1. Protect current `main` with a safety branch.
2. Extract actual structure and verified declarations.
3. Classify responsibilities before moving them.
4. Extend the single Main Core only with capabilities required for migration.
5. Preserve legacy behavior through adapters while ownership is moved in verified increments.
6. Route new/migrated mutations through commands/transactions/validation/undo.
7. Derive disposable data from generation-stamped authoritative state.
8. Keep LitePix separate and attach only a stable render-scene boundary/generation stamp.
9. Run browser architecture, viewport and real Path-render regression tests.
10. Run L3N release gate.
11. Promote only when all gates pass; otherwise retain the previous main unchanged.
