export interface PiExactTaskPayload {
  kind: "pi-chudnovsky-range";
  startTerm: number;
  termCount: number;
  batch: number;
  decimalDigits: number;
  totalTerms: number;
}

export interface PiExactTaskSummary {
  kind: "pi-chudnovsky-range";
  startTerm: number;
  termCount: number;
  batch: number;
  decimalDigits: number;
  totalTerms: number;
  p: string;
  q: string;
  t: string;
  engine?: "js" | "wasm";
}

export interface PiExactTaskExecutionResult {
  summary: PiExactTaskSummary;
  durationSec: number;
  outputDigest: string;
  executionKind: "js" | "wasm";
}

interface PiExactExecutionOptions {
  shouldContinue?: () => boolean;
  waitIfSuspended?: () => Promise<void>;
  onProgress?: (progress: number) => void;
  yieldBetweenChunks?: boolean | (() => boolean);
}

interface PiExactWasmExports {
  memory: WebAssembly.Memory;
  get_contract_version?: () => number;
  reset_output: () => void;
  process_pi_chudnovsky_range: (startTerm: number, termCount: number) => void;
  get_output_ptr: () => number;
  get_output_len: () => number;
}

const CHUDNOVSKY_A = 13_591_409n;
const CHUDNOVSKY_B = 545_140_134n;
const CHUDNOVSKY_C3_OVER_24 = 10_939_058_860_032_000n;
const CHUDNOVSKY_MULTIPLIER = 426_880n;

function readJson<T>(payloadRef: string): Partial<T> | null {
  try {
    return JSON.parse(payloadRef) as Partial<T>;
  } catch {
    return null;
  }
}

function continueOrThrow(options?: Pick<PiExactExecutionOptions, "shouldContinue">) {
  if (options?.shouldContinue && !options.shouldContinue()) {
    throw new Error("Task cancelled");
  }
}

async function waitIfSuspended(options?: Pick<PiExactExecutionOptions, "waitIfSuspended">) {
  if (options?.waitIfSuspended) {
    await options.waitIfSuspended();
  }
}

function getPiExactWasmExports(instance: WebAssembly.Instance): PiExactWasmExports {
  const runtime = instance.exports as Partial<PiExactWasmExports>;
  if (
    !(runtime.memory instanceof WebAssembly.Memory) ||
    typeof runtime.reset_output !== "function" ||
    typeof runtime.process_pi_chudnovsky_range !== "function" ||
    typeof runtime.get_output_ptr !== "function" ||
    typeof runtime.get_output_len !== "function"
  ) {
    throw new Error("Pi exact WASM exports are incomplete.");
  }

  if (runtime.get_contract_version && runtime.get_contract_version() !== 1) {
    throw new Error("Pi exact WASM contract version is not supported.");
  }

  return runtime as PiExactWasmExports;
}

function bigintAbs(value: bigint) {
  return value < 0n ? -value : value;
}

function bigintSqrt(value: bigint) {
  if (value < 0n) {
    throw new Error("Square root is undefined for negative numbers.");
  }

  if (value < 2n) {
    return value;
  }

  let current = value;
  let next = (current + value / current) >> 1n;
  while (next < current) {
    current = next;
    next = (current + value / current) >> 1n;
  }

  return current;
}

export function createPiExactTaskPayload(payload: PiExactTaskPayload) {
  return JSON.stringify(payload);
}

export function parsePiExactTaskPayload(payloadRef: string): PiExactTaskPayload | null {
  if (!payloadRef) {
    return null;
  }

  const parsed = readJson<PiExactTaskPayload>(payloadRef);
  if (
    parsed?.kind === "pi-chudnovsky-range" &&
    typeof parsed.startTerm === "number" &&
    typeof parsed.termCount === "number" &&
    typeof parsed.batch === "number" &&
    typeof parsed.decimalDigits === "number" &&
    typeof parsed.totalTerms === "number"
  ) {
    return {
      kind: "pi-chudnovsky-range",
      startTerm: parsed.startTerm,
      termCount: parsed.termCount,
      batch: parsed.batch,
      decimalDigits: parsed.decimalDigits,
      totalTerms: parsed.totalTerms
    };
  }

  return null;
}

export function parsePiExactTaskSummary(outputDigest: string): PiExactTaskSummary | null {
  const parsed = readJson<PiExactTaskSummary>(outputDigest);
  if (
    parsed?.kind === "pi-chudnovsky-range" &&
    typeof parsed.startTerm === "number" &&
    typeof parsed.termCount === "number" &&
    typeof parsed.batch === "number" &&
    typeof parsed.decimalDigits === "number" &&
    typeof parsed.totalTerms === "number" &&
    typeof parsed.p === "string" &&
    typeof parsed.q === "string" &&
    typeof parsed.t === "string"
  ) {
    return {
      kind: "pi-chudnovsky-range",
      startTerm: parsed.startTerm,
      termCount: parsed.termCount,
      batch: parsed.batch,
      decimalDigits: parsed.decimalDigits,
      totalTerms: parsed.totalTerms,
      p: parsed.p,
      q: parsed.q,
      t: parsed.t,
      engine: parsed.engine === "js" ? "js" : parsed.engine === "wasm" ? "wasm" : undefined
    };
  }

  return null;
}

export async function executePiExactTaskWithWasm(
  payload: PiExactTaskPayload,
  wasmBytes: Uint8Array<ArrayBufferLike>,
  options?: PiExactExecutionOptions
): Promise<PiExactTaskExecutionResult> {
  const startTime = Date.now();
  continueOrThrow(options);
  await waitIfSuspended(options);
  options?.onProgress?.(0);

  const instantiated = (await WebAssembly.instantiate(wasmBytes)) as
    | WebAssembly.Instance
    | WebAssembly.WebAssemblyInstantiatedSource;
  const instance = "instance" in instantiated ? instantiated.instance : instantiated;
  const runtime = getPiExactWasmExports(instance);
  runtime.reset_output();
  runtime.process_pi_chudnovsky_range(payload.startTerm, payload.termCount);

  const outputPtr = Math.max(0, runtime.get_output_ptr());
  const outputLength = Math.max(0, runtime.get_output_len());
  const outputBytes = new Uint8Array(runtime.memory.buffer, outputPtr, outputLength);
  const rawOutput = new TextDecoder("utf8").decode(outputBytes);
  const partial = JSON.parse(rawOutput) as { p?: string; q?: string; t?: string };

  if (typeof partial.p !== "string" || typeof partial.q !== "string" || typeof partial.t !== "string") {
    throw new Error("Pi exact WASM returned an invalid partial result.");
  }

  options?.onProgress?.(1);

  const summary: PiExactTaskSummary = {
    kind: "pi-chudnovsky-range",
    startTerm: payload.startTerm,
    termCount: payload.termCount,
    batch: payload.batch,
    decimalDigits: payload.decimalDigits,
    totalTerms: payload.totalTerms,
    p: partial.p,
    q: partial.q,
    t: partial.t,
    engine: "wasm"
  };

  return {
    summary,
    durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    outputDigest: JSON.stringify(summary),
    executionKind: "wasm"
  };
}

export function combinePiExactTaskSummaries(summaries: PiExactTaskSummary[]) {
  const ordered = [...summaries].sort((left, right) => left.startTerm - right.startTerm);
  if (ordered.length === 0) {
    throw new Error("No Pi exact summaries were provided.");
  }

  let combinedP = 1n;
  let combinedQ = 1n;
  let combinedT = 0n;

  for (const summary of ordered) {
    const partP = BigInt(summary.p);
    const partQ = BigInt(summary.q);
    const partT = BigInt(summary.t);

    const nextP = combinedP * partP;
    const nextQ = combinedQ * partQ;
    const nextT = combinedT * partQ + combinedP * partT;

    combinedP = nextP;
    combinedQ = nextQ;
    combinedT = nextT;
  }

  return {
    kind: "pi-chudnovsky-range" as const,
    startTerm: ordered[0]?.startTerm ?? 0,
    termCount: ordered.reduce((sum, summary) => sum + summary.termCount, 0),
    batch: ordered[0]?.batch ?? 0,
    decimalDigits: ordered[0]?.decimalDigits ?? 0,
    totalTerms: ordered[0]?.totalTerms ?? 0,
    p: combinedP.toString(),
    q: combinedQ.toString(),
    t: combinedT.toString(),
    engine: "wasm" as const
  };
}

export function piChudnovskySummaryToDecimalString(summary: Pick<PiExactTaskSummary, "q" | "t" | "decimalDigits">, guardDigits = 20) {
  const safeDigits = Math.max(1, Math.floor(summary.decimalDigits));
  const precision = safeDigits + Math.max(8, Math.floor(guardDigits));
  const sqrtScale = 10n ** BigInt(precision * 2);
  const sqrtTerm = bigintSqrt(10005n * sqrtScale);
  const q = BigInt(summary.q);
  const t = bigintAbs(BigInt(summary.t));
  const scaledPi = (CHUDNOVSKY_MULTIPLIER * sqrtTerm * q) / t;
  const digits = scaledPi.toString().padStart(precision + 1, "0");
  const integerPart = digits.slice(0, 1);
  const fractionalPart = digits.slice(1, 1 + safeDigits).padEnd(safeDigits, "0");
  return `${integerPart}.${fractionalPart}`;
}

export function formatPiExactDeliverable(summary: PiExactTaskSummary) {
  const piValue = piChudnovskySummaryToDecimalString(summary);
  const decimalDigitsOnly = piValue.split(".")[1] ?? "";
  return {
    piValue,
    decimalDigitsOnly
  };
}
