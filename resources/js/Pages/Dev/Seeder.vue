<template>
    <SimporaLayout title="Generator Data">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Generator Data Simulasi</h1>
                    <p class="page-subtitle">Isi seluruh modul dengan data dummy yang koheren — atau bersihkan kembali. Khusus lingkungan dev.</p>
                </div>
                <AppButton variant="secondary" size="md" :loading="loadingStatus" @click="fetchStatus">Muat ulang status</AppButton>
            </div>

            <!-- Banner nonaktif -->
            <AppAlert v-if="status && !status.enabled" type="warning" class="seeder-alert">
                Generator dinonaktifkan di environment <strong>{{ status.env }}</strong>. Aktifkan via <code>SIMULATION_ENABLED=true</code> (hanya untuk dev).
            </AppAlert>

            <!-- ── Ringkasan jumlah baris ─────────────────────────────── -->
            <AppCard title="Status Data" subtitle="Jumlah baris per tabel saat ini" padding="lg" class="seeder-section">
                <div v-if="loadingStatus && !status" class="counts-grid">
                    <div v-for="i in 12" :key="i" class="count-card count-card--skeleton" />
                </div>
                <div v-else-if="status" class="counts-grid">
                    <div v-for="(val, key) in status.counts" :key="key" class="count-card">
                        <span class="count-card__num">{{ val }}</span>
                        <span class="count-card__label">{{ tableLabel(key) }}</span>
                    </div>
                </div>
                <div class="seeder-meta" v-if="status">
                    Environment: <AppBadge size="sm" :color="status.env === 'production' ? 'danger' : 'success'">{{ status.env }}</AppBadge>
                    · Simulasi: <AppBadge size="sm" :color="status.enabled ? 'success' : 'default'">{{ status.enabled ? 'aktif' : 'nonaktif' }}</AppBadge>
                </div>
            </AppCard>

            <!-- ── Seed ───────────────────────────────────────────────── -->
            <AppCard title="Buat Data Simulasi" subtitle="Pilih profil & modul, lalu jalankan" padding="lg" class="seeder-section">
                <div class="seed-grid">
                    <div class="seed-block">
                        <h4 class="seed-block__title">Preset Volume <span class="title-hint">titik awal — semua angka bisa diubah</span></h4>
                        <div class="radio-row">
                            <AppRadio v-for="p in profiles" :key="p" v-model="form.profile" :value="p"
                                :label="profileLabel(p)" name="profile" />
                        </div>
                    </div>

                    <div class="seed-block">
                        <h4 class="seed-block__title">Jumlah Data
                            <button type="button" class="link-btn" @click="applyPreset(form.profile)">reset ke preset «{{ profileLabel(form.profile) }}»</button>
                        </h4>
                        <div class="counts-form">
                            <div v-for="k in volumeKeys" :key="k" class="count-field" :class="{ 'count-field--ratio': k === 'finished_ratio' }">
                                <label class="count-field__label">{{ volumeLabel(k) }}</label>
                                <input
                                    class="count-field__input"
                                    type="number"
                                    inputmode="decimal"
                                    :min="limits[k]?.min ?? 0"
                                    :max="limits[k]?.max"
                                    :step="limits[k]?.step ?? 1"
                                    v-model.number="form.counts[k]"
                                    @blur="clampField(k)"
                                />
                                <span v-if="limits[k]" class="count-field__range">{{ limits[k].min }}–{{ limits[k].max }}</span>
                            </div>
                        </div>

                        <!-- Preview sinkron (derived) -->
                        <div class="derived">
                            <span class="derived__item">≈ <b>{{ estPersons.toLocaleString('id-ID') }}</b> data pribadi</span>
                            <span class="derived__item">≈ <b>{{ estAthletes.toLocaleString('id-ID') }}</b> atlet</span>
                            <span class="derived__item">≈ <b>{{ estOfficials.toLocaleString('id-ID') }}</b> ofisial</span>
                            <span class="derived__item">hingga <b>{{ (form.counts.max_matches ?? 0).toLocaleString('id-ID') }}</b> pertandingan</span>
                            <span class="derived__item"><b>{{ finishedPct }}%</b> ditandai selesai (+ medali)</span>
                        </div>
                        <p class="hint">Angka disinkronkan otomatis — data pribadi, peserta, registrasi sub-cabor, lineup, hasil & medali mengikuti jumlah di atas. Nilai di luar batas dibulatkan ke rentang aman.</p>
                    </div>

                    <div class="seed-block">
                        <h4 class="seed-block__title">Modul <button type="button" class="link-btn" @click="toggleAllModules">{{ allChecked ? 'kosongkan' : 'pilih semua' }}</button></h4>
                        <div class="modules-grid">
                            <AppCheckbox v-for="m in modules" :key="m" v-model="form.modules" :value="m" :label="moduleLabel(m)" />
                        </div>
                        <p class="hint">Data master (wilayah, role, cabor, jenis dokumen, template kartu) selalu disiapkan.</p>
                    </div>

                    <div class="seed-block">
                        <AppToggle v-model="form.fresh" label="Migrate fresh dulu" description="Reset skema (migrate:fresh) sebelum seed. Semua data hilang." />
                        <p class="hint" :class="{ 'hint--warn': form.fresh }">
                            <template v-if="form.fresh">⚠ Fresh akan <strong>impor ulang 91.600 baris wilayah Indonesia</strong> (~1–2 menit di fase “Master data”). Hanya perlu jika skema/migrasi berubah.</template>
                            <template v-else>Untuk sekadar isi ulang data, <strong>tanpa fresh</strong> jauh lebih cepat (wilayah master tidak diimpor ulang). Bersihkan dulu via “Hapus Data → Hanya simulasi” bila perlu.</template>
                        </p>
                    </div>
                </div>

                <template #footer>
                    <div class="card-actions">
                        <AppButton variant="primary" size="md" :loading="seeding" :disabled="!canSeed" @click="runSeed">
                            {{ seeding ? 'Membuat data…' : 'Jalankan Seed' }}
                        </AppButton>
                    </div>
                </template>
            </AppCard>

            <!-- ── Hasil run terakhir ─────────────────────────────────── -->
            <AppCard v-if="lastLog.length" title="Log Run Terakhir" padding="lg" class="seeder-section">
                <ul class="run-log">
                    <li v-for="(line, i) in lastLog" :key="i">{{ line }}</li>
                </ul>
            </AppCard>

            <!-- ── Clean (danger) ─────────────────────────────────────── -->
            <AppCard title="Bersihkan Data" subtitle="Hapus data simulasi atau reset total" padding="lg" class="seeder-section seeder-section--danger">
                <div class="clean-row">
                    <div class="seed-block">
                        <h4 class="seed-block__title">Cakupan</h4>
                        <div class="radio-row">
                            <AppRadio v-model="cleanScope" value="simulation" name="scope" label="Hanya simulasi"
                                description="Master & super admin tetap." />
                            <AppRadio v-model="cleanScope" value="all" name="scope" label="Reset total"
                                description="Hapus data aktivitas. Fondasi tetap: wilayah, cabor, jenis berkas, template, kontingen, user default (1/role + 1/kontingen)." />
                        </div>
                    </div>
                    <AppButton variant="danger" size="md" @click="confirmOpen = true">Hapus Data…</AppButton>
                </div>
            </AppCard>
        </div>

        <!-- Popup progress (terminal) saat seeding -->
        <AppModal v-model="showProgress" :title="progress.done ? 'Seed Selesai' : (progress.failed ? 'Seed Gagal' : 'Menjalankan Seed…')" size="lg">
            <div class="seed-progress">
                <!-- Progress bar -->
                <div class="sp-bar-row">
                    <div class="sp-bar" :class="{ 'sp-bar--done': progress.done, 'sp-bar--fail': progress.failed }">
                        <div class="sp-bar__fill" :style="{ width: progress.percent + '%' }" />
                    </div>
                    <span class="sp-pct">{{ progress.percent }}%</span>
                </div>

                <!-- Label fase berjalan -->
                <div class="sp-label">
                    <Loader2 v-if="seeding && !progress.done && !progress.failed" :size="15" class="spin" />
                    <CheckCircle2 v-else-if="progress.done" :size="15" class="sp-ic-ok" />
                    <XCircle v-else-if="progress.failed" :size="15" class="sp-ic-fail" />
                    <span>{{ progress.label }}</span>
                    <span v-if="progress.total" class="sp-step">{{ Math.min(progress.step + (progress.done ? 0 : 1), progress.total) }}/{{ progress.total }} fase</span>
                </div>

                <!-- Terminal log -->
                <div ref="termRef" class="sp-terminal">
                    <div v-for="(l, i) in progressLog" :key="i" class="sp-line">
                        <span class="sp-prompt">›</span> {{ l }}
                    </div>
                    <div v-if="!progressLog.length" class="sp-line sp-line--muted">Menunggu output…</div>
                    <div v-if="seeding && !progress.done" class="sp-cursor">▋</div>
                </div>
            </div>

            <template #footer>
                <AppButton variant="secondary" size="md" :disabled="seeding" @click="showProgress = false">
                    {{ seeding ? 'Menjalankan…' : 'Tutup' }}
                </AppButton>
            </template>
        </AppModal>

        <!-- Modal konfirmasi -->
        <AppModal v-model="confirmOpen" title="Konfirmasi Penghapusan" size="sm">
            <p class="confirm-text">
                Anda akan menghapus data
                <strong>{{ cleanScope === 'all' ? 'SECARA TOTAL (sisakan fondasi + user default)' : 'simulasi' }}</strong>.
                Tindakan ini tidak dapat dibatalkan. Ketik <code>CLEAN</code> untuk melanjutkan.
            </p>
            <AppInput v-model="confirmText" placeholder="CLEAN" />
            <template #footer>
                <AppButton variant="secondary" size="md" @click="confirmOpen = false">Batal</AppButton>
                <AppButton variant="danger" size="md" :loading="cleaning" :disabled="confirmText !== 'CLEAN'" @click="runClean">
                    Hapus Sekarang
                </AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import { Loader2, CheckCircle2, XCircle } from '@lucide/vue';
import api from '@/lib/axios';
import { useToast } from '@/Composables/useToast';
import { useAuth } from '@/Composables/useAuth';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard from '@/Components/App/AppCard.vue';
import AppButton from '@/Components/App/AppButton.vue';
import AppBadge from '@/Components/App/AppBadge.vue';
import AppAlert from '@/Components/App/AppAlert.vue';
import AppRadio from '@/Components/App/AppRadio.vue';
import AppCheckbox from '@/Components/App/AppCheckbox.vue';
import AppToggle from '@/Components/App/AppToggle.vue';
import AppModal from '@/Components/App/AppModal.vue';
import AppInput from '@/Components/App/AppInput.vue';

interface Limit { min: number; max: number; step: number }
interface SeederStatus {
    counts: Record<string, number>;
    enabled: boolean;
    env: string;
    profiles: Record<string, Record<string, number>>;
    volume_keys: string[];
    limits: Record<string, Limit>;
    modules: string[];
}

const toast = useToast();
const { isSuperAdmin } = useAuth();

const status = ref<SeederStatus | null>(null);
const loadingStatus = ref(false);
const seeding = ref(false);
const cleaning = ref(false);

const profiles = ref<string[]>(['minimal', 'standard', 'full']);
const profilesDetail = ref<Record<string, Record<string, number>>>({});
const volumeKeys = ref<string[]>([]);
const limits = ref<Record<string, Limit>>({});
const modules = ref<string[]>([]);
const lastLog = ref<string[]>([]);

const form = reactive({
    profile: 'standard',
    counts: {} as Record<string, number>,
    modules: [] as string[],
    fresh: false,
});

const cleanScope = ref<'simulation' | 'all'>('simulation');
const confirmOpen = ref(false);
const confirmText = ref('');

// ── Progress streaming (popup terminal) ──────────────────────────
const showProgress = ref(false);
const progressLog  = ref<string[]>([]);
const termRef      = ref<HTMLElement | null>(null);
const progress = reactive({ percent: 0, label: '', step: 0, total: 0, done: false, failed: false });

const allChecked = computed(() => modules.value.length > 0 && form.modules.length === modules.value.length);
const canSeed = computed(() => !!status.value?.enabled && !seeding.value);

const TABLE_LABELS: Record<string, string> = {
    contingents: 'Kontingen',
    persons: 'Data Pribadi',
    participants: 'Peserta',
    participant_registrations: 'Registrasi Sub-Cabor',
    venues: 'Venue',
    lodgings: 'Penginapan',
    lodging_allocations: 'Alokasi Penginapan',
    users: 'User',
    judge_sport_scopes: 'Keahlian Juri',
    matches: 'Pertandingan',
    match_participants: 'Peserta Match',
    match_lineups: 'Lineup',
    match_judges: 'Juri Match',
    match_results: 'Hasil',
    match_medals: 'Medali',
    participant_documents: 'Dokumen',
    sports: 'Cabor',
    sport_categories: 'Sub-Cabor',
};

const MODULE_LABELS: Record<string, string> = {
    contingents: 'Kontingen',
    venues: 'Venue',
    lodgings: 'Penginapan',
    users: 'User & Juri',
    persons: 'Data Pribadi',
    participants: 'Peserta',
    registrations: 'Registrasi Sub-Cabor',
    matches: 'Jadwal Pertandingan',
    results: 'Hasil & Medali',
    documents: 'Dokumen Peserta',
};

const VOLUME_LABELS: Record<string, string> = {
    contingents: 'Kontingen',
    athletes_per_contingent: 'Atlet / kontingen',
    officials_per_contingent: 'Ofisial / kontingen',
    venues: 'Venue',
    lodgings: 'Penginapan',
    judges: 'Juri',
    max_matches: 'Maks. pertandingan',
    finished_ratio: 'Rasio selesai (0–1)',
};

function tableLabel(key: string): string {
    return TABLE_LABELS[key] ?? key;
}
function volumeLabel(key: string): string {
    return VOLUME_LABELS[key] ?? key;
}
function moduleLabel(key: string): string {
    return MODULE_LABELS[key] ?? key;
}
function profileLabel(p: string): string {
    return { minimal: 'Minimal (cepat)', standard: 'Standard (default)', full: 'Full (skala PORA)' }[p] ?? p;
}

/** Salin angka preset ke form.counts (jadi titik awal yang bisa diubah). */
function applyPreset(name: string) {
    const preset = profilesDetail.value[name];
    if (!preset) return;
    const next: Record<string, number> = {};
    for (const k of volumeKeys.value) next[k] = Number(preset[k] ?? 0);
    form.counts = next;
}

/** Bulatkan satu field ke rentang aman saat blur (cerminan clamp backend). */
function clampField(key: string) {
    const lim = limits.value[key];
    let v = Number(form.counts[key]);
    if (Number.isNaN(v)) v = lim?.min ?? 0;
    if (lim) v = Math.min(lim.max, Math.max(lim.min, v));
    form.counts[key] = key === 'finished_ratio' ? Math.round(v * 100) / 100 : Math.round(v);
}

// ── Preview sinkron (derived) ────────────────────────────────────────────────
const estAthletes  = computed(() => (form.counts.contingents ?? 0) * (form.counts.athletes_per_contingent ?? 0));
const estOfficials = computed(() => (form.counts.contingents ?? 0) * (form.counts.officials_per_contingent ?? 0));
const estPersons   = computed(() => estAthletes.value + estOfficials.value);
const finishedPct  = computed(() => Math.round((form.counts.finished_ratio ?? 0) * 100));

// Pindah preset → prefill ulang angka.
watch(() => form.profile, (p) => applyPreset(p));

function toggleAllModules() {
    form.modules = allChecked.value ? [] : [...modules.value];
}

async function fetchStatus() {
    loadingStatus.value = true;
    try {
        const res = await api.get('/api/v1/dev/status');
        const data = res.data?.data as SeederStatus;
        status.value = data;

        if (data?.profiles && typeof data.profiles === 'object') {
            profilesDetail.value = data.profiles;
            const names = Object.keys(data.profiles);
            if (names.length) {
                profiles.value = names;
                if (!names.includes(form.profile)) form.profile = names.includes('standard') ? 'standard' : names[0];
            }
        }
        if (Array.isArray(data?.volume_keys) && data.volume_keys.length) volumeKeys.value = data.volume_keys;
        if (data?.limits && typeof data.limits === 'object') limits.value = data.limits;

        // Prefill angka dari preset terpilih (sekali, jika belum diisi).
        if (!Object.keys(form.counts).length) applyPreset(form.profile);

        if (Array.isArray(data?.modules) && data.modules.length) {
            modules.value = data.modules;
            if (!form.modules.length) form.modules = [...data.modules];
        }
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal memuat status.');
    } finally {
        loadingStatus.value = false;
    }
}

async function scrollTerminal() {
    await nextTick();
    if (termRef.value) termRef.value.scrollTop = termRef.value.scrollHeight;
}

/** Proses satu event NDJSON dari stream seed. */
function handleSeedEvent(raw: string) {
    const s = raw.trim();
    if (!s) return;
    let ev: any;
    try { ev = JSON.parse(s); } catch { return; }

    if (ev.type === 'progress') {
        progress.percent = ev.percent ?? progress.percent;
        progress.label   = ev.label ?? progress.label;
        progress.step    = ev.step ?? progress.step;
        progress.total   = ev.total ?? progress.total;
    } else if (ev.type === 'log') {
        progressLog.value.push(ev.message);
        scrollTerminal();
    } else if (ev.type === 'done') {
        progress.percent = 100;
        progress.label   = 'Selesai';
        progress.done    = true;
        const data = ev.result;
        lastLog.value = data?.log ?? [...progressLog.value];
        if (data?.counts && status.value) status.value = { ...status.value, counts: data.counts };
        toast.success('Data simulasi berhasil dibuat.');
    } else if (ev.type === 'error') {
        progress.failed = true;
        progress.label  = 'Gagal';
        progressLog.value.push('⚠ ' + (ev.message ?? 'Gagal membuat data.'));
        scrollTerminal();
        toast.error(ev.message ?? 'Gagal membuat data.');
    }
}

async function runSeed() {
    // Sanitasi: hanya kirim angka valid (field kosong/NaN dilewati → pakai preset di backend).
    const counts: Record<string, number> = {};
    for (const k of volumeKeys.value) {
        const v = Number(form.counts[k]);
        if (Number.isFinite(v)) counts[k] = v;
    }

    // Reset state popup terminal.
    seeding.value      = true;
    lastLog.value      = [];
    progressLog.value  = [];
    progress.percent   = 0;
    progress.label     = 'Mempersiapkan…';
    progress.step      = 0;
    progress.total     = 0;
    progress.done      = false;
    progress.failed    = false;
    showProgress.value = true;

    const base = (api.defaults.baseURL || (import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

    try {
        const resp = await fetch(`${base}/api/v1/dev/seed/stream`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/x-ndjson' },
            body: JSON.stringify({ profile: form.profile, counts, modules: form.modules, fresh: form.fresh }),
        });

        if (!resp.ok) {
            const msg = await resp.text().catch(() => '');
            throw new Error(msg || `HTTP ${resp.status}`);
        }

        // Stream NDJSON: baca bertahap, pisah per baris.
        if (resp.body && 'getReader' in resp.body) {
            const reader  = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) handleSeedEvent(line);
            }
            if (buf.trim()) handleSeedEvent(buf);
        } else {
            // Fallback (tanpa stream): proses sekaligus setelah selesai.
            const text = await resp.text();
            for (const line of text.split('\n')) handleSeedEvent(line);
        }
    } catch (e: any) {
        progress.failed = true;
        progress.label  = 'Gagal';
        toast.error(e?.message ?? 'Gagal menjalankan seed.');
    } finally {
        seeding.value = false;
    }
}

async function runClean() {
    cleaning.value = true;
    try {
        const res = await api.post('/api/v1/dev/clean', { scope: cleanScope.value, confirm: confirmText.value });
        const data = res.data?.data;
        lastLog.value = data?.log ?? [];
        if (data?.counts) status.value = { ...(status.value as SeederStatus), counts: data.counts };
        toast.success(res.data?.message ?? 'Data simulasi berhasil dibersihkan.');
        confirmOpen.value = false;
        confirmText.value = '';
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal membersihkan data.');
    } finally {
        cleaning.value = false;
    }
}

onMounted(() => {
    // Halaman khusus super-admin.
    if (!isSuperAdmin.value) {
        router.visit('/dashboard');
        return;
    }
    void fetchStatus();
});
</script>

<style scoped>
/* Layout dasar halaman (konvensi repo: didefinisikan per-halaman). */
.page-wrap    { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title   { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle{ font-size: 13px; color: var(--color-text-muted); margin-top: 4px; max-width: 620px; line-height: 1.5; }

.seeder-section--danger { border: 1.5px solid var(--color-danger-light); }
.seeder-alert :deep(code),
.confirm-text code, .hint code {
    background: var(--color-bg-subtle); padding: 1px 6px; border-radius: 5px;
    font-size: 0.85em; font-family: var(--font-mono, ui-monospace, monospace);
    color: var(--color-text-primary);
}

/* ── Kartu jumlah baris ─────────────────────────────────────── */
.counts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
}
.count-card {
    display: flex; flex-direction: column; gap: 4px;
    padding: 14px 16px; border-radius: 12px;
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border);
    transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}
.count-card:hover { transform: translateY(-2px); border-color: var(--color-primary); box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06); }
.count-card--skeleton { height: 72px; animation: pulse 1.2s infinite; }
.count-card__num   { font-size: 26px; font-weight: 700; color: var(--color-primary); line-height: 1.1; font-variant-numeric: tabular-nums; }
.count-card__label { font-size: 12px; color: var(--color-text-muted); font-weight: 500; }
.seeder-meta { margin-top: 16px; font-size: 13px; color: var(--color-text-muted); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

/* ── Form seed ──────────────────────────────────────────────── */
.seed-grid  { display: flex; flex-direction: column; gap: 22px; }
.seed-block__title {
    font-size: 13px; font-weight: 700; color: var(--color-text-primary);
    text-transform: uppercase; letter-spacing: 0.04em;
    margin: 0 0 12px; display: flex; gap: 10px; align-items: baseline;
}
.radio-row    { display: flex; flex-wrap: wrap; gap: 14px 22px; }
.modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 18px; }
.hint   { margin-top: 12px; font-size: 12px; color: var(--color-text-subtle); line-height: 1.5; }
.hint--warn { color: #b45309; }
.title-hint { font-size: 11px; font-weight: 500; color: var(--color-text-subtle); text-transform: none; letter-spacing: 0; }

/* ── Editor jumlah data ─────────────────────────────────────── */
.counts-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px 16px; }
.count-field { display: flex; flex-direction: column; gap: 5px; }
.count-field__label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.count-field__input {
    width: 100%; padding: 8px 10px; border-radius: 9px;
    border: 1px solid var(--color-border); background: var(--color-bg-subtle);
    font-size: 14px; font-weight: 600; color: var(--color-text-primary);
    font-variant-numeric: tabular-nums; outline: none; transition: border-color 120ms ease, box-shadow 120ms ease;
}
.count-field__input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-subtle, rgba(59,130,246,0.15)); }
.count-field__range { font-size: 10.5px; color: var(--color-text-subtle); font-variant-numeric: tabular-nums; }
.count-field--ratio .count-field__input { color: var(--color-primary); }

.derived {
    margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px 10px;
}
.derived__item {
    font-size: 12px; color: var(--color-text-muted);
    background: var(--color-bg-subtle); border: 1px solid var(--color-border);
    padding: 5px 10px; border-radius: 999px;
}
.derived__item b { color: var(--color-primary); font-variant-numeric: tabular-nums; }
.link-btn { background: none; border: none; color: var(--color-primary); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; text-transform: none; letter-spacing: 0; }
.link-btn:hover { text-decoration: underline; }

.card-actions { display: flex; justify-content: flex-end; }
.clean-row    { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.clean-row .seed-block { flex: 1; min-width: 240px; }

/* ── Log run ────────────────────────────────────────────────── */
.run-log {
    list-style: none; margin: 0; padding: 0;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12.5px; color: var(--color-text-muted);
    max-height: 280px; overflow-y: auto;
}
.run-log li { padding: 6px 2px; border-bottom: 1px dashed var(--color-border); }
.run-log li:last-child { border-bottom: none; }

.confirm-text { font-size: 14px; color: var(--color-text-primary); margin: 0 0 14px; line-height: 1.6; }

/* ── Popup progress (terminal) ──────────────────────────────── */
.seed-progress { display: flex; flex-direction: column; gap: 14px; }
.sp-bar-row { display: flex; align-items: center; gap: 12px; }
.sp-bar {
    flex: 1; height: 10px; border-radius: 999px; overflow: hidden;
    background: var(--color-bg-subtle); border: 1px solid var(--color-border);
}
.sp-bar__fill {
    height: 100%; border-radius: 999px;
    background: linear-gradient(90deg, var(--color-primary), #6366f1);
    transition: width 280ms ease;
}
.sp-bar--done .sp-bar__fill { background: linear-gradient(90deg, #10b981, #059669); }
.sp-bar--fail .sp-bar__fill { background: linear-gradient(90deg, #ef4444, #dc2626); }
.sp-pct { font-size: 13px; font-weight: 700; color: var(--color-text-primary); font-variant-numeric: tabular-nums; min-width: 42px; text-align: right; }

.sp-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.sp-ic-ok   { color: #059669; }
.sp-ic-fail { color: #dc2626; }
.sp-step { margin-left: auto; font-size: 11.5px; font-weight: 500; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }

.sp-terminal {
    background: #0d1117; color: #c9d1d9; border-radius: 10px;
    padding: 14px 16px; max-height: 320px; overflow-y: auto;
    font-family: var(--font-mono, ui-monospace, monospace); font-size: 12.5px; line-height: 1.7;
    border: 1px solid #1f2630;
}
.sp-line { white-space: pre-wrap; word-break: break-word; }
.sp-line--muted { color: #6e7681; }
.sp-prompt { color: #3fb950; font-weight: 700; margin-right: 6px; }
.sp-cursor { color: #3fb950; animation: sp-blink 1s steps(2) infinite; }
@keyframes sp-blink { 0%,50% { opacity: 1; } 50.01%,100% { opacity: 0; } }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
