# 3D_Lite

Current GitHub Pages development build: **v3.99.14 — Sparse 1K–4K Ray Budget Renderer**

The visible editor version is owned by `ThreeDLiteVersion.version`.

Current render defaults:
- Primary GI: Irradiance
- Secondary GI: Light Cache
- Global sparse camera/radiance budget: 1,000–4,000 rays
- Denoise: Quality (default)
- Path Guiding: enabled by default

Sparse adaptive reconstruction v3.99.14:
- first lighting estimate uses about 1K sparse radiance probes across the frame
- later refinement phases spend additional rays only until the 4K global camera/radiance-probe ceiling is reached
- deterministic interleaved grid phases prevent repeatedly sampling the same pixels
- sparse samples are reconstructed to full resolution with neighborhood interpolation instead of leaving unsampled pixels black
- live framebuffer preview uses the reconstructed image during active passes
- Irradiance + Light Cache, visibility reuse, path guiding and Quality denoise remain the quality-recovery layers
- telemetry reports rayBudgetMin, rayBudgetMax, rayBudgetUsed and rayBudgetRemaining

Important budget definition:
- v3.99.14 strictly caps the sparse **camera/radiance-probe launches** at 4,000
- secondary/shadow/cache rays produced inside an individual path are still accounted separately by renderer telemetry; a later hard-total-ray governor can clamp those internal rays too

Live render preview:
- preview begins during the first pass
- active batches refresh the framebuffer instead of waiting on a black image
- the last valid framebuffer remains visible if rendering is cancelled or errors

Guided denoiser:
- Beauty + Albedo + Normal + Depth guidance
- edge-aware Quality filtering for low-sample renders
- Quality remains the default denoise mode

Deployment validation blocks publication if renderer, preview, sparse-budget, denoiser or JavaScript syntax gates fail.
