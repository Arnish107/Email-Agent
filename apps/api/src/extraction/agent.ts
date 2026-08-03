import { config } from "../config.js";
import type { NormalizedEmail } from "../providers/types.js";
import { fallbackExtract } from "./fallback.js";
import { buildExtractionUserPrompt, EXTRACTION_SYSTEM_PROMPT } from "./prompt.js";
import {
  type ExtractionResult,
  validateExtractionResult,
} from "./schema.js";

function emailForModel(email: NormalizedEmail) {
  // Intentionally omit long bodies beyond a bound for privacy/token control
  return {
    provider: email.provider,
    messageId: email.messageId,
    threadId: email.threadId,
    subject: email.subject,
    from: email.from,
    to: email.to,
    cc: email.cc,
    sentAt: email.sentAt,
    bodyText: email.bodyText.slice(0, 6000),
    links: email.links.slice(0, 20),
    attachments: email.attachments,
  };
}

async function llmExtract(email: NormalizedEmail): Promise<ExtractionResult> {
  const payload = {
    model: config.openai.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildExtractionUserPrompt(JSON.stringify(emailForModel(email), null, 2)),
      },
    ],
  };

  const res = await fetch(`${config.openai.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM extraction failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }
  return validateExtractionResult(JSON.parse(content));
}

export async function extractTasks(email: NormalizedEmail): Promise<ExtractionResult> {
  if (!config.openai.apiKey) {
    return fallbackExtract(email);
  }
  try {
    return await llmExtract(email);
  } catch (err) {
    console.warn("LLM extraction failed; using fallback parser", err);
    return fallbackExtract(email);
  }
}
