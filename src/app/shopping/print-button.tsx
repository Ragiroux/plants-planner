"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-9 items-center px-4 border border-[#E8E4DE] bg-white hover:bg-[#F5F2EE] text-[#3D3832] font-medium rounded-lg text-sm transition-colors print:hidden"
    >
      Imprimer
    </button>
  );
}
