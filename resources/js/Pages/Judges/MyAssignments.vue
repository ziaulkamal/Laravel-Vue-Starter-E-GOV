<template>
    <SimporaLayout title="Penugasan Saya">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Penugasan Saya</h1>
                    <p class="page-subtitle">Pertandingan di mana Anda bertugas sebagai juri</p>
                </div>
            </div>

            <AppCard padding="none">
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Kode</th>
                                <th class="dt-th">Sub-Cabor</th>
                                <th class="dt-th">Venue</th>
                                <th class="dt-th">Waktu</th>
                                <th class="dt-th">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="m in assignments" :key="m.code" class="dt-row">
                                <td class="dt-td"><span class="match-code">{{ m.code }}</span></td>
                                <td class="dt-td dt-name">{{ m.subcabor }}</td>
                                <td class="dt-td text-muted">{{ m.venue }}</td>
                                <td class="dt-td text-muted">{{ m.time }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="statusColor(m.status)" size="sm">
                                        <span v-if="m.status === 'ongoing'" class="pulse-dot" />
                                        {{ statusLabel(m.status) }}
                                    </AppBadge>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!assignments.length" title="Tidak ada penugasan saat ini" size="sm" />
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

const assignments = [
    { code: 'M-001', subcabor: 'Silat Kumite 60kg Putra', venue: 'GOR Serbaguna', time: '08:00 – 10:00', status: 'ongoing' },
    { code: 'M-007', subcabor: 'Silat Kumite 65kg Putra', venue: 'GOR Serbaguna', time: '13:00 – 15:00', status: 'scheduled' },
];

function statusColor(s: string) {
    const m: Record<string, 'info' | 'success' | 'default' | 'warning'> = { scheduled: 'info', ongoing: 'success', finished: 'default', postponed: 'warning' };
    return m[s] ?? 'default';
}
function statusLabel(s: string) {
    const m: Record<string, string> = { scheduled: 'Terjadwal', ongoing: 'Berlangsung', finished: 'Selesai', postponed: 'Ditunda' };
    return m[s] ?? s;
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
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-name     { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.match-code  { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.pulse-dot   { display: inline-block; width: 7px; height: 7px; background: var(--color-success); border-radius: 50%; margin-right: 4px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
