<template>
    <SimporaLayout :title="venue?.name ?? 'Detail Venue'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Venue', href: '/venues' }, { label: venue?.name ?? 'Detail' }]" />

            <!-- Hero -->
            <div class="venue-hero-card">
                <span class="venue-badge"><MapPin :size="24" /></span>
                <div class="venue-hero-card__info">
                    <h1 class="page-title cap">{{ venue?.name ?? 'Memuat...' }}</h1>
                    <div class="venue-hero-card__meta">
                        <AppBadge v-if="venue" :color="venue.is_active ? 'success' : 'default'" size="sm">
                            {{ venue.is_active ? 'Aktif' : 'Nonaktif' }}
                        </AppBadge>
                        <span v-if="venue?.wilayah?.nama" class="venue-hero-card__loc">
                            <MapPin :size="12" /> {{ venue.wilayah.nama }}
                        </span>
                        <span class="venue-hero-card__count">{{ matches.length }} jadwal</span>
                    </div>
                </div>
                <div class="hero-actions">
                    <button type="button" class="edit-btn" @click="$inertia.visit(`/venues/${encodeId(realId)}/edit`)">
                        <Pencil :size="15" /><span>Edit</span>
                    </button>
                </div>
            </div>

            <AppTabs v-if="venue" v-model="activeTab" variant="underline" :tabs="tabs">
                <!-- Info -->
                <template #info>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Alamat</span><span class="info-value">{{ venue.address ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Wilayah</span><span class="info-value">{{ venue.wilayah?.nama ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Kapasitas</span><span class="info-value">{{ venue.capacity ? `${venue.capacity} orang` : '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Koordinat</span>
                            <span class="info-value">
                                <template v-if="venue.latitude && venue.longitude">
                                    <a class="coord-link" :href="`https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`" target="_blank" rel="noopener">
                                        {{ venue.latitude }}, {{ venue.longitude }}
                                    </a>
                                </template>
                                <template v-else>—</template>
                            </span>
                        </div>
                        <div class="info-item"><span class="info-label">Status</span>
                            <AppBadge :color="venue.is_active ? 'success' : 'default'" size="sm">{{ venue.is_active ? 'Aktif' : 'Nonaktif' }}</AppBadge>
                        </div>
                    </div>
                </template>

                <!-- Sub-Cabor -->
                <template #subcabor>
                    <div class="sc-head">
                        <p class="tab-hint">Pilih sub-cabor yang dapat menggunakan venue ini:</p>
                        <div class="sc-search">
                            <Search :size="15" class="sc-search__icon" />
                            <input v-model="scQuery" type="text" class="sc-search__input" placeholder="Cari nama sub-cabor / cabor…" />
                            <button v-if="scQuery" type="button" class="sc-search__clear" @click="scQuery = ''"><X :size="14" /></button>
                        </div>
                    </div>

                    <div class="sc-meta">
                        <span>{{ assignedIds.length }} dipilih</span>
                        <span class="sc-meta__dot">·</span>
                        <span>{{ filteredSubCabors.length }} dari {{ allSubCabors.length }} sub-cabor</span>
                    </div>

                    <div v-if="filteredSubCabors.length" class="subcabor-grid">
                        <label v-for="sc in filteredSubCabors" :key="sc.id" class="subcabor-check" :class="{ 'is-checked': assignedIds.includes(sc.id) }">
                            <input type="checkbox" :value="sc.id" v-model="assignedIds" />
                            <span class="sc-name">{{ sc.name }}</span>
                            <span class="sc-sport">{{ sc.sport?.name ?? '' }}</span>
                        </label>
                    </div>
                    <div v-else class="sc-noresult">Tidak ada sub-cabor cocok dengan "{{ scQuery }}".</div>

                    <AppButton variant="primary" size="sm" class="mt-3" :loading="savingSc" @click="saveSubCabor">Simpan Perubahan</AppButton>
                </template>

                <!-- Jadwal -->
                <template #jadwal>
                    <div class="tab-toolbar">
                        <span class="tab-toolbar__count">{{ matches.length }} jadwal di venue ini</span>
                    </div>

                    <!-- Loading -->
                    <table v-if="loadingMatches" class="dt-table">
                        <thead>
                            <tr><th class="dt-th">Kode</th><th class="dt-th">Sub-Cabor</th><th class="dt-th">Waktu</th><th class="dt-th">Status</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="i in 3" :key="i" class="dt-row"><td class="dt-td" v-for="c in 4" :key="c"><span class="sk-bar" /></td></tr>
                        </tbody>
                    </table>

                    <!-- Empty (seperti gambar 2) -->
                    <div v-else-if="!matches.length" class="jadwal-empty">
                        <div class="jadwal-empty__icon"><CalendarClock :size="26" /></div>
                        <div class="jadwal-empty__title">Belum ada jadwal</div>
                        <p class="jadwal-empty__text">
                            Venue <strong>{{ venue?.name }}</strong> belum memiliki jadwal pertandingan. Tambahkan jadwal untuk mulai mengatur waktu dan sub-cabor.
                        </p>
                        <AppButton variant="primary" size="sm" @click="$inertia.visit(`/matches/create?venue_id=${realId}`)">
                            + Tambah Jadwal
                        </AppButton>
                    </div>

                    <!-- List -->
                    <table v-else class="dt-table">
                        <thead>
                            <tr><th class="dt-th">Kode</th><th class="dt-th">Sub-Cabor</th><th class="dt-th">Waktu</th><th class="dt-th">Status</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="m in matches" :key="m.id" class="dt-row dt-row--link" @click="$inertia.visit(`/matches/${encodeId(m.id)}`)">
                                <td class="dt-td font-mono text-xs">{{ m.match_code }}</td>
                                <td class="dt-td">{{ m.sport_category?.name ?? '—' }}</td>
                                <td class="dt-td text-muted">{{ formatTime(m.scheduled_at) }}</td>
                                <td class="dt-td"><AppBadge :color="statusColor(m.status)" size="sm">{{ statusLabel(m.status) }}</AppBadge></td>
                            </tr>
                        </tbody>
                    </table>
                </template>
            </AppTabs>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil, MapPin, CalendarClock, Search, X } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId, encodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }   from '@/Composables/useToast';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
const realId = decodeId(props.id);

const activeTab     = ref('info');
const tabs = [
    { value: 'info', label: 'Info' },
    { value: 'subcabor', label: 'Sub-Cabor' },
    { value: 'jadwal', label: 'Jadwal' },
];
const venue         = ref<any>(null);
const allSubCabors  = ref<any[]>([]);
const assignedIds   = ref<number[]>([]);
const matches       = ref<any[]>([]);
const loadingMatches = ref(true);
const savingSc      = ref(false);
const scQuery       = ref('');

const filteredSubCabors = computed(() => {
    const q = scQuery.value.trim().toLowerCase();
    if (!q) return allSubCabors.value;
    return allSubCabors.value.filter((sc: any) =>
        (sc.name ?? '').toLowerCase().includes(q) ||
        (sc.sport?.name ?? '').toLowerCase().includes(q)
    );
});

async function fetchVenue() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/venues/${realId}`);
        venue.value = res.data?.data ?? null;
        if (!venue.value) { notFound(); return; }
        assignedIds.value = (venue.value.sport_categories ?? []).map((s: any) => s.id);
        fetchAllSubCabors();
        fetchMatches();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    }
}
async function fetchAllSubCabors() {
    try {
        const res = await api.get('/api/v1/sport-categories', { params: { active_only: false } });
        const raw = res.data?.data;
        allSubCabors.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch { allSubCabors.value = []; }
}
async function fetchMatches() {
    loadingMatches.value = true;
    try {
        const res = await api.get('/api/v1/matches', { params: { venue_id: realId, per_page: 100 } });
        const raw = res.data?.data;
        matches.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch { matches.value = []; }
    finally { loadingMatches.value = false; }
}
async function saveSubCabor() {
    savingSc.value = true;
    try {
        await api.put(`/api/v1/venues/${realId}/sport-categories`, { sport_category_ids: assignedIds.value });
        toast.success('Sub-cabor venue berhasil disimpan');
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menyimpan sub-cabor');
    } finally { savingSc.value = false; }
}
onMounted(fetchVenue);

function formatTime(dt: string) {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? dt : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function statusColor(s: string) {
    const m: Record<string, 'success' | 'info' | 'default' | 'warning'> = { scheduled: 'info', ongoing: 'success', finished: 'default', postponed: 'warning', cancelled: 'default' };
    return m[s] ?? 'default';
}
function statusLabel(s: string) {
    return ({ scheduled: 'Terjadwal', ongoing: 'Berlangsung', finished: 'Selesai', postponed: 'Ditunda', cancelled: 'Dibatalkan' } as Record<string,string>)[s] ?? s;
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.cap         { text-transform: capitalize; }

/* Hero */
.venue-hero-card {
    display: flex; align-items: center; gap: 16px;
    padding: 18px 20px; border-radius: 16px;
    background: var(--color-bg-card, var(--color-bg-subtle));
    border: 1px solid var(--color-border);
}
.venue-hero-card__info { flex: 1 1 auto; min-width: 0; }
.venue-hero-card__meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.venue-hero-card__count { font-size: 12px; color: var(--color-text-muted); }
.venue-hero-card__loc { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-text-muted); }
.venue-badge { flex: 0 0 auto; width: 54px; height: 54px; border-radius: 14px; background: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; }

.hero-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
.edit-btn {
    flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px; cursor: pointer;
    background: var(--color-accent-subtle); color: var(--color-accent);
    border: 1px solid transparent; font-size: 13px; font-weight: 600;
    transition: background .15s ease, border-color .15s ease;
}
.edit-btn:hover { border-color: var(--color-accent); }
.edit-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* Info tab */
.info-grid   { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.info-item   { display: flex; align-items: center; gap: 12px; }
.info-label  { font-size: 12px; font-weight: 600; color: var(--color-text-muted); width: 100px; flex-shrink: 0; }
.info-value  { font-size: 13.5px; color: var(--color-text-primary); }
.coord-link  { color: var(--color-accent); text-decoration: none; }
.coord-link:hover { text-decoration: underline; }

/* Sub-cabor tab */
.tab-hint    { font-size: 13px; color: var(--color-text-muted); margin: 0; }
.sc-head     { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
.sc-search   { position: relative; flex: 0 0 auto; width: 280px; max-width: 100%; }
.sc-search__icon  { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-subtle); pointer-events: none; }
.sc-search__input {
    width: 100%; padding: 8px 30px 8px 32px; border-radius: 9px;
    border: 1px solid var(--color-border); background: var(--color-bg-card, var(--color-bg-subtle));
    font-size: 13px; color: var(--color-text-primary); outline: none; transition: border-color .15s ease;
}
.sc-search__input:focus { border-color: var(--color-accent); }
.sc-search__clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: inline-flex; color: var(--color-text-subtle); cursor: pointer; background: none; border: none; padding: 2px; }
.sc-search__clear:hover { color: var(--color-text-primary); }

.sc-meta     { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px; }
.sc-meta__dot{ color: var(--color-text-subtle); }

.subcabor-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px;
    max-height: 340px; overflow-y: auto; padding: 4px; margin: 0 -4px;
}
.subcabor-check {
    display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--color-text-primary);
    cursor: pointer; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--color-border);
    background: var(--color-bg-card, transparent); transition: border-color .12s ease, background .12s ease;
}
.subcabor-check:hover { border-color: var(--color-accent); }
.subcabor-check.is-checked { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.subcabor-check input { flex: 0 0 auto; }
.sc-name     { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-sport    { flex: 0 0 auto; color: var(--color-text-subtle); font-size: 11px; }
.sc-noresult { font-size: 13px; color: var(--color-text-muted); padding: 24px 4px; }
.mt-3        { margin-top: 16px; }

/* Toolbar */
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.tab-toolbar__count { font-size: 12px; color: var(--color-text-muted); }

/* Jadwal empty (seperti gambar 2) */
.jadwal-empty {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 12px; padding: 56px 24px; border-radius: 16px;
    border: 1px dashed var(--color-border); background: var(--color-bg-subtle);
}
.jadwal-empty__icon { width: 56px; height: 56px; border-radius: 16px; background: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; }
.jadwal-empty__title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.jadwal-empty__text  { font-size: 13px; color: var(--color-text-muted); max-width: 380px; margin: 0; line-height: 1.5; }
.jadwal-empty__text strong { color: var(--color-text-primary); text-transform: capitalize; }

/* Table */
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-row--link { cursor: pointer; transition: background .12s ease; }
.dt-row--link:hover { background: var(--color-bg-subtle); }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.font-mono   { font-family: var(--font-mono); }
.text-xs     { font-size: 12px; }
.text-muted  { color: var(--color-text-muted); }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
