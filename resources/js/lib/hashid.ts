// Obfuscator ID reversibel untuk URL.
// id numerik → string base36 acak, dan bisa di-decode kembali.
// Bukan enkripsi kriptografis (kunci ada di client), tujuannya
// menyembunyikan ID berurutan agar tidak gampang ditebak/di-enumerasi.

const M    = 2147483648n;   // 2^31 — ruang ID
const A    = 506952113n;    // pengali ganjil, coprime dengan 2^31
const AINV = modInverse(A, M);

function modInverse(a: bigint, m: bigint): bigint {
    let [oldR, r] = [a % m, m];
    let [oldS, s] = [1n, 0n];
    while (r !== 0n) {
        const q = oldR / r;
        [oldR, r] = [r, oldR - q * r];
        [oldS, s] = [s, oldS - q * s];
    }
    return ((oldS % m) + m) % m;
}

/** Encode id numerik → string opaque untuk URL. */
export function encodeId(id: number | string): string {
    const n = BigInt(id);
    const v = (n * A) % M;
    return v.toString(36);
}

/** Decode string URL → id numerik asli. NaN jika tidak valid. */
export function decodeId(hash: string | number): number {
    const parsed = parseInt(String(hash), 36);
    if (Number.isNaN(parsed)) return NaN;
    const n = (BigInt(parsed) * AINV) % M;
    return Number(n);
}
