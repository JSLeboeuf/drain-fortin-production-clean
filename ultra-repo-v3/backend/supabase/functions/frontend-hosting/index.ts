import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Serve static files from the frontend build
serve(async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;

  // Default to index.html for root or client-side routes
  if (path === "/" || !path.includes(".")) {
    path = "/index.html";
  }

  try {
    // Read the file from the build directory
    const file = await Deno.readFile(`./dist${path}`);
    
    // Determine content type
    let contentType = "text/html";
    if (path.endsWith(".js")) contentType = "application/javascript";
    else if (path.endsWith(".css")) contentType = "text/css";
    else if (path.endsWith(".json")) contentType = "application/json";
    else if (path.endsWith(".svg")) contentType = "image/svg+xml";
    else if (path.endsWith(".png")) contentType = "image/png";
    else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) contentType = "image/jpeg";
    
    return new Response(file, {
      headers: {
        "content-type": contentType,
        "cache-control": path === "/index.html" ? "no-cache" : "public, max-age=31536000",
      },
    });
  } catch (e) {
    // If file not found, serve index.html for client-side routing
    try {
      const indexFile = await Deno.readFile("./dist/index.html");
      return new Response(indexFile, {
        headers: { "content-type": "text/html" },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }
});