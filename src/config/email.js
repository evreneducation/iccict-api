import nodemailer from "nodemailer";
import { config } from "dotenv";

config();

export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

transporter
  .verify()
  .then(() => console.log("Email server ready to send messages"))
  .catch((error) => {
    console.log("Email verification error: ", error);
    process.exit(1);
  });


// import nodemailer from "nodemailer";
// import { config } from "dotenv";
// import { sendMailSafe } from "../services/emailService.js";
// config();

// /**
//  * Prefer explicit SMTP_* vars; fall back to your existing EMAIL_* ones.
//  * This keeps your current env working but lets you switch providers easily.
//  */
// const SMTP_HOST   = process.env.SMTP_HOST || "smtp.gmail.com";
// const SMTP_PORT   = Number(process.env.SMTP_PORT || 587);
// const SMTP_SECURE = (process.env.SMTP_SECURE || "").toLowerCase() === "true"; // true only for 465
// const EMAIL_USER   = process.env.EMAIL_USER || process.env.EMAIL_USER;
// const EMAIL_PASSWORD   = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD;

// // Build a pooled transporter with timeouts (prevents hanging on PaaS like Railway)
// export const transporter = nodemailer.createTransport({
//   host: SMTP_HOST,
//   port: SMTP_PORT,
//   secure: SMTP_SECURE,
//   auth: EMAIL_USER && EMAIL_PASSWORD ? { user:  EMAIL_USER, pass: EMAIL_PASSWORD } : undefined,
//   // Connection pool for better reuse + fewer auths
//   pool: (process.env.SMTP_POOL || "true").toLowerCase() === "true",
//   maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
//   maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 50),
//   // Timeouts so the app doesn’t hang forever if SMTP is blocked
//   connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000), // 10s
//   greetingTimeout:   Number(process.env.SMTP_GREETING_TIMEOUT   || 10000), // 10s
//   socketTimeout:     Number(process.env.SMTP_SOCKET_TIMEOUT     || 20000), // 20s
//   // If you KNOW you’re using a provider with funky TLS, you could add:
//   // tls: { rejectUnauthorized: false },
// });

// /**
//  * Optional verification on boot. Do NOT crash the app if it fails.
//  * Enable only if you set EMAIL_VERIFY_ON_BOOT=true in env.
//  */
// (async () => {
//   const verifyOnBoot = (process.env.EMAIL_VERIFY_ON_BOOT || "").toLowerCase() === "true";
//   if (!verifyOnBoot) return;

//   try {
//     await transporter.verify();
//     console.log("Email server ready to send messages");
//   } catch (err) {
//     console.warn("Email verification warning (continuing):", err?.message || err);
//     // IMPORTANT: do not exit the process on Railway
//   }
// })();

// /**
//  * Small helper to add retry around transient SMTP errors.
//  * Use in places where you currently call `transporter.sendMail(...)`.
//  */
// export async function sendWithRetry(mailOptions, attempts = 3) {
//   let lastErr;
//   for (let i = 1; i <= attempts; i++) {
//     try {
//       // return await transporter.sendMail(mailOptions);
//       return await sendMailSafe(mailOptions);
//     } catch (err) {
//       lastErr = err;
//       const transient = ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"].includes(err?.code);
//       if (!transient || i === attempts) break;
//       await new Promise(r => setTimeout(r, 1000 * i)); // simple backoff
//     }
//   }
//   throw lastErr;
// }





// src/config/email.js
// import nodemailer from "nodemailer";
// import { config } from "dotenv";
// config();

// // ENV (kept simple, no helper functions)
// const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
// const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
// // if SMTP_SECURE is set, respect it; otherwise default true for port 465
// const SMTP_SECURE =
//   typeof process.env.SMTP_SECURE !== "undefined"
//     ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
//     : SMTP_PORT === 465;

// export const transporter = nodemailer.createTransport({
//   host: SMTP_HOST,
//   port: SMTP_PORT,
//   secure: SMTP_SECURE, // true for 465, false for 587
//   auth: (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
//     ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
//     : undefined,
//   // pooling + timeouts keep Railway from hanging
//   pool: String(process.env.SMTP_POOL || "true").toLowerCase() === "true",
//   maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
//   maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 50),
//   connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
//   greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
//   socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
// });

// // Optional: verify on boot (will NOT crash app)
// (async () => {
//   if (String(process.env.EMAIL_VERIFY_ON_BOOT || "").toLowerCase() !== "true") return;
//   try {
//     await transporter.verify();
//     console.log(`Email: SMTP ready (${SMTP_HOST}:${SMTP_PORT}, secure=${SMTP_SECURE})`);
//   } catch (err) {
//     console.warn("Email: SMTP verify warning:", err?.message || err);
//   }
// })();

// // Optional: keep for callers that want a retry without any other imports
// export async function sendWithRetry(mailOptions, attempts = 3) {
//   let lastErr;
//   for (let i = 1; i <= attempts; i++) {
//     try {
//       return await transporter.sendMail(mailOptions);
//     } catch (err) {
//       lastErr = err;
//       const code = err?.code || "";
//       const transient = code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED";
//       if (!transient || i === attempts) break;
//       await new Promise(r => setTimeout(r, 1000 * i)); // simple backoff
//     }
//   }
//   throw lastErr;
// }


// import nodemailer from "nodemailer";
// import { config } from "dotenv";
// config();

// /**
//  * Minimal Gmail SMTP (STARTTLS on 587).
//  * Uses only EMAIL_USER and EMAIL_PASSWORD from .env
//  */
// export const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // STARTTLS
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD, // Use an App Password for Gmail
//   },
// });

// /**
//  * Optional: small retry helper for transient network issues.
//  */
// export async function sendWithRetry(mailOptions, attempts = 3) {
//   let lastErr;
//   for (let i = 1; i <= attempts; i++) {
//     try {
//       return await transporter.sendMail(mailOptions);
//     } catch (err) {
//       lastErr = err;
//       const transient = ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"].includes(err?.code);
//       if (!transient || i === attempts) break;
//       await new Promise((r) => setTimeout(r, 1000 * i)); // simple backoff
//     }
//   }
//   throw lastErr;
// }