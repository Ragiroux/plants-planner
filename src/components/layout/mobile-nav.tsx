"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/garden", label: "Mon jardin" },
  { href: "/journal", label: "Journal" },
  { href: "/report", label: "Rapport" },
  { href: "/shopping", label: "Achats" },
  { href: "/settings", label: "Paramètres" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-[#2A2622] hover:bg-[#F5F2EE] transition-colors"
        aria-label="Menu"
        aria-expanded={open}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-[#E8E4DE] shadow-sm px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#3D3832] hover:bg-[#F5F2EE] hover:text-[#2D5A3D] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
