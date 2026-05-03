import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { AnalyzeCodeBody, DetectLanguageBody } from "@workspace/api-zod";

const router = Router();

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const DEBUG_SYSTEM_PROMPT = `You are a senior software engineer and expert debugger with 20+ years of experience across multiple programming languages. Your job is to analyze code submitted by developers and provide structured, educational feedback.

When analyzing code, you must return a JSON object with EXACTLY these fields:
- bug_description: A clear, concise description of the bug(s) found. If no bugs exist, say so.
- fixed_code: The complete corrected version of the code. If no bugs, return the original code unchanged.
- root_cause_explanation: A detailed technical explanation of WHY this bug occurs — not just what it does wrong. Include the underlying mechanism that causes the failure.
- severity: One of exactly: "minor", "major", or "critical"
  - minor: Style issues, minor inefficiencies, or non-breaking problems
  - major: Logic errors, potential runtime failures, or significant performance issues
  - critical: Security vulnerabilities, data loss risks, crashes, or undefined behavior
- prevention_tip: A specific, actionable tip on how to avoid this class of bug in the future. Include best practices, tools, or patterns that help.
- has_bugs: true if bugs were found, false if the code looks correct

Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;

const DETECT_LANGUAGE_PROMPT = `You are a programming language detection expert. Given a code snippet, identify the programming language.

Return a JSON object with EXACTLY these fields:
- language: The name of the programming language (e.g. "JavaScript", "Python", "Java", "Go", "Rust", "C++", "TypeScript", "Ruby", "PHP", "Swift", "Kotlin", "C", "C#", "Scala", "Haskell", etc.)
- confidence: One of exactly: "high", "medium", or "low"

Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;

/**
 * Extracts the text content from a Gemini response, handling both standard
 * and thinking-model response shapes, then strips any markdown code fences
 * the model may have added despite being instructed not to.
 */
function extractText(response: { text?: string }): string {
  const raw = response.text ?? "";
  // Strip ```json ... ``` or ``` ... ``` wrappers
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return stripped;
}

router.post("/analyze", async (req, res) => {
  const parseResult = AnalyzeCodeBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body: " + parseResult.error.message });
    return;
  }

  const { code, language } = parseResult.data;

  if (!code.trim()) {
    res.status(400).json({ error: "Code cannot be empty" });
    return;
  }

  try {
    const userPrompt = language
      ? `Language: ${language}\n\nCode to analyze:\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``
      : `Code to analyze (detect language automatically):\n\`\`\`\n${code}\n\`\`\``;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: DEBUG_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const rawText = extractText(response);

    let parsed: {
      bug_description: string;
      fixed_code: string;
      root_cause_explanation: string;
      severity: "minor" | "major" | "critical";
      prevention_tip: string;
      has_bugs: boolean;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      req.log.error({ rawText }, "Failed to parse Gemini JSON response");
      res.status(500).json({ error: "AI returned malformed response. Please try again." });
      return;
    }

    const detectedLanguage = language ?? (parsed as { language?: string }).language ?? "Unknown";

    res.json({
      language: detectedLanguage,
      bug_description: parsed.bug_description ?? "No analysis available",
      fixed_code: parsed.fixed_code ?? code,
      root_cause_explanation: parsed.root_cause_explanation ?? "",
      severity: ["minor", "major", "critical"].includes(parsed.severity)
        ? parsed.severity
        : "minor",
      prevention_tip: parsed.prevention_tip ?? "",
      has_bugs: parsed.has_bugs ?? false,
    });
  } catch (err) {
    req.log.error({ err }, "Error calling Gemini API for code analysis");
    res.status(500).json({ error: "Failed to analyze code. Please try again." });
  }
});

router.post("/detect-language", async (req, res) => {
  const parseResult = DetectLanguageBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body: " + parseResult.error.message });
    return;
  }

  const { code } = parseResult.data;

  if (!code.trim()) {
    res.status(400).json({ error: "Code cannot be empty" });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: `Code snippet:\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\`` }] }],
      config: {
        systemInstruction: DETECT_LANGUAGE_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 256,
      },
    });

    const rawText = extractText(response);

    let parsed: { language: string; confidence: "high" | "medium" | "low" };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      res.status(500).json({ error: "AI returned malformed response. Please try again." });
      return;
    }

    res.json({
      language: parsed.language ?? "Unknown",
      confidence: ["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : "low",
    });
  } catch (err) {
    req.log.error({ err }, "Error calling Gemini API for language detection");
    res.status(500).json({ error: "Failed to detect language. Please try again." });
  }
});

export default router;
