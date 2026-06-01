<template>
    <SimporaLayout title="Dashboard">
        <div class="page-wrap">
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Selamat datang di SIMPORA 2026 — PORA XV Aceh Jaya</p>
                </div>
            </div>

            <!-- KPI Row -->
            <div class="kpi-grid">
                <KpiCard label="Total Kontingen"  :value="23"  icon="Shield"   color="accent" />
                <KpiCard label="Total Atlet"      :value="342" icon="Users"    color="info" />
                <KpiCard label="Tanding Hari Ini" :value="18"  icon="Calendar" color="warning" />
                <KpiCard label="Dok. Pending"     :value="12"  icon="FileText" color="danger" />
            </div>

            <!-- Content Row -->
            <div class="content-grid">
                <!-- Pertandingan Hari Ini -->
                <AppCard>
                    <template #header>
                        <div class="card-header-row">
                            <span class="card-header-title">Pertandingan Hari Ini</span>
                            <Link href="/matches" class="card-header-link">Lihat semua</Link>
                        </div>
                    </template>
                    <div class="match-list">
                        <div v-for="match in todayMatches" :key="match.code" class="match-item">
                            <div class="match-item__info">
                                <span class="match-item__code">{{ match.code }}</span>
                                <span class="match-item__name">{{ match.name }}</span>
                                <span class="match-item__venue">{{ match.venue }} · {{ match.time }}</span>
                            </div>
                            <AppBadge :color="statusColor(match.status)" size="sm">
                                <span v-if="match.status === 'ongoing'" class="pulse-dot" />
                                {{ statusLabel(match.status) }}
                            </AppBadge>
                        </div>
                    </div>
                </AppCard>

                <!-- Dokumen Pending -->
                <AppCard>
                    <template #header>
                        <div class="card-header-row">
                            <span class="card-header-title">Dokumen Pending</span>
                            <Link href="/documents/review" class="card-header-link">Verifikasi</Link>
                        </div>
                    </template>
                    <div class="doc-list">
                        <div v-for="doc in pendingDocs" :key="doc.id" class="doc-item">
                            <div class="doc-item__info">
                                <span class="doc-item__name">{{ doc.name }}</span>
                                <span class="doc-item__type">{{ doc.type }}</span>
                            </div>
                            <AppBadge color="warning" size="sm">Pending</AppBadge>
                        </div>
                    </div>
                </AppCard>
            </div>

            <!-- Klasemen Top 5 -->
            <AppCard>
                <template #header>
                    <div class="card-header-row">
                        <span class="card-header-title">Klasemen Sementara — Top 5</span>
                        <Link href="/leaderboard" class="card-header-link">Lihat semua</Link>
                    </div>
                </template>
                <table class="lb-table">
                    <thead>
                        <tr class="lb-thead">
                            <th class="lb-th" style="width:40px">#</th>
                            <th class="lb-th">Kontingen</th>
                            <th class="lb-th lb-medal">🥇</th>
                            <th class="lb-th lb-medal">🥈</th>
                            <th class="lb-th lb-medal">🥉</th>
                            <th class="lb-th lb-medal">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, i) in leaderboard" :key="entry.name"
                            :class="['lb-row', i === 0 ? 'lb-row--gold' : '']">
                            <td class="lb-td lb-rank">{{ i + 1 }}</td>
                            <td class="lb-td lb-name">{{ entry.name }}</td>
                            <td class="lb-td lb-medal">{{ entry.gold }}</td>
                            <td class="lb-td lb-medal">{{ entry.silver }}</td>
                            <td class="lb-td lb-medal">{{ entry.bronze }}</td>
                            <td class="lb-td lb-medal lb-total">{{ entry.gold + entry.silver + entry.bronze }}</td>
                        </tr>
                    </tbody>
                </table>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import KpiCard       from '@/Components/Dashboard/KpiCard.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';

const todayMatches = [
    { code: 'M-001', name: 'Silat Kumite 60kg Putra',    venue: 'GOR Serbaguna',      time: '08:00', status: 'ongoing' },
    { code: 'M-002', name: 'Renang 100m Gaya Bebas',     venue: 'Kolam Renang Calang', time: '09:30', status: 'scheduled' },
    { code: 'M-003', name: 'Bulu Tangkis Tunggal Putra', venue: 'GOR Badminton',       time: '10:00', status: 'scheduled' },
    { code: 'M-004', name: 'Atletik Lari 400m',          venue: 'Stadion PORA',        time: '07:00', status: 'finished' },
];

const pendingDocs = [
    { id: 1, name: 'Ahmad Fauzi',   type: 'Pas Foto' },
    { id: 2, name: 'Siti Rahayu',   type: 'KTP' },
    { id: 3, name: 'Budi Santoso',  type: 'Surat Keterangan' },
    { id: 4, name: 'Rina Marlina',  type: 'Akta Lahir' },
];

const leaderboard = [
    { name: 'Aceh Jaya',    gold: 8, silver: 5, bronze: 3 },
    { name: 'Banda Aceh',   gold: 7, silver: 4, bronze: 4 },
    { name: 'Aceh Besar',   gold: 5, silver: 6, bronze: 2 },
    { name: 'Pidie',        gold: 4, silver: 3, bronze: 5 },
    { name: 'Lhokseumawe', gold: 3, silver: 4, bronze: 6 },
];

function statusColor(status: string) {
    const map: Record<string, 'info' | 'success' | 'default' | 'warning'> = {
        scheduled: 'info', ongoing: 'success', finished: 'default', postponed: 'warning',
    };
    return map[status] ?? 'default';
}
function statusLabel(status: string) {
    const map: Record<string, string> = {
        scheduled: 'Terjadwal', ongoing: 'Berlangsung', finished: 'Selesai', postponed: 'Ditunda',
    };
    return map[status] ?? status;
}
</script>

<style scoped>
.page-wrap    { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title   { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle{ font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .kpi-grid { grid-template-columns: 1fr; } }

.content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
@media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } }

.card-header-row   { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.card-header-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.card-header-link  { font-size: 12px; color: var(--color-accent); font-weight: 500; }
.card-header-link:hover { text-decoration: underline; }

.match-list { display: flex; flex-direction: column; }
.match-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.match-item:last-child { border-bottom: none; }
.match-item__info  { display: flex; flex-direction: column; gap: 2px; }
.match-item__code  { font-size: 10px; font-weight: 700; color: var(--color-text-subtle); letter-spacing: 0.05em; }
.match-item__name  { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.match-item__venue { font-size: 11.5px; color: var(--color-text-muted); }

.doc-list { display: flex; flex-direction: column; }
.doc-item { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--color-border); }
.doc-item:last-child { border-bottom: none; }
.doc-item__info { display: flex; flex-direction: column; gap: 1px; }
.doc-item__name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.doc-item__type { font-size: 11.5px; color: var(--color-text-muted); }

.pulse-dot { display: inline-block; width: 7px; height: 7px; background: var(--color-success); border-radius: 50%; margin-right: 5px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.lb-table  { width: 100%; border-collapse: collapse; }
.lb-th     { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); background: var(--color-bg-subtle); }
.lb-row    { border-bottom: 1px solid var(--color-border); }
.lb-row:hover { background: var(--color-bg-subtle); }
.lb-row--gold { background: rgba(183,140,43,0.06); }
.lb-td     { padding: 11px 12px; font-size: 13px; color: var(--color-text-primary); }
.lb-rank   { font-weight: 700; color: var(--color-text-muted); }
.lb-name   { font-weight: 500; }
.lb-total  { font-weight: 700; color: var(--color-accent); }
.lb-medal  { text-align: center; }
</style>
