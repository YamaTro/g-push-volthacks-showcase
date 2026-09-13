# Workload adapters

Adapters make workload boundaries explicit rather than accepting arbitrary
code.

## Rendering

The render contract fixes frame/sample ranges, output mode, lossless format,
and project-level asset rules. Blender rendering is for compatible Windows
Workers; it is not an Android workload.

## Science

The exact-pi, prime, and bounded calculation excerpts define typed payloads and
parsers for deterministic science work. They are suitable for local or
disposable validation and are not a claim of a public Production service.

## Parameter sweeps

A parameter sweep is represented as a fixed grid of bounded Work Units. The
result is assembled from verified cells, making missing or invalid cells
visible instead of silently treating them as success.

