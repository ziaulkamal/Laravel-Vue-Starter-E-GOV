<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <h1 class="page-title">Audit Log Sistem</h1>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <select v-model="filterUser"  class="filter-select"><option value="">Semua User</option><option value="1">Admin SIMPORA</option></select>
                    <select v-model="filterModel" class="filter-select"><option value="">Semua Model</option><option value="Participant">Participant</option><option value="Document">Document</option></select>
                    <select v-model="filterAction" class="filter-select"><option value="">Semua Aksi</option><option value="created">Created</option><option value="updated">Updated</option><option value="deleted">Deleted</option></select>
                    <AppInput v-model="filterFrom" type="date" placeholder="Dari" style="width:140px" />
                    <AppInput v-model="filterTo"   type="date" placeholder="Sampai" style="width:140px" />
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Waktu</th>
                                <th class="dt-th">User</th>
                                <th class="dt-th">Aksi</th>
                                <th class="dt-th">Model</th>
                                <th class="dt-th">ID</th>
                                <th class="dt-th dt-th--actions">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="log in logs" :key="log.id" class="dt-row">
                                <td class="dt-td text-muted text-xs">{{ log.created_at }}</td>
                                <td class="dt-td"><span class="user-name">{{ log.user }}</span></td>
                                <td class="dt-td">
                                    <AppBadge :color="actionColor(log.action)" size="sm">{{ log.action }}</AppBadge>
                                </td>
                                <td class="dt-td">{{ log.model }}</td>
                                <td class="dt-td text-muted">#{{ log.model_id }}</td>
                                <td class="dt-td dt-td--actions">
                                    <AppButton size="xs" variant="ghost" @click="viewDetail(log)">Lihat</AppButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!logs.length" title="Tidak ada log" size="sm" />
                </div>
            </AppCard>
        </div>

        <!-- Detail Modal -->
        <AppModal v-model:open="showDetail" title="Detail Audit Log" size="md">
            <div v-if="selectedLog" class="detail-wrap">
                <div class="detail-header">
                    <AppBadge :color="actionColor(selectedLog.action)" size="sm">{{ selectedLog.action }}</AppBadge>
                    <span class="detail-model">{{ selectedLog.model }} #{{ selectedLog.model_id }}</span>
                    <span class="detail-time text-muted">{{ selectedLog.created_at }}</span>
                </div>
                <div class="diff-grid">
                    <div v-if="selectedLog.old_values" class="diff-col">
                        <div class="diff-label">Sebelum</div>
                        <pre class="diff-pre diff-pre--old">{{ JSON.stringify(selectedLog.old_values, null, 2) }}</pre>
                    </div>
                    <div v-if="selectedLog.new_values" class="diff-col">
                        <div class="diff-label">Sesudah</div>
                        <pre class="diff-pre diff-pre--new">{{ JSON.stringify(selectedLog.new_values, null, 2) }}</pre>
                    </div>
                </div>
            </div>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

const filterUser   = ref('');
const filterModel  = ref('');
const filterAction = ref('');
const filterFrom   = ref('');
const filterTo     = ref('');
const showDetail   = ref(false);
const selectedLog  = ref<any>(null);

const logs = [
    { id: 1, user: 'Admin SIMPORA', action: 'created', model: 'Participant', model_id: 42, created_at: '2026-05-31 08:12:33', old_values: null, new_values: { role: 'athlete', sport_id: 1 } },
    { id: 2, user: 'Admin SIMPORA', action: 'updated', model: 'Document',    model_id: 15, created_at: '2026-05-31 09:05:11', old_values: { status: 'pending' }, new_values: { status: 'approved' } },
    { id: 3, user: 'Panitia Besar', action: 'deleted', model: 'GameMatch',   model_id: 7,  created_at: '2026-05-30 14:30:00', old_values: { status: 'scheduled' }, new_values: null },
];

function actionColor(a: string) {
    const m: Record<string, 'success' | 'warning' | 'danger' | 'info'> = { created: 'success', updated: 'warning', deleted: 'danger' };
    return m[a] ?? 'info';
}
function viewDetail(log: any) {
    selectedLog.value = log;
    showDetail.value = true;
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; align-items: center; }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 70px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.user-name   { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.text-xs     { font-size: 11.5px; }
.detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.detail-model  { font-weight: 500; font-size: 13.5px; }
.detail-time   { font-size: 12px; }
.diff-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .diff-grid { grid-template-columns: 1fr; } }
.diff-col      { }
.diff-label    { font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 6px; }
.diff-pre      { font-family: var(--font-mono); font-size: 11.5px; padding: 12px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
.diff-pre--old { background: rgba(220,38,38,0.07); color: var(--color-danger); }
.diff-pre--new { background: rgba(5,150,105,0.07); color: var(--color-success); }
</style>
