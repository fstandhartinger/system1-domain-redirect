import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const destination = "https://system1models.ai";
const serviceHost = "system1-domain-redirect.app.mintapis.com";
const rawDomains = JSON.parse(readFileSync(new URL("./domains.json", import.meta.url), "utf8"));
const sourceByHost = new Map();
const hostnamePattern = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

for (const [registeredDomain, hostnames] of Object.entries(rawDomains)) {
  if (!hostnamePattern.test(registeredDomain) || !Array.isArray(hostnames) || hostnames.length !== 2) {
    throw new Error("Invalid redirect domain configuration");
  }
  for (const hostname of hostnames) {
    if (!hostnamePattern.test(hostname) || sourceByHost.has(hostname)) {
      throw new Error("Invalid or duplicate redirect hostname");
    }
    sourceByHost.set(hostname, registeredDomain);
  }
}

if (sourceByHost.size !== 22) {
  throw new Error("Expected exactly 22 redirect hostnames");
}

const server = createServer((request, response) => {
  const rawHost = request.headers.host ?? "";
  const host = rawHost.toLowerCase().replace(/:\d+$/, "");
  const requestTarget = request.url ?? "/";

  if ((host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === serviceHost) && request.method === "GET" && requestTarget === "/healthz") {
    response.writeHead(204, { "Cache-Control": "no-store" });
    response.end();
    return;
  }

  const sourceDomain = sourceByHost.get(host);
  if (!sourceDomain) {
    response.writeHead(404, { "Content-Length": "0", "Cache-Control": "no-store" });
    response.end();
    return;
  }

  if (!requestTarget.startsWith("/") || requestTarget.includes("\r") || requestTarget.includes("\n")) {
    response.writeHead(400, { "Content-Length": "0", "Cache-Control": "no-store" });
    response.end();
    return;
  }

  const queryIndex = requestTarget.indexOf("?");
  const existingQuery = queryIndex >= 0 && requestTarget.length > queryIndex + 1;
  const separator = existingQuery ? "&" : queryIndex >= 0 ? "" : "?";
  const location = `${destination}${requestTarget}${separator}utm_source=${encodeURIComponent(sourceDomain)}`;
  response.writeHead(301, {
    Location: location,
    "Cache-Control": "public, max-age=3600",
    "Content-Length": "0",
  });
  response.end();
});

server.listen(3000, "::");
