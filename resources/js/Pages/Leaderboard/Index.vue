<template>
    <SimporaLayout title="Klasemen">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Klasemen PORA XV 2026</h1>
                    <p class="page-subtitle">Diperbarui: {{ lastUpdated }}</p>
                </div>
                <div class="header-actions">
                    <AppButton variant="secondary" size="sm" :loading="refreshing" @click="refresh">
                        🔄 Refresh
                    </AppButton>
                </div>
            </div>

            <!-- Overall Leaderboard -->
            <AppCard>
                <template #header>
                    <span class="section-title">Klasemen Umum</span>
                </template>
                <p v-if="loading" class="lb-empty">Memuat klasemen…</p>
                <AppEmptyState v-else-if="!leaderboard.length" title="Belum ada perolehan medali" size="sm" />
                <table v-else class="lb-table">
                    <thead>
                        <tr class="lb-thead">
                            <th class="lb-th" style="width:40px">#</th>
                            <th class="lb-th">Kontingen</th>
                            <th class="lb-th lb-medal">🥇 Emas</th>
                            <th class="lb-th lb-medal">🥈 Perak</th>
                            <th class="lb-th lb-medal">🥉 Perunggu</th>
                            <th class="lb-th lb-medal">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, i) in leaderboard" :key="entry.name"
                            :class="['lb-row', i === 0 ? 'lb-row--gold' : i === 1 ? 'lb-row--silver' : i === 2 ? 'lb-row--bronze' : '']">
                            <td class="lb-td lb-rank">
                                <span v-if="i === 0">🥇</span>
                                <span v-else-if="i === 1">🥈</span>
                                <span v-else-if="i === 2">🥉</span>
                                <span v-else>{{ i + 1 }}</span>
                            </td>
                            <td class="lb-td lb-name">
                                <div class="kontingen-cell">
                                    <ContingentLogo
                                        :wilayah-kode="entry.wilayah_kode"
                                        :short-name="entry.short"
                                        :name="entry.name"
                                        :size="32"
                                        :radius="8"
                                    />
                                    <span>{{ entry.name }}</span>
                                </div>
                            </td>
                            <td class="lb-td lb-medal lb-gold-count">{{ entry.gold }}</td>
                            <td class="lb-td lb-medal">{{ entry.silver }}</td>
                            <td class="lb-td lb-medal">{{ entry.bronze }}</td>
                            <td class="lb-td lb-medal lb-total">{{ entry.gold + entry.silver + entry.bronze }}</td>
                        </tr>
                    </tbody>
                </table>
            </AppCard>

            <!-- Per Cabor -->
            <AppCard>
                <template #header>
                    <div class="card-header-row">
                        <span class="section-title">Klasemen per Cabor</span>
                        <AppSelect v-model="selectedCabor" :options="caborOptions" style="width:200px" />
                    </div>
                </template>
                <p v-if="selectedCabor && caborLoading" class="lb-empty">Memuat…</p>
                <AppEmptyState v-else-if="!selectedCabor" title="Pilih cabor untuk melihat klasemen" size="sm" />
                <AppEmptyState v-else-if="!caborLeaderboard.length" title="Belum ada medali untuk cabor ini" size="sm" />
                <table v-else class="lb-table">
                    <thead>
                        <tr class="lb-thead">
                            <th class="lb-th">#</th>
                            <th class="lb-th">Kontingen</th>
                            <th class="lb-th lb-medal">🥇</th>
                            <th class="lb-th lb-medal">🥈</th>
                            <th class="lb-th lb-medal">🥉</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(e, i) in caborLeaderboard" :key="e.name" class="lb-row">
                            <td class="lb-td lb-rank">{{ i + 1 }}</td>
                            <td class="lb-td lb-name">{{ e.name }}</td>
                            <td class="lb-td lb-medal lb-gold-count">{{ e.gold }}</td>
                            <td class="lb-td lb-medal">{{ e.silver }}</td>
                            <td class="lb-td lb-medal">{{ e.bronze }}</td>
                        </tr>
                    </tbody>
                </table>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import api           from '@/lib/axios';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

interface LbEntry { name: string; short?: string; wilayah_kode?: string | null; gold: number; silver: number; bronze: number }

const refreshing    = ref(false);
const loading       = ref(false);
const lastUpdated   = ref('—');
const selectedCabor = ref('');

const leaderboard      = ref<LbEntry[]>([]);
const caborOptions     = ref<{ value: string | number; label: string }[]>([]);
const caborLeaderboard = ref<LbEntry[]>([]);
const caborLoading     = ref(false);

function mapRows(raw: any): LbEntry[] {
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    return list.filter(Boolean).map((r: any) => ({
        name: r.contingent_name ?? r.name ?? '—',
        short: r.short_name ?? undefined,
        wilayah_kode: r.wilayah_kode ?? null,
        gold: Number(r.gold ?? 0),
        silver: Number(r.silver ?? 0),
        bronze: Number(r.bronze ?? 0),
    }));
}

function nowLabel() {
    return new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

async function fetchOverall() {
    loading.value = true;
    try {
        const res = await api.get('/api/v1/leaderboard');
        leaderboard.value = mapRows(res.data?.data);
        lastUpdated.value = nowLabel();
    } catch {
        leaderboard.value = [];
    } finally {
        loading.value = false;
    }
}

async function fetchCabors() {
    try {
        const res = await api.get('/api/v1/sports');
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        caborOptions.value = list.filter(Boolean).map((s: any) => ({ value: s.id, label: s.name }));
    } catch {
        caborOptions.value = [];
    }
}

async function fetchCaborLeaderboard(sportId: string | number) {
    if (!sportId) { caborLeaderboard.value = []; return; }
    caborLoading.value = true;
    try {
        const res = await api.get('/api/v1/leaderboard', { params: { sport_id: sportId } });
        caborLeaderboard.value = mapRows(res.data?.data);
    } catch {
        caborLeaderboard.value = [];
    } finally {
        caborLoading.value = false;
    }
}

watch(selectedCabor, (v) => fetchCaborLeaderboard(v));

function refresh() {
    refreshing.value = true;
    Promise.all([fetchOverall(), selectedCabor.value ? fetchCaborLeaderboard(selectedCabor.value) : Promise.resolve()])
        .finally(() => { refreshing.value = false; });
}

onMounted(() => { fetchOverall(); fetchCabors(); });
</script>

<style scoped>
.page-wrap      { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header    { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title     { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle  { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.header-actions { display: flex; gap: 8px; }
.section-title  { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.card-header-row{ display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; }

.lb-table   { width: 100%; border-collapse: collapse; }
.lb-thead   { }
.lb-th      { padding: 9px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); background: var(--color-bg-subtle); }
.lb-medal   { text-align: center; }
.lb-row     { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.lb-row:hover  { background: var(--color-bg-subtle); }
.lb-row:last-child { border-bottom: none; }
.lb-row--gold   { background: rgba(183,140,43,0.08); }
.lb-row--silver { background: rgba(148,163,184,0.08); }
.lb-row--bronze { background: rgba(180,100,50,0.06); }
.lb-td      { padding: 12px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.lb-rank    { font-weight: 700; font-size: 16px; }
.lb-name    { font-weight: 500; }
.lb-gold-count { font-weight: 700; color: var(--color-gold); }
.lb-total   { font-weight: 700; color: var(--color-accent); }
.kontingen-cell { display: flex; align-items: center; gap: 10px; }
.lb-empty { font-size: 13px; color: var(--color-text-muted); padding: 18px 4px; text-align: center; }
</style>
