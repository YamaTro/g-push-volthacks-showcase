# Result verification

Every submission is tied to a Work Unit and Project identity, the lease that
authorized execution, the contributor/device identity, and an output digest.
The acceptance boundary is deliberately narrower than the execution boundary:

- an empty or malformed payload is rejected;
- a task that is no longer in a completable state is rejected unless an
  already-accepted result is being re-read;
- a lease belonging to another contributor cannot be completed;
- duplicate acceptance does not award progress twice;
- only accepted results contribute to the visible Project state.

These rules are represented by the real task/result contracts and the bounded
workload parsers in `src-excerpts/`.

