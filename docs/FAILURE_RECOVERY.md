# Failure recovery

The recovery model is intentionally conservative:

```text
leased
  ├─ heartbeat / renewal → leased (new bounded expiry)
  ├─ explicit release     → queued
  └─ expiry / loss        → queued and eligible for reassignment
```

An already completed Work Unit remains completed. A late result from an old
lease, a result owned by another contributor, or a duplicate result must not
replace the accepted record. This preserves progress even when execution is
repeated after a device disconnects.

The public repository does not include private transport or administrative
endpoints; it documents the state contract and publishes only the safe shared
types and eligibility code.

