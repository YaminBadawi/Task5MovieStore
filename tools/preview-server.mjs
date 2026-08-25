import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../src/Task5MovieStore/wwwroot");
const port = Number(process.env.PREVIEW_PORT || 4175);
const titles = ["The Silent Harbor", "Letters from Santa Fe", "The Amber Hour", "Nine Miles Home", "When Detroit Sleeps", "The Last Photographer", "A Signal in Brooklyn", "The Northern Current", "No One Leaves Monterey", "The Private Window", "Between Echo and Promise", "The Westward Map"];
const actors = ["Mara Collins", "Noah Bennett", "Ivy Mercer", "Julian Cole", "Nina Foster", "Elias Ward", "Clara Rhodes", "Leon Hayes"];
const palettes = [["#11131a", "#7b172a", "#f0b35c"], ["#0c1f2f", "#2c6e73", "#f2d492"], ["#101b17", "#385d43", "#d9c984"], ["#151323", "#53418c", "#e89da4"]];
const scenes = ["city", "desert", "ocean", "forest", "tunnel", "space", "storm", "corridor"];

function number(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function movie(index, seedText, likesAverage, reviewsAverage) {
  const seed = (Number(BigInt(seedText) % 4294967295n) + index * 7919) >>> 0;
  const random = number(seed);
  const palette = palettes[Math.floor(random() * palettes.length)];
  const reviewCount = Math.floor(reviewsAverage) + (random() < reviewsAverage % 1 ? 1 : 0);
  const likes = Math.floor(likesAverage) + (random() < likesAverage % 1 ? 1 : 0);
  const elements = Array.from({ length: 24 }, () => ({ x: random(), y: random(), size: 0.08 + random() * 0.92, depth: 0.12 + random() * 0.88, phase: random() * 6.28, tone: random() }));
  return {
    index,
    title: titles[(index - 1) % titles.length],
    actors: [actors[index % actors.length], actors[(index + 3) % actors.length], actors[(index + 5) % actors.length]],
    year: 1980 + Math.floor(random() * 47),
    genre: ["Drama", "Mystery", "Adventure", "Science fiction", "Crime"][index % 5],
    likes,
    reviews: Array.from({ length: reviewCount }, (_, reviewIndex) => ({ reviewer: actors[(index + reviewIndex + 2) % actors.length], text: ["A patient, beautifully observed story with a memorable final scene.", "The cast makes every quiet moment feel earned.", "Sharp writing and confident direction."][reviewIndex % 3], rating: 3 + reviewIndex % 3 })),
    poster: { layout: ["horizon", "portrait", "window", "split"][index % 4], primary: palette[0], secondary: palette[1], accent: palette[2], grain: 0.18, focusX: random(), focusY: random(), motif: "signal" },
    trailer: {
      id: seed.toString(16), phrase: "Every road remembers", credit: `Starring ${actors[index % actors.length]}`, durationSeconds: 7.4,
      scenes: Array.from({ length: 4 }, (_, sceneIndex) => ({ type: scenes[(index + sceneIndex) % scenes.length], palette: palettes[(index + sceneIndex) % palettes.length], transition: ["fade", "wipe", "iris", "flash"][sceneIndex], durationSeconds: 1.3, zoom: 1.08, speed: 0.8 + random(), horizon: 0.42 + random() * 0.18, elements })),
      audio: { tempo: 84, droneFrequency: 58, pulseFrequency: 180, hitStrength: 0.55 }
    }
  };
}

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/api/locales") return json(response, [{ id: "en_US", displayName: "English  USA", direction: "ltr" }, { id: "ar_SA", displayName: "العربية  السعودية", direction: "rtl" }]);
  if (url.pathname === "/api/seed") return json(response, { seed: "181903741216" });
  if (url.pathname === "/api/movies") {
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 12);
    const seed = url.searchParams.get("seed") || "181903741216";
    const likes = Number(url.searchParams.get("likes") || 3.5);
    const reviews = Number(url.searchParams.get("reviews") || 2.5);
    return json(response, { page, pageSize, locale: url.searchParams.get("locale") || "en_US", direction: "ltr", seed, items: Array.from({ length: pageSize }, (_, position) => movie((page - 1) * pageSize + position + 1, seed, likes, reviews)) });
  }

  const relative = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root) || !fs.existsSync(target)) {
    response.writeHead(404);
    return response.end("Not found");
  }
  response.writeHead(200, { "Content-Type": mime[path.extname(target)] || "application/octet-stream" });
  fs.createReadStream(target).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`Preview at http://127.0.0.1:${port}`));

function json(response, value) {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}
