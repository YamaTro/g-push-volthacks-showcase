import type { ProjectCategory, ProjectExecutionMode, ProjectStatus } from "./domain/project";
import type { TaskKind } from "./domain/task";

export interface ProjectPackageTask {
  title: string;
  kind: TaskKind;
  // payloadRef must only contain the Work Unit specific delta.
  // Shared constants, models, lookup tables, and engine data belong in
  // project-level assets (wasmModuleUrl / initialDataUrl / supporting assets),
  // not duplicated into every task payload.
  payloadRef: string;
  rewardPoints: number;
}

export interface ProjectPackageDefinition {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  status: ProjectStatus;
  contributionLabel: string;
  description: string;
  manifestVersion: string;
  estimatedDurationMinutes: number;
  totalPointsPool: number;
  supportedExecutionModes: ProjectExecutionMode[];
  engineKind: "physics" | "rendering";
  dataPayloadLabel: string;
  // Physics projects use wasmModuleUrl for the executable engine.
  // Rendering projects may leave this empty and use initialDataUrl to point to
  // a render manifest instead.
  wasmModuleUrl: string;
  // Project-wide shared assets should be downloaded once here and reused by
  // every Work Unit. Keep per-task network traffic small by not repeating
  // common data inside tasks[].payloadRef.
  initialDataUrl: string;
}

export interface ProjectPackageFile {
  format: "gridsynapse-project-package";
  version: 1;
  project: ProjectPackageDefinition;
  tasks: ProjectPackageTask[];
}
