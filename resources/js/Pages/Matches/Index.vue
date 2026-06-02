<template>
    <SimporaLayout title="Jadwal Pertandingan">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Jadwal Pertandingan</h1>
                    <p class="page-subtitle">Kelola jadwal pertandingan PORA XV</p>
                </div>
                <AppButton v-if="can('matches.manage')" variant="primary" size="md" @click="$inertia.visit('/matches/create')">+ Buat Jadwal</AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari kode pertandingan..." />
                    </div>
                    <select v-model="filterStatus" class="filter-select">
                        <option value="">Semua Status</option>
                        <option value="scheduled">Terjadwal</option>
                        <option value="ongoing">Berlangsung</option>
                        <option value="finished">Selesai</option>
                        <option value="postponed">Ditunda</option>
                        <option value="cancelled">Dibatalkan</option>
                    </select>
                    <div class="filter-date"><AppDatePicker v-model="filterDate" placeholder="Semua tanggal" /></div>
                    <AppButton variant="secondary" size="sm" @click="setToday">Hari Ini</AppButton>
                    <AppButton v-if="filterStatus || filterDate || search" variant="ghost" size="sm" @click="resetFilters">Reset</AppButton>
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Kode</th>
                                <th class="dt-th">Sub-Cabor</th>
                                <th class="dt-th">Venue</th>
                                <th class="dt-th">Waktu</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th">Kontingen</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 6" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 7" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                            <tr v-for="m in matches" :key="m.id" class="dt-row">
                                <td class="dt-td"><span class="match-code">{{ m.match_code }}</span></td>
                                <td class="dt-td dt-name">{{ m.sport_category?.name ?? '—' }}</td>
                                <td class="dt-td text-muted">{{ m.venue?.name ?? '—' }}</td>
                                <td class="dt-td text-muted">{{ formatTime(m.scheduled_at) }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="statusColor(m.status)" size="sm">
                                        <span v-if="m.status === 'ongoing'" class="pulse-dot" />
                                        {{ statusLabel(m.status) }}
                                    </AppBadge>
                                </td>
                                <td class="dt-td">
                                    <div class="kontingen-chips">
                                        <span v-for="p in (m.participants ?? [])" :key="p.id" class="kontingen-chip" :title="p.contingent?.name ?? ''">
                                            <ContingentLogo :contingent="p.contingent" :size="20" :radius="5" />
                                            <span class="kontingen-chip__name">{{ p.contingent?.short_name ?? p.contingent?.name ?? '—' }}</span>
                                        </span>
                                    </div>
                                </td>
                                <td class="dt-td dt-td--actions">
                                    <div class="action-btns">
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/matches/${encodeId(m.id)}`)"><Eye :size="14" /></AppButton>
                                        <AppButton v-if="can('matches.manage') && ['scheduled','postponed'].includes(m.status)" size="xs" variant="ghost" @click="$inertia.visit(`/matches/${encodeId(m.id)}/edit`)"><Pencil :size="14" /></AppButton>
                                    </div>
                                </td>
                            </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !matches.length && !error" title="Tidak ada pertandingan" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchMatches">Coba lagi</AppButton></div>
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Search, Eye, Pencil } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppDatePicker from '@/Components/App/AppDatePicker.vue';
import { useAuth } from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';

usePageGuard({ permission: 'matches.view' });
const { can } = useAuth();

const search       = ref('');
const filterStatus = ref('');
const filterDate   = ref<string | null>('');
const matches      = ref<any[]>([]);
const loading      = ref(false);
const error        = ref('');

async function fetchMatches() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/matches', {
            params: { status: filterStatus.value || undefined, date: filterDate.value || undefined, per_page: 50 },
        });
        const raw = res.data?.data;
        let list = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
        // search client-side berdasarkan kode (API tidak punya param search untuk match)
        const q = search.value.trim().toLowerCase();
        if (q) list = list.filter((m: any) =>
            (m.match_code ?? '').toLowerCase().includes(q) ||
            (m.sport_category?.name ?? '').toLowerCase().includes(q));
        matches.value = list;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat jadwal pertandingan';
        matches.value = [];
    } finally {
        loading.value = false;
    }
}

function setToday() {
    filterDate.value = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD lokal
}
function resetFilters() {
    search.value = '';
    filterStatus.value = '';
    filterDate.value = '';
}

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterStatus, filterDate], () => { clearTimeout(debounce); debounce = setTimeout(fetchMatches, 350); });
onMounted(fetchMatches);

// scheduled_at = wall-clock (backend UTC, tanpa makna zona). Tampilkan apa adanya,
// JANGAN konversi zona (kalau pakai new Date() langsung, browser geser +7 → 15:13 jadi 22:13).
function formatTime(dt: string) {
    if (!dt) return '—';
    const m = String(dt).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return dt;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function statusColor(s: string) {
    const m: Record<string, 'info' | 'success' | 'default' | 'warning'> = { scheduled: 'info', ongoing: 'success', finished: 'default', postponed: 'warning', cancelled: 'default' };
    return m[s] ?? 'default';
}
function statusLabel(s: string) {
    const m: Record<string, string> = { scheduled: 'Terjadwal', ongoing: 'Berlangsung', finished: 'Selesai', postponed: 'Ditunda', cancelled: 'Dibatalkan' };
    return m[s] ?? s;
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; align-items: center; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 160px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.filter-date  { width: 180px; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 80px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.dt-name     { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.match-code  { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.kontingen-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.kontingen-chip  { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px 2px 3px; border-radius: 999px; background: var(--color-bg-subtle); border: 1px solid var(--color-border); }
.kontingen-chip__name { font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.02em; }
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.pulse-dot   { display: inline-block; width: 7px; height: 7px; background: var(--color-success); border-radius: 50%; margin-right: 4px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
