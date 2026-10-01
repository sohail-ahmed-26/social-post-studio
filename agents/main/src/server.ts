import * as http from "node:http";
import { generateContent } from "./content";

const PORT = 8787;
const HOST = "127.0.0.1";

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "";
  const isAllowedOrigin = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isAllowedOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = req.url || "/";

  if (req.method === "GET" && url === "/health") {
    res.writeHead(200, headers);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url === "/content") {
    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyStr);
        if (!body.postId || typeof body.postId !== "string") {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: "Missing or invalid postId in body" }));
          return;
        }

        const result = await generateContent(body.postId);
        res.writeHead(200, headers);
        res.end(JSON.stringify(result));
      } catch (err: any) {
        console.error("Error generating content:", err.message || "Unknown error");
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: "Failed to generate content" }));
      }
    });
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, HOST, () => {
  console.log(`Agent server running at http://${HOST}:${PORT}`);
});
