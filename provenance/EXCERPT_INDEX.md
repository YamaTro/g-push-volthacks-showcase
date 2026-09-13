# Excerpt index

No private absolute filesystem paths are recorded here.

| Public file | Original logical component | Demonstrates | Sanitization | Semantic changes |
| --- | --- | --- | --- | --- |
| `src-excerpts/contracts/task.ts` | Shared task domain | Work Unit, lease, and result contracts | None of the shown types; private transport omitted by selection | None |
| `src-excerpts/capability-matching/runtime.ts` | Shared runtime domain | Platform/device normalization and runtime state | None; no device records included | None |
| `src-excerpts/capability-matching/eligibility.ts` | Runtime eligibility | Battery, charging, lock, and power checks | None; no service wiring included | None |
| `src-excerpts/contracts/project-package.ts` | Project package contract | Bounded package/task structure | None; no private packages copied | None |
| `src-excerpts/workload-adapters/pi-exact.ts` | Exact science adapter | Typed exact-pi payload parsing | None; reference data and infrastructure excluded | None |
| `src-excerpts/workload-adapters/prime.ts` | Science adapter | Bounded prime/pi payload contracts | None; no runtime credentials or endpoints | None |
| `src-excerpts/workload-adapters/cannon.ts` | Bounded calculation adapter | Fixed payload and result validation | None; no transport or deployment data | None |
| `src-excerpts/workload-adapters/orbital3d-schemas.ts` | Orbital3D schema layer | Versioned scenario/result shapes | None; no production orchestration | None |
| `src-excerpts/mobile/device-profile.ts` | Mobile device capability | Android/browser capability collection | None; no real device identifiers | None |
| `src-excerpts/mobile/task-ordinal.ts` | Mobile Work Unit display helper | Stable Work Unit ordering across adapters | None; no account data | None |

