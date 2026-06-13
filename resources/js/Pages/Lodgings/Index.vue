<template>
    <SimporaLayout title="Penginapan">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Penginapan</h1>
                    <p class="page-subtitle">Kelola penginapan peserta PORA XV</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/lodgings/create')">+ Tambah Penginapan</AppButton>
            </div>

            <AppCard padding="none">
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama</th>
                                <th class="dt-th">Alamat</th>
                                <th class="dt-th">Kapasitas</th>
                                <th class="dt-th">PIC</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 4" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 6" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                            <tr v-for="l in lodgings" :key="l.id" class="dt-row">
                                <td class="dt-td dt-name">{{ l.name }}</td>
                                <td class="dt-td text-muted">{{ l.address ?? '—' }}</td>
                                <td class="dt-td">{{ l.capacity ?? '—' }}</td>
                                <td class="dt-td text-muted">{{ l.pic_name ?? '—' }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="l.is_active ? 'success' : 'default'" size="sm">
                                        {{ l.is_active ? 'Aktif' : 'Nonaktif' }}
                                    </AppBadge>
                                </td>
                                <td class="dt-td dt-td--actions">
                                    <div class="action-btns">
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/lodgings/${encodeId(l.id)}`)"><Eye :size="14" /></AppButton>
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/lodgings/${encodeId(l.id)}/edit`)"><Pencil :size="14" /></AppButton>
                                    </div>
                                </td>
                            </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !lodgings.length && !error" title="Belum ada penginapan" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchLodgings">Coba lagi</AppButton></div>
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Eye, Pencil } from '@lucide/vue';
import api            from '@/lib/axios';
import { encodeId }   from '@/lib/hashid';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import { usePageGuard } from '@/Composables/usePageGuard';
import AppButton      from '@/Components/App/AppButton.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';

interface Lodging {
    id: number; name: string; address: string | null;
    capacity: number | null; pic_name: string | null; is_active: boolean;
}

usePageGuard({ anyRole: ['super_admin', 'panitia_besar'] });

const lodgings = ref<Lodging[]>([]);
const loading  = ref(false);
const error    = ref('');

async function fetchLodgings() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/lodgings');
        const raw = res.data?.data;
        lodgings.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data penginapan';
        lodgings.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchLodgings);
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
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
