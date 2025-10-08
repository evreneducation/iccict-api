let cooldownUntil = 0;

// Default 25h to be safe; adjust if you want
const DEFAULT_COOLDOWN_MS = 25 * 60 * 60 * 1000;

export function isMailerBlocked() {
  return Date.now() < cooldownUntil;
}
export function nextSendTime() {
  return cooldownUntil;
}
export function tripMailerCooldown(ms = DEFAULT_COOLDOWN_MS) {
  cooldownUntil = Date.now() + ms;
  console.warn(
    `[MailerGuard] Cooling down until ${new Date(cooldownUntil).toISOString()}`
  );
}

// Decide if an error is a Gmail daily limit block
export function shouldCooldownFor(err) {
  const msg = `${err?.response || ""} ${err?.message || ""}`.toLowerCase();
  return (
    err?.responseCode === 550 &&
    (msg.includes("5.4.5") || msg.includes("daily user sending") || msg.includes("quota exceeded"))
  );
}
