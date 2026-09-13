# How it works

## Project to Work Units

Project packages define a workload family, execution modes, and a list of
bounded Work Units. Payload references contain the Work Unit-specific delta;
shared assets belong to the Project package rather than being duplicated into
every task.

## Capability matching

The runtime and eligibility excerpts normalize platform/device information,
clamp safety preferences, and return both `canRun` and human-readable reasons.
That keeps scheduling decisions explainable and prevents a device from being
offered work it cannot safely execute.

## Execution and acceptance

Leasing is time-bounded. A result carries the lease and task identities plus an
output digest. Verification happens before accepted progress or contribution
accounting; execution alone is never treated as success.

