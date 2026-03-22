"use client";

import { useState } from "react";

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

interface ReportResponse {
  report: string | null;
  generatedAt: string;
  year: number;
  error?: string;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-[#2A2622]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatReport(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-3" />);
      continue;
    }

    if (/^#{1,2}\s/.test(trimmed)) {
      elements.push(
        <h2
          key={key++}
          className="text-lg font-bold text-[#2A2622] mt-6 mb-2 pb-1 border-b border-[#E8E4DE]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {trimmed.replace(/^#{1,2}\s/, "")}
        </h2>
      );
    } else if (/^#{3}\s/.test(trimmed)) {
      elements.push(
        <h3
          key={key++}
          className="text-base font-bold text-[#2D5A3D] mt-4 mb-1"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {trimmed.replace(/^#{3}\s/, "")}
        </h3>
      );
    } else if (/^\d+[\)\.]\s/.test(trimmed)) {
      elements.push(
        <p key={key++} className="text-sm text-[#3D3832] pl-4">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      elements.push(
        <p key={key++} className="text-sm text-[#3D3832] pl-4">
          • {renderInlineFormatting(trimmed.replace(/^[-•*]\s/, ""))}
        </p>
      );
    } else {
      elements.push(
        <p key={key++} className="text-sm text-[#3D3832] leading-relaxed">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    }
  }

  return elements;
}

export default function ReportPage() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`/api/report?year=${selectedYear}`);
      const data = await res.json() as ReportResponse;

      if (!res.ok || data.error) {
        setError(data.error ?? "Erreur lors de la génération du rapport");
        return;
      }

      setReport(data);
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1
          className="text-3xl font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Bilan de saison
        </h1>
        {report?.report && (
          <button
            onClick={handlePrint}
            className="inline-flex h-9 items-center px-4 border border-[#E8E4DE] bg-white hover:bg-[#F5F2EE] text-[#3D3832] font-medium rounded-lg text-sm transition-colors print:hidden"
          >
            Enregistrer en PDF
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <div>
          <label
            htmlFor="year-select"
            className="block text-sm font-medium text-[#3D3832] mb-1"
          >
            Année
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white text-[#2A2622]"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="self-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex h-9 items-center px-4 bg-[#2D5A3D] hover:bg-[#3D7A52] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {loading ? "Génération en cours..." : "Générer le rapport"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FEE2E2] border border-[#C4463A] rounded-xl p-4">
          <p className="text-sm text-[#C4463A] font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#7D766E]">
            L&apos;IA analyse votre saison de jardinage...
          </p>
        </div>
      )}

      {report && !report.report && (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-8 text-center">
          <span className="text-4xl block mb-3">🌱</span>
          <p className="text-sm text-[#7D766E]">
            Aucune donnée pour cette saison. Commencez à utiliser l&apos;app
            pour générer votre premier bilan!
          </p>
        </div>
      )}

      {report?.report && (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-6 space-y-1">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E4DE]">
            <span
              className="text-lg font-semibold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Bilan {report.year}
            </span>
            <span className="text-xs text-[#7D766E]">
              Généré le{" "}
              {new Date(report.generatedAt).toLocaleDateString("fr-CA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="space-y-1">{formatReport(report.report)}</div>
          <div className="pt-4 mt-4 border-t border-[#E8E4DE] flex justify-center print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex h-10 items-center px-6 bg-[#C4703F] hover:bg-[#D4854F] text-white font-semibold rounded-lg text-sm transition-colors"
            >
              📄 Enregistrer en PDF
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
