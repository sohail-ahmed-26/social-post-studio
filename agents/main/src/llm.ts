import 'dotenv/config';

function stripCodeFences(text: string): string {
  text = text.trim();
  if (text.startsWith('```')) {
    const lines = text.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift();
    }
    if (lines.length > 0 && lines[lines.length - 1].startsWith('```')) {
      lines.pop();
    }
    return lines.join('\n').trim();
  }
  return text;
}

export async function askJson(system: string, user: string): Promise<unknown> {
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!provider) throw new Error("Missing LLM_PROVIDER in env");
  if (!apiKey) throw new Error("Missing LLM_API_KEY in env");
  if (!model) throw new Error("Missing LLM_MODEL in env");

  const attempt = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      let url = "";
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      let body: any = {};

      if (provider === "openai") {
        url = "https://api.openai.com/v1/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
        body = {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          response_format: { type: "json_object" }
        };
      } else if (provider === "gemini") {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        headers["x-goog-api-key"] = apiKey;
        body = {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json" }
        };
      } else if (provider === "anthropic") {
        url = "https://api.anthropic.com/v1/messages";
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
        body = {
          model,
          max_tokens: 1000,
          system,
          messages: [{ role: "user", content: user }]
        };
      } else {
        throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error("Network error: Request timed out after 60s");
        }
        throw new Error(`Network error: ${err.message}`);
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401 Unauthorized: Please check your API key (LLM_API_KEY).");
        } else if (response.status === 404) {
          throw new Error(`404 Not Found: Model '${model}' not found (LLM_MODEL).`);
        } else if (response.status === 429) {
          throw new Error("429 Too Many Requests: Rate limit exceeded or out of credits.");
        }
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      let rawText = "";

      if (provider === "openai") {
        rawText = data.choices[0]?.message?.content || "";
      } else if (provider === "gemini") {
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (provider === "anthropic") {
        rawText = data.content?.[0]?.text || "";
      }

      rawText = stripCodeFences(rawText);
      return JSON.parse(rawText);
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Retry once if JSON is invalid
      return await attempt();
    }
    throw err;
  }
}
