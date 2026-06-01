<template>
    <SimporaLayout title="Venue">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Venue</h1>
                    <p class="page-subtitle">Kelola venue pertandingan PORA XV</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/venues/create')">+ Tambah Venue</AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama venue..." />
                    </div>
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
                                <th class="dt-th">Nama Venue</th>
                                <th class="dt-th">Alamat</th>
                                <th class="dt-th">Kapasitas</th>
                                <th class="dt-th">Sub-Cabor</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 5" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 6" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                            <tr v-for="v in venues" :key="v.id" class="dt-row">
                                <td class="dt-td dt-name">{{ v.name }}</td>
                                <td class="dt-td text-muted">{{ v.address ?? '—' }}</td>
                                <td class="dt-td">{{ v.capacity ?? '—' }}</td>
                                <td class="dt-td">{{ v.sport_categories_count ?? 0 }} sub-cabor</td>
                                <td class="dt-td">
                                    <AppBadge :color="v.is_active ? 'success' : 'default'" size="sm">
                                        {{ v.is_active ? 'Aktif' : 'Nonaktif' }}
                                    </AppBadge>
                                </td>
                                <td class="dt-td dt-td--actions">
                                    <div class="action-btns">
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/venues/${encodeId(v.id)}`)"><Eye :size="14" /></AppButton>
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/venues/${encodeId(v.id)}/edit`)"><Pencil :size="14" /></AppButton>
                                    </div>
                                </td>
                            </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !venues.length && !error" title="Tidak ada venue" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchVenues">Coba lagi</AppButton></div>
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
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

interface Venue {
    id: number; name: string; address: string | null; capacity: number | null;
    is_active: boolean; sport_categories_count?: number;
}

const search       = ref('');
const filterStatus = ref('');
const venues       = ref<Venue[]>([]);
const loading      = ref(false);
const error        = ref('');

async function fetchVenues() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/venues', {
            params: {
                search:      search.value || undefined,
                active_only: filterStatus.value === 'active' ? true
                           : filterStatus.value === 'inactive' ? false : undefined,
            },
        });
        const raw = res.data?.data;
        venues.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data venue';
        venues.value = [];
    } finally {
        loading.value = false;
    }
}

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterStatus], () => { clearTimeout(debounce); debounce = setTimeout(fetchVenues, 350); });
onMounted(fetchVenues);
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
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
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
