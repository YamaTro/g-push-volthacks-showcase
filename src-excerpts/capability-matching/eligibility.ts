import type {
  DeviceStatus,
  RuntimeEligibility,
  RuntimeExecutionMode,
  RuntimePlatformInfo,
  RuntimePreferences
} from "./domain/runtime";
import { isDesktopRuntimePlatform } from "./domain/runtime";

function evaluateBaseRuntimeEligibility(
  preferences: RuntimePreferences,
  status: DeviceStatus,
  platformInfo?: RuntimePlatformInfo | null,
  options?: {
    requireScreenUnlocked?: boolean;
  }
): RuntimeEligibility {
  if (isDesktopRuntimePlatform(platformInfo)) {
    return {
      canRun: true,
      reasons: []
    };
  }

  const reasons: string[] = [];
  const minimumBatteryPercent = Math.max(0, Math.min(100, preferences.minimumBatteryPercent));
  const maximumBatteryTemperatureC = Math.max(1, Math.min(45, preferences.maximumBatteryTemperatureC));

  if (minimumBatteryPercent > 0 && status.batteryPercent < minimumBatteryPercent) {
    reasons.push(`バッテリー残量が ${minimumBatteryPercent}% 未満です`);
  }

  if (status.batteryTemperatureC > maximumBatteryTemperatureC) {
    reasons.push(`バッテリー温度が ${maximumBatteryTemperatureC}°C を超えています`);
  }

  if (preferences.requireCharging && !status.charging) {
    reasons.push("充電中ではありません");
  }

  if ((options?.requireScreenUnlocked ?? preferences.requireScreenUnlocked) && !status.screenUnlocked) {
    reasons.push("画面がロックされています");
  }

  if (status.lowPowerMode) {
    reasons.push("省電力モードが有効です");
  }

  return {
    canRun: reasons.length === 0,
    reasons
  };
}

export function evaluateForegroundRuntimeEligibility(
  preferences: RuntimePreferences,
  status: DeviceStatus,
  platformInfo?: RuntimePlatformInfo | null
): RuntimeEligibility {
  return evaluateBaseRuntimeEligibility(preferences, status, platformInfo, {
    requireScreenUnlocked: preferences.requireScreenUnlocked
  });
}

export function evaluateAndroidBackgroundRuntimeEligibility(
  preferences: RuntimePreferences,
  status: DeviceStatus,
  platformInfo?: RuntimePlatformInfo | null
): RuntimeEligibility {
  return evaluateBaseRuntimeEligibility(preferences, status, platformInfo, {
    requireScreenUnlocked: false
  });
}

export function evaluateRuntimeEligibility(
  preferences: RuntimePreferences,
  status: DeviceStatus,
  executionMode: RuntimeExecutionMode = "foreground",
  platformInfo?: RuntimePlatformInfo | null
): RuntimeEligibility {
  if (executionMode === "android-background-v1") {
    return evaluateAndroidBackgroundRuntimeEligibility(preferences, status, platformInfo);
  }

  return evaluateForegroundRuntimeEligibility(preferences, status, platformInfo);
}
