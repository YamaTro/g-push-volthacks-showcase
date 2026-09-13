# Technical architecture

G-push is organized around a small set of explicit contracts:

1. A Project describes purpose, supported execution modes, and a bounded
   workload family.
2. A Project is divided into Work Units. Each Work Unit carries a stable task
   identity and a payload reference.
3. A contributor advertises a capability profile and runtime state. Eligibility
   is evaluated before a Work Unit is offered.
4. A lease gives one contributor a bounded execution window. Heartbeat/renewal
   keeps an active lease alive; expiry makes unfinished work eligible for
   recovery.
5. A submitted result is checked against the Work Unit, Project, lease, and
   output digest before acceptance.
6. Only accepted work updates visible progress and contribution records.

The public source excerpts show the contract and validation layers without
publishing private API authentication, deployment configuration, or database
topology.

