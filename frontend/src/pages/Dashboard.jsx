import { Link } from "react-router-dom";
import Card from "../components/Card";

// Halaman beranda: ringkasan + pintasan ke fitur utama.
const actions = [
  {
    to: "/issue",
    title: "Issue Certificate",
    desc: "Pilih institusi, unggah file (PDF/gambar), terbitkan ke IPFS + blockchain.",
    cta: "Buat sertifikat →",
    color: "bg-brand-50 text-brand-700",
  },
  {
    to: "/institutions",
    title: "Institusi",
    desc: "Kelola institusi penerbit dan lihat semua sertifikat yang diterbitkan.",
    cta: "Lihat institusi →",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    to: "/stats",
    title: "Statistik",
    desc: "Ringkasan global: total sertifikat, institusi, dan tren verifikasi harian.",
    cta: "Lihat statistik →",
    color: "bg-amber-50 text-amber-700",
  },
  {
    to: "/verify",
    title: "Verify Certificate",
    desc: "Cek keaslian sertifikat berdasarkan certificateId dan lihat detailnya.",
    cta: "Verifikasi →",
    color: "bg-emerald-50 text-emerald-700",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola dan verifikasi sertifikat berbasis blockchain CertifyChain.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="group">
            <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
              <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold ${a.color}`}>
                {a.title}
              </span>
              <p className="mt-3 text-sm text-slate-600">{a.desc}</p>
              <p className="mt-4 text-sm font-semibold text-brand-600">{a.cta}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Bagaimana cara kerjanya?">
        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
            Pilih institusi penerbit, isi nama penerima, dan unggah file sertifikat. Backend mem-pin file ke IPFS lalu mencatat hash &amp; CID-nya di smart contract.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
            Anda menerima <code className="rounded bg-slate-100 px-1">certificateId</code> unik sebagai bukti.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span>
            Siapa pun bisa memverifikasi keaslian sertifikat dengan certificateId tersebut.
          </li>
        </ol>
      </Card>
    </div>
  );
}
