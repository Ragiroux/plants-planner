const LEGEND_ITEMS = [
  { color: "#E8912D", label: "Semis intérieur" },
  { color: "#D45FA0", label: "Repiquage" },
  { color: "#D4C24A", label: "Semis extérieur" },
  { color: "#4A9E4A", label: "Au jardin" },
  { color: "#C0392B", label: "Récolte" },
  { color: "#E8A317", label: "Semaine actuelle", dashed: true },
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.dashed ? (
            <div
              className="w-0.5 h-4"
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <div
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-xs text-[#5C5650]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
