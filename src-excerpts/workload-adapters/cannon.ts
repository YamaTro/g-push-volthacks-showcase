export interface CannonTaskPayload {
  kind: "cannon-angle-search";
  angleStartCentideg: number;
  angleEndCentideg: number;
  angleStepCentideg: number;
  muzzleSpeedMps: number;
  targetDistanceM: number;
  targetRadiusM: number;
  launchHeightM: number;
  targetHeightM: number;
  gravityMps2: number;
  linearDamping: number;
  maxFlightSeconds: number;
  batch: number;
}

export interface CannonTaskSummary {
  kind: "cannon-angle-search";
  angleStartCentideg: number;
  angleEndCentideg: number;
  angleStepCentideg: number;
  batch: number;
  testedPatterns: number;
  bestAngleCentideg: number | null;
  bestAngleDegrees: number | null;
  bestMissDistanceM: number | null;
  bestTravelDistanceM: number | null;
  bestFlightTimeSeconds: number | null;
  directHit: boolean;
  engine?: "wasm";
}

export interface CannonTaskExecutionResult {
  summary: CannonTaskSummary;
  durationSec: number;
  outputDigest: string;
  executionKind: "wasm";
}

interface CannonTaskExecutionOptions {
  chunkSize?: number;
  shouldContinue?: () => boolean;
  waitIfSuspended?: () => Promise<void>;
  onProgress?: (progress: number) => void;
  yieldBetweenChunks?: boolean | (() => boolean);
}

interface CannonSearchWasmExports {
  get_contract_version?: () => number;
  reset_cannon_search: (
    targetDistanceM: number,
    targetHeightM: number,
    targetRadiusM: number,
    launchHeightM: number,
    muzzleSpeedMps: number,
    gravityMps2: number,
    linearDamping: number,
    maxFlightSeconds: number
  ) => void;
  process_cannon_angle_range: (
    angleStartCentideg: number,
    angleEndCentideg: number,
    angleStepCentideg: number
  ) => void;
  get_tested_patterns: () => number;
  has_best_solution: () => number;
  get_best_angle_centideg: () => number;
  get_best_miss_distance_mm: () => number;
  get_best_travel_distance_mm: () => number;
  get_best_flight_time_ms: () => number;
}

function readJson<T>(payloadRef: string): Partial<T> | null {
  try {
    return JSON.parse(payloadRef) as Partial<T>;
  } catch {
    return null;
  }
}

function continueOrThrow(options?: Pick<CannonTaskExecutionOptions, "shouldContinue">) {
  if (options?.shouldContinue && !options.shouldContinue()) {
    throw new Error("Task cancelled");
  }
}

async function waitIfSuspended(options?: Pick<CannonTaskExecutionOptions, "waitIfSuspended">) {
  if (options?.waitIfSuspended) {
    await options.waitIfSuspended();
  }
}

async function yieldBetweenChunksIfNeeded(options?: Pick<CannonTaskExecutionOptions, "yieldBetweenChunks">) {
  const shouldYield =
    typeof options?.yieldBetweenChunks === "function"
      ? options.yieldBetweenChunks()
      : options?.yieldBetweenChunks !== false;

  if (!shouldYield) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 0));
}

function getCannonWasmExports(instance: WebAssembly.Instance): CannonSearchWasmExports {
  const runtime = instance.exports as Partial<CannonSearchWasmExports>;
  if (
    typeof runtime.reset_cannon_search !== "function" ||
    typeof runtime.process_cannon_angle_range !== "function" ||
    typeof runtime.get_tested_patterns !== "function" ||
    typeof runtime.has_best_solution !== "function" ||
    typeof runtime.get_best_angle_centideg !== "function" ||
    typeof runtime.get_best_miss_distance_mm !== "function" ||
    typeof runtime.get_best_travel_distance_mm !== "function" ||
    typeof runtime.get_best_flight_time_ms !== "function"
  ) {
    throw new Error("WASM engine shape is invalid.");
  }

  if (runtime.get_contract_version && runtime.get_contract_version() !== 1) {
    throw new Error("WASM engine contract version is incompatible.");
  }

  return runtime as CannonSearchWasmExports;
}

export function createCannonTaskPayload(payload: CannonTaskPayload) {
  return JSON.stringify(payload);
}

export function parseCannonTaskPayload(payloadRef: string): CannonTaskPayload | null {
  if (!payloadRef) {
    return null;
  }

  const parsed = readJson<CannonTaskPayload>(payloadRef);
  if (
    parsed?.kind === "cannon-angle-search" &&
    typeof parsed.angleStartCentideg === "number" &&
    typeof parsed.angleEndCentideg === "number" &&
    typeof parsed.angleStepCentideg === "number" &&
    typeof parsed.muzzleSpeedMps === "number" &&
    typeof parsed.targetDistanceM === "number" &&
    typeof parsed.targetRadiusM === "number" &&
    typeof parsed.launchHeightM === "number" &&
    typeof parsed.targetHeightM === "number" &&
    typeof parsed.gravityMps2 === "number" &&
    typeof parsed.linearDamping === "number" &&
    typeof parsed.maxFlightSeconds === "number" &&
    typeof parsed.batch === "number"
  ) {
    return {
      kind: "cannon-angle-search",
      angleStartCentideg: parsed.angleStartCentideg,
      angleEndCentideg: parsed.angleEndCentideg,
      angleStepCentideg: parsed.angleStepCentideg,
      muzzleSpeedMps: parsed.muzzleSpeedMps,
      targetDistanceM: parsed.targetDistanceM,
      targetRadiusM: parsed.targetRadiusM,
      launchHeightM: parsed.launchHeightM,
      targetHeightM: parsed.targetHeightM,
      gravityMps2: parsed.gravityMps2,
      linearDamping: parsed.linearDamping,
      maxFlightSeconds: parsed.maxFlightSeconds,
      batch: parsed.batch
    };
  }

  return null;
}

export function parseCannonTaskSummary(outputDigest: string): CannonTaskSummary | null {
  const parsed = readJson<CannonTaskSummary>(outputDigest);
  if (
    parsed?.kind === "cannon-angle-search" &&
    typeof parsed.angleStartCentideg === "number" &&
    typeof parsed.angleEndCentideg === "number" &&
    typeof parsed.angleStepCentideg === "number" &&
    typeof parsed.batch === "number" &&
    typeof parsed.testedPatterns === "number" &&
    (typeof parsed.bestAngleCentideg === "number" || parsed.bestAngleCentideg === null) &&
    (typeof parsed.bestAngleDegrees === "number" || parsed.bestAngleDegrees === null) &&
    (typeof parsed.bestMissDistanceM === "number" || parsed.bestMissDistanceM === null) &&
    (typeof parsed.bestTravelDistanceM === "number" || parsed.bestTravelDistanceM === null) &&
    (typeof parsed.bestFlightTimeSeconds === "number" || parsed.bestFlightTimeSeconds === null) &&
    typeof parsed.directHit === "boolean"
  ) {
    return {
      kind: "cannon-angle-search",
      angleStartCentideg: parsed.angleStartCentideg,
      angleEndCentideg: parsed.angleEndCentideg,
      angleStepCentideg: parsed.angleStepCentideg,
      batch: parsed.batch,
      testedPatterns: parsed.testedPatterns,
      bestAngleCentideg: parsed.bestAngleCentideg ?? null,
      bestAngleDegrees: parsed.bestAngleDegrees ?? null,
      bestMissDistanceM: parsed.bestMissDistanceM ?? null,
      bestTravelDistanceM: parsed.bestTravelDistanceM ?? null,
      bestFlightTimeSeconds: parsed.bestFlightTimeSeconds ?? null,
      directHit: parsed.directHit,
      engine: parsed.engine === "wasm" ? "wasm" : undefined
    };
  }

  return null;
}

export async function executeCannonTaskWithWasm(
  payload: CannonTaskPayload,
  wasmBytes: Uint8Array<ArrayBufferLike>,
  options?: CannonTaskExecutionOptions
): Promise<CannonTaskExecutionResult> {
  const startTime = Date.now();
  continueOrThrow(options);
  await waitIfSuspended(options);

  const instantiated = (await WebAssembly.instantiate(wasmBytes)) as
    | WebAssembly.Instance
    | WebAssembly.WebAssemblyInstantiatedSource;
  const instance = "instance" in instantiated ? instantiated.instance : instantiated;
  const runtime = getCannonWasmExports(instance);

  runtime.reset_cannon_search(
    payload.targetDistanceM,
    payload.targetHeightM,
    payload.targetRadiusM,
    payload.launchHeightM,
    payload.muzzleSpeedMps,
    payload.gravityMps2,
    payload.linearDamping,
    payload.maxFlightSeconds
  );

  const totalPatterns =
    Math.max(0, payload.angleEndCentideg - payload.angleStartCentideg) / Math.max(1, payload.angleStepCentideg) + 1;
  const chunkPatterns = Math.max(1, Math.floor(options?.chunkSize ?? 5));
  const chunkCentideg = chunkPatterns * Math.max(1, payload.angleStepCentideg);

  for (
    let chunkStart = payload.angleStartCentideg;
    chunkStart <= payload.angleEndCentideg;
    chunkStart += chunkCentideg
  ) {
    continueOrThrow(options);
    await waitIfSuspended(options);

    const chunkEnd = Math.min(payload.angleEndCentideg, chunkStart + chunkCentideg - payload.angleStepCentideg);
    runtime.process_cannon_angle_range(chunkStart, chunkEnd, payload.angleStepCentideg);

    const processedPatterns =
      Math.floor((chunkEnd - payload.angleStartCentideg) / Math.max(1, payload.angleStepCentideg)) + 1;
    options?.onProgress?.(Math.min(1, processedPatterns / totalPatterns));
    await yieldBetweenChunksIfNeeded(options);
  }

  const hasBest = runtime.has_best_solution() === 1;
  const bestAngleCentideg = hasBest ? runtime.get_best_angle_centideg() : null;
  const bestMissDistanceMm = hasBest ? runtime.get_best_miss_distance_mm() : null;
  const bestTravelDistanceMm = hasBest ? runtime.get_best_travel_distance_mm() : null;
  const bestFlightTimeMs = hasBest ? runtime.get_best_flight_time_ms() : null;

  const summary: CannonTaskSummary = {
    kind: "cannon-angle-search",
    angleStartCentideg: payload.angleStartCentideg,
    angleEndCentideg: payload.angleEndCentideg,
    angleStepCentideg: payload.angleStepCentideg,
    batch: payload.batch,
    testedPatterns: runtime.get_tested_patterns(),
    bestAngleCentideg,
    bestAngleDegrees: bestAngleCentideg === null ? null : bestAngleCentideg / 100,
    bestMissDistanceM: bestMissDistanceMm === null ? null : Number((bestMissDistanceMm / 1000).toFixed(3)),
    bestTravelDistanceM: bestTravelDistanceMm === null ? null : Number((bestTravelDistanceMm / 1000).toFixed(3)),
    bestFlightTimeSeconds: bestFlightTimeMs === null ? null : Number((bestFlightTimeMs / 1000).toFixed(3)),
    directHit:
      bestMissDistanceMm !== null &&
      bestMissDistanceMm <= Math.round(Math.max(0, payload.targetRadiusM) * 1000),
    engine: "wasm"
  };

  return {
    summary,
    durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    outputDigest: JSON.stringify(summary),
    executionKind: "wasm"
  };
}
