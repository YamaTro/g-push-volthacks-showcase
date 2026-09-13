export type RenderPerformanceMode = "fastest" | "balanced" | "stable";
export type RenderGpuLoadLimit = "unlimited" | "90" | "70" | "50";

export interface RuntimePreferences {
  minimumBatteryPercent: number;
  maximumBatteryTemperatureC: number;
  requireCharging: boolean;
  requireScreenUnlocked: boolean;
  allowAndroidBackground: boolean;
  allowExperimentalBackgroundProjects: boolean;
  allowFalconAndroidNativeEngine: boolean;
  renderPerformanceMode: RenderPerformanceMode;
  renderGpuLoadLimit: RenderGpuLoadLimit;
  workerCount: number;
}

export type RuntimeExecutionMode = "foreground" | "android-background-v1";

export type RuntimePlatform = "android" | "ios" | "web" | "unknown";

export type RuntimeDeviceType = "android" | "ios" | "mobile-browser" | "pc-browser" | "pc-native" | "unknown";

export interface RuntimePlatformInfo {
  isNativePlatform: boolean;
  platform: RuntimePlatform;
  deviceType: RuntimeDeviceType;
}

export interface DeviceStatus {
  batteryPercent: number;
  batteryTemperatureC: number;
  charging: boolean;
  screenUnlocked: boolean;
  lowPowerMode: boolean;
}

export interface RuntimeEligibility {
  canRun: boolean;
  reasons: string[];
}

export function normalizeRuntimePlatform(platform: string | null | undefined): RuntimePlatform {
  switch (platform) {
    case "android":
    case "ios":
    case "web":
      return platform;
    default:
      return "unknown";
  }
}

export function normalizeRuntimeDeviceType(deviceType: string | null | undefined): RuntimeDeviceType {
  switch (deviceType) {
    case "android":
    case "ios":
    case "mobile-browser":
    case "pc-browser":
    case "pc-native":
      return deviceType;
    default:
      return "unknown";
  }
}

export function createRuntimePlatformInfo(input?: {
  isNativePlatform?: boolean;
  platform?: string | null;
  deviceType?: string | null;
}): RuntimePlatformInfo {
  return {
    isNativePlatform: Boolean(input?.isNativePlatform),
    platform: normalizeRuntimePlatform(input?.platform),
    deviceType: normalizeRuntimeDeviceType(input?.deviceType)
  };
}

export function isDesktopRuntimePlatform(platformInfo?: RuntimePlatformInfo | null) {
  return platformInfo?.deviceType === "pc-browser" || platformInfo?.deviceType === "pc-native";
}
