// src/jobs/reviewReminderJob.js
import { prisma } from "../config/db.js";
import { sendReviewReminderEmail } from "../services/emailService.js";
import reminderCfg from "../config/reviewReminder.config.js";
import { isMailerBlocked, nextSendTime } from "../services/mailerGuard.js";
/**
 * Sends reminder emails to committee members every N hours
 * for speakers still awaiting a decision. Stops once reviewStatus is
 * APPROVED / REJECTED / NEEDS_REVISION.
 *
 * Tuning via .env:
 *   REVIEW_REMINDER_INTERVAL_HOURS  (default 24)
 *   REVIEW_REMINDER_CHECK_MINUTES   (default 60)
 *   REVIEW_REMINDER_MAX             (default 7)
 */
const HOURS = Number(reminderCfg.INTERVAL_HOURS ?? 24); // allows 0.0833, etc.
const CHECK_EVERY_MIN = Number(reminderCfg.CHECK_EVERY_MIN ?? 60);
const MAX_REMINDERS = Number(reminderCfg.MAX_REMINDERS ?? 7);

function safeParseJSON(v, fallback = null) {
  try {
    if (!v) return fallback;
    if (typeof v === "object") return v;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function hoursBetween(a, b) {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60));
}

function earliestSentAt(committeeMembers) {
  const arr = safeParseJSON(committeeMembers, []);
  const dates = (arr || [])
    .map((m) => (m?.sentAt ? new Date(m.sentAt) : null))
    .filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function shouldSendReminder(speaker) {
  if (!speaker.sentToCommittee) return false;
  if (["APPROVED", "REJECTED", "NEEDS_REVISION"].includes(speaker.reviewStatus))
    return false;
  if ((speaker.reviewReminderCount || 0) >= MAX_REMINDERS) return false;

  const last = speaker.reviewReminderLastSentAt
    ? new Date(speaker.reviewReminderLastSentAt)
    : null;
  const firstSent =
    earliestSentAt(speaker.committeeMembers) ||
    new Date(speaker.updatedAt || speaker.createdAt);
  const reference = last || firstSent;
  if (!reference) return true;

  return hoursBetween(new Date(), reference) >= HOURS;
}

async function sendRemindersForSpeaker(speaker) {
  const members = safeParseJSON(speaker.committeeMembers, []) || [];
  if (!members.length) return;

  const results = await Promise.allSettled(
    members.map((m) => sendReviewReminderEmail(speaker, m))
  );

  await prisma.speaker.update({
    where: { id: speaker.id },
    data: {
      reviewReminderCount: (speaker.reviewReminderCount || 0) + 1,
      reviewReminderLastSentAt: new Date(),
    },
  });

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  console.log(
    `[ReviewReminderJob] ${
      speaker.paperId || speaker.id
    }: sent=${ok}, failed=${fail}`
  );
}

export function startReviewReminderJob() {
  if (reminderCfg.DISABLED) {
    console.log("[ReviewReminderJob] disabled via config");
    return;
  }
  console.log(
    `[ReviewReminderJob] started — checks every ${CHECK_EVERY_MIN} min; interval=${HOURS}h; max=${MAX_REMINDERS}`
  );

  const tick = async () => {
    try {
      if (isMailerBlocked()) {
        console.warn(
          `[ReviewReminderJob] Mailer in cooldown; skipping reminders until ${new Date(
            nextSendTime()
          ).toISOString()}`
        );
        return;
      }
      const speakers = await prisma.speaker.findMany({
        where: {
          sentToCommittee: true,
          reviewStatus: {
            in: ["PENDING", "SENT_TO_COMMITTEE", "UNDER_REVIEW"],
          },
        },
        select: {
          id: true,
          paperId: true,
          paperTitle: true,
          name: true,
          email: true,
          paperFileUrl: true,
          fileUrl: true,
          turnitinReportUrl: true,
          committeeMembers: true,
          reviewStatus: true,
          sentToCommittee: true,
          createdAt: true,
          updatedAt: true,
          reviewReminderCount: true,
          reviewReminderLastSentAt: true,
        },
      });

      let processed = 0,
        sent = 0;
      for (const s of speakers) {
        processed++;
        if (shouldSendReminder(s)) {
          await sendRemindersForSpeaker(s);
          sent++;
        }
      }
      if (processed)
        console.log(
          `[ReviewReminderJob] scanned=${processed}, remindersSent=${sent}`
        );
    } catch (err) {
      console.error("[ReviewReminderJob] error:", err?.message || err);
    }
  };

  // Run immediately, then on interval
  //   tick();
  setTimeout(tick, 60 * 1000);
  setInterval(tick, CHECK_EVERY_MIN * 60 * 1000);
}
