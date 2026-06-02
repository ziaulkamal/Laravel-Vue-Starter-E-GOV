// Daftar maskot cabor (aset statis di `public/images/maskot/`).
// Nilai `file` disimpan di kolom `sports.icon` di backend.

export interface MascotOption { file: string; label: string }

export const MASCOTS: MascotOption[] = [
    { file: 'anggar.png',         label: 'Anggar' },
    { file: 'angkat-besi.png',    label: 'Angkat Besi' },
    { file: 'arung-jeram.png',    label: 'Arung Jeram' },
    { file: 'atletik.png',        label: 'Atletik' },
    { file: 'badminton.png',      label: 'Badminton / Bulu Tangkis' },
    { file: 'balap-sepeda.png',   label: 'Balap Sepeda' },
    { file: 'bermotor.png',       label: 'Bermotor' },
    { file: 'bola-basket.png',    label: 'Bola Basket' },
    { file: 'bola-voli.png',      label: 'Bola Voli' },
    { file: 'dayung.png',         label: 'Dayung' },
    { file: 'futsal.png',         label: 'Futsal' },
    { file: 'karate.png',         label: 'Karate' },
    { file: 'kempo.png',          label: 'Kempo' },
    { file: 'layar.png',          label: 'Layar' },
    { file: 'menembak.png',       label: 'Menembak' },
    { file: 'muaythai.png',       label: 'Muaythai' },
    { file: 'panahan.png',        label: 'Panahan' },
    { file: 'panjat-tebing.png',  label: 'Panjat Tebing' },
    { file: 'petanque.png',       label: 'Petanque' },
    { file: 'sepak-bola.png',     label: 'Sepak Bola' },
    { file: 'sepak-takraw.png',   label: 'Sepak Takraw' },
    { file: 'sepatu-roda.png',    label: 'Sepatu Roda' },
    { file: 'silat.png',          label: 'Pencak Silat' },
    { file: 'taekwondo.png',      label: 'Taekwondo' },
    { file: 'tarung-derajat.png', label: 'Tarung Derajat' },
    { file: 'tennis-lapangan.png', label: 'Tenis Lapangan' },
    { file: 'tennis-meja.png',    label: 'Tenis Meja' },
    { file: 'tinju.png',          label: 'Tinju' },
    { file: 'wushu.png',          label: 'Wushu' },
];

/** URL aset maskot (file di `public/images/maskot/`). */
export function maskotUrl(file?: string | null): string {
    if (!file) return '';
    return `/images/maskot/${encodeURIComponent(file)}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

// Sinonim nama cabor → label maskot (untuk auto-saran saat menambah cabor).
const ALIASES: Record<string, string> = {
    bulutangkis: 'badminton.png',
    pencaksilat: 'silat.png',
    tenismeja:   'tennis-meja.png',
    tenislapangan: 'tennis-lapangan.png',
    tenis:       'tennis-lapangan.png',
};

/** Tebak file maskot dari nama cabor (cocokkan nama/label). */
export function guessMascot(name?: string | null): string {
    if (!name) return '';
    const n = norm(name);
    if (ALIASES[n]) return ALIASES[n];
    const exact = MASCOTS.find((m) => norm(m.label) === n || norm(m.file.replace(/\.\w+$/, '')) === n);
    if (exact) return exact.file;
    const partial = MASCOTS.find((m) => norm(m.label).includes(n) || n.includes(norm(m.file.replace(/\.\w+$/, ''))));
    return partial?.file ?? '';
}
