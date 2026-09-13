import type { WorkerDeviceProfile } from "../benchmark";

export type TaskKind = "physics-sim" | "frame-render";

export type TaskLeaseStatus = "queued" | "leased" | "completed";

export interface ComputeTask {
  id: string;
  projectId: string;
  kind: TaskKind;
  title: string;
  payloadRef: string;
  payloadUrl?: string | null;
  rewardPoints: number;
  expectedDurationSec: number;
  status: TaskLeaseStatus;
}

export interface TaskLease {
  leaseId: string;
  task: ComputeTask;
  leasedUntilIso: string;
}

export interface TaskResultSubmission {
  leaseId: string;
  taskId: string;
  projectId: string;
  outputDigest: string;
  deviceId: string;
  durationSec: number;
  executionTimeMs?: number;
  opsPerSec?: number | null;
  samplesPerSec?: number | null;
  deviceProfile?: WorkerDeviceProfile;
  userId?: string | null;
}
