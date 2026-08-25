(() => {
  "use strict";

  let dialog;
  let canvas;
  let context;
  let playButton;
  let progress;
  let titleNode;
  let metaNode;
  let currentMovie = null;
  let animationFrame = 0;
  let startedAt = 0;
  let audioContext = null;
  let audioNodes = [];

  document.addEventListener("DOMContentLoaded", initialise);

  function initialise() {
    dialog = document.getElementById("trailerDialog");
    canvas = document.getElementById("trailerCanvas");
    context = canvas.getContext("2d", { alpha: false });
    playButton = document.getElementById("playTrailerButton");
    progress = document.getElementById("trailerProgress");
    titleNode = document.getElementById("trailerTitle");
    metaNode = document.getElementById("trailerMeta");

    playButton.addEventListener("click", play);
    document.getElementById("closeTrailerButton").addEventListener("click", close);
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) close();
    });
  }

  function open(movie) {
    stop();
    currentMovie = movie;
    titleNode.textContent = movie.title;
    metaNode.textContent = `${movie.year}  ${movie.genre}  ${movie.trailer.durationSeconds.toFixed(1)} seconds`;
    playButton.hidden = false;
    progress.style.width = "0%";
    drawFreezeFrame(movie);
    if (!dialog.open) dialog.showModal();
  }

  function close() {
    stop();
    if (dialog.open) dialog.close();
  }

  async function play() {
    if (!currentMovie) return;
    stop();
    playButton.hidden = true;
    startedAt = performance.now();
    startAudio(currentMovie.trailer.audio, currentMovie.trailer.durationSeconds);
    animationFrame = requestAnimationFrame(renderFrame);
  }

  function stop() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    audioNodes.forEach(node => {
      try { node.stop?.(); } catch { }
      try { node.disconnect?.(); } catch { }
    });
    audioNodes = [];
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
  }

  function renderFrame(now) {
    if (!currentMovie) return;
    const duration = currentMovie.trailer.durationSeconds;
    const seconds = Math.max(0, (now - startedAt) / 1000);
    const ratio = Math.min(1, seconds / duration);
    progress.style.width = `${ratio * 100}%`;
    drawTrailer(currentMovie, seconds);

    if (seconds < duration) {
      animationFrame = requestAnimationFrame(renderFrame);
    } else {
      animationFrame = 0;
      playButton.hidden = false;
      drawFinalCard(currentMovie);
    }
  }

  function drawTrailer(movie, seconds) {
    const width = canvas.width;
    const height = canvas.height;
    const introDuration = 0.72;
    const outroDuration = 1.22;

    if (seconds < introDuration) {
      const alpha = ease(seconds / introDuration);
      fill("#080807");
      context.globalAlpha = alpha;
      drawSmallCaps("LUMEN CINEMA PRESENTS", width / 2, height / 2, "#e8e0d3", 24);
      context.globalAlpha = 1;
      return;
    }

    let sceneTime = seconds - introDuration;
    const scenes = movie.trailer.scenes;
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index];
      if (sceneTime <= scene.durationSeconds) {
        const local = Math.max(0, Math.min(1, sceneTime / scene.durationSeconds));
        renderScene(scene, local);
        applyTransition(scene, local);
        if (index === Math.floor(scenes.length / 2)) {
          drawPhrase(movie.trailer.phrase, local);
        }
        return;
      }
      sceneTime -= scene.durationSeconds;
    }

    const outroProgress = Math.min(1, Math.max(0, (seconds - (movie.trailer.durationSeconds - outroDuration)) / outroDuration));
    fill("#090908");
    context.globalAlpha = ease(outroProgress);
    drawTitle(movie.title, movie.trailer.credit, "#f6efe2");
    context.globalAlpha = 1;
  }

  function drawFreezeFrame(movie) {
    const firstScene = movie.trailer.scenes[0];
    renderScene(firstScene, 0.28);
    context.fillStyle = "rgba(5, 5, 4, 0.34)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawTitle(movie.title, movie.trailer.phrase, "#fff8ec");
  }

  function drawFinalCard(movie) {
    fill("#090908");
    drawTitle(movie.title, movie.trailer.credit, "#f6efe2");
  }

  function renderScene(scene, time) {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    const zoom = 1 + (scene.zoom - 1) * time;
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(zoom, zoom);
    context.translate(-canvas.width / 2, -canvas.height / 2);

    switch (scene.type) {
      case "city": drawCity(scene, time); break;
      case "desert": drawDesert(scene, time); break;
      case "ocean": drawOcean(scene, time); break;
      case "forest": drawForest(scene, time); break;
      case "tunnel": drawTunnel(scene, time); break;
      case "space": drawSpace(scene, time); break;
      case "storm": drawStorm(scene, time); break;
      case "corridor": drawCorridor(scene, time); break;
      default: drawCity(scene, time); break;
    }

    drawFilmTexture(scene, time);
    context.restore();
  }

  function drawCity(scene, time) {
    const [dark, mid, light] = scene.palette;
    const horizon = canvas.height * scene.horizon;
    skyGradient(dark, mid, horizon);
    context.fillStyle = dark;
    context.fillRect(0, horizon, canvas.width, canvas.height - horizon);

    const buildings = scene.elements.slice(0, 18);
    buildings.forEach((item, index) => {
      const width = 36 + item.size * 118;
      const height = 80 + item.depth * 250;
      const x = item.x * canvas.width + Math.sin(time * scene.speed + item.phase) * 9;
      const y = horizon - height;
      context.fillStyle = index % 3 === 0 ? mid : mix(dark, mid, 0.35 + item.tone * 0.35);
      context.fillRect(x - width / 2, y, width, height);
      context.fillStyle = withAlpha(light, 0.35 + item.tone * 0.55);
      const windowGap = 14;
      for (let wy = y + 18; wy < horizon - 14; wy += 23) {
        if (((index + Math.floor(wy)) % 3) !== 0) context.fillRect(x - width / 3, wy, 5, 8);
        if (((index + Math.floor(wy)) % 4) !== 0) context.fillRect(x + width / 6, wy, 5, 8);
      }
    });

    drawPerspectiveRoad(horizon, dark, mid, light, time, scene.speed);
    scene.elements.slice(18).forEach(item => {
      const travel = (item.y + time * scene.speed * 0.35) % 1;
      const y = horizon + travel * (canvas.height - horizon);
      const spread = Math.pow(travel, 1.7) * canvas.width * 0.46;
      const side = item.tone > 0.5 ? 1 : -1;
      context.fillStyle = withAlpha(light, 0.45 + item.depth * 0.5);
      context.beginPath();
      context.arc(canvas.width / 2 + side * spread, y, 2 + travel * 8, 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawDesert(scene, time) {
    const [dark, mid, light] = scene.palette;
    const horizon = canvas.height * scene.horizon;
    skyGradient(dark, light, horizon + 80);
    const sun = scene.elements[0];
    context.fillStyle = withAlpha(light, 0.9);
    context.beginPath();
    context.arc(sun.x * canvas.width, horizon * 0.48, 38 + sun.size * 50, 0, Math.PI * 2);
    context.fill();

    for (let layer = 0; layer < 4; layer += 1) {
      context.beginPath();
      context.moveTo(0, horizon + layer * 42);
      scene.elements.slice(layer * 6, layer * 6 + 8).forEach((item, index) => {
        const x = index * canvas.width / 7;
        const drift = Math.sin(item.phase + time * scene.speed * 0.3) * 12;
        const y = horizon + layer * 55 + item.tone * 78 + drift;
        context.quadraticCurveTo(x - 55, y - 30, x, y);
      });
      context.lineTo(canvas.width, canvas.height);
      context.lineTo(0, canvas.height);
      context.closePath();
      context.fillStyle = layer % 2 ? mix(mid, light, layer * 0.12) : mix(dark, mid, 0.4 + layer * 0.12);
      context.fill();
    }

    context.strokeStyle = withAlpha(light, 0.58);
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(canvas.width * 0.49, horizon);
    context.bezierCurveTo(canvas.width * (0.49 + time * 0.02), horizon + 120, canvas.width * 0.36, canvas.height - 120, canvas.width * 0.3, canvas.height);
    context.stroke();
  }

  function drawOcean(scene, time) {
    const [dark, mid, light] = scene.palette;
    const horizon = canvas.height * scene.horizon;
    skyGradient(dark, light, horizon);
    const sea = context.createLinearGradient(0, horizon, 0, canvas.height);
    sea.addColorStop(0, mid);
    sea.addColorStop(1, dark);
    context.fillStyle = sea;
    context.fillRect(0, horizon, canvas.width, canvas.height - horizon);

    context.lineWidth = 2;
    scene.elements.forEach((item, index) => {
      const y = horizon + item.y * (canvas.height - horizon);
      const offset = Math.sin(item.phase + time * scene.speed * 4) * 35;
      context.strokeStyle = withAlpha(light, 0.08 + item.tone * 0.36);
      context.beginPath();
      context.moveTo(item.x * canvas.width - 150 + offset, y);
      context.quadraticCurveTo(item.x * canvas.width + offset, y - 6 - item.size * 9, item.x * canvas.width + 170 + offset, y);
      context.stroke();
    });

    const boat = scene.elements[2];
    const boatX = canvas.width * (0.22 + time * 0.42);
    const boatY = horizon + 55 + Math.sin(time * 8 + boat.phase) * 5;
    context.fillStyle = dark;
    context.beginPath();
    context.moveTo(boatX - 48, boatY);
    context.lineTo(boatX + 52, boatY);
    context.lineTo(boatX + 28, boatY + 24);
    context.lineTo(boatX - 30, boatY + 24);
    context.closePath();
    context.fill();
    context.strokeStyle = light;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(boatX, boatY);
    context.lineTo(boatX, boatY - 76);
    context.lineTo(boatX + 48, boatY - 10);
    context.closePath();
    context.stroke();
  }

  function drawForest(scene, time) {
    const [dark, mid, light] = scene.palette;
    skyGradient(dark, mid, canvas.height);
    const vanishingX = canvas.width * (0.42 + scene.elements[0].tone * 0.16);
    scene.elements.forEach((item, index) => {
      const depth = 0.2 + item.depth * 0.8;
      const x = item.x * canvas.width + Math.sin(item.phase + time * scene.speed) * 10 * depth;
      const base = canvas.height * (0.72 + item.y * 0.26);
      const trunk = 10 + item.size * 30 * depth;
      const height = 150 + item.depth * 470;
      context.fillStyle = index % 3 === 0 ? dark : mix(dark, mid, 0.3 + item.tone * 0.3);
      context.fillRect(x - trunk / 2, base - height, trunk, height);
      context.fillStyle = withAlpha(mid, 0.45 + item.tone * 0.4);
      context.beginPath();
      context.arc(x, base - height, 42 + item.size * 75, 0, Math.PI * 2);
      context.fill();
    });
    context.fillStyle = withAlpha(light, 0.38);
    context.beginPath();
    context.moveTo(vanishingX - 6, canvas.height * 0.58);
    context.lineTo(canvas.width * 0.1, canvas.height);
    context.lineTo(canvas.width * 0.92, canvas.height);
    context.lineTo(vanishingX + 6, canvas.height * 0.58);
    context.closePath();
    context.fill();
  }

  function drawTunnel(scene, time) {
    const [dark, mid, light] = scene.palette;
    fill(dark);
    const centerX = canvas.width * (0.44 + scene.elements[0].tone * 0.12);
    const centerY = canvas.height * scene.horizon;
    const travel = (time * scene.speed) % 0.16;

    for (let index = 0; index < 13; index += 1) {
      const size = ((index / 13 + travel) % 1);
      const width = 70 + size * canvas.width * 1.1;
      const height = 45 + size * canvas.height * 1.25;
      context.strokeStyle = withAlpha(index % 3 === 0 ? light : mid, 0.18 + size * 0.62);
      context.lineWidth = 2 + size * 7;
      context.strokeRect(centerX - width / 2, centerY - height / 2, width, height);
    }
    const glow = context.createRadialGradient(centerX, centerY, 4, centerX, centerY, 160);
    glow.addColorStop(0, withAlpha(light, 0.95));
    glow.addColorStop(1, "transparent");
    context.fillStyle = glow;
    context.fillRect(centerX - 170, centerY - 170, 340, 340);
  }

  function drawSpace(scene, time) {
    const [dark, mid, light] = scene.palette;
    fill(dark);
    scene.elements.forEach(item => {
      const x = (item.x * canvas.width + time * scene.speed * item.depth * 32) % canvas.width;
      const y = item.y * canvas.height;
      context.fillStyle = withAlpha(light, 0.28 + item.tone * 0.7);
      context.beginPath();
      context.arc(x, y, 1 + item.size * 2.8, 0, Math.PI * 2);
      context.fill();
    });
    const planet = scene.elements[0];
    const px = canvas.width * (0.24 + planet.x * 0.52);
    const py = canvas.height * (0.28 + planet.y * 0.35);
    const radius = 105 + planet.size * 150;
    const sphere = context.createRadialGradient(px - radius * 0.3, py - radius * 0.35, 10, px, py, radius);
    sphere.addColorStop(0, light);
    sphere.addColorStop(0.35, mid);
    sphere.addColorStop(1, dark);
    context.fillStyle = sphere;
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = withAlpha(light, 0.45);
    context.lineWidth = 12;
    context.beginPath();
    context.ellipse(px, py, radius * 1.6, radius * 0.35, 0.14 + time * 0.08, 0, Math.PI * 2);
    context.stroke();
  }

  function drawStorm(scene, time) {
    const [dark, mid, light] = scene.palette;
    skyGradient(dark, mid, canvas.height);
    scene.elements.slice(0, 10).forEach(item => {
      const x = (item.x * canvas.width + Math.sin(item.phase + time) * 45) % canvas.width;
      const y = item.y * canvas.height * 0.54;
      context.fillStyle = withAlpha(mix(dark, mid, item.tone), 0.68);
      context.beginPath();
      context.ellipse(x, y, 80 + item.size * 120, 35 + item.depth * 58, 0, 0, Math.PI * 2);
      context.fill();
    });
    scene.elements.slice(10).forEach(item => {
      const fall = (item.y + time * scene.speed * (0.6 + item.depth)) % 1;
      const x = item.x * canvas.width - fall * 70;
      const y = fall * canvas.height;
      context.strokeStyle = withAlpha(light, 0.18 + item.tone * 0.48);
      context.lineWidth = 1 + item.size * 2;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 22, y + 72);
      context.stroke();
    });
    if (Math.sin(time * 19 + scene.elements[0].phase) > 0.82) {
      context.fillStyle = withAlpha(light, 0.16);
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawLighthouse(scene, dark, light, time);
  }

  function drawCorridor(scene, time) {
    const [dark, mid, light] = scene.palette;
    fill(dark);
    const centerX = canvas.width * (0.44 + scene.elements[0].tone * 0.12);
    const centerY = canvas.height * scene.horizon;
    context.strokeStyle = withAlpha(mid, 0.85);
    context.lineWidth = 5;
    [[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]].forEach(([x, y]) => {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(centerX, centerY);
      context.stroke();
    });
    for (let index = 0; index < 8; index += 1) {
      const distance = ((index / 8 + time * scene.speed * 0.1) % 1);
      const spread = 42 + distance * canvas.width * 0.46;
      const doorHeight = 45 + distance * 310;
      context.strokeStyle = withAlpha(index % 2 ? mid : light, 0.28 + distance * 0.55);
      context.lineWidth = 2 + distance * 5;
      context.strokeRect(centerX - spread, centerY - doorHeight / 2, spread * 0.35, doorHeight);
      context.strokeRect(centerX + spread * 0.65, centerY - doorHeight / 2, spread * 0.35, doorHeight);
    }
    const figure = scene.elements[3];
    context.fillStyle = mix(dark, light, 0.22);
    context.beginPath();
    context.arc(centerX, centerY - 34, 14 + figure.size * 14, 0, Math.PI * 2);
    context.fill();
    context.fillRect(centerX - 18, centerY - 18, 36, 95);
  }

  function drawPerspectiveRoad(horizon, dark, mid, light, time, speed) {
    context.fillStyle = mix(dark, mid, 0.32);
    context.beginPath();
    context.moveTo(canvas.width * 0.46, horizon);
    context.lineTo(canvas.width * 0.54, horizon);
    context.lineTo(canvas.width * 0.82, canvas.height);
    context.lineTo(canvas.width * 0.18, canvas.height);
    context.closePath();
    context.fill();
    context.strokeStyle = withAlpha(light, 0.55);
    context.lineWidth = 5;
    for (let index = 0; index < 8; index += 1) {
      const progress = (index / 8 + time * speed * 0.22) % 1;
      const y = horizon + Math.pow(progress, 1.7) * (canvas.height - horizon);
      const length = 5 + progress * 80;
      context.beginPath();
      context.moveTo(canvas.width / 2, y);
      context.lineTo(canvas.width / 2, y + length);
      context.stroke();
    }
  }

  function drawLighthouse(scene, dark, light, time) {
    const x = canvas.width * (0.18 + scene.elements[1].x * 0.64);
    const base = canvas.height * 0.86;
    context.fillStyle = dark;
    context.beginPath();
    context.moveTo(x - 35, base);
    context.lineTo(x - 18, base - 230);
    context.lineTo(x + 18, base - 230);
    context.lineTo(x + 35, base);
    context.closePath();
    context.fill();
    const angle = time * scene.speed * 1.8 + scene.elements[1].phase;
    context.fillStyle = withAlpha(light, 0.2);
    context.beginPath();
    context.moveTo(x, base - 220);
    context.lineTo(x + Math.cos(angle) * 520, base - 220 + Math.sin(angle) * 170);
    context.lineTo(x + Math.cos(angle + 0.18) * 520, base - 220 + Math.sin(angle + 0.18) * 170);
    context.closePath();
    context.fill();
  }

  function drawFilmTexture(scene, time) {
    context.save();
    context.globalCompositeOperation = "screen";
    scene.elements.slice(0, 12).forEach(item => {
      const y = (item.y * canvas.height + time * scene.speed * item.depth * 45) % canvas.height;
      context.fillStyle = `rgba(255,255,255,${0.012 + item.tone * 0.028})`;
      context.fillRect(item.x * canvas.width, y, 1 + item.size, 1 + item.size);
    });
    context.restore();
    context.fillStyle = "rgba(0,0,0,0.12)";
    context.fillRect(0, 0, canvas.width, 30);
    context.fillRect(0, canvas.height - 30, canvas.width, 30);
  }

  function applyTransition(scene, time) {
    const edge = Math.min(time, 1 - time);
    const opacity = Math.max(0, 1 - edge / 0.12);
    if (opacity <= 0) return;
    context.save();
    if (scene.transition === "flash") {
      context.fillStyle = `rgba(255,248,230,${opacity * 0.75})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else if (scene.transition === "wipe") {
      context.fillStyle = "#070706";
      const width = canvas.width * opacity;
      context.fillRect(time < 0.5 ? 0 : canvas.width - width, 0, width, canvas.height);
    } else if (scene.transition === "iris") {
      context.fillStyle = "#070706";
      context.beginPath();
      context.rect(0, 0, canvas.width, canvas.height);
      const radius = Math.max(1, (1 - opacity) * canvas.width * 0.72);
      context.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2, true);
      context.fill("evenodd");
    } else if (scene.transition === "shutter") {
      context.fillStyle = "#070706";
      const bar = canvas.height * opacity / 4;
      for (let index = 0; index < 4; index += 1) {
        context.fillRect(0, index * canvas.height / 4, canvas.width, bar);
      }
    } else {
      context.fillStyle = `rgba(7,7,6,${opacity})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.restore();
  }

  function drawPhrase(phrase, time) {
    if (time < 0.18 || time > 0.82) return;
    const alpha = Math.min(1, (time - 0.18) / 0.15, (0.82 - time) / 0.15);
    context.save();
    context.fillStyle = `rgba(5,5,4,${alpha * 0.48})`;
    context.fillRect(0, canvas.height * 0.38, canvas.width, canvas.height * 0.24);
    context.globalAlpha = alpha;
    drawWrappedText(phrase, canvas.width / 2, canvas.height / 2 + 12, canvas.width * 0.72, 54, "#fff8ed", 58);
    context.restore();
  }

  function drawTitle(title, subtitle, color) {
    context.save();
    context.textAlign = "center";
    context.direction = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    drawWrappedText(title, canvas.width / 2, canvas.height * 0.48, canvas.width * 0.78, 68, color, 76);
    drawSmallCaps(subtitle, canvas.width / 2, canvas.height * 0.69, withAlpha(color, 0.76), 22);
    context.restore();
  }

  function drawWrappedText(text, x, y, maxWidth, lineHeight, color, fontSize) {
    context.fillStyle = color;
    context.font = `600 ${fontSize}px Georgia, serif`;
    context.textAlign = "center";
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    const startY = y - (lines.length - 1) * lineHeight / 2;
    lines.forEach((value, index) => context.fillText(value, x, startY + index * lineHeight));
  }

  function drawSmallCaps(text, x, y, color, size) {
    context.save();
    context.fillStyle = color;
    context.font = `700 ${size}px Segoe UI, Arial, sans-serif`;
    context.textAlign = "center";
    context.letterSpacing = "4px";
    context.fillText(text, x, y);
    context.restore();
  }

  function skyGradient(top, bottom, horizon) {
    const gradient = context.createLinearGradient(0, 0, 0, horizon);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function fill(color) {
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function ease(value) {
    const limited = Math.max(0, Math.min(1, value));
    return limited * limited * (3 - 2 * limited);
  }

  function withAlpha(hex, alpha) {
    const value = hex.replace("#", "");
    const expanded = value.length === 3 ? value.split("").map(char => char + char).join("") : value;
    const number = Number.parseInt(expanded, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  function mix(first, second, amount) {
    const a = hexRgb(first);
    const b = hexRgb(second);
    const limited = Math.max(0, Math.min(1, amount));
    const red = Math.round(a[0] + (b[0] - a[0]) * limited);
    const green = Math.round(a[1] + (b[1] - a[1]) * limited);
    const blue = Math.round(a[2] + (b[2] - a[2]) * limited);
    return `rgb(${red},${green},${blue})`;
  }

  function hexRgb(hex) {
    const value = hex.replace("#", "");
    const number = Number.parseInt(value, 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  }

  function startAudio(plan, duration) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    audioContext = new AudioEngine();
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.13, now + 0.35);
    master.gain.setValueAtTime(0.13, now + Math.max(0.5, duration - 0.6));
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(audioContext.destination);

    const drone = audioContext.createOscillator();
    const droneGain = audioContext.createGain();
    drone.type = "sine";
    drone.frequency.value = plan.droneFrequency;
    droneGain.gain.value = 0.42;
    drone.connect(droneGain).connect(master);
    drone.start(now);
    drone.stop(now + duration);

    const upper = audioContext.createOscillator();
    const upperGain = audioContext.createGain();
    upper.type = "triangle";
    upper.frequency.value = plan.droneFrequency * 1.5;
    upperGain.gain.value = 0.08;
    upper.connect(upperGain).connect(master);
    upper.start(now);
    upper.stop(now + duration);

    const beat = 60 / plan.tempo;
    for (let at = 0.6; at < duration - 0.4; at += beat) {
      const pulse = audioContext.createOscillator();
      const gain = audioContext.createGain();
      pulse.type = "sine";
      pulse.frequency.setValueAtTime(plan.pulseFrequency, now + at);
      pulse.frequency.exponentialRampToValueAtTime(plan.droneFrequency, now + at + 0.16);
      gain.gain.setValueAtTime(plan.hitStrength * 0.34, now + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      pulse.connect(gain).connect(master);
      pulse.start(now + at);
      pulse.stop(now + at + 0.24);
      audioNodes.push(pulse, gain);
    }

    audioNodes.push(drone, droneGain, upper, upperGain, master);
  }

  window.LumenTrailer = { open, close };
})();
