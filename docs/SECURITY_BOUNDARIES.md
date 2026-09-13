# Security boundaries

The public story is intentionally high level:

- adapters are fixed and allowlisted;
- execution is bounded and capability-checked;
- leases and heartbeats limit ownership of a Work Unit;
- output digests and verification separate execution from acceptance;
- failures are fail-closed at the acceptance boundary;
- arbitrary uploaded EXE, shell, or unrestricted WASM execution is not
  supported.

This repository omits private authentication, privileged administration,
signing/attestation internals, Production topology, raw backups, credentials,
and implementation details whose main value would be helping an attacker target
the private system. The excerpts are not a complete security specification.

