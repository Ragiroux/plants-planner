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
const WEEK_MAX = 35;
const OFF_SEASON_END = 39;

// Month boundaries matching the écoumène calendar column layout exactly.
// The chart has 35 columns: Feb 3 cols (w2-w4) + 8 months × 4 cols each.
// Seed data positions: 1-3 = Feb, 4-7 = Mar, 8-11 = Apr, ..., 32-35 = Oct.
// Values 36-39 represent extended harvest beyond the chart.
const MONTH_STARTS: [number, number][] = [
  [1, 1],   // [startWeek, monthIndex 0-based] Feb (weeks 1-3)
  [4, 2],   // Mar (weeks 4-7)
  [8, 3],   // Apr (weeks 8-11)
  [12, 4],  // May (weeks 12-15)
  [16, 5],  // Jun (weeks 16-19)
  [20, 6],  // Jul (weeks 20-23)
  [24, 7],  // Aug (weeks 24-27)
  [28, 8],  // Sep (weeks 28-31)
  [32, 9],  // Oct (weeks 32-35)
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

  if (month === 1) {
    // February: chart starts at week 2 of the month (day ~8)
    if (day < 8) return WEEK_MIN;
    const weekInMonth = Math.floor((day - 8) / 7);
    return Math.min(startWeek + weekInMonth, 3);
  }

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

  if (monthIndex === 1) {
    // February: chart starts at week 2, so day offset = 8
    const day = weekInMonth * 7 + 8;
    return new Date(targetYear, monthIndex, day);
  }

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
  if (week <= 7) {
    return "semis_interieur";
  }
  if (week <= 15) {
    return "transplantation";
  }
  if (week <= 23) {
    return "croissance";
  }
  return "recolte";
}
