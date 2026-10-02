import * as http from "node:http";
import { generateContent } from "./content";

const PORT = 8787;
const HOST = "127.0.0.1";

const server = http.createServer(async (req, res) => {
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

  if (req.method === "GET" && url.startsWith("/image/render")) {
    const urlParams = new URLSearchParams(req.url?.split('?')[1]);
    const path = urlParams.get('path');
    if (!path) {
      res.writeHead(400, headers);
      res.end("Missing path");
      return;
    }
    try {
      const { getSupabase } = await import("../../shared/supabase.js");
      const sb = await getSupabase();
      const { data, error } = await sb.storage.from("post-images").download(path);
      if (error || !data) {
        res.writeHead(404, headers);
        res.end("Not found");
        return;
      }
      const { Buffer } = await import("buffer");
      const buffer = Buffer.from(await data.arrayBuffer());
      res.writeHead(200, {
        ...headers,
        "Content-Type": data.type || "image/png",
        "Cache-Control": "public, max-age=31536000"
      });
      res.end(buffer);
    } catch (err: any) {
      console.error("Error serving image:", err.message);
      res.writeHead(500, headers);
      res.end("Internal error");
    }
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

  if (req.method === "POST" && url === "/design") {
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

        // Import dynamically
        const { generateDesignSpec } = await import("./designer.js");
        const result = await generateDesignSpec(body.postId, body.headline || "", body.subtext || "");
        res.writeHead(200, headers);
        res.end(JSON.stringify(result));
      } catch (err: any) {
        console.error("Error generating design:", err.message || "Unknown error");
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: "Failed to generate design" }));
      }
    });
    return;
  }

  if (req.method === "POST" && url === "/image") {
    let bodyStr = "";
    req.on("data", (chunk) => bodyStr += chunk.toString());
    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyStr);
        if (!body.postId || !body.topic) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: "Missing postId or topic" }));
          return;
        }
        const { generateAndUploadImage } = await import("./image.js");
        const result = await generateAndUploadImage(body.postId, body.topic, body.headline || "");
        res.writeHead(200, headers);
        res.end(JSON.stringify(result));
      } catch (err: any) {
        console.error("Error generating image:", err.message);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && url === "/publish") {
    let bodyStr = "";
    req.on("data", (chunk) => bodyStr += chunk.toString());
    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyStr);
        if (!body.postId) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: "Missing postId" }));
          return;
        }
        const { publishPost } = await import("./publish.js");
        const result = await publishPost(body.postId);
        if (!result.success) {
          res.writeHead(400, headers);
        } else {
          res.writeHead(200, headers);
        }
        res.end(JSON.stringify(result));
      } catch (err: any) {
        console.error("Error publishing:", err.message);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: err.message }));
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
