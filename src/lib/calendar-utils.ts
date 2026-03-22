export function getFrenchDate(date: Date): string {
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const WEEK_MIN = 1;
const WEEK_MAX = 44;
const OFF_SEASON_END = 39;

export function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const week = Math.floor((dayOfYear - 32) / 7) + 1;
  return Math.max(WEEK_MIN, Math.min(WEEK_MAX, week));
}

export function isOffSeason(week: number): boolean {
  return week < WEEK_MIN || week > OFF_SEASON_END;
}

export function weekToDate(week: number, year?: number): Date {
  const targetYear = year ?? new Date().getFullYear();
  const dayOfYear = (week - 1) * 7 + 32;
  const date = new Date(targetYear, 0, dayOfYear);
  return date;
}

export function getMonthForWeek(week: number): string {
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  const date = weekToDate(week);
  return months[date.getMonth()];
}

export function getWeekOfMonth(week: number): number {
  const date = weekToDate(week);
  return Math.ceil(date.getDate() / 7);
}

export function getWeekLabel(week: number): string {
  const month = getMonthForWeek(week);
  const weekOfMonth = getWeekOfMonth(week);
  return `${month}, semaine ${weekOfMonth}`;
}

export type SeasonPhase =
  | "semis_interieur"
  | "transplantation"
  | "croissance"
  | "recolte"
  | "hors_saison";

export function getSeasonPhase(week: number): SeasonPhase {
  if (week < WEEK_MIN || week > OFF_SEASON_END) {
    return "hors_saison";
  }
  if (week <= 8) {
    return "semis_interieur";
  }
  if (week <= 16) {
    return "transplantation";
  }
  if (week <= 22) {
    return "croissance";
  }
  return "recolte";
}
