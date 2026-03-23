"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormWithFeedback } from "@/components/ui/form-with-feedback";
import {
  updateClimateZone,
  updateLocation,
  updateSoilType,
  updateSlackWebhook,
  updateGardenDimensions,
  updateUnitPreference,
} from "./actions";
import { fromMeters, toMeters, unitLabel as getUnitLabel, type UnitPreference } from "@/lib/units";
import type { AIProvider } from "@/lib/ai";

const soilTypeOptions = [
  { value: "sandy", label: "Sableux" },
  { value: "loamy", label: "Limoneux" },
  { value: "clay", label: "Argileux" },
  { value: "silty", label: "Silteux" },
  { value: "peaty", label: "Tourbeux" },
  { value: "chalky", label: "Calcaire" },
];

interface SettingsFormsProps {
  user: {
    climate_zone: "zone_3_4" | "zone_5_6" | null;
    location_city: string | null;
    location_lat: number | null;
    location_lon: number | null;
    soil_type: string | null;
    slack_webhook: string | null;
  } | null;
  primaryGarden: {
    id: number;
    name: string;
    length_m: number | null;
    width_m: number | null;
  } | null;
  unitPreference: UnitPreference;
  aiProvider: AIProvider | null;
}

export function SettingsForms({ user, primaryGarden, unitPreference, aiProvider }: SettingsFormsProps) {
  const unitLbl = getUnitLabel(unitPreference);

  return (
    <>
      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
            Zone climatique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormWithFeedback
            action={async (_prev, formData) => {
              const zone = formData.get("zone") as "zone_3_4" | "zone_5_6";
              return await updateClimateZone(zone);
            }}
            className="space-y-3"
            successMessage="Zone climatique enregistrée"
          >
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="radio" name="zone" value="zone_3_4" defaultChecked={user?.climate_zone === "zone_3_4"} className="mt-1 accent-[#2D5A3D]" />
              <div>
                <p className="text-sm font-semibold text-[#3D3832]">Zone 3-4</p>
                <p className="text-xs text-[#7D766E] mt-0.5">Régions nordiques — Saguenay, Abitibi, Bas-Saint-Laurent. Dernier gel fin mai.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="radio" name="zone" value="zone_5_6" defaultChecked={!user?.climate_zone || user?.climate_zone === "zone_5_6"} className="mt-1 accent-[#2D5A3D]" />
              <div>
                <p className="text-sm font-semibold text-[#3D3832]">Zone 5-6</p>
                <p className="text-xs text-[#7D766E] mt-0.5">Montréal, Québec, Estrie. Dernier gel mi-mai.</p>
              </div>
            </label>
            <button type="submit" className="mt-2 px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors">
              Enregistrer
            </button>
          </FormWithFeedback>
        </CardContent>
      </Card>

      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormWithFeedback
            action={async (_prev, formData) => {
              const city = (formData.get("city") as string) ?? "";
              const latStr = formData.get("lat") as string;
              const lonStr = formData.get("lon") as string;
              const lat = latStr ? parseFloat(latStr) : null;
              const lon = lonStr ? parseFloat(lonStr) : null;
              return await updateLocation(city, lat, lon);
            }}
            className="space-y-3"
            successMessage="Localisation enregistrée"
          >
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-[#3D3832] mb-1">Ville</label>
              <input id="city" name="city" type="text" defaultValue={user?.location_city ?? ""} placeholder="Ex: Montréal" className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="lat" className="block text-sm font-medium text-[#3D3832] mb-1">Latitude (optionnel)</label>
                <input id="lat" name="lat" type="number" step="0.0001" defaultValue={user?.location_lat ?? ""} placeholder="45.5017" className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white" />
              </div>
              <div className="flex-1">
                <label htmlFor="lon" className="block text-sm font-medium text-[#3D3832] mb-1">Longitude (optionnel)</label>
                <input id="lon" name="lon" type="number" step="0.0001" defaultValue={user?.location_lon ?? ""} placeholder="-73.5673" className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white" />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors">
              Enregistrer
            </button>
          </FormWithFeedback>
        </CardContent>
      </Card>

      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
            Type de sol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormWithFeedback
            action={async (_prev, formData) => {
              const soilType = formData.get("soil_type") as string;
              return await updateSoilType(soilType);
            }}
            className="space-y-3"
            successMessage="Type de sol enregistré"
          >
            <div>
              <select name="soil_type" defaultValue={user?.soil_type ?? ""} className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white">
                <option value="">Sélectionner un type de sol</option>
                {soilTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors">
              Enregistrer
            </button>
          </FormWithFeedback>
        </CardContent>
      </Card>

      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
            Unité de mesure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormWithFeedback
            action={async (_prev, formData) => {
              const unit = formData.get("unit_preference") as "meters" | "feet";
              return await updateUnitPreference(unit);
            }}
            className="space-y-3"
            successMessage="Unité de mesure enregistrée"
          >
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="unit_preference" value="meters" defaultChecked={unitPreference === "meters"} className="accent-[#2D5A3D]" />
                <span className="text-sm font-medium text-[#3D3832]">Mètres</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="unit_preference" value="feet" defaultChecked={unitPreference === "feet"} className="accent-[#2D5A3D]" />
                <span className="text-sm font-medium text-[#3D3832]">Pieds (pi)</span>
              </label>
            </div>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors">
              Enregistrer
            </button>
          </FormWithFeedback>
        </CardContent>
      </Card>

      {primaryGarden && (
        <Card className="border-[#E8E4DE]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
              Dimensions du potager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#7D766E] mb-4">{primaryGarden.name}</p>
            <FormWithFeedback
              action={async (_prev, formData) => {
                const lengthDisplay = parseFloat(formData.get("length") as string);
                const widthDisplay = parseFloat(formData.get("width") as string);
                const length = toMeters(lengthDisplay, unitPreference);
                const width = toMeters(widthDisplay, unitPreference);
                return await updateGardenDimensions(primaryGarden.id, length, width);
              }}
              className="space-y-3"
              successMessage="Dimensions enregistrées"
            >
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="length" className="block text-sm font-medium text-[#3D3832] mb-1">Longueur ({unitLbl})</label>
                  <input id="length" name="length" type="number" step="0.1" min="0.1" defaultValue={primaryGarden.length_m != null ? fromMeters(primaryGarden.length_m, unitPreference) : ""} placeholder="5" required className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white" />
                </div>
                <div className="flex-1">
                  <label htmlFor="width" className="block text-sm font-medium text-[#3D3832] mb-1">Largeur ({unitLbl})</label>
                  <input id="width" name="width" type="number" step="0.1" min="0.1" defaultValue={primaryGarden.width_m != null ? fromMeters(primaryGarden.width_m, unitPreference) : ""} placeholder="3" required className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white" />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors">
                Enregistrer
              </button>
            </FormWithFeedback>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
              Intelligence artificielle
            </CardTitle>
            <div className="flex items-center gap-2">
              {aiProvider === "gemini" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#3D8B5D] inline-block" />
                  <span className="text-xs text-[#3D8B5D] font-medium">Gemini (gratuit)</span>
                </>
              )}
              {aiProvider === "claude" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#5B21B6] inline-block" />
                  <span className="text-xs text-[#5B21B6] font-medium">Claude</span>
                </>
              )}
              {!aiProvider && (
                <span className="text-xs text-[#7D766E]">Non configuré</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#7D766E] mb-3">
            L&apos;assistant potager utilise l&apos;IA pour répondre à vos questions et générer des bilans de saison.
          </p>
          {!aiProvider && (
            <p className="text-sm text-[#3D3832] mb-3">
              Aucun service IA configuré. Obtenez une clé gratuite en quelques minutes.
            </p>
          )}
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2D5A3D] underline underline-offset-2 hover:text-[#3D7A52] transition-colors"
          >
            {aiProvider ? "Voir le guide de configuration" : "Comment configurer l\u2019assistant? →"}
          </Link>
        </CardContent>
      </Card>

      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#2A2622]" style={{ fontFamily: "Fraunces, serif" }}>
              Webhook Slack
            </CardTitle>
            <div className="flex items-center gap-2">
              {user?.slack_webhook ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#3D8B5D] inline-block" />
                  <span className="text-xs text-[#3D8B5D] font-medium">Configuré</span>
                </>
              ) : (
                <span className="text-xs text-[#7D766E]">Non configuré</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FormWithFeedback
            action={async (_prev, formData) => {
              const webhookUrl = formData.get("webhook_url") as string;
              return await updateSlackWebhook(webhookUrl);
            }}
            className="space-y-3"
            successMessage="Webhook testé et enregistré"
          >
            <div>
              <label htmlFor="webhook_url" className="block text-sm font-medium text-[#3D3832] mb-1">URL du webhook</label>
              <input id="webhook_url" name="webhook_url" type="url" defaultValue={user?.slack_webhook ?? ""} placeholder="https://hooks.slack.com/services/..." className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white" />
              <p className="text-xs text-[#A9A29A] mt-1">Un message de test sera envoyé avant l&apos;enregistrement.</p>
            </div>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors">
              Tester et enregistrer
            </button>
          </FormWithFeedback>
        </CardContent>
      </Card>
    </>
  );
}
