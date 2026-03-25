import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export type AIProvider = "gemini" | "claude";

export interface AIResponse {
  text: string;
}

export function getAIProvider(): AIProvider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

export async function callAI(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<AIResponse> {
  const { systemPrompt, userMessage, maxTokens = 4000 } = options;

  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      });

      const text = result.response.text();
      return { text };
    } catch (err: unknown) {
      console.error("[AI Gemini Error]", err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("429") || message.includes("quota")) {
        throw new Error(
          "Limite de requêtes atteinte. Réessayez dans quelques minutes."
        );
      }
      throw new Error(`Service IA temporairement indisponible: ${message}`);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const firstBlock = message.content[0];
      const text =
        firstBlock.type === "text"
          ? firstBlock.text
          : "Service temporairement indisponible";
      return { text };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("credit") || message.includes("billing")) {
        throw new Error(
          "Crédits API insuffisants. Vérifiez votre compte Anthropic."
        );
      }
      throw new Error("Service IA temporairement indisponible");
    }
  }

  throw new Error("Aucun service IA configuré");
}
