// src/services/mailer.service.js
// Pengirim email. Dev (MAIL_PROVIDER=console): cetak ke console.
// Produksi: ganti cabang provider dengan Resend/SES/SMTP.

const config = require("../config");

async function sendEmail({ to, subject, text }) {
  if (config.mailProvider === "console") {
    console.log("\n===== [EMAIL — DEV] =====");
    console.log("From   :", config.mailFrom);
    console.log("To     :", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("=========================\n");
    return;
  }

  // Resend (https://resend.com) — kirim via HTTP API (fetch bawaan, tanpa dependency).
  // PRODUKSI: MAIL_FROM harus memakai domain yang sudah diverifikasi di Resend.
  if (config.mailProvider === "resend") {
    if (!config.resendApiKey) throw new Error("RESEND_API_KEY belum diset (MAIL_PROVIDER=resend).");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.mailFrom, to: [to], subject, text }),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const j = await res.json();
        detail = j?.message || j?.name || JSON.stringify(j);
      } catch {
        /* respons non-JSON */
      }
      throw new Error(`Resend gagal mengirim (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return;
  }

  throw new Error(`MAIL_PROVIDER '${config.mailProvider}' belum didukung (pakai: console | resend).`);
}

/** Link verifikasi -> halaman frontend yang akan memanggil API verify-email. */
function verifyLink(token) {
  return `${config.publicBaseUrl}/verify-email?token=${token}`;
}

async function sendVerificationEmail(to, token) {
  await sendEmail({
    to,
    subject: "Verifikasi email CertifyChain",
    text:
      `Halo,\n\nVerifikasi email Anda dengan membuka tautan berikut (berlaku ${config.emailVerifyTtlHours} jam):\n` +
      `${verifyLink(token)}\n\n(Token: ${token})\n\nAbaikan email ini jika Anda tidak mendaftar.`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, verifyLink };
