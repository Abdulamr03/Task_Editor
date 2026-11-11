import Anthropic from "@anthropic-ai/sdk";

// Shared bits for the app's Claude features (PDF import, Plan my day).
export const MODEL = "claude-opus-5-5";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export class AiError extends Error {}

export function explainApiError(error: unknown, what = "the request"): string {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in your .env file.";
  }
  if (error instanceof Anthropic.RateLimitError) return "Too many requests right now. Wait a minute and try again.";
  if (error instanceof Anthropic.BadRequestError) {
    const detail = (error.error as { error?: { message?: string } } | undefined)?.error?.message;
    return `Claude couldn't handle ${what}${detail ? `: ${detail}` : "."}`;
  }
  if (error instanceof Anthropic.APIConnectionError) return "Couldn't reach Anthropic. Check your internet connection.";
  if (error instanceof Anthropic.APIError) return `Anthropic returned an error (${error.status}). Please try again.`;
  return "Something went wrong talking to Claude. Please try again.";
}

// Sends one request that must answer as JSON matching `schema`; returns the parsed JSON.
export async function askForJson(options: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: Record<string, unknown>;
  maxTokens: number;
  what: string;
}): Promise<unknown> {
  if (!hasApiKey()) throw new AiError("No Anthropic API key is set. Add ANTHROPIC_API_KEY to your .env file and restart the app.");
  const client = new Anthropic();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: options.maxTokens,
        // If a safety check declines the request, retry on the recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium", format: { type: "json_schema", schema: options.schema } },
        system: options.system,
        messages: [{ role: "user", content: options.content }],
      })
      .finalMessage();
  } catch (error) {
    throw new AiError(explainApiError(error, options.what));
  }
  if (message.stop_reason === "refusal") throw new AiError(`Claude declined ${options.what}.`);
  if (message.stop_reason === "max_tokens") throw new AiError("Claude's answer was too long.");
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("Claude's answer couldn't be read. Please try again.");
  }
}
