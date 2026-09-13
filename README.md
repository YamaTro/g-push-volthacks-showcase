# G-push — VoltHacks Technical Showcase

G-push is crowdfunding for computing power.

This repository contains selected, sanitized source excerpts and technical
evidence for VoltHacks review. It is intentionally **not** the complete
Production repository. Credentials, private infrastructure, deployment
configuration, signing and attestation material, security-sensitive internals,
and private evidence are excluded.

## The idea

Crowdfunding normally combines money from many supporters. G-push explores
combining spare **computing power** instead: a Project is divided into bounded
Work Units, compatible contributor devices execute those units, and results are
verified before accepted progress and contribution are recorded.

## How it works

```text
Project
  → Work Units
  → capability matching
  → lease / heartbeat execution
  → result verification
  → accepted progress
  → Contribution Score
```

The shared contracts in `src-excerpts/` show the typed boundaries used by the
implementation. The excerpts are copied from the private implementation and
retain the semantics of the shown algorithms; private configuration and
transport wiring are intentionally omitted.

## Technical architecture

- **Contracts** — projects, tasks, leases, results, and runtime state are
  represented as explicit types.
- **Capability matching** — execution mode and device state are checked before
  work is offered to a contributor.
- **Bounded adapters** — rendering, exact/science workloads, and parameter
  sweeps have fixed payload shapes and validation boundaries.
- **Acceptance** — a result is associated with its Work Unit and lease before
  it can affect progress or contribution accounting.

## Failure recovery

When a worker disappears, its lease can expire and unfinished work becomes
eligible for reassignment. A result from an old or superseded lease must not
overwrite an accepted result. See `docs/FAILURE_RECOVERY.md` for the concise
state model.

## Result verification

The product keeps the Work Unit identity, Project identity, lease ownership,
and output digest together. Verification and acceptance are separate from
execution: rejected, duplicate, late, or incomplete results do not count as
accepted progress.

## Workload adapters

- **Blender rendering** runs on compatible Windows Workers. The included image
  is historical private-scope evidence; it is not a public worker network.
- **Science compute** uses allowlisted, bounded workloads such as exact
  arithmetic and Monte Carlo-style calculations.
- **Parameter sweep** turns a fixed experiment grid into Work Units and
  assembles verified cells into an aggregate result.

Android is used for supported bounded science workloads; Android does **not**
run Blender. Arbitrary uploaded WASM, EXE, or shell code is not supported.

## Contribution

Contribution Score records accepted compute contribution. It is not money,
cryptocurrency, or a transferable balance. GP is a separate internal compute
utility concept; this showcase does not claim public GP activation, purchase,
cash-out, or peer-to-peer transfer.

## Evidence

All images below are reviewed copies of existing product evidence. Captions
preserve whether an image is a fixture, a candidate, or historical private
evidence.

| Evidence | Scope |
| --- | --- |
| `evidence/project-dashboard.png` | Product Detail development fixture |
| `evidence/worker-status.png` | Worker/status development fixture |
| `evidence/historical-worker.png` | Historical private hardware evidence |
| `evidence/contributor-result.png` | Contributor result development fixture |
| `evidence/parameter-sweep.png` | Parameter Sweep visual QA fixture |
| `evidence/gp-wallet.png` | GP Wallet UI candidate with sample data |

## Current scope

This is a technical showcase, not a public service. The current material mixes
recorded private hardware proof, local/disposable validation, and development
fixtures; each item is labelled accordingly. Public project submission, a
public worker network, public downloads, and Production proof are not claimed.

## Repository scope

This is a fresh, sanitized repository with one clean public history. It is not
a mirror, fork, or runnable Production clone of G-push. See
`REVIEW_NOTICE.md`, `docs/SECURITY_BOUNDARIES.md`, and
`provenance/EXCERPT_INDEX.md` before reading the excerpts.

