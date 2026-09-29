import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  cleanTopic,
  errorMessage,
  handleDashboardRequest,
  makeTextFileReader,
  readBody,
  readTopic,
  runResearchForResponse,
  sendJson,
} from "./api-utils.js";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const INDEX_HTML_URL = new URL("../public/index.html", import.meta.url);
const LOGO_SVG_URL = new URL("../public/browserbase-logo.svg", import.meta.url);
const STYLES_CSS_URL = new URL("../public/styles.css", import.meta.url);
const readIndexHtml = makeTextFileReader(INDEX_HTML_URL);
const readLogoSvg = makeTextFileReader(LOGO_SVG_URL);
const readStylesCss = makeTextFileReader(STYLES_CSS_URL);

let activeRun = false;

const server = createServer((request, response) =>
  handleDashboardRequest(request, response, {
    protocol: "http",
    readIndexHtml,
    readLogoSvg,
    readStylesCss,
    handleResearch,
  }),
);

server.listen(PORT, () => {
  console.log(`bb research engine dashboard listening on http://localhost:${PORT}`);
});

async function handleResearch(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  if (activeRun) {
    return sendJson(response, 409, { error: "A research run is already in progress." });
  }

  if (!process.env.BROWSERBASE_API_KEY) {
    return sendJson(response, 500, { error: "Missing BROWSERBASE_API_KEY." });
  }

  activeRun = true;
  try {
    const topic = cleanTopic(readTopic(await readBody(request)));
    if (!topic) {
      return sendJson(response, 400, { error: "Enter a research topic." });
    }

    return sendJson(response, 200, await runResearchForResponse(topic, "web"));
  } catch (error) {
    return sendJson(response, 500, { error: errorMessage(error) });
  } finally {
    activeRun = false;
  }
}
