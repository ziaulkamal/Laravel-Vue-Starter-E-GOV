<template>
    <SimporaLayout title="Kontingen">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Kontingen</h1>
                    <p class="page-subtitle">{{ total }} kontingen PORA XV Aceh Jaya 2026</p>
                </div>
                <AppButton v-if="can('contingents.create')" variant="primary" size="md" @click="$inertia.visit('/contingents/create')">+ Tambah Kontingen</AppButton>
            </div>

            <!-- Filter -->
            <div class="filter-bar">
                <div class="filter-search">
                    <Search :size="15" class="filter-search__icon" />
                    <input v-model="search" class="filter-search__input" placeholder="Cari nama kontingen..." />
                </div>
                <select v-model="filterStatus" class="filter-select">
                    <option value="">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                </select>
            </div>

            <!-- Loading skeleton -->
            <div v-if="loading" class="contingent-grid">
                <AppCard v-for="i in 6" :key="i" class="contingent-card" padding="none">
                    <div class="contingent-card__body">
                        <span class="sk-logo" />
                        <div style="flex:1; display:flex; flex-direction:column; gap:8px">
                            <span class="sk-bar" style="width:70%" />
                            <span class="sk-bar" style="width:40%" />
                            <span class="sk-bar" style="width:55%" />
                        </div>
                    </div>
                </AppCard>
            </div>

            <!-- Grid Cards -->
            <div v-else-if="contingents.length" class="contingent-grid">
                <AppCard v-for="c in contingents" :key="c.id" class="contingent-card" padding="none" hoverable>
                    <div class="contingent-card__body">
                        <ContingentLogo :contingent="c" :size="48" :radius="12" />
                        <div class="contingent-card__info">
                            <div class="contingent-card__name">
                                {{ c.name }}
                                <AppBadge v-if="c.is_host" color="warning" size="sm">Tuan Rumah</AppBadge>
                            </div>
                            <div class="contingent-card__short">{{ c.short_name }}</div>
                            <div class="contingent-card__stats">
                                {{ c.wilayah?.nama ?? '—' }}
                            </div>
                        </div>
                    </div>
                    <div class="contingent-card__footer">
                        <AppBadge :color="c.is_active ? 'success' : 'default'" size="sm">
                            {{ c.is_active ? 'Aktif' : 'Tidak Aktif' }}
                        </AppBadge>
                        <AppButton variant="secondary" size="xs" @click="$inertia.visit(`/contingents/${encodeId(c.id)}`)">
                            Detail
                        </AppButton>
                    </div>
                </AppCard>
            </div>

            <!-- Empty / Error -->
            <AppEmptyState v-else-if="!error" title="Tidak ada kontingen" description="Tambah kontingen baru atau ubah filter pencarian" />
            <div v-else class="state-error">
                <p>{{ error }}</p>
                <AppButton size="sm" variant="secondary" @click="fetchContingents">Coba lagi</AppButton>
            </div>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Search } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';
import { useAuth } from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';

interface Contingent {
    id: number; name: string; short_name: string; wilayah_kode?: string | null;
    is_active: boolean; is_host?: boolean; wilayah?: { kode: string; nama: string } | null;
}

usePageGuard({ permission: 'contingents.view' });
const { can } = useAuth();

const search       = ref('');
const filterStatus = ref('');
const contingents  = ref<Contingent[]>([]);
const total        = ref(0);
const loading      = ref(false);
const error        = ref('');

async function fetchContingents() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/contingents', {
            params: {
                search:      search.value || undefined,
                active_only: filterStatus.value === 'active' ? true
                           : filterStatus.value === 'inactive' ? false : undefined,
            },
        });
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        contingents.value = list.filter(Boolean);
        total.value = res.data?.meta?.total ?? raw?.total ?? contingents.value.length;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data kontingen';
        contingents.value = [];
    } finally {
        loading.value = false;
    }
}

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterStatus], () => {
    clearTimeout(debounce);
    debounce = setTimeout(fetchContingents, 350);
});

onMounted(fetchContingents);
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }

.filter-bar   { display: flex; gap: 10px; flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); flex-shrink: 0; }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }

.contingent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 900px) { .contingent-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .contingent-grid { grid-template-columns: 1fr; } }

.contingent-card        { padding: 16px; }
.contingent-card :deep(.app-card__body) { flex: 1; display: flex; flex-direction: column; gap: 14px; }
.contingent-card__body  { display: flex; gap: 14px; align-items: flex-start; }
.contingent-card__info  { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
.contingent-card__name  { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.contingent-card__short { font-size: 11px; color: var(--color-text-subtle); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.contingent-card__stats { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.contingent-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--color-border); }

.sk-logo { width: 48px; height: 48px; border-radius: 12px; background: var(--color-bg-subtle); flex-shrink: 0; animation: sk 1.2s ease-in-out infinite; }
.sk-bar  { display: block; height: 12px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk    { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
