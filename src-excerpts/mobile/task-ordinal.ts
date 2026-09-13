import {
  parseFalconTaskPayload,
  parseOrbital3dTaskPayload,
  parsePiExactTaskPayload,
  parsePiTaskPayload,
  parsePrimeTaskPayload,
  parseRenderTaskPayload,
  type ComputeTask
} from "@gridsynapse/shared";

export function getDisplayedWorkUnitOrdinal(totalTasks: number, task: Pick<ComputeTask, "title" | "payloadRef"> | null) {
  if (!task) {
    return 0;
  }

  const falconPayload = parseFalconTaskPayload(task.payloadRef);
  if (falconPayload?.batch) {
    return Math.max(1, falconPayload.batch);
  }

  const orbital3dPayload = parseOrbital3dTaskPayload(task.payloadRef);
  if (orbital3dPayload?.batch) {
    return Math.max(1, orbital3dPayload.batch);
  }

  const piExactPayload = parsePiExactTaskPayload(task.payloadRef);
  if (piExactPayload?.batch) {
    return Math.max(1, piExactPayload.batch);
  }

  const piPayload = parsePiTaskPayload(task.payloadRef);
  if (piPayload?.batch) {
    return Math.max(1, piPayload.batch);
  }

  const primePayload = parsePrimeTaskPayload(task.payloadRef);
  if (primePayload?.batch) {
    return Math.max(1, primePayload.batch);
  }

  const renderPayload = parseRenderTaskPayload(task.payloadRef);
  if (renderPayload) {
    const titleMatch = task.title.match(/Work Unit\s+(\d+)/i);
    if (titleMatch) {
      return Math.max(1, Number(titleMatch[1]));
    }
  }

  const genericTitleMatch = task.title.match(/Work Unit\s+(\d+)/i);
  if (genericTitleMatch) {
    return Math.max(1, Number(genericTitleMatch[1]));
  }

  return 0;
}

export function resolveCurrentWorkUnitOrdinal(input: {
  totalTasks: number;
  completedTasks: number;
  activeTask: Pick<ComputeTask, "title" | "payloadRef"> | null;
}) {
  const { totalTasks, completedTasks, activeTask } = input;
  const activeOrdinal = getDisplayedWorkUnitOrdinal(totalTasks, activeTask);
  if (activeOrdinal > 0) {
    return activeOrdinal;
  }

  if (totalTasks <= 0) {
    return 0;
  }

  return Math.min(totalTasks, Math.max(1, completedTasks + 1));
}
