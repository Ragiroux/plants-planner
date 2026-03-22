"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toMeters, type UnitPreference } from "@/lib/units";
import {
  updateClimateZone,
  updateLocation,
  updateSoilType,
  updateUnitPreference,
} from "@/app/settings/actions";
import { createGarden } from "@/app/garden/actions";

const STEPS = [
  { label: "Zone" },
  { label: "Localisation" },
  { label: "Jardin" },
  { label: "Sol" },
];

const soilTypeOptions = [
  { value: "sandy", label: "Sableux" },
  { value: "loamy", label: "Limoneux" },
  { value: "clay", label: "Argileux" },
  { value: "silty", label: "Silteux" },
  { value: "peaty", label: "Tourbeux" },
  { value: "chalky", label: "Calcaire" },
];

function ProgressDots({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-start justify-center gap-6 mb-8">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <div key={step.label} className="flex flex-col items-center gap-1.5">
            <div
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: isCurrent ? 28 : 20,
                height: isCurrent ? 28 : 20,
                backgroundColor:
                  isCompleted || isCurrent ? "#2D5A3D" : "transparent",
                border: isCompleted || isCurrent ? "none" : "2px solid #E8E4DE",
              }}
            >
              {isCompleted && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 6L5 9L10 3"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="text-xs text-[#7D766E]">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedZone, setSelectedZone] = useState<"zone_3_4" | "zone_5_6" | null>(null);
  const [city, setCity] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [gardenName, setGardenName] = useState("Mon potager");
  const [unitPref, setUnitPref] = useState<UnitPreference>("meters");
  const [lengthInput, setLengthInput] = useState("");
  const [widthInput, setWidthInput] = useState("");
  const [soilType, setSoilType] = useState("");

  const unitLabel = unitPref === "feet" ? "pi" : "m";

  async function showSuccessAndAdvance() {
    setFeedback("Enregistré");
    await new Promise((r) => setTimeout(r, 600));
    setFeedback(null);
    setCurrentStep((s) => s + 1);
  }

  async function handleStep1() {
    if (!selectedZone) return;
    setIsSubmitting(true);
    const result = await updateClimateZone(selectedZone);
    setIsSubmitting(false);
    if (result && "error" in result && result.error) {
      setFeedback(`Erreur: ${result.error}`);
      return;
    }
    await showSuccessAndAdvance();
  }

  async function handleStep2() {
    if (city || lat || lon) {
      setIsSubmitting(true);
      const latNum = lat ? parseFloat(lat) : null;
      const lonNum = lon ? parseFloat(lon) : null;
      await updateLocation(city, latNum, lonNum);
      setIsSubmitting(false);
    }
    setFeedback(null);
    setCurrentStep((s) => s + 1);
  }

  async function handleStep2Skip() {
    setCurrentStep((s) => s + 1);
  }

  async function handleStep3() {
    const lengthVal = parseFloat(lengthInput);
    const widthVal = parseFloat(widthInput);
    if (!gardenName.trim() || isNaN(lengthVal) || isNaN(widthVal) || lengthVal <= 0 || widthVal <= 0) {
      setFeedback("Veuillez remplir tous les champs correctement.");
      return;
    }
    setIsSubmitting(true);
    const lengthM = toMeters(lengthVal, unitPref);
    const widthM = toMeters(widthVal, unitPref);
    const formData = new FormData();
    formData.set("name", gardenName.trim());
    formData.set("length_m", String(lengthM));
    formData.set("width_m", String(widthM));
    const gardenResult = await createGarden(formData);
    if (gardenResult && "error" in gardenResult && gardenResult.error) {
      setIsSubmitting(false);
      setFeedback(`Erreur: ${gardenResult.error}`);
      return;
    }
    await updateUnitPreference(unitPref);
    setIsSubmitting(false);
    await showSuccessAndAdvance();
  }

  async function handleStep3Skip() {
    setCurrentStep((s) => s + 1);
  }

  async function handleStep4() {
    if (soilType) {
      setIsSubmitting(true);
      await updateSoilType(soilType);
      setIsSubmitting(false);
    }
    router.push("/garden/add");
  }

  async function handleStep4Skip() {
    router.push("/garden/add");
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="max-w-lg w-full mx-auto bg-white rounded-2xl border border-[#E8E4DE] shadow-sm p-8">
        <ProgressDots currentStep={currentStep} />

        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h1
                className="text-3xl font-bold text-[#2A2622]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Bienvenue sur PlantesPlanner
              </h1>
              <p className="text-sm text-[#7D766E] mt-2">
                Configurons votre profil de jardinage
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedZone("zone_3_4")}
                className="w-full text-left p-4 rounded-xl border-2 transition-colors"
                style={{
                  borderColor: selectedZone === "zone_3_4" ? "#2D5A3D" : "#E8E4DE",
                  backgroundColor: selectedZone === "zone_3_4" ? "#f0f7ed" : "white",
                }}
              >
                <p className="text-sm font-semibold text-[#3D3832]">Zone 3-4</p>
                <p className="text-xs text-[#7D766E] mt-0.5">
                  Régions nordiques — Saguenay, Abitibi, Bas-Saint-Laurent. Dernier gel fin mai.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedZone("zone_5_6")}
                className="w-full text-left p-4 rounded-xl border-2 transition-colors"
                style={{
                  borderColor: selectedZone === "zone_5_6" ? "#2D5A3D" : "#E8E4DE",
                  backgroundColor: selectedZone === "zone_5_6" ? "#f0f7ed" : "white",
                }}
              >
                <p className="text-sm font-semibold text-[#3D3832]">Zone 5-6</p>
                <p className="text-xs text-[#7D766E] mt-0.5">
                  Montréal, Québec, Estrie. Dernier gel mi-mai.
                </p>
              </button>
            </div>

            {feedback && (
              <p className="text-sm text-[#C4463A]">{feedback}</p>
            )}
            {isSubmitting && (
              <p className="text-sm text-[#7D766E] animate-pulse">Enregistrement...</p>
            )}

            <button
              type="button"
              onClick={handleStep1}
              disabled={!selectedZone || isSubmitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#C4703F" }}
              onMouseEnter={(e) => {
                if (!isSubmitting && selectedZone) e.currentTarget.style.backgroundColor = "#D4854F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#C4703F";
              }}
            >
              Suivant
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2
              className="text-2xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Votre localisation
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#3D3832] mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Montréal"
                  className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#3D3832] mb-1">
                    Latitude (optionnel)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="45.5017"
                    className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#3D3832] mb-1">
                    Longitude (optionnel)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    placeholder="-73.5673"
                    className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                  />
                </div>
              </div>
            </div>

            {isSubmitting && (
              <p className="text-sm text-[#7D766E] animate-pulse">Enregistrement...</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStep2}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#C4703F" }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = "#D4854F";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#C4703F";
                }}
              >
                Suivant
              </button>
              <button
                type="button"
                onClick={handleStep2Skip}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-[#5C5650] bg-[#F5F2EE] rounded-lg transition-colors hover:bg-[#E8E4DE]"
              >
                Passer
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2
              className="text-2xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Créez votre jardin
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3832] mb-1">
                  Nom du jardin
                </label>
                <input
                  type="text"
                  value={gardenName}
                  onChange={(e) => setGardenName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3832] mb-2">
                  Unité de mesure
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUnitPref("meters")}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: unitPref === "meters" ? "#2D5A3D" : "#F5F2EE",
                      color: unitPref === "meters" ? "white" : "#5C5650",
                    }}
                  >
                    Mètres
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitPref("feet")}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: unitPref === "feet" ? "#2D5A3D" : "#F5F2EE",
                      color: unitPref === "feet" ? "white" : "#5C5650",
                    }}
                  >
                    Pieds
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#3D3832] mb-1">
                    Longueur ({unitLabel})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={lengthInput}
                    onChange={(e) => setLengthInput(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#3D3832] mb-1">
                    Largeur ({unitLabel})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                  />
                </div>
              </div>
            </div>

            {feedback && (
              <p className="text-sm text-[#C4463A]">{feedback}</p>
            )}
            {isSubmitting && (
              <p className="text-sm text-[#7D766E] animate-pulse">Enregistrement...</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStep3}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#C4703F" }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = "#D4854F";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#C4703F";
                }}
              >
                Suivant
              </button>
              <button
                type="button"
                onClick={handleStep3Skip}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-[#5C5650] bg-[#F5F2EE] rounded-lg transition-colors hover:bg-[#E8E4DE]"
              >
                Passer
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2
              className="text-2xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Type de sol
            </h2>

            <div>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
              >
                <option value="">Sélectionner un type de sol</option>
                {soilTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isSubmitting && (
              <p className="text-sm text-[#7D766E] animate-pulse">Enregistrement...</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStep4}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#C4703F" }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = "#D4854F";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#C4703F";
                }}
              >
                Terminer
              </button>
              <button
                type="button"
                onClick={handleStep4Skip}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-[#5C5650] bg-[#F5F2EE] rounded-lg transition-colors hover:bg-[#E8E4DE]"
              >
                Passer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
