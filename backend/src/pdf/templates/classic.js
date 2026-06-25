// src/pdf/templates/classic.js
// Template "Classic" — sertifikat A4 landscape, tanpa JSX (React.createElement)
// karena backend CommonJS tanpa bundler. Aksen violet (selaras brand).

const INK = "#18181B";
const MUTED = "#5B5D66";
const LINE = "#E5E7EB";

function build({ RP, React, data, qrDataUrl }) {
  const h = React.createElement;
  const { Document, Page, View, Text, Image, StyleSheet } = RP;
  const { recipientName, institutionName, issuedAt, certificateId, body, verificationUrl, accent } = data;
  const BRAND = accent || "#5E4FDB";

  const s = StyleSheet.create({
    page: { padding: 22, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
    frame: { flexGrow: 1, border: `2pt solid ${BRAND}`, borderRadius: 6, padding: 38, justifyContent: "space-between" },
    eyebrow: { fontSize: 11, letterSpacing: 3, color: BRAND, fontFamily: "Helvetica-Bold", textAlign: "center" },
    title: { marginTop: 6, fontSize: 40, color: INK, textAlign: "center", fontFamily: "Helvetica-Bold" },
    label: { marginTop: 22, fontSize: 12, color: MUTED, textAlign: "center" },
    name: { marginTop: 6, fontSize: 30, color: BRAND, textAlign: "center", fontFamily: "Helvetica-Bold" },
    rule: { alignSelf: "center", marginTop: 10, width: 220, borderBottom: `1pt solid ${LINE}` },
    body: { marginTop: 16, fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 1.5, marginHorizontal: 60 },
    metaRow: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
    metaLabel: { fontSize: 9, color: MUTED, letterSpacing: 1 },
    metaValue: { fontSize: 13, color: INK, marginTop: 2, fontFamily: "Helvetica-Bold" },
    footer: { marginTop: 24, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    footerLabel: { fontSize: 8, color: MUTED, letterSpacing: 1 },
    mono: { fontSize: 8, color: INK, fontFamily: "Courier", marginTop: 2 },
    verify: { fontSize: 8, color: MUTED, marginTop: 4 },
    qr: { width: 78, height: 78 },
  });

  return h(
    Document,
    { title: `Sertifikat ${recipientName || certificateId}`, author: institutionName || "CertifyChain" },
    h(Page, { size: "A4", orientation: "landscape", style: s.page },
      h(View, { style: s.frame },
        h(View, null,
          h(Text, { style: s.eyebrow }, "SERTIFIKAT PENCAPAIAN"),
          h(Text, { style: s.title }, "Sertifikat"),
          h(Text, { style: s.label }, "Dengan ini diberikan kepada"),
          h(Text, { style: s.name }, recipientName || "—"),
          h(View, { style: s.rule }),
          body ? h(Text, { style: s.body }, body) : null
        ),
        h(View, null,
          h(View, { style: s.metaRow },
            h(View, null,
              h(Text, { style: s.metaLabel }, "INSTITUSI PENERBIT"),
              h(Text, { style: s.metaValue }, institutionName || "—")
            ),
            h(View, null,
              h(Text, { style: s.metaLabel }, "TANGGAL TERBIT"),
              h(Text, { style: s.metaValue }, issuedAt || "—")
            )
          ),
          h(View, { style: s.footer },
            h(View, null,
              h(Text, { style: s.footerLabel }, "CERTIFICATE ID"),
              h(Text, { style: s.mono }, certificateId || "—"),
              verificationUrl ? h(Text, { style: s.verify }, `Verifikasi: ${verificationUrl}`) : null
            ),
            qrDataUrl ? h(Image, { src: qrDataUrl, style: s.qr }) : null
          )
        )
      )
    )
  );
}

module.exports = { name: "Classic", build };
