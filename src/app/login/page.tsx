import { signIn } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "Fraunces, serif" }}>
            <span className="text-[#2D5A3D]">Plantes</span>
            <span className="text-[#C4703F]">Planner</span>
          </h1>
          <p className="mt-3 text-[#5C5650] text-sm font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Votre assistant pour le potager
          </p>
        </div>

        <Card className="border border-[#E8E4DE] shadow-sm bg-white rounded-xl">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2
              className="text-lg font-semibold text-[#2A2622] text-center"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Connectez-vous
            </h2>
            <p className="text-sm text-[#7D766E] text-center mt-1">
              Choisissez votre méthode de connexion
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4 flex flex-col gap-3">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 border-[#D4CFC7] hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 text-[#2A2622] font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuer avec Google
              </Button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 border-[#D4CFC7] hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 text-[#2A2622] font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
                  <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
                  <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
                  <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
                </svg>
                Continuer avec Microsoft
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#A9A29A] mt-6">
          En vous connectant, vous acceptez nos conditions d&apos;utilisation.
        </p>
      </div>
    </main>
  );
}
