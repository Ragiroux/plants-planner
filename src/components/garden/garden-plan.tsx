"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { gardens, user_plants, plants, companion_plants } from "@/lib/db/schema";

type Garden = typeof gardens.$inferSelect;
type UserPlant = typeof user_plants.$inferSelect;
type Plant = typeof plants.$inferSelect;
type CompanionPlant = typeof companion_plants.$inferSelect;

interface UserPlantWithPlant {
  userPlant: UserPlant;
  plant: Plant;
}

interface PlantPosition {
  plantId: number;
  gridX: number;
  gridY: number;
}

interface LayoutJson {
  positions: PlantPosition[];
}

interface GardenPlanProps {
  garden: Garden;
  userPlants: UserPlantWithPlant[];
  companionRelationships: CompanionPlant[];
  onSaveLayout: (gardenId: number, layoutJson: string) => Promise<{ success?: boolean; error?: string }>;
}

const GRID_SIZE = 20;

function hashPlantName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const h = ((hash % 36) + 36) % 36;
  const s = 40 + (((hash >> 4) % 20) + 20) % 20;
  const l = 70 + (((hash >> 8) % 10) + 10) % 10;
  return `hsl(${h * 10}, ${s}%, ${l}%)`;
}

function getPlantEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tomate")) return "🍅";
  if (n.includes("carotte")) return "🥕";
  if (n.includes("concombre") || n.includes("courgette")) return "🥒";
  if (n.includes("laitue") || n.includes("mesclun") || n.includes("épinard") || n.includes("epinard")) return "🥬";
  if (n.includes("poivron") || n.includes("piment")) return "🫑";
  if (n.includes("aubergine")) return "🍆";
  if (n.includes("brocoli")) return "🥦";
  if (n.includes("chou")) return "🥬";
  if (n.includes("haricot")) return "🫘";
  if (n.includes("pois")) return "🫛";
  if (n.includes("maïs") || n.includes("mais")) return "🌽";
  if (n.includes("oignon")) return "🧅";
  if (n.includes("ail")) return "🧄";
  if (n.includes("citrouille") || n.includes("courge")) return "🎃";
  if (n.includes("melon")) return "🍈";
  return "🌱";
}

function DraggablePlantCard({
  userPlantId,
  plant,
  isPlaced,
}: {
  userPlantId: number;
  plant: Plant;
  isPlaced: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${userPlantId}`,
    data: { userPlantId, source: "sidebar" },
    disabled: isPlaced,
  });

  const color = hashPlantName(plant.name);
  const emoji = getPlantEmoji(plant.name);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-2 rounded-lg border border-[#E8E4DE] bg-white select-none transition-opacity ${
        isPlaced
          ? "opacity-40 cursor-default"
          : isDragging
          ? "opacity-40 cursor-grabbing"
          : "cursor-grab hover:border-[#2D5A3D] hover:shadow-sm"
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: color }}
      >
        {plant.name.slice(0, 3).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#2A2622] truncate">{emoji} {plant.name}</p>
        {plant.spacing_cm && (
          <p className="text-xs text-[#7D766E]">{plant.spacing_cm}cm</p>
        )}
      </div>
    </div>
  );
}

function GridCell({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${x}-${y}`,
    data: { gridX: x, gridY: y },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border border-[#E8E4DE] relative flex items-center justify-center transition-colors ${
        isOver ? "bg-[#DCFCE7]" : "bg-white hover:bg-[#F5F2EE]"
      }`}
      style={{ aspectRatio: "1" }}
    >
      {children}
    </div>
  );
}

function PlantCircle({
  plant,
  userPlantId,
  gridX,
  gridY,
}: {
  plant: Plant;
  userPlantId: number;
  gridX: number;
  gridY: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed-${userPlantId}`,
    data: { userPlantId, source: "grid", gridX, gridY },
  });

  const color = hashPlantName(plant.name);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full h-full flex items-center justify-center cursor-grab select-none ${
        isDragging ? "opacity-40" : ""
      }`}
      title={plant.name}
    >
      <div
        className="rounded-full flex items-center justify-center text-xs font-bold leading-none"
        style={{
          backgroundColor: color,
          width: "80%",
          height: "80%",
        }}
      >
        {plant.name.slice(0, 3).toUpperCase()}
      </div>
    </div>
  );
}

export function GardenPlan({
  garden,
  userPlants,
  companionRelationships,
  onSaveLayout,
}: GardenPlanProps) {
  const [positions, setPositions] = useState<PlantPosition[]>(() => {
    if (!garden.layout_json) return [];
    try {
      const parsed = JSON.parse(garden.layout_json) as LayoutJson;
      return parsed.positions ?? [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getPositionForUserPlant = useCallback(
    (userPlantId: number): PlantPosition | undefined =>
      positions.find((p) => p.plantId === userPlantId),
    [positions]
  );

  const unplacedPlants = userPlants.filter(
    ({ userPlant }) => !getPositionForUserPlant(userPlant.id)
  );

  const activePlantData = activeId
    ? userPlants.find(({ userPlant }) =>
        activeId === `sidebar-${userPlant.id}` ||
        activeId === `placed-${userPlant.id}`
      )
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overData = over.data.current as { gridX: number; gridY: number } | undefined;
    if (!overData) return;

    const { gridX, gridY } = overData;
    const activeData = active.data.current as {
      userPlantId: number;
      source: "sidebar" | "grid";
      gridX?: number;
      gridY?: number;
    };
    const { userPlantId } = activeData;

    const occupant = positions.find(
      (p) => p.gridX === gridX && p.gridY === gridY && p.plantId !== userPlantId
    );
    if (occupant) return;

    setPositions((prev) => {
      const without = prev.filter((p) => p.plantId !== userPlantId);
      return [...without, { plantId: userPlantId, gridX, gridY }];
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    const layout: LayoutJson = { positions };
    const result = await onSaveLayout(garden.id, JSON.stringify(layout));
    setSaving(false);
    if (result.error) {
      setSaveMessage(`Erreur: ${result.error}`);
    } else {
      setSaveMessage("Plan sauvegardé!");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  function handleRemoveFromGrid(userPlantId: number) {
    setPositions((prev) => prev.filter((p) => p.plantId !== userPlantId));
  }

  const totalAreaM2 =
    garden.length_m && garden.width_m
      ? garden.length_m * garden.width_m
      : null;

  const usedAreaM2 = userPlants.reduce((sum, { plant, userPlant }) => {
    if (plant.spacing_cm && plant.row_spacing_cm) {
      return (
        sum +
        ((plant.spacing_cm * plant.row_spacing_cm) / 10000) * userPlant.quantity
      );
    }
    return sum;
  }, 0);

  const spacePercent =
    totalAreaM2 && totalAreaM2 > 0
      ? Math.min(100, Math.round((usedAreaM2 / totalAreaM2) * 100))
      : null;

  const plantIdToUserPlant = new Map(
    userPlants.map(({ userPlant, plant }) => [userPlant.id, { userPlant, plant }])
  );

  const placedPlantsByCell = new Map<string, number>();
  for (const pos of positions) {
    placedPlantsByCell.set(`${pos.gridX}-${pos.gridY}`, pos.plantId);
  }

  const companionLineData: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    relationship: "beneficial" | "antagonistic";
  }> = [];

  for (const rel of companionRelationships) {
    const posA = positions.find((p) => {
      const up = userPlants.find((u) => u.userPlant.id === p.plantId);
      return up?.plant.id === rel.plant_a_id;
    });
    const posB = positions.find((p) => {
      const up = userPlants.find((u) => u.userPlant.id === p.plantId);
      return up?.plant.id === rel.plant_b_id;
    });

    if (posA && posB) {
      const cellSize = 100 / GRID_SIZE;
      companionLineData.push({
        x1: (posA.gridX + 0.5) * cellSize,
        y1: (posA.gridY + 0.5) * cellSize,
        x2: (posB.gridX + 0.5) * cellSize,
        y2: (posB.gridY + 0.5) * cellSize,
        relationship: rel.relationship,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Plan du jardin
          </h1>
          <p className="text-sm text-[#7D766E] mt-1">{garden.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={`text-sm font-medium ${
                saveMessage.startsWith("Erreur") ? "text-[#C4463A]" : "text-[#3D8B5D]"
              }`}
            >
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-9 items-center px-4 bg-[#2D5A3D] hover:bg-[#3D7A52] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {spacePercent !== null && (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#3D3832]">
              Espace utilisé
            </span>
            <span className="text-sm text-[#7D766E]">
              {usedAreaM2.toFixed(1)} m² / {totalAreaM2?.toFixed(1)} m² ({spacePercent}%)
            </span>
          </div>
          <div className="w-full bg-[#F5F2EE] rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all"
              style={{
                width: `${spacePercent}%`,
                backgroundColor:
                  spacePercent > 90
                    ? "#C4463A"
                    : spacePercent > 70
                    ? "#D4973B"
                    : "#2D5A3D",
              }}
            />
          </div>
        </div>
      )}

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div
              className="relative border-2 border-[#2D5A3D] rounded-lg overflow-hidden bg-[#F5F2EE]"
              ref={gridRef}
              style={{ aspectRatio: "1" }}
            >
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                }}
              >
                {Array.from({ length: GRID_SIZE }, (_, y) =>
                  Array.from({ length: GRID_SIZE }, (_, x) => {
                    const userPlantId = placedPlantsByCell.get(`${x}-${y}`);
                    const plantData = userPlantId !== undefined
                      ? plantIdToUserPlant.get(userPlantId)
                      : undefined;

                    return (
                      <GridCell key={`${x}-${y}`} x={x} y={y}>
                        {plantData && (
                          <PlantCircle
                            plant={plantData.plant}
                            userPlantId={plantData.userPlant.id}
                            gridX={x}
                            gridY={y}
                          />
                        )}
                      </GridCell>
                    );
                  })
                )}
              </div>

              {companionLineData.length > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ width: "100%", height: "100%" }}
                >
                  {companionLineData.map((line, i) => (
                    <line
                      key={i}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={line.relationship === "beneficial" ? "#4A9E4A" : "#C4463A"}
                      strokeWidth="0.5"
                      strokeDasharray="2 1"
                      strokeOpacity="0.8"
                    />
                  ))}
                </svg>
              )}
            </div>
            {garden.length_m && garden.width_m && (
              <p className="text-xs text-[#7D766E] mt-1 text-center">
                {garden.length_m}m × {garden.width_m}m — grille {GRID_SIZE}×{GRID_SIZE}
              </p>
            )}
          </div>

          <div className="w-52 shrink-0 space-y-2">
            <h2 className="text-sm font-semibold text-[#3D3832]">Plantes</h2>

            {userPlants.length === 0 && (
              <p className="text-xs text-[#7D766E]">
                Aucune plante dans votre jardin.
              </p>
            )}

            {unplacedPlants.length === 0 && userPlants.length > 0 && (
              <div className="text-xs text-[#3D8B5D] font-medium bg-[#DCFCE7] rounded-lg p-2">
                Toutes les plantes sont placées ✓
              </div>
            )}

            {unplacedPlants.map(({ userPlant, plant }) => (
              <DraggablePlantCard
                key={userPlant.id}
                userPlantId={userPlant.id}
                plant={plant}
                isPlaced={false}
              />
            ))}

            {positions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-[#7D766E] uppercase tracking-wide mb-2">
                  Placées
                </h3>
                {positions.map((pos) => {
                  const plantData = plantIdToUserPlant.get(pos.plantId);
                  if (!plantData) return null;
                  return (
                    <div
                      key={pos.plantId}
                      className="flex items-center justify-between gap-1 p-1.5 rounded-lg border border-[#E8E4DE] bg-white mb-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: hashPlantName(plantData.plant.name) }}
                        >
                          {plantData.plant.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs text-[#2A2622] truncate">
                          {plantData.plant.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFromGrid(pos.plantId)}
                        className="text-[#7D766E] hover:text-[#C4463A] text-xs shrink-0 p-0.5"
                        title="Retirer du plan"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {companionRelationships.length > 0 && (
              <div className="mt-4 p-2 rounded-lg bg-[#F5F2EE] space-y-1">
                <p className="text-xs font-semibold text-[#3D3832]">Légende</p>
                <div className="flex items-center gap-1.5">
                  <svg width="20" height="8" viewBox="0 0 20 8">
                    <line
                      x1="0" y1="4" x2="20" y2="4"
                      stroke="#4A9E4A"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                  <span className="text-xs text-[#7D766E]">Bénéfique</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="20" height="8" viewBox="0 0 20 8">
                    <line
                      x1="0" y1="4" x2="20" y2="4"
                      stroke="#C4463A"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                  <span className="text-xs text-[#7D766E]">Antagoniste</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activePlantData && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg opacity-90"
              style={{ backgroundColor: hashPlantName(activePlantData.plant.name) }}
            >
              {activePlantData.plant.name.slice(0, 3).toUpperCase()}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
