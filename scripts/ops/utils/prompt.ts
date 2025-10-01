import * as readline from "readline";

const PROMPT_DISABLED = (process.env.OPS_NO_PROMPT ?? "").toLowerCase() === "true";

export function promptsEnabled(): boolean {
  return !PROMPT_DISABLED;
}

export async function prompt(question: string, defaultValue?: string): Promise<string> {
  if (!promptsEnabled()) {
    if (typeof defaultValue === "string") {
      return defaultValue;
    }

    throw new Error(`Prompt disabled via OPS_NO_PROMPT. Provide a value for: ${question.replace(/\s+/g, " ").trim()}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const trimmedQuestion = question.trim();
  const hasPunctuation = /[?:]$/.test(trimmedQuestion);
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const finalQuestion = hasPunctuation ? `${trimmedQuestion}${suffix} ` : `${trimmedQuestion}${suffix}: `;

  return new Promise<string>((resolve) => {
    rl.question(finalQuestion, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed.length === 0 && defaultValue !== undefined) {
        resolve(defaultValue);
      } else {
        resolve(trimmed);
      }
    });
  });
}
