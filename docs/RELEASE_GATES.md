# 3DLite Release Gates

Before promotion:
- JavaScript syntax passes
- no duplicate DOM IDs
- no duplicate top-level lexical declarations
- external script tags contain no inline body code
- exactly one final `boot3DLite()` call
- exactly one animation-loop owner
- final bootstrap occurs after subsystem declarations
- viewport dependencies are available
- editor boots and viewport renders in a real browser
- core modeling workflows pass runtime regression checks

A black viewport, initialization ReferenceError, non-responsive UI, missing dependency,
or duplicate animation loop is release-blocking.
