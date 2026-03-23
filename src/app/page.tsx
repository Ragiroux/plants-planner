import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] -mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[#FAF8F5]">
      <div className="max-w-2xl w-full text-center py-20">
        <h1
          className="text-5xl font-bold tracking-tight mb-4"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          <span className="text-[#2D5A3D]">Plantes</span>
          <span className="text-[#C4703F]">Planner</span>
        </h1>

        <p
          className="text-xl text-[#5C5650] mb-3 font-light leading-relaxed"
          style={{ fontFamily: "Fraunces, serif", fontStyle: "italic" }}
        >
          Planifiez votre potager avec confiance.
        </p>

        <p className="text-base text-[#7D766E] mb-10 max-w-lg mx-auto leading-relaxed">
          Calendriers de semis personnalisés pour votre zone climatique au Québec,
          suivi de vos plantes et rappels hebdomadaires.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center px-8 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-base transition-colors"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center px-8 border border-[#D4CFC7] hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 text-[#3D3832] font-medium rounded-lg text-base transition-colors bg-white"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              title: "Calendriers précis",
              desc: "Semis intérieurs, repiquage, transplantation — adaptés à votre zone.",
            },
            {
              title: "Associations de plantes",
              desc: "Découvrez quelles plantes se complémentent ou se nuisent dans votre potager.",
            },
            {
              title: "Rappels hebdomadaires",
              desc: "Recevez vos tâches de jardinage chaque semaine directement sur Slack.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl border border-[#E8E4DE] p-5 shadow-sm hover:-translate-y-px hover:shadow-md transition-all duration-200"
            >
              <h3
                className="text-base font-semibold text-[#2A2622] mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {feature.title}
              </h3>
              <p className="text-sm text-[#7D766E] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
