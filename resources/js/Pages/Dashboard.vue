<template>
    <SimporaLayout title="Dashboard">
        <div class="page-wrap">
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Halo, {{ firstName }} 👋</h1>
                    <p class="page-subtitle">
                        <span class="role-chip">{{ roleLabel }}</span>
                        · SIMPORA 2026 — PORA XV Aceh Jaya
                    </p>
                </div>
            </div>

            <!-- Pintasan per role -->
            <div class="quick-grid">
                <Link v-for="q in quickActions" :key="q.href" :href="q.href" class="quick-card">
                    <component :is="q.icon" :size="20" class="quick-card__icon" />
                    <div class="quick-card__body">
                        <span class="quick-card__title">{{ q.title }}</span>
                        <span class="quick-card__desc">{{ q.desc }}</span>
                    </div>
                    <ChevronRight :size="18" class="quick-card__chevron" />
                </Link>
            </div>

            <!-- KPI Row — hanya admin/panitia/super -->
            <div v-if="canSeeGlobalKpi" class="kpi-grid">
                <KpiCard label="Total Kontingen"  :value="kpi.contingents"       icon="Shield"   color="accent" />
                <KpiCard label="Total Atlet"      :value="kpi.athletes"          icon="Users"    color="info" />
                <KpiCard label="Tanding Hari Ini" :value="kpi.matches_today"     icon="Calendar" color="warning" />
                <KpiCard label="Dok. Pending"     :value="kpi.documents_pending" icon="FileText" color="danger" />
            </div>

            <!-- Content Row -->
            <div class="content-grid">
                <!-- Pertandingan Hari Ini — semua role yang bisa lihat jadwal -->
                <AppCard v-if="can('matches.view')">
                    <template #header>
                        <div class="card-header-row">
                            <span class="card-header-title">{{ matchesUpcoming ? 'Pertandingan Akan Datang' : 'Pertandingan Hari Ini' }}</span>
                            <Link href="/matches" class="card-header-link">Lihat semua</Link>
                        </div>
                    </template>
                    <div v-if="todayMatches.length" class="match-list">
                        <div v-for="match in todayMatches" :key="match.code" class="match-item">
                            <div class="match-item__info">
                                <span class="match-item__code">{{ match.code }}</span>
                                <span class="match-item__name">{{ match.name }}</span>
                                <span class="match-item__venue">{{ match.venue }} · {{ matchesUpcoming && match.date ? fmtDate(match.date) + ' ' : '' }}{{ match.time }}</span>
                            </div>
                            <AppBadge :color="statusColor(match.status)" size="sm">
                                <span v-if="match.status === 'ongoing'" class="pulse-dot" />
                                {{ statusLabel(match.status) }}
                            </AppBadge>
                        </div>
                    </div>
                    <p v-else class="empty-hint">Belum ada pertandingan terjadwal.</p>
                </AppCard>

                <!-- Dokumen Pending — hanya yang bisa verifikasi -->
                <AppCard v-if="can('documents.verify')">
                    <template #header>
                        <div class="card-header-row">
                            <span class="card-header-title">Dokumen Pending</span>
                            <Link href="/documents/review" class="card-header-link">Verifikasi</Link>
                        </div>
                    </template>
                    <div v-if="pendingDocs.length" class="doc-list">
                        <div v-for="doc in pendingDocs" :key="doc.id" class="doc-item">
                            <div class="doc-item__info">
                                <span class="doc-item__name">{{ doc.name }}</span>
                                <span class="doc-item__type">{{ doc.type }}</span>
                            </div>
                            <AppBadge color="warning" size="sm">Pending</AppBadge>
                        </div>
                    </div>
                    <p v-else class="empty-hint">Tidak ada dokumen menunggu verifikasi.</p>
                </AppCard>
            </div>

            <!-- Klasemen Top 5 — semua role yang bisa lihat hasil -->
            <AppCard v-if="can('results.view')">
                <template #header>
                    <div class="card-header-row">
                        <span class="card-header-title">Klasemen Sementara — Top 5</span>
                        <Link href="/leaderboard" class="card-header-link">Lihat semua</Link>
                    </div>
                </template>
                <table v-if="leaderboard.length" class="lb-table">
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
                <p v-else class="empty-hint">Belum ada perolehan medali.</p>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
    ChevronRight, Users, FileCheck, Gavel, BarChart2,
    Shield, Building2, Calendar, UserCog,
} from '@lucide/vue';
import api           from '@/lib/axios';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import KpiCard       from '@/Components/Dashboard/KpiCard.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import { useAuth }   from '@/Composables/useAuth';

const { user, roles, can, hasAnyRole } = useAuth();

const firstName = computed(() => (user.value?.name ?? 'Pengguna').split(' ')[0]);

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin', panitia_besar: 'Panitia Besar',
    admin_kontingen: 'Admin Kontingen', admin_penilaian: 'Admin Penilaian',
    admin_venue: 'Admin Venue', viewer: 'Viewer',
};
const roleLabel = computed(() => {
    const r = roles.value;
    if (!r.length) return 'Pengguna';
    return r.map((x) => ROLE_LABELS[x] ?? x).join(', ');
});

const canSeeGlobalKpi = computed(() => hasAnyRole(['super_admin', 'panitia_besar']));

// Pintasan kontekstual per kemampuan (permission-driven, jadi otomatis sesuai role).
const quickActions = computed(() => {
    const items: { title: string; desc: string; href: string; icon: any }[] = [];
    if (can('participants.view')) items.push({ title: 'Peserta', desc: 'Kelola atlet & ofisial', href: '/participants', icon: Users });
    if (can('documents.verify')) items.push({ title: 'Verifikasi Dokumen', desc: 'Antrian berkas peserta', href: '/documents/review', icon: FileCheck });
    if (can('contingents.view')) items.push({ title: 'Kontingen', desc: 'Data kontingen', href: '/contingents', icon: Shield });
    if (hasAnyRole(['super_admin', 'panitia_besar', 'admin_penilaian'])) items.push({ title: 'Tugas Penilaian', desc: 'Pertandingan yang Anda nilai', href: '/judges/my-assignments', icon: Gavel });
    if (can('matches.view')) items.push({ title: 'Jadwal', desc: 'Jadwal pertandingan', href: '/matches', icon: Calendar });
    if (can('venues.manage')) items.push({ title: 'Venue', desc: 'Kelola venue', href: '/venues', icon: Building2 });
    if (can('results.view')) items.push({ title: 'Klasemen', desc: 'Perolehan medali', href: '/leaderboard', icon: BarChart2 });
    if (can('users.view')) items.push({ title: 'Users', desc: 'Manajemen akun', href: '/users', icon: UserCog });
    return items;
});

interface MatchRow { code: string; name: string; venue: string; date?: string | null; time: string; status: string }
interface DocRow { id: number; name: string; type: string }
interface LbRow { name: string; gold: number; silver: number; bronze: number }

const kpi = ref({ contingents: 0, athletes: 0, matches_today: 0, documents_pending: 0 });
const todayMatches   = ref<MatchRow[]>([]);
const matchesUpcoming = ref(false);
const pendingDocs    = ref<DocRow[]>([]);
const leaderboard    = ref<LbRow[]>([]);

async function fetchSummary() {
    try {
        const res = await api.get('/api/v1/dashboard/summary');
        const d = res.data?.data ?? {};
        kpi.value             = { ...kpi.value, ...(d.kpi ?? {}) };
        todayMatches.value    = Array.isArray(d.today_matches) ? d.today_matches : [];
        matchesUpcoming.value = !!d.matches_upcoming;
        pendingDocs.value     = Array.isArray(d.pending_documents) ? d.pending_documents : [];
        leaderboard.value     = Array.isArray(d.leaderboard) ? d.leaderboard : [];
    } catch {
        // Biarkan nilai default (0/empty) — dashboard tetap tampil tanpa data.
    }
}

onMounted(fetchSummary);

function fmtDate(d: string) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

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
.page-subtitle{ font-size: 13px; color: var(--color-text-muted); margin-top: 5px; display: flex; align-items: center; gap: 6px; }
.role-chip    { display: inline-block; padding: 2px 9px; border-radius: 999px; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 11.5px; font-weight: 600; }

.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 900px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .quick-grid { grid-template-columns: 1fr; } }
.quick-card {
    display: flex; align-items: center; gap: 12px; padding: 14px 16px;
    background: var(--color-bg-card, var(--color-bg-subtle));
    border: 1px solid var(--color-border); border-radius: 14px;
    text-decoration: none; transition: border-color .15s ease, transform .15s ease;
}
.quick-card:hover { border-color: var(--color-accent); transform: translateY(-2px); }
.quick-card__icon { flex: 0 0 auto; color: var(--color-accent); }
.quick-card__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.quick-card__title { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.quick-card__desc  { font-size: 11.5px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.quick-card__chevron { flex: 0 0 auto; color: var(--color-text-subtle); }

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
.empty-hint { font-size: 13px; color: var(--color-text-muted); padding: 18px 4px; text-align: center; }
</style>
