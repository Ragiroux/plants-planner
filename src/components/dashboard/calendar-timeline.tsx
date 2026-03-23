"use client";

interface CalendarEntry {
  indoor_sow_start: number | null;
  indoor_sow_end: number | null;
  transplant_start: number | null;
  transplant_end: number | null;
  outdoor_sow_start: number | null;
  outdoor_sow_end: number | null;
  garden_transplant_start: number | null;
  garden_transplant_end: number | null;
  harvest_start: number | null;
  harvest_end: number | null;
}

interface PlantRow {
  id: number;
  name: string;
  quantity: number;
  calendar: CalendarEntry | null;
}

interface CalendarTimelineProps {
  plants: PlantRow[];
  currentWeek: number;
}

const MONTHS = [
  { name: "Fév", startWeek: 1 },
  { name: "Mar", startWeek: 4 },
  { name: "Avr", startWeek: 8 },
  { name: "Mai", startWeek: 12 },
  { name: "Juin", startWeek: 16 },
  { name: "Juil", startWeek: 20 },
  { name: "Août", startWeek: 24 },
  { name: "Sep", startWeek: 28 },
  { name: "Oct", startWeek: 32 },
];

const DISPLAY_WEEK_MIN = 1;
const DISPLAY_WEEK_MAX = 36;
const DISPLAY_SPAN = DISPLAY_WEEK_MAX - DISPLAY_WEEK_MIN;

function weekToPercent(week: number): number {
  return ((week - DISPLAY_WEEK_MIN) / DISPLAY_SPAN) * 100;
}

const PHASES = [
  {
    startKey: "indoor_sow_start" as keyof CalendarEntry,
    endKey: "indoor_sow_end" as keyof CalendarEntry,
    color: "#E8912D",
    label: "Semis intérieur",
  },
  {
    startKey: "transplant_start" as keyof CalendarEntry,
    endKey: "transplant_end" as keyof CalendarEntry,
    color: "#D45FA0",
    label: "Repiquage",
  },
  {
    startKey: "outdoor_sow_start" as keyof CalendarEntry,
    endKey: "outdoor_sow_end" as keyof CalendarEntry,
    color: "#D4C24A",
    label: "Semis extérieur",
  },
  {
    startKey: "garden_transplant_start" as keyof CalendarEntry,
    endKey: "garden_transplant_end" as keyof CalendarEntry,
    color: "#4A9E4A",
    label: "Au jardin",
  },
  {
    startKey: "harvest_start" as keyof CalendarEntry,
    endKey: "harvest_end" as keyof CalendarEntry,
    color: "#C0392B",
    label: "Récolte",
  },
];

export function CalendarTimeline({ plants, currentWeek }: CalendarTimelineProps) {
  const currentWeekPercent = weekToPercent(currentWeek);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex">
          <div className="w-36 shrink-0" />
          <div className="flex-1 relative h-6 mb-1">
            {MONTHS.map((month) => (
              <div
                key={month.name}
                className="absolute top-0 h-full flex items-center"
                style={{ left: `${weekToPercent(month.startWeek)}%` }}
              >
                <span className="text-xs text-[#A9A29A] font-medium">
                  {month.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex mb-1">
          <div className="w-36 shrink-0" />
          <div className="flex-1 relative h-4">
            {MONTHS.map((month, monthIndex) => {
              const nextMonthStart = MONTHS[monthIndex + 1]?.startWeek ?? DISPLAY_WEEK_MAX;
              const monthSpanWeeks = nextMonthStart - month.startWeek;
              const weekWidth = monthSpanWeeks / 4;
              return [1, 2, 3, 4].map((w) => {
                const weekStart = month.startWeek + (w - 1) * weekWidth;
                const leftPercent = weekToPercent(weekStart);
                return (
                  <div
                    key={`${month.name}-w${w}`}
                    className="absolute top-0 h-full flex items-center"
                    style={{
                      left: `${leftPercent}%`,
                      borderLeft: w > 1 ? "1px solid #F5F2EE" : undefined,
                    }}
                  >
                    <span
                      className="pl-0.5"
                      style={{ fontSize: "10px", color: "#A9A29A" }}
                    >
                      {w}
                    </span>
                  </div>
                );
              });
            })}
          </div>
        </div>

        <div className="space-y-1">
          {plants.map((plant) => (
            <div key={plant.id} className="flex items-center gap-2">
              <div className="w-36 shrink-0 text-right pr-3">
                <span className="text-xs font-medium text-[#3D3832] truncate block">
                  {plant.name}
                </span>
                {plant.quantity > 1 && (
                  <span className="text-xs text-[#A9A29A]">×{plant.quantity}</span>
                )}
              </div>
              <div className="flex-1 relative h-6 bg-[#F5F2EE] rounded-sm">
                {plant.calendar &&
                  PHASES.map((phase) => {
                    const start = plant.calendar![phase.startKey] as number | null;
                    const end = plant.calendar![phase.endKey] as number | null;
                    if (start === null || end === null) return null;
                    const left = weekToPercent(start);
                    const width = weekToPercent(end) - left;
                    return (
                      <div
                        key={phase.label}
                        className="absolute top-1 h-4 rounded-sm"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 1)}%`,
                          backgroundColor: phase.color,
                        }}
                        title={`${phase.label}: sem. ${start}–${end}`}
                      />
                    );
                  })}
                <div
                  className="absolute top-0 w-px h-full"
                  style={{
                    left: `${currentWeekPercent}%`,
                    backgroundColor: "#E8A317",
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
