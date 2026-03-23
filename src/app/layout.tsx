import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { HeaderUserMenu } from "@/components/auth/header-user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ChatWidget } from "@/components/chat/chat-widget";
import { HeaderWeatherServer } from "@/components/layout/header-weather-server";

export const metadata: Metadata = {
  title: "PlantesPlanner",
  description: "Votre assistant pour le potager au Québec",
};

const navLinks = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/garden", label: "Mon potager" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/journal", label: "Journal" },
  { href: "/report", label: "Rapport" },
  { href: "/shopping", label: "Achats" },
  { href: "/settings", label: "Paramètres" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#FAF8F5] text-[#2A2622]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <header className="relative bg-white border-b border-[#E8E4DE] sticky top-0 z-40">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex-shrink-0 text-xl font-bold tracking-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              <span className="text-[#2D5A3D]">Plantes</span>
              <span className="text-[#C4703F]">Planner</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#5C5650] hover:text-[#2D5A3D] hover:bg-[#F5F2EE] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <HeaderWeatherServer />
              </Suspense>
              <HeaderUserMenu />
              <MobileNav />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>

        <ChatWidget />
      </body>
    </html>
  );
}
