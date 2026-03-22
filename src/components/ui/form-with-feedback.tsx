"use client";

import { useActionState, useEffect, useState } from "react";

type ActionResult = { error?: string; success?: boolean } | void;

export function FormWithFeedback({
  action,
  children,
  className,
  successMessage = "Enregistré avec succès",
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (state) {
      setShowFeedback(true);
      const timer = setTimeout(() => setShowFeedback(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form action={formAction} className={className}>
      {children}
      {isPending && (
        <p className="text-sm text-[#7D766E] mt-2 animate-pulse">
          Enregistrement...
        </p>
      )}
      {showFeedback && state != null && !isPending && (
        <p
          className={`text-sm mt-2 transition-opacity ${
            state.error
              ? "text-[#C4463A]"
              : "text-[#3D8B5D]"
          }`}
        >
          {state.error ? `❌ ${state.error}` : `✓ ${successMessage}`}
        </p>
      )}
    </form>
  );
}
