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
  // TODO: integrasi provider nyata (Resend/SES/SMTP).
  throw new Error(`MAIL_PROVIDER '${config.mailProvider}' belum didukung.`);
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
