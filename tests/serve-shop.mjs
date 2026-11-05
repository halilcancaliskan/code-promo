import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../examples/shop.html", import.meta.url));
createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3001");
  let page = html.toString();
  for (const name of ["data-name", "data-accent", "data-background", "data-code", "data-terms", "data-expires-at"]) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      const escaped = value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      page = page.replace(new RegExp(`${name}="[^"]*"`), () => `${name}="${escaped}"`);
    }
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(page);
}).listen(3001, "127.0.0.1");
