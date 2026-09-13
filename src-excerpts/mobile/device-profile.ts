import { Capacitor } from "@capacitor/core";
import type { WorkerDeviceProfile, WorkerDeviceType } from "@gridsynapse/shared";

let cachedProfilePromise: Promise<WorkerDeviceProfile> | null = null;

function detectWorkerDeviceType(): WorkerDeviceType {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    return "android";
  }

  if (platform === "ios") {
    return "ios";
  }

  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isMobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  return isMobileBrowser ? "mobile-browser" : "pc-browser";
}

function readCpuCores() {
  const raw = Number(typeof navigator === "undefined" ? 1 : navigator.hardwareConcurrency ?? 1);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(raw));
}

function readWebGlRenderer() {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2", { antialias: false, alpha: false }) ||
    canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) {
    return null;
  }

  const extension = gl.getExtension("WEBGL_debug_renderer_info");
  if (!extension) {
    return null;
  }

  try {
    const renderer = gl.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === "string" && renderer.trim() ? renderer.trim() : null;
  } catch {
    return null;
  }
}

async function readGpuInfo() {
  const nav = navigator as Navigator & {
    gpu?: {
      requestAdapter?: () => Promise<{
        info?: {
          architecture?: string;
          description?: string;
          device?: string;
          vendor?: string;
        };
      } | null>;
    };
  };

  if (nav.gpu?.requestAdapter) {
    try {
      const adapter = await nav.gpu.requestAdapter();
      const info = adapter?.info;
      const description = info?.description?.trim();
      if (description) {
        return description;
      }

      const vendor = info?.vendor?.trim();
      const device = info?.device?.trim();
      if (vendor || device) {
        return [vendor, device].filter(Boolean).join(" ").trim();
      }
    } catch {
      // Fall through to WebGL renderer.
    }
  }

  return readWebGlRenderer();
}

async function buildWorkerDeviceProfile(): Promise<WorkerDeviceProfile> {
  const deviceType = detectWorkerDeviceType();
  const renderer = readWebGlRenderer();
  const gpuInfo = (await readGpuInfo()) ?? renderer;

  return {
    deviceType,
    cpuCores: readCpuCores(),
    gpuInfo,
    renderer,
    userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
    platformLabel: Capacitor.getPlatform()
  };
}

export async function getWorkerDeviceProfile() {
  if (!cachedProfilePromise) {
    cachedProfilePromise = buildWorkerDeviceProfile();
  }

  return cachedProfilePromise;
}
