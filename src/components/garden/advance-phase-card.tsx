"use client";

import { useState, useTransition } from "react";
import { advancePhase } from "@/app/garden/actions";

interface AdvancePhaseCardProps {
  userPlantId: number;
  quantity: number;
  nextPhaseAction: "repiquage" | "transplant" | null;
}

export function AdvancePhaseCard({
  userPlantId,
  quantity,
  nextPhaseAction,
}: AdvancePhaseCardProps) {
  const [selectedQty, setSelectedQty] = useState(quantity);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!nextPhaseAction) return null;

  const label =
    nextPhaseAction === "repiquage" ? "Passer au repiquage" : "Passer au potager";

  function handleAdvance() {
    setError(null);
    startTransition(async () => {
      const result = await advancePhase(userPlantId, nextPhaseAction!, selectedQty);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="bg-white border border-[#E8E4DE] rounded-xl p-4 space-y-3">
      <h3
        className="text-base font-semibold text-[#2A2622]"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Prochaine étape
      </h3>

      {quantity > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#7D766E]">Quantité à avancer :</span>
          <div className="flex items-center border border-[#E8E4DE] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
              disabled={isPending}
              className="px-2 py-1 text-sm text-[#5C5650] hover:bg-[#F5F2EE] transition-colors disabled:opacity-50"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={quantity}
              value={selectedQty}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setSelectedQty(Math.min(quantity, Math.max(1, val)));
              }}
              className="w-12 text-center text-sm border-x border-[#E8E4DE] py-1 focus:outline-none bg-white"
            />
            <button
              type="button"
              onClick={() => setSelectedQty((q) => Math.min(quantity, q + 1))}
              disabled={isPending}
              className="px-2 py-1 text-sm text-[#5C5650] hover:bg-[#F5F2EE] transition-colors disabled:opacity-50"
            >
              +
            </button>
          </div>
          <span className="text-xs text-[#A9A29A]">sur {quantity}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdvance}
        disabled={isPending}
        className="px-4 py-2 text-sm font-semibold bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors disabled:opacity-60"
      >
        {isPending ? "..." : label}
      </button>

      {error && (
        <p className="text-xs text-[#C4463A]">{error}</p>
      )}
    </div>
  );
}
