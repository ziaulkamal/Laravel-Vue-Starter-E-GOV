<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Sub-Cabor</h1>
                    <p class="page-subtitle">{{ total }} sub-cabor (nomor pertandingan) PORA XV</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/sport-categories/create')">
                    + Tambah Sub-Cabor
                </AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama sub-cabor..." />
                    </div>
                    <select v-model="filterCabor" class="filter-select">
                        <option value="">Semua Cabor</option>
                        <option v-for="c in caborOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                    </select>
                    <select v-model="filterStatus" class="filter-select">
                        <option value="">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                    </select>
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama</th>
                                <th class="dt-th">Cabor</th>
                                <th class="dt-th">Gender</th>
                                <th class="dt-th">Tipe</th>
                                <th class="dt-th">Pemain</th>
                                <th class="dt-th">Scoring</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 8" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 8" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="sc in pagedCategories" :key="sc.id" class="dt-row">
                                    <td class="dt-td dt-name">{{ sc.name }}</td>
                                    <td class="dt-td">
                                        <span class="cabor-cell">
                                            <span class="cabor-code">{{ sc.sport?.code ?? '—' }}</span>
                                            {{ sc.sport?.name ?? '—' }}
                                        </span>
                                    </td>
                                    <td class="dt-td"><AppBadge :color="genderColor(sc.gender_rule)" size="sm">{{ genderLabel(sc.gender_rule) }}</AppBadge></td>
                                    <td class="dt-td">{{ typeLabel(sc.participant_type) }}</td>
                                    <td class="dt-td">{{ sc.min_players }}–{{ sc.max_players }}</td>
                                    <td class="dt-td">{{ scoringLabel(sc.scoring_type) }}</td>
                                    <td class="dt-td"><AppBadge :color="sc.is_active ? 'success' : 'default'" size="sm">{{ sc.is_active ? 'Aktif' : 'Nonaktif' }}</AppBadge></td>
                                    <td class="dt-td dt-td--actions">
                                        <div class="action-btns">
                                            <AppButton
                                                size="xs"
                                                variant="ghost"
                                                :loading="togglingId === sc.id"
                                                :title="sc.is_active ? 'Nonaktifkan' : 'Aktifkan'"
                                                @click="toggleActive(sc)"
                                            >
                                                <Power :size="14" :class="sc.is_active ? 'ic-on' : 'ic-off'" />
                                            </AppButton>
                                            <AppButton size="xs" variant="ghost" title="Edit" @click="$inertia.visit(`/sport-categories/${encodeId(sc.id)}/edit`)"><Pencil :size="14" /></AppButton>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !filtered.length && !error" title="Tidak ada sub-cabor" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchCategories">Coba lagi</AppButton></div>
                </div>

                <div v-if="filtered.length" class="table-footer">
                    <AppPagination
                        :model-value="page"
                        :total="total"
                        :per-page="perPage"
                        @update:model-value="goToPage"
                        @update:per-page="changePerPage"
                    />
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Search, Pencil, Power } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import { useToast }  from '@/Composables/useToast';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';

const toast = useToast();

const categories  = ref<any[]>([]);
const loading     = ref(false);
const error       = ref('');
const togglingId  = ref<number | null>(null);

const search       = ref('');
const filterCabor  = ref('');
const filterStatus = ref('');
const page         = ref(1);
const perPage      = ref(25);

async function fetchCategories() {
    loading.value = true;
    error.value   = '';
    try {
        // Endpoint kembalikan seluruh list (meta:null) → pagination & filter di sisi klien.
        const res = await api.get('/api/v1/sport-categories', { params: { active_only: false } });
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        categories.value = list.filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data sub-cabor';
        categories.value = [];
    } finally {
        loading.value = false;
    }
}

// ── Opsi filter cabor (derive dari data) ──────────────────────
const caborOptions = computed(() => {
    const map = new Map<string, string>();
    for (const sc of categories.value) {
        if (sc.sport?.id != null) map.set(String(sc.sport.id), sc.sport.name);
    }
    return [...map.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
});

// ── Filter + pagination (klien) ───────────────────────────────
const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return categories.value.filter((sc) => {
        if (q && !String(sc.name ?? '').toLowerCase().includes(q)) return false;
        if (filterCabor.value && String(sc.sport?.id) !== filterCabor.value) return false;
        if (filterStatus.value === 'active'   && !sc.is_active) return false;
        if (filterStatus.value === 'inactive' &&  sc.is_active) return false;
        return true;
    });
});
const total = computed(() => filtered.value.length);
const pagedCategories = computed(() => {
    const start = (page.value - 1) * perPage.value;
    return filtered.value.slice(start, start + perPage.value);
});

watch([search, filterCabor, filterStatus], () => { page.value = 1; });

function goToPage(p: number) { if (p !== page.value) page.value = p; }
function changePerPage(n: number) { perPage.value = n; page.value = 1; }

// ── Toggle aktif/nonaktif (PUT dengan payload penuh dari row) ──
async function toggleActive(sc: any) {
    togglingId.value = sc.id;
    const next = !sc.is_active;
    try {
        await api.put(`/api/v1/sport-categories/${sc.id}`, {
            sport_id:         sc.sport_id ?? sc.sport?.id,
            name:             sc.name,
            gender_rule:      sc.gender_rule,
            participant_type: sc.participant_type,
            min_players:      sc.min_players,
            max_players:      sc.max_players,
            match_format:     sc.match_format,
            scoring_type:     sc.scoring_type,
            min_age:          sc.min_age ?? null,
            max_age:          sc.max_age ?? null,
            is_active:        next,
        });
        sc.is_active = next;
        toast.success(next ? 'Sub-cabor diaktifkan' : 'Sub-cabor dinonaktifkan');
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal mengubah status');
    } finally {
        togglingId.value = null;
    }
}

onMounted(fetchCategories);

function genderColor(g: string) {
    const m: Record<string, 'info' | 'danger' | 'warning'> = { male: 'info', female: 'danger', mixed: 'warning' };
    return m[g] ?? 'default' as 'info';
}
function genderLabel(g: string) { return ({ male: 'Putra', female: 'Putri', mixed: 'Campuran' } as Record<string,string>)[g] ?? g; }
function typeLabel(t: string)   { return ({ individual: 'Individual', pair: 'Pasangan', team: 'Beregu' } as Record<string,string>)[t] ?? t; }
function scoringLabel(s: string){ return ({ score: 'Skor', time: 'Waktu', distance: 'Jarak', point: 'Poin', rank: 'Peringkat' } as Record<string,string>)[s] ?? s; }
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 90px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.dt-name     { font-weight: 500; }
.cabor-cell  { display: inline-flex; align-items: center; gap: 7px; }
.cabor-code  { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--color-accent); background: var(--color-accent-subtle); padding: 2px 6px; border-radius: 6px; }
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.ic-on  { color: var(--color-accent); }
.ic-off { color: var(--color-text-subtle); }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
