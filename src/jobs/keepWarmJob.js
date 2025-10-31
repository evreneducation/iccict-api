import axios from "axios";
import logger from "../config/logger.js";

// Resolve full health URL from envs
function resolveHealthUrl() {
  // Prefer an explicit KEEP_WARM_URL you set, else use Render's RENDER_EXTERNAL_URL, else PUBLIC_BASE_URL
  const base =
    process.env.KEEP_WARM_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://iccict-api.onrender.com";

  if (!base) return null;

  // Choose path: "/health" (your super light handler) or "/api/health" if you prefer
  const path = process.env.KEEP_WARM_PATH || "/health";
  return `${base.replace(/\/+$/, "")}${path}`;
}

export function startKeepWarmJob() {
  // toggle via env
  const enabled = String(process.env.KEEP_WARM_ENABLED || "true").toLowerCase() === "true";
  if (!enabled) {
    logger.info("[keep-warm] disabled via KEEP_WARM_ENABLED=false");
    return;
  }

  const url = resolveHealthUrl();
  if (!url) {
    logger.warn("[keep-warm] no base URL found (set KEEP_WARM_URL or ensure RENDER_EXTERNAL_URL)");
    return;
  }

  const CHECK_EVERY_MIN = parseInt(process.env.KEEP_WARM_INTERVAL_MIN || "10", 10); // default 10 min

  const tick = async () => {
    // jitter to avoid hitting at the same second across instances
    const jitterMs = Math.floor(Math.random() * 20000);
    await new Promise((r) => setTimeout(r, jitterMs));

    const started = Date.now();
    try {
      const res = await axios.get(url, {
        timeout: 8000,
        headers: { "User-Agent": "ICCICT-KeepWarm/1.0" },
      });
      logger.info("[keep-warm] ping ok", {
        url,
        status: res.status,
        durationMs: Date.now() - started,
      });
    } catch (err) {
      logger.warn("[keep-warm] ping failed", {
        url,
        error: err?.message || String(err),
      });
    }
  };

  // Run first ping after 60s, then on interval (like reviewReminderJob)
  setTimeout(tick, 60 * 1000);
  setInterval(tick, CHECK_EVERY_MIN * 60 * 1000);

  logger.info("[keep-warm] scheduled", { url, everyMin: CHECK_EVERY_MIN });
}