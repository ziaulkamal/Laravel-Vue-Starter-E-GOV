<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Template Kartu</h1>
                    <p class="page-subtitle">Kelola template kartu identitas peserta</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/card-templates/create')">+ Buat Template</AppButton>
            </div>

            <AppCard padding="none">
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama Template</th>
                                <th class="dt-th">Tipe</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th">Dibuat</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="t in templates" :key="t.id"
                                :class="['dt-row', t.is_active ? 'dt-row--active' : '']">
                                <td class="dt-td dt-name">
                                    {{ t.name }}
                                    <AppBadge v-if="t.is_active" color="success" size="sm" class="ml-2">AKTIF</AppBadge>
                                </td>
                                <td class="dt-td">{{ typeLabel(t.type) }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="t.is_active ? 'success' : 'default'" size="sm">
                                        {{ t.is_active ? 'Aktif' : 'Draft' }}
                                    </AppBadge>
                                </td>
                                <td class="dt-td text-muted">{{ t.created_at }}</td>
                                <td class="dt-td dt-td--actions">
                                    <div class="action-btns">
                                        <AppButton size="xs" variant="secondary" @click="$inertia.visit(`/card-templates/${encodeId(t.id)}/edit`)">Edit</AppButton>
                                        <AppButton v-if="!t.is_active" size="xs" variant="primary">Aktifkan</AppButton>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import { encodeId } from '@/lib/hashid';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';

const templates = [
    { id: 1, name: 'Kartu Atlet PORA XV',   type: 'athlete_card', is_active: true,  created_at: '2026-04-01' },
    { id: 2, name: 'Kartu Pelatih PORA XV',  type: 'coach_card',   is_active: false, created_at: '2026-04-02' },
    { id: 3, name: 'Kartu Tamu Kontingen',   type: 'guest_card',   is_active: false, created_at: '2026-04-05' },
];

function typeLabel(t: string) {
    const m: Record<string, string> = { athlete_card: 'Kartu Atlet', coach_card: 'Kartu Pelatih', guest_card: 'Kartu Tamu' };
    return m[t] ?? t;
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 140px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row--active { background: rgba(15,107,64,0.04); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.dt-name     { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.action-btns { display: flex; gap: 6px; justify-content: flex-end; }
.ml-2        { margin-left: 8px; }
</style>
