import { ORBITAL3D_CONTROLLER_CONTRACT_ARTIFACT, ORBITAL3D_DEFAULT_MISSION_CONFIG, ORBITAL3D_DEFAULT_REWARD_WEIGHTS, ORBITAL3D_TRAINING_PHASE_DEFAULTS } from "./defaults";
import { getOrbital3dScenarioFamilies } from "./scenario";
import {
  ORBITAL3D_SCHEMA_VERSION,
  type Orbital3dMissionConfig,
  type Orbital3dScenarioPack,
  type Orbital3dTaskPayload
} from "./contracts";

export const ORBITAL3D_REPLAY_TRACE_SCHEMA_ARTIFACT = {
  schemaVersion: ORBITAL3D_SCHEMA_VERSION,
  artifactType: "replay_trace_schema",
  artifactId: "orbital3d-replay-trace-schema-v1",
  createdAt: "2026-05-01T00:00:00.000Z",
  notes: "Replay frame schema shared by headless, Gazebo/ROS 2, and KSP/kRPC validation adapters.",
  frameFields: [
    "timeS",
    "activeStageId",
    "missionPhase",
    "trainingPhaseId",
    "positionMissionM",
    "velocityMissionMps",
    "attitudeWxyz",
    "angularRateRadps",
    "currentMassKg",
    "remainingPropellantKg",
    "localDensityKgpm3",
    "localWindMps",
    "action",
    "eventFlags"
  ]
} as const;

export const ORBITAL3D_TRAINING_PHASE_DEFAULTS_ARTIFACT = {
  schemaVersion: ORBITAL3D_SCHEMA_VERSION,
  artifactType: "training_phase_defaults",
  artifactId: "orbital3d-training-phase-defaults-v1",
  createdAt: "2026-05-01T00:00:00.000Z",
  notes: "Benchmark GA defaults for phase-specific learning.",
  phases: ORBITAL3D_TRAINING_PHASE_DEFAULTS
} as const;

export const ORBITAL3D_SCENARIO_FAMILY_ARTIFACT = {
  schemaVersion: ORBITAL3D_SCHEMA_VERSION,
  artifactType: "scenario_family_catalog",
  artifactId: "orbital3d-scenario-families-v1",
  createdAt: "2026-05-01T00:00:00.000Z",
  notes: "Required deterministic scenario families for the 3-stage orbital recovery benchmark.",
  families: getOrbital3dScenarioFamilies()
} as const;

export function buildOrbital3dDatasetArtifact() {
  return {
    kind: "orbital3d-benchmark-dataset",
    version: 1,
    runtime: "orbital3d-headless-core-v1",
    projectId: "proj-orbital3d-recovery-benchmark",
    missionConfig: ORBITAL3D_DEFAULT_MISSION_CONFIG,
    controllerContract: ORBITAL3D_CONTROLLER_CONTRACT_ARTIFACT,
    replayTraceSchema: ORBITAL3D_REPLAY_TRACE_SCHEMA_ARTIFACT,
    rewardWeights: ORBITAL3D_DEFAULT_REWARD_WEIGHTS,
    trainingPhaseDefaults: ORBITAL3D_TRAINING_PHASE_DEFAULTS_ARTIFACT,
    physicsFidelityCurriculum: ORBITAL3D_TRAINING_PHASE_DEFAULTS_ARTIFACT.phases,
    scenarioFamilies: ORBITAL3D_SCENARIO_FAMILY_ARTIFACT,
    adapterContracts: {
      gazeboRos2: {
        topics: [
          "/orbital3d/mission_state",
          "/orbital3d/controller_command",
          "/orbital3d/replay_frame",
          "/orbital3d/phase_event"
        ],
        packageName: "orbital3d_msgs"
      },
      kspKrpc: {
        adapterModule: "orbital3d_krpc_adapter.py",
        sharedContract: "controllerContract"
      }
    },
    note:
      "Research benchmark metadata only. It is not a real vehicle configuration or operational launch plan."
  };
}

export function validateOrbital3dMissionConfig(value: unknown): value is Orbital3dMissionConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const config = value as Partial<Orbital3dMissionConfig>;
  return (
    config.schemaVersion === ORBITAL3D_SCHEMA_VERSION &&
    config.artifactType === "mission_config" &&
    config.missionId === "orbital3d-v1" &&
    typeof config.planet?.radiusM === "number" &&
    typeof config.planet?.muM3PerS2 === "number" &&
    typeof config.planet?.rotationRateRadPerS === "number" &&
    typeof config.launchSite?.latitudeDeg === "number" &&
    typeof config.launchSite?.longitudeDeg === "number" &&
    typeof config.vehicle?.bodyDiameterM === "number" &&
    (
      !config.payload ||
      (
        typeof config.payload.payloadMassKg === "number" &&
        typeof config.payload.satelliteHeightM === "number"
      )
    ) &&
    Array.isArray(config.stages) &&
    config.stages.length === 3 &&
    config.stages.every((stage) =>
      typeof stage.stageId === "number" &&
      typeof stage.propellantMassKg === "number" &&
      typeof stage.ignitionBudget === "number" &&
      stage.thrustMode === "fixed"
    )
  );
}

export function validateOrbital3dScenarioPack(value: unknown): value is Orbital3dScenarioPack {
  if (!value || typeof value !== "object") {
    return false;
  }
  const pack = value as Partial<Orbital3dScenarioPack>;
  return (
    pack.schemaVersion === ORBITAL3D_SCHEMA_VERSION &&
    pack.artifactType === "scenario_pack" &&
    typeof pack.phaseId === "string" &&
    typeof pack.generation === "number" &&
    typeof pack.baseSeed === "number" &&
    Array.isArray(pack.entries) &&
    pack.entries.length > 0
  );
}

export function validateOrbital3dTaskPayload(value: unknown): value is Orbital3dTaskPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Partial<Orbital3dTaskPayload>;
  return (
    payload.kind === "orbital3d-ga" &&
    payload.schemaVersion === ORBITAL3D_SCHEMA_VERSION &&
    typeof payload.phaseId === "string" &&
    typeof payload.generation === "number" &&
    validateOrbital3dMissionConfig(payload.missionConfig) &&
    validateOrbital3dScenarioPack(payload.scenarioPack) &&
    Array.isArray(payload.genomes)
  );
}
