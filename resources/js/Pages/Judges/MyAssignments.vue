<template>
    <SimporaLayout title="Tugas Penilaian Saya">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Tugas Penilaian Saya</h1>
                    <p class="page-subtitle">Pertandingan di mana Anda bertugas sebagai juri / penilai</p>
                </div>
            </div>

            <AppCard padding="none">
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Kode</th>
                                <th class="dt-th">Cabor / Sub-Cabor</th>
                                <th class="dt-th">Venue</th>
                                <th class="dt-th">Waktu</th>
                                <th class="dt-th">Peran</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 5" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 7" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="m in assignments" :key="m.id" class="dt-row">
                                    <td class="dt-td"><span class="match-code">{{ m.match_code ?? '—' }}</span></td>
                                    <td class="dt-td dt-name">
                                        <div>{{ m.sport_category?.name ?? '—' }}</div>
                                        <div class="text-subtle">{{ m.sport_category?.sport?.name ?? '' }}</div>
                                    </td>
                                    <td class="dt-td text-muted">{{ m.venue?.name ?? '—' }}</td>
                                    <td class="dt-td text-muted">{{ formatSchedule(m.scheduled_at) }}</td>
                                    <td class="dt-td text-muted">{{ roleLabel(m.judges?.[0]?.role) }}</td>
                                    <td class="dt-td">
                                        <AppBadge :color="statusColor(m.status)" size="sm">
                                            <span v-if="m.status === 'ongoing'" class="pulse-dot" />
                                            {{ statusLabel(m.status) }}
                                        </AppBadge>
                                    </td>
                                    <td class="dt-td dt-td--actions">
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/matches/${encodeId(m.id)}`)">
                                            <Eye :size="14" />
                                            <span v-if="m.status === 'ongoing'">Nilai</span>
                                        </AppButton>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !assignments.length && !error" title="Belum ada penugasan" subtitle="Anda belum ditugaskan sebagai juri di pertandingan mana pun." size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchAssignments">Coba lagi</AppButton></div>
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Eye } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

// Penilai (admin_penilaian) atau super_admin / panitia besar yang juga bisa jadi juri.
usePageGuard({ anyRole: ['super_admin', 'panitia_besar', 'admin_penilaian'] });

const assignments = ref<any[]>([]);
const loading = ref(false);
const error   = ref('');

async function fetchAssignments() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/judges/my-assignments', { params: { per_page: 50 } });
        const raw = res.data?.data;
        assignments.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat penugasan';
        assignments.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchAssignments);

// scheduled_at = wall-clock; parse komponen literal (jangan konversi zona). Lihat CLAUDE.md.
function formatSchedule(dt: string | null): string {
    if (!dt) return '—';
    const m = dt.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return dt;
    const [, y, mo, d, h, mi] = m;
    const date = new Date(+y, +mo - 1, +d, +h, +mi);
    return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function roleLabel(role?: string | null): string {
    if (!role) return 'Juri';
    const m: Record<string, string> = {
        head_judge: 'Ketua Juri', judge_1: 'Juri 1', judge_2: 'Juri 2',
        referee: 'Wasit', line_judge: 'Hakim Garis',
    };
    return m[role] ?? role;
}
function statusColor(s: string) {
    const m: Record<string, 'info' | 'success' | 'default' | 'warning'> = { scheduled: 'info', ongoing: 'success', finished: 'default', postponed: 'warning' };
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
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.dt-name     { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.text-subtle { color: var(--color-text-subtle); font-size: 11.5px; }
.match-code  { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.pulse-dot   { display: inline-block; width: 7px; height: 7px; background: var(--color-success); border-radius: 50%; margin-right: 4px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.sk-bar  { display: block; height: 12px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
