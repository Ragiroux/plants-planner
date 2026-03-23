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
const WEEK_MAX = 39;
const OFF_SEASON_END = 39;

// Month boundaries matching the écoumène calendar column layout.
// Each month is divided into equal "weeks" (columns on the chart).
// Feb: 4 weeks (1-4), Mar: 4 (5-8), Apr: 5 (9-13), May: 5 (14-18),
// Jun: 4 (19-22), Jul: 4 (23-26), Aug: 5 (27-31), Sep: 4 (32-35), Oct: 4 (36-39)
const MONTH_STARTS: [number, number][] = [
  [1, 1],   // [startWeek, monthIndex 0-based] Feb
  [5, 2],   // Mar
  [9, 3],   // Apr
  [14, 4],  // May
  [19, 5],  // Jun
  [23, 6],  // Jul
  [27, 7],  // Aug
  [32, 8],  // Sep
  [36, 9],  // Oct
];

export function getCurrentWeek(): number {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  if (month < 1) return WEEK_MIN;
  if (month > 9) return WEEK_MAX;

  const entry = MONTH_STARTS.find(([, m]) => m === month);
  if (!entry) return WEEK_MIN;

  const startWeek = entry[0];
  const weekInMonth = Math.floor((day - 1) / 7);
  return Math.max(WEEK_MIN, Math.min(WEEK_MAX, startWeek + weekInMonth));
}

export function isOffSeason(week: number): boolean {
  return week < WEEK_MIN || week > OFF_SEASON_END;
}

export function weekToDate(week: number, year?: number): Date {
  const targetYear = year ?? new Date().getFullYear();

  let monthIndex = 1; // February by default
  let monthStartWeek = 1;

  for (let i = MONTH_STARTS.length - 1; i >= 0; i--) {
    if (week >= MONTH_STARTS[i][0]) {
      monthStartWeek = MONTH_STARTS[i][0];
      monthIndex = MONTH_STARTS[i][1];
      break;
    }
  }

  const weekInMonth = week - monthStartWeek; // 0-based
  const day = weekInMonth * 7 + 1;
  return new Date(targetYear, monthIndex, day);
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
