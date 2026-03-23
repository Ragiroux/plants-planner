import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user_plants, plants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateSeedsNeeded,
  getOverplantFactor,
  estimateSeedPacketPrice,
  quebecSeedCompanies,
} from "@/lib/seed-shopping";
import { PrintButton } from "./print-button";

export default async function ShoppingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userPlantRows = await db
    .select({
      userPlant: user_plants,
      plant: plants,
    })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, session.user.id));

  type ShoppingRow = {
    plantName: string;
    quantity: number;
    overplantFactor: number;
    seedsNeeded: number;
    pricePerPacket: number;
    subtotal: number;
  };

  const rows: ShoppingRow[] = userPlantRows.map(({ userPlant, plant }) => {
    const overplantFactor = getOverplantFactor(plant.frost_tolerance ?? "semi_hardy");
    const adjustedQuantity = Math.ceil(userPlant.quantity * overplantFactor);
    const seedsNeeded = calculateSeedsNeeded(adjustedQuantity);
    const pricePerPacket = estimateSeedPacketPrice(plant.name);
    const subtotal = pricePerPacket;
    return {
      plantName: plant.name,
      quantity: userPlant.quantity,
      overplantFactor,
      seedsNeeded,
      pricePerPacket,
      subtotal,
    };
  });

  const total = rows.reduce((sum, r) => sum + r.subtotal, 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1
          className="text-3xl font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Liste d&apos;achats de semences
        </h1>
        {rows.length > 0 && <PrintButton />}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-8 text-center">
          <span className="text-4xl block mb-3">🌱</span>
          <p className="text-sm text-[#7D766E]">
            Ajoutez des plantes à votre potager pour générer votre liste d&apos;achats
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E4DE] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E4DE] bg-[#F5F2EE]">
                <th className="text-left px-4 py-3 font-semibold text-[#3D3832]">
                  Plante
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#3D3832]">
                  Qté prévue
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#3D3832]">
                  Graines nécessaires
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#3D3832]">
                  Prix / sachet
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#3D3832]">
                  Sous-total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#F5F2EE] hover:bg-[#FAF8F5] transition-colors"
                >
                  <td className="px-4 py-3 text-[#2A2622] font-medium">
                    {row.plantName}
                  </td>
                  <td className="px-4 py-3 text-right text-[#3D3832] tabular-nums">
                    {row.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-[#3D3832] tabular-nums">
                    <span>{row.seedsNeeded}</span>
                    <span className="text-xs text-[#7D766E] ml-1">
                      (×{row.overplantFactor.toFixed(1)})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#3D3832] tabular-nums">
                    {row.pricePerPacket.toFixed(2)} $
                  </td>
                  <td className="px-4 py-3 text-right text-[#3D3832] tabular-nums font-medium">
                    {row.subtotal.toFixed(2)} $
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F2EE]">
                <td
                  colSpan={4}
                  className="px-4 py-3 text-right font-bold text-[#2A2622]"
                >
                  Total estimé
                </td>
                <td className="px-4 py-3 text-right font-bold text-[#2D5A3D] tabular-nums">
                  {total.toFixed(2)} $
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#E8E4DE]">
            <p className="text-xs text-[#7D766E]">
              * Les prix sont des estimations. Un sachet par variété est calculé.
              Le facteur de sursemis tient compte de la tolérance au gel de chaque plante.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E8E4DE] p-5 space-y-3">
        <h2
          className="text-lg font-semibold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Semenciers québécois
        </h2>
        <p className="text-sm text-[#7D766E]">
          Privilégiez les semenciers locaux pour des variétés adaptées au climat québécois.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quebecSeedCompanies.map((company) => (
            <a
              key={company.name}
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border border-[#E8E4DE] hover:border-[#2D5A3D] hover:bg-[#F5F2EE] transition-colors group"
            >
              <span className="text-sm font-medium text-[#2A2622] group-hover:text-[#2D5A3D]">
                {company.name}
              </span>
              <svg
                className="w-4 h-4 text-[#7D766E] group-hover:text-[#2D5A3D] shrink-0 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
