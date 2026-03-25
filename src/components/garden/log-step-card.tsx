"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logStep } from "@/app/garden/[id]/actions";
import { STEP_TYPE_OPTIONS, stepLabels, type StepType } from "@/lib/step-utils";

interface LogStepCardProps {
  userPlantId: number;
  quantity: number;
  nextPhaseAction: "repiquage" | "transplant" | null;
}

const phaseToStepType: Record<string, StepType> = {
  repiquage: "repiquage",
  transplant: "transplantation",
};

export function LogStepCard({
  userPlantId,
  quantity,
  nextPhaseAction,
}: LogStepCardProps) {
  const suggestedStepType = nextPhaseAction
    ? phaseToStepType[nextPhaseAction]
    : null;

  const [stepType, setStepType] = useState<StepType>(
    suggestedStepType ?? STEP_TYPE_OPTIONS[0]
  );
  const [notes, setNotes] = useState("");
  const [selectedQty, setSelectedQty] = useState(quantity);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Build options with suggested step first
  const options = suggestedStepType
    ? [
        suggestedStepType,
        ...STEP_TYPE_OPTIONS.filter((t) => t !== suggestedStepType),
      ]
    : STEP_TYPE_OPTIONS;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await logStep(userPlantId, stepType, {
        notes: notes || undefined,
        quantity: selectedQty,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setNotes("");
        setSelectedQty(quantity);
      }
    });
  }

  return (
    <Card className="border-[#E8E4DE]">
      <CardHeader className="pb-3">
        <CardTitle
          className="text-base text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Enregistrer une étape
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="step_type"
              className="block text-sm font-medium text-[#3D3832] mb-1"
            >
              Type d&apos;étape
            </label>
            <select
              id="step_type"
              value={stepType}
              onChange={(e) => setStepType(e.target.value as StepType)}
              className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
            >
              {options.map((type) => (
                <option key={type} value={type}>
                  {stepLabels[type]}
                  {type === suggestedStepType ? " (suggérée)" : ""}
                </option>
              ))}
            </select>
          </div>

          {quantity > 1 && (
            <div>
              <label className="block text-sm font-medium text-[#3D3832] mb-1">
                Combien de plants
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-[#E8E4DE] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedQty((q) => Math.max(1, q - 1))
                    }
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
                      setSelectedQty(
                        Math.min(quantity, Math.max(1, val))
                      );
                    }}
                    className="w-12 text-center text-sm border-x border-[#E8E4DE] py-1 focus:outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedQty((q) => Math.min(quantity, q + 1))
                    }
                    disabled={isPending}
                    className="px-2 py-1 text-sm text-[#5C5650] hover:bg-[#F5F2EE] transition-colors disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-[#A9A29A]">
                  sur {quantity}
                </span>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-[#3D3832] mb-1"
            >
              Notes (optionnel)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations, conditions..."
              className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {isPending ? "..." : "Enregistrer"}
          </button>

          {error && (
            <p className="text-xs text-[#C4463A]">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
