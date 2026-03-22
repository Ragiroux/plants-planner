import Link from "next/link";

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#2A2622] mb-3"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Configurer l&apos;assistant intelligent
          </h1>
          <p className="text-lg text-[#7D766E]">
            En 3 minutes, activez votre assistant de jardinage personnel
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-5">

          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                1
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-semibold text-[#2A2622] mb-2"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Créer un compte Google AI Studio
                </h2>
                <p className="text-[#3D3832] mb-3">
                  C&apos;est gratuit — pas besoin de carte de crédit!
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Visiter Google AI Studio
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <p className="text-sm text-[#7D766E] mt-3">
                  Connectez-vous avec votre compte Google — le même que Gmail.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                2
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-semibold text-[#2A2622] mb-2"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Copier votre clé API
                </h2>
                <p className="text-[#3D3832] mb-3">
                  Sur la page Google AI Studio, cliquez sur{" "}
                  <span className="font-semibold text-[#2A2622]">&ldquo;Create API Key&rdquo;</span>{" "}
                  puis copiez la clé qui commence par{" "}
                  <code className="bg-[#F5F2EE] text-[#2D5A3D] px-1.5 py-0.5 rounded text-sm font-mono">AI...</code>
                </p>
                <div className="flex items-start gap-2 bg-[#FFF8F0] border border-[#D4973B]/30 rounded-lg p-3">
                  <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                  <p className="text-sm text-[#7D766E]">
                    Gardez cette clé secrète — ne la partagez jamais avec personne.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                3
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-semibold text-[#2A2622] mb-2"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Ajouter la clé à PlantesPlanner
                </h2>
                <p className="text-[#3D3832] mb-3">
                  Ouvrez le fichier{" "}
                  <code className="bg-[#F5F2EE] text-[#2D5A3D] px-1.5 py-0.5 rounded text-sm font-mono">.env.local</code>{" "}
                  à la racine du projet et ajoutez votre clé:
                </p>
                <div className="bg-[#1A1816] rounded-lg p-4 mb-3">
                  <code className="text-sm font-mono text-[#A8E6B0]">
                    GEMINI_API_KEY=<span className="text-[#FFD580]">votre-clé-ici</span>
                  </code>
                </div>
                <p className="text-sm text-[#7D766E] mb-3">
                  Redémarrez ensuite votre application. C&apos;est tout!
                </p>
                <div className="flex items-start gap-2 bg-[#F0F9F4] border border-[#3D8B5D]/30 rounded-lg p-3">
                  <span className="text-base flex-shrink-0 mt-0.5">✅</span>
                  <p className="text-sm text-[#3D8B5D] font-medium">
                    Votre assistant jardin est prêt. Bonne culture!
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bonus section */}
        <div className="mt-10 space-y-5">
          <h2
            className="text-2xl font-semibold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Questions fréquentes
          </h2>

          <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6 shadow-sm">
            <h3
              className="text-base font-semibold text-[#2A2622] mb-2"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Qu&apos;est-ce que l&apos;assistant peut faire?
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[#3D3832]">
                <span className="text-[#2D5A3D] flex-shrink-0 mt-0.5">🌿</span>
                Répondre à vos questions de jardinage — par exemple{" "}
                <em>&ldquo;mes tomates ont des feuilles jaunes&rdquo;</em>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#3D3832]">
                <span className="text-[#2D5A3D] flex-shrink-0 mt-0.5">📅</span>
                Vous envoyer des conseils personnalisés chaque semaine dans Slack
              </li>
              <li className="flex items-start gap-2 text-sm text-[#3D3832]">
                <span className="text-[#2D5A3D] flex-shrink-0 mt-0.5">📊</span>
                Générer un bilan de fin de saison avec vos données de jardinage
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6 shadow-sm">
            <h3
              className="text-base font-semibold text-[#2A2622] mb-2"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Est-ce vraiment gratuit?
            </h3>
            <p className="text-sm text-[#3D3832]">
              Oui! Google offre un usage gratuit généreux — largement suffisant pour votre potager.
              Pour un jardinier qui utilise l&apos;assistant quelques fois par semaine, vous ne paierez rien.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6 shadow-sm">
            <h3
              className="text-base font-semibold text-[#2A2622] mb-2"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Ça fonctionne en français?
            </h3>
            <p className="text-sm text-[#3D3832]">
              Oui, l&apos;assistant répond toujours en français et connaît les spécificités du jardinage québécois.
            </p>
          </div>

        </div>

        {/* Back to settings */}
        <div className="mt-10 text-center">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-[#7D766E] hover:text-[#2A2622] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Retour aux paramètres
          </Link>
        </div>

      </div>
    </div>
  );
}
