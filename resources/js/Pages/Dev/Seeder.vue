<template>
    <SimporaLayout>
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
                        <h4 class="seed-block__title">Profil Volume</h4>
                        <div class="radio-row">
                            <AppRadio v-for="p in profiles" :key="p" v-model="form.profile" :value="p"
                                :label="profileLabel(p)" name="profile" />
                        </div>
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
                                description="migrate:fresh — semua data hilang." />
                        </div>
                    </div>
                    <AppButton variant="danger" size="md" @click="confirmOpen = true">Hapus Data…</AppButton>
                </div>
            </AppCard>
        </div>

        <!-- Modal konfirmasi -->
        <AppModal v-model="confirmOpen" title="Konfirmasi Penghapusan" size="sm">
            <p class="confirm-text">
                Anda akan menghapus data
                <strong>{{ cleanScope === 'all' ? 'SECARA TOTAL (reset database)' : 'simulasi' }}</strong>.
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
import { ref, reactive, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
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

interface SeederStatus {
    counts: Record<string, number>;
    enabled: boolean;
    env: string;
    profiles: string[];
    modules: string[];
}

const toast = useToast();
const { isSuperAdmin } = useAuth();

const status = ref<SeederStatus | null>(null);
const loadingStatus = ref(false);
const seeding = ref(false);
const cleaning = ref(false);

const profiles = ref<string[]>(['minimal', 'standard', 'full']);
const modules = ref<string[]>([]);
const lastLog = ref<string[]>([]);

const form = reactive({
    profile: 'standard',
    modules: [] as string[],
    fresh: false,
});

const cleanScope = ref<'simulation' | 'all'>('simulation');
const confirmOpen = ref(false);
const confirmText = ref('');

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

function tableLabel(key: string): string {
    return TABLE_LABELS[key] ?? key;
}
function moduleLabel(key: string): string {
    return MODULE_LABELS[key] ?? key;
}
function profileLabel(p: string): string {
    return { minimal: 'Minimal (cepat)', standard: 'Standard (default)', full: 'Full (skala PORA)' }[p] ?? p;
}

function toggleAllModules() {
    form.modules = allChecked.value ? [] : [...modules.value];
}

async function fetchStatus() {
    loadingStatus.value = true;
    try {
        const res = await api.get('/api/v1/dev/status');
        const data = res.data?.data as SeederStatus;
        status.value = data;
        if (Array.isArray(data?.profiles) && data.profiles.length) profiles.value = data.profiles;
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

async function runSeed() {
    seeding.value = true;
    lastLog.value = [];
    try {
        const res = await api.post('/api/v1/dev/seed', {
            profile: form.profile,
            modules: form.modules,
            fresh: form.fresh,
        });
        const data = res.data?.data;
        lastLog.value = data?.log ?? [];
        if (data?.counts) status.value = { ...(status.value as SeederStatus), counts: data.counts };
        toast.success(res.data?.message ?? 'Data simulasi berhasil dibuat.');
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal membuat data.');
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

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
</style>
