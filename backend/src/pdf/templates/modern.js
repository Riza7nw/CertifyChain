// src/pdf/templates/modern.js
// Template "Modern" — A4 landscape, panel aksen di kiri + konten kanan.
// Tanpa JSX (React.createElement). Branding via data.accent.

const INK = "#18181B";
const MUTED = "#5B5D66";
const FAINT = "#8A8D98";

function build({ RP, React, data, qrDataUrl }) {
  const h = React.createElement;
  const { Document, Page, View, Text, Image, StyleSheet } = RP;
  const { recipientName, institutionName, issuedAt, certificateId, body, verificationUrl, accent } = data;
  const BRAND = accent || "#0F766E";

  const s = StyleSheet.create({
    page: { flexDirection: "row", backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
    side: { width: 150, backgroundColor: BRAND, padding: 26, justifyContent: "space-between" },
    sideTitle: { color: "#FFFFFF", fontSize: 13, letterSpacing: 2, fontFamily: "Helvetica-Bold" },
    sideText: { color: "#FFFFFF", fontSize: 9, opacity: 0.85, lineHeight: 1.5 },
    qr: { width: 92, height: 92, backgroundColor: "#FFFFFF", padding: 5, borderRadius: 6 },
    main: { flexGrow: 1, padding: 44, justifyContent: "center" },
    eyebrow: { fontSize: 10, letterSpacing: 3, color: BRAND, fontFamily: "Helvetica-Bold" },
    title: { marginTop: 8, fontSize: 34, color: INK, fontFamily: "Helvetica-Bold" },
    label: { marginTop: 24, fontSize: 11, color: MUTED },
    name: { marginTop: 6, fontSize: 28, color: INK, fontFamily: "Helvetica-Bold" },
    accentRule: { marginTop: 12, width: 64, height: 3, backgroundColor: BRAND, borderRadius: 2 },
    body: { marginTop: 16, fontSize: 11, color: MUTED, lineHeight: 1.5, maxWidth: 380 },
    meta: { marginTop: 30, fontSize: 11, color: INK, fontFamily: "Helvetica-Bold" },
    metaLabel: { fontSize: 8, color: FAINT, letterSpacing: 1 },
    foot: { marginTop: 20 },
    mono: { fontSize: 8, color: FAINT, fontFamily: "Courier" },
  });

  return h(
    Document,
    { title: `Sertifikat ${recipientName || certificateId}`, author: institutionName || "CertifyChain" },
    h(Page, { size: "A4", orientation: "landscape", style: s.page },
      h(View, { style: s.side },
        h(View, null,
          h(Text, { style: s.sideTitle }, "CERTIFY\nCHAIN"),
          h(Text, { style: [s.sideText, { marginTop: 10 }] }, "Terverifikasi di blockchain")
        ),
        qrDataUrl ? h(Image, { src: qrDataUrl, style: s.qr }) : null
      ),
      h(View, { style: s.main },
        h(Text, { style: s.eyebrow }, "SERTIFIKAT PENCAPAIAN"),
        h(Text, { style: s.title }, "Sertifikat"),
        h(Text, { style: s.label }, "Diberikan kepada"),
        h(Text, { style: s.name }, recipientName || "—"),
        h(View, { style: s.accentRule }),
        body ? h(Text, { style: s.body }, body) : null,
        h(View, { style: s.meta },
          h(Text, { style: s.metaLabel }, "INSTITUSI PENERBIT"),
          h(Text, null, institutionName || "—")
        ),
        h(View, { style: s.foot },
          h(Text, { style: s.metaLabel }, `DITERBITKAN ${issuedAt || "—"}  ·  ID`),
          h(Text, { style: s.mono }, certificateId || "—"),
          verificationUrl ? h(Text, { style: [s.mono, { marginTop: 2 }] }, verificationUrl) : null
        )
      )
    )
  );
}

module.exports = { name: "Modern", build };
