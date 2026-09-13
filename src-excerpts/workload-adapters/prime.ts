export interface PrimeTaskPayload {
  kind: "prime-range";
  start: number;
  end: number;
  batch: number;
}

export interface PrimeTaskSummary {
  kind: "prime-range";
  start: number;
  end: number;
  primeCount: number;
  highestPrime: number | null;
  sampledPrimes: number[];
  engine?: "js" | "wasm";
}

export interface PrimeTaskExecutionResult {
  summary: PrimeTaskSummary;
  durationSec: number;
  outputDigest: string;
  executionKind: "js" | "wasm";
}

export interface PiTaskPayload {
  kind: "pi-bbp-hex-range";
  start: number;
  digits: number;
  batch: number;
  decimalDigits: number;
  totalHexDigits: number;
}

export interface PiTaskSummary {
  kind: "pi-bbp-hex-range";
  start: number;
  digits: number;
  batch: number;
  decimalDigits: number;
  totalHexDigits: number;
  hexDigits: string;
  engine?: "js" | "wasm";
}

export interface PiTaskExecutionResult {
  summary: PiTaskSummary;
  durationSec: number;
  outputDigest: string;
  executionKind: "js" | "wasm";
}

interface TaskExecutionOptions {
  chunkSize?: number;
  shouldContinue?: () => boolean;
  waitIfSuspended?: () => Promise<void>;
  onProgress?: (progress: number) => void;
  yieldBetweenChunks?: boolean | (() => boolean);
}

interface PrimeRangeWasmExports {
  memory: WebAssembly.Memory;
  get_contract_version?: () => number;
  reset_summary: (sampleLimit: number) => void;
  process_prime_range: (start: number, end: number) => void;
  get_prime_count: () => number;
  get_highest_prime: () => number;
  get_sample_count: () => number;
}

interface PiBbpWasmExports {
  memory: WebAssembly.Memory;
  get_contract_version?: () => number;
  reset_hex_buffer: () => void;
  process_pi_hex_range: (start: number, digits: number) => void;
  get_written_length: () => number;
}

const piHexAlphabet = "0123456789ABCDEF";
const piVerificationPrefix = "14159265358979323846264338327950288419716939937510";
const defaultPiGuardDigits = 32;

function isPrime(value: number) {
  if (value < 2) {
    return false;
  }

  if (value === 2) {
    return true;
  }

  if (value % 2 === 0) {
    return false;
  }

  const limit = Math.floor(Math.sqrt(value));
  for (let divisor = 3; divisor <= limit; divisor += 2) {
    if (value % divisor === 0) {
      return false;
    }
  }

  return true;
}

function readJson<T>(payloadRef: string): Partial<T> | null {
  try {
    return JSON.parse(payloadRef) as Partial<T>;
  } catch {
    return null;
  }
}

function continueOrThrow(options?: Pick<TaskExecutionOptions, "shouldContinue">) {
  if (options?.shouldContinue && !options.shouldContinue()) {
    throw new Error("Task cancelled");
  }
}

async function waitIfSuspended(options?: Pick<TaskExecutionOptions, "waitIfSuspended">) {
  if (options?.waitIfSuspended) {
    await options.waitIfSuspended();
  }
}

async function yieldBetweenChunksIfNeeded(options?: Pick<TaskExecutionOptions, "yieldBetweenChunks">) {
  const shouldYield =
    typeof options?.yieldBetweenChunks === "function"
      ? options.yieldBetweenChunks()
      : options?.yieldBetweenChunks !== false;

  if (!shouldYield) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 0));
}

function modPow16(exponent: number, modulus: number) {
  if (modulus === 1) {
    return 0;
  }

  let result = 1;
  let power = exponent;
  let base = 16 % modulus;

  while (power > 0) {
    if (power & 1) {
      result = (result * base) % modulus;
    }

    power = Math.floor(power / 2);
    if (power > 0) {
      base = (base * base) % modulus;
    }
  }

  return result;
}

function computeBbpSeries(j: number, digitIndex: number) {
  let sum = 0;

  for (let k = 0; k <= digitIndex; k += 1) {
    const denominator = 8 * k + j;
    sum += modPow16(digitIndex - k, denominator) / denominator;
    sum -= Math.floor(sum);
  }

  for (let k = digitIndex + 1; ; k += 1) {
    const denominator = 8 * k + j;
    const term = Math.pow(16, digitIndex - k) / denominator;
    if (term < 1e-17) {
      break;
    }
    sum += term;
    sum -= Math.floor(sum);
  }

  return sum;
}

function computePiHexDigit(digitIndex: number) {
  let sum =
    4 * computeBbpSeries(1, digitIndex) -
    2 * computeBbpSeries(4, digitIndex) -
    computeBbpSeries(5, digitIndex) -
    computeBbpSeries(6, digitIndex);

  sum -= Math.floor(sum);
  const digit = Math.floor((sum + 1e-12) * 16) & 0xf;
  return piHexAlphabet[digit];
}

function repeatString(value: string, count: number) {
  return Array.from({ length: count }, () => value).join("");
}

function getPrimeRangeWasmExports(instance: WebAssembly.Instance): PrimeRangeWasmExports {
  const runtime = instance.exports as Partial<PrimeRangeWasmExports>;
  if (
    !(runtime.memory instanceof WebAssembly.Memory) ||
    typeof runtime.reset_summary !== "function" ||
    typeof runtime.process_prime_range !== "function" ||
    typeof runtime.get_prime_count !== "function" ||
    typeof runtime.get_highest_prime !== "function" ||
    typeof runtime.get_sample_count !== "function"
  ) {
    throw new Error("WASM エンジンの形式が正しくありません。");
  }

  if (runtime.get_contract_version && runtime.get_contract_version() !== 1) {
    throw new Error("WASM エンジンのバージョンに互換性がありません。");
  }

  return runtime as PrimeRangeWasmExports;
}

function getPiBbpWasmExports(instance: WebAssembly.Instance): PiBbpWasmExports {
  const runtime = instance.exports as Partial<PiBbpWasmExports>;
  if (
    !(runtime.memory instanceof WebAssembly.Memory) ||
    typeof runtime.reset_hex_buffer !== "function" ||
    typeof runtime.process_pi_hex_range !== "function" ||
    typeof runtime.get_written_length !== "function"
  ) {
    throw new Error("WASM エンジンの形式が正しくありません。");
  }

  if (runtime.get_contract_version && runtime.get_contract_version() !== 1) {
    throw new Error("WASM エンジンのバージョンに互換性がありません。");
  }

  return runtime as PiBbpWasmExports;
}

export function createPrimeTaskPayload(payload: PrimeTaskPayload) {
  return JSON.stringify(payload);
}

export function createPiTaskPayload(payload: PiTaskPayload) {
  return JSON.stringify(payload);
}

export function parsePrimeTaskPayload(payloadRef: string): PrimeTaskPayload | null {
  if (!payloadRef) {
    return null;
  }

  const parsed = readJson<PrimeTaskPayload>(payloadRef);
  if (
    parsed?.kind === "prime-range" &&
    typeof parsed.start === "number" &&
    typeof parsed.end === "number" &&
    typeof parsed.batch === "number"
  ) {
    return {
      kind: "prime-range",
      start: parsed.start,
      end: parsed.end,
      batch: parsed.batch
    };
  }

  const legacy = payloadRef.match(/^prime-range:(\d+):(\d+):(\d+)$/);
  if (!legacy) {
    return null;
  }

  return {
    kind: "prime-range",
    start: Number(legacy[1]),
    end: Number(legacy[2]),
    batch: Number(legacy[3])
  };
}

export function parsePiTaskPayload(payloadRef: string): PiTaskPayload | null {
  if (!payloadRef) {
    return null;
  }

  const parsed = readJson<PiTaskPayload>(payloadRef);
  if (
    parsed?.kind === "pi-bbp-hex-range" &&
    typeof parsed.start === "number" &&
    typeof parsed.digits === "number" &&
    typeof parsed.batch === "number" &&
    typeof parsed.decimalDigits === "number" &&
    typeof parsed.totalHexDigits === "number"
  ) {
    return {
      kind: "pi-bbp-hex-range",
      start: parsed.start,
      digits: parsed.digits,
      batch: parsed.batch,
      decimalDigits: parsed.decimalDigits,
      totalHexDigits: parsed.totalHexDigits
    };
  }

  return null;
}

export function parsePrimeTaskSummary(outputDigest: string): PrimeTaskSummary | null {
  const parsed = readJson<PrimeTaskSummary>(outputDigest);
  if (
    parsed?.kind === "prime-range" &&
    typeof parsed.start === "number" &&
    typeof parsed.end === "number" &&
    typeof parsed.primeCount === "number" &&
    (typeof parsed.highestPrime === "number" || parsed.highestPrime === null) &&
    Array.isArray(parsed.sampledPrimes)
  ) {
    return {
      kind: "prime-range",
      start: parsed.start,
      end: parsed.end,
      primeCount: parsed.primeCount,
      highestPrime: parsed.highestPrime ?? null,
      sampledPrimes: parsed.sampledPrimes.filter((value): value is number => typeof value === "number"),
      engine: parsed.engine === "wasm" ? "wasm" : parsed.engine === "js" ? "js" : undefined
    };
  }

  return null;
}

export function parsePiTaskSummary(outputDigest: string): PiTaskSummary | null {
  const parsed = readJson<PiTaskSummary>(outputDigest);
  if (
    parsed?.kind === "pi-bbp-hex-range" &&
    typeof parsed.start === "number" &&
    typeof parsed.digits === "number" &&
    typeof parsed.batch === "number" &&
    typeof parsed.decimalDigits === "number" &&
    typeof parsed.totalHexDigits === "number" &&
    typeof parsed.hexDigits === "string"
  ) {
    return {
      kind: "pi-bbp-hex-range",
      start: parsed.start,
      digits: parsed.digits,
      batch: parsed.batch,
      decimalDigits: parsed.decimalDigits,
      totalHexDigits: parsed.totalHexDigits,
      hexDigits: parsed.hexDigits.toUpperCase(),
      engine: parsed.engine === "wasm" ? "wasm" : parsed.engine === "js" ? "js" : undefined
    };
  }

  return null;
}

export async function executePrimeTask(
  payload: PrimeTaskPayload,
  options?: TaskExecutionOptions
): Promise<PrimeTaskExecutionResult> {
  const startTime = Date.now();
  const chunkSize = options?.chunkSize ?? 4000;
  const checkpointSize = 250;
  const sampledPrimes: number[] = [];
  let primeCount = 0;
  let highestPrime: number | null = null;

  const total = Math.max(1, payload.end - payload.start + 1);

  for (let rangeStart = payload.start; rangeStart <= payload.end; rangeStart += chunkSize) {
    continueOrThrow(options);
    await waitIfSuspended(options);

    const rangeEnd = Math.min(payload.end, rangeStart + chunkSize - 1);

    for (let candidate = rangeStart; candidate <= rangeEnd; candidate += 1) {
      if ((candidate - rangeStart) % checkpointSize === 0) {
        continueOrThrow(options);
        await waitIfSuspended(options);
      }

      if (!isPrime(candidate)) {
        continue;
      }

      primeCount += 1;
      highestPrime = candidate;
      if (sampledPrimes.length < 12) {
        sampledPrimes.push(candidate);
      }
    }

    options?.onProgress?.(Math.min(1, (rangeEnd - payload.start + 1) / total));
    await yieldBetweenChunksIfNeeded(options);
  }

  const summary: PrimeTaskSummary = {
    kind: "prime-range",
    start: payload.start,
    end: payload.end,
    primeCount,
    highestPrime,
    sampledPrimes,
    engine: "js"
  };

  return {
    summary,
    durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    outputDigest: JSON.stringify(summary),
    executionKind: "js"
  };
}

export async function executePrimeTaskWithWasm(
  payload: PrimeTaskPayload,
  wasmBytes: Uint8Array<ArrayBufferLike>,
  options?: TaskExecutionOptions
): Promise<PrimeTaskExecutionResult> {
  const startTime = Date.now();
  const total = Math.max(1, payload.end - payload.start + 1);
  const chunkSize = Math.max(512, options?.chunkSize ?? 10_000);
  const sampleLimit = 12;
  const instantiated = (await WebAssembly.instantiate(wasmBytes)) as
    | WebAssembly.Instance
    | WebAssembly.WebAssemblyInstantiatedSource;
  const instance = "instance" in instantiated ? instantiated.instance : instantiated;
  const runtime = getPrimeRangeWasmExports(instance);
  runtime.reset_summary(sampleLimit);

  for (let rangeStart = payload.start; rangeStart <= payload.end; rangeStart += chunkSize) {
    continueOrThrow(options);
    await waitIfSuspended(options);

    const rangeEnd = Math.min(payload.end, rangeStart + chunkSize - 1);
    runtime.process_prime_range(rangeStart, rangeEnd);
    options?.onProgress?.(Math.min(1, (rangeEnd - payload.start + 1) / total));
    await yieldBetweenChunksIfNeeded(options);
  }

  const primeCount = runtime.get_prime_count();
  const highestPrime = runtime.get_highest_prime();
  const sampleCount = Math.max(0, Math.min(sampleLimit, runtime.get_sample_count()));
  const samples = new Int32Array(runtime.memory.buffer, 0, sampleLimit);
  const sampledPrimes = Array.from({ length: sampleCount }, (_, index) => samples[index]).filter((value) => value > 0);

  const summary: PrimeTaskSummary = {
    kind: "prime-range",
    start: payload.start,
    end: payload.end,
    primeCount,
    highestPrime: highestPrime > 0 ? highestPrime : null,
    sampledPrimes,
    engine: "wasm"
  };

  return {
    summary,
    durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    outputDigest: JSON.stringify(summary),
    executionKind: "wasm"
  };
}

export async function executePiTask(
  payload: PiTaskPayload,
  options?: TaskExecutionOptions
): Promise<PiTaskExecutionResult> {
  const startTime = Date.now();
  const digits = Math.max(1, payload.digits);
  const checkpointSize = options?.chunkSize ?? 8;
  let hexDigits = "";

  for (let offset = 0; offset < digits; offset += 1) {
    if (offset % checkpointSize === 0) {
      continueOrThrow(options);
      await waitIfSuspended(options);
      await yieldBetweenChunksIfNeeded(options);
    }

    hexDigits += computePiHexDigit(payload.start + offset);
    options?.onProgress?.((offset + 1) / digits);
  }

  const summary: PiTaskSummary = {
    kind: "pi-bbp-hex-range",
    start: payload.start,
    digits,
    batch: payload.batch,
    decimalDigits: payload.decimalDigits,
    totalHexDigits: payload.totalHexDigits,
    hexDigits,
    engine: "js"
  };

  return {
    summary,
    durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    outputDigest: JSON.stringify(summary),
    executionKind: "js"
  };
}

export async function executePiTaskWithWasm(
  payload: PiTaskPayload,
  wasmBytes: Uint8Array<ArrayBufferLike>,
  options?: TaskExecutionOptions
): Promise<PiTaskExecutionResult> {
  const startTime = Date.now();
  const digits = Math.max(1, payload.digits);
  const chunkSize = Math.max(1, options?.chunkSize ?? 8);
  let hexDigits = "";
  const instantiated = (await WebAssembly.instantiate(wasmBytes)) as
    | WebAssembly.Instance
    | WebAssembly.WebAssemblyInstantiatedSource;
  const instance = "instance" in instantiated ? instantiated.instance : instantiated;
  const runtime = getPiBbpWasmExports(instance);

  for (let offset = 0; offset < digits; offset += chunkSize) {
    continueOrThrow(options);
    await waitIfSuspended(options);

    const chunkDigits = Math.min(chunkSize, digits - offset);
    runtime.reset_hex_buffer();
    runtime.process_pi_hex_range(payload.start + offset, chunkDigits);

    const writtenLength = Math.max(0, Math.min(chunkDigits, runtime.get_written_length()));
    const writtenBytes = new Uint8Array(runtime.memory.buffer, 0, writtenLength);
    hexDigits += new TextDecoder("ascii").decode(writtenBytes).toUpperCase();

    options?.onProgress?.(Math.min(1, (offset + chunkDigits) / digits));
    await yieldBetweenChunksIfNeeded(options);
  }

  const summary: PiTaskSummary = {
    kind: "pi-bbp-hex-range",
    start: payload.start,
    digits,
    batch: payload.batch,
    decimalDigits: payload.decimalDigits,
    totalHexDigits: payload.totalHexDigits,
    hexDigits,
    engine: "wasm"
  };

  return {
    summary,
    durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    outputDigest: JSON.stringify(summary),
    executionKind: "wasm"
  };
}

export function getPiHexDigitsForDecimalDigits(decimalDigits: number, guardDigits = defaultPiGuardDigits) {
  const safeDigits = Math.max(1, Math.floor(decimalDigits));
  const safeGuard = Math.max(8, Math.floor(guardDigits));
  return Math.ceil((safeDigits + safeGuard) * (Math.log(10) / Math.log(16)));
}

export function verifyPiDigits(decimalDigitsOnly: string) {
  return decimalDigitsOnly.startsWith(piVerificationPrefix);
}

export function piHexDigitsToDecimalString(hexDigits: string, decimalDigits: number) {
  const safeDecimalDigits = Math.max(1, Math.floor(decimalDigits));
  const normalized = (hexDigits || "").replace(/[^0-9a-f]/gi, "").toUpperCase();
  const denominator = 16n ** BigInt(normalized.length);
  const fraction = normalized ? BigInt(`0x${normalized}`) : 0n;
  const numerator = 3n * denominator + fraction;
  const scale = 10n ** BigInt(safeDecimalDigits);
  const scaled = (numerator * scale) / denominator;
  const integerPart = scaled / scale;
  const fractionalPart = (scaled % scale).toString().padStart(safeDecimalDigits, "0");
  return `${integerPart.toString()}.${fractionalPart}`;
}

export function formatPiDecimalForDisplay(piValue: string, lineWidth = 100) {
  const [integerPart, fractionalPart = ""] = piValue.split(".");
  if (!fractionalPart) {
    return integerPart;
  }

  const lines: string[] = [];
  for (let index = 0; index < fractionalPart.length; index += lineWidth) {
    lines.push(fractionalPart.slice(index, index + lineWidth));
  }

  if (lines.length === 0) {
    return `${integerPart}.`;
  }

  return `${integerPart}.${lines[0]}\n${lines.slice(1).join("\n")}`.trimEnd();
}

export function createRepeatedHexPlaceholder(length: number) {
  return repeatString("0", Math.max(0, Math.floor(length)));
}
