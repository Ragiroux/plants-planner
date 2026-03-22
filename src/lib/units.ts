export type UnitPreference = "meters" | "feet";
const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 1 / FEET_TO_METERS;

export function toMeters(value: number, unit: UnitPreference): number {
  return unit === "feet" ? value * FEET_TO_METERS : value;
}
export function fromMeters(value: number, unit: UnitPreference): number {
  return unit === "feet" ? value * METERS_TO_FEET : value;
}
export function unitLabel(unit: UnitPreference): string {
  return unit === "feet" ? "pi" : "m";
}
export function unitSquaredLabel(unit: UnitPreference): string {
  return unit === "feet" ? "pi²" : "m²";
}
