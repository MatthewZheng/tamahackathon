import type { CompanionInference } from "./types";

export function addInference(list: CompanionInference[], inf: CompanionInference) {
  return [inf, ...list];
}
export function editInference(list: CompanionInference[], id: string, statement: string) {
  return list.map((i) =>
    i.id === id
      ? { ...i, statement, userCorrected: true, updatedAt: new Date().toISOString() }
      : i,
  );
}
export function deleteInference(list: CompanionInference[], id: string) {
  return list.filter((i) => i.id !== id);
}
export function deleteAllInferences() {
  return [];
}
export function confirmInference(list: CompanionInference[], id: string) {
  return list.map((i) =>
    i.id === id ? { ...i, userConfirmed: true, updatedAt: new Date().toISOString() } : i,
  );
}
export function rejectInference(list: CompanionInference[], id: string) {
  return list.map((i) =>
    i.id === id ? { ...i, isActive: false, updatedAt: new Date().toISOString() } : i,
  );
}
export function getActiveInferences(list: CompanionInference[]) {
  return list.filter((i) => i.isActive);
}
export function getRelevantInferences(list: CompanionInference[], category?: string) {
  return list.filter((i) => i.isActive && (!category || i.category === category));
}
export function generateMemorySummary(list: CompanionInference[]) {
  const active = getActiveInferences(list);
  return {
    total: active.length,
    byCategory: active.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
export function exportMemoryJSON(list: CompanionInference[]) {
  return JSON.stringify(list, null, 2);
}
