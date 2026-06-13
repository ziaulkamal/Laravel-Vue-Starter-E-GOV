<template>
    <SimporaLayout title="Audit Log">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Audit Log Sistem</h1>
                    <p class="page-subtitle">Rekam jejak login &amp; perubahan data — siapa melakukan apa &amp; kapan.</p>
                </div>
                <AppButton variant="secondary" size="md" :loading="loading" @click="fetchLogs">
                    <RefreshCw :size="14" /> Muat ulang
                </AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari deskripsi..." />
                    </div>
                    <select v-model="filterLog" class="filter-select">
                        <option value="">Semua Kategori</option>
                        <option value="auth">Login &amp; Auth</option>
                        <option value="model">Perubahan Data</option>
                    </select>
                    <select v-model="filterEvent" class="filter-select">
                        <option value="">Semua Aksi</option>
                        <optgroup label="Login / Auth">
                            <option value="login">Login</option>
                            <option value="login_failed">Login Gagal</option>
                            <option value="login_blocked">Login Diblokir</option>
                            <option value="logout">Logout</option>
                        </optgroup>
                        <optgroup label="Data">
                            <option value="created">Dibuat</option>
                            <option value="updated">Diperbarui</option>
                            <option value="deleted">Dihapus</option>
                            <option value="restored">Dipulihkan</option>
                        </optgroup>
                    </select>
                    <select v-model="filterModel" class="filter-select">
                        <option value="">Semua Model</option>
                        <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <select v-if="users.length" v-model="filterUser" class="filter-select">
                        <option value="">Semua User</option>
                        <option v-for="u in users" :key="u.id" :value="String(u.id)">{{ u.name }}</option>
                    </select>
                    <AppInput v-model="filterFrom" type="date" style="width:150px" />
                    <AppInput v-model="filterTo"   type="date" style="width:150px" />
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Waktu</th>
                                <th class="dt-th">User</th>
                                <th class="dt-th">Aksi</th>
                                <th class="dt-th">Deskripsi</th>
                                <th class="dt-th">Objek</th>
                                <th class="dt-th dt-th--actions">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 6" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 6" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="log in logs" :key="log.id" class="dt-row">
                                    <td class="dt-td text-xs">
                                        <span class="cell-time">{{ formatTime(log.created_at) }}</span>
                                        <span class="cell-diff text-muted">{{ log.created_diff }}</span>
                                    </td>
                                    <td class="dt-td">
                                        <span v-if="log.causer" class="user-name">{{ log.causer.name }}</span>
                                        <span v-else class="text-muted">— sistem / tamu</span>
                                    </td>
                                    <td class="dt-td">
                                        <AppBadge :color="eventColor(log.event)" size="sm">{{ eventLabel(log.event) }}</AppBadge>
                                    </td>
                                    <td class="dt-td">{{ log.description }}</td>
                                    <td class="dt-td text-muted">
                                        <template v-if="log.subject">{{ log.subject.type }} <span class="text-subtle">#{{ log.subject.id }}</span></template>
                                        <template v-else>—</template>
                                    </td>
                                    <td class="dt-td dt-td--actions">
                                        <AppButton size="xs" variant="ghost" @click="viewDetail(log)">Lihat</AppButton>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !logs.length && !error" title="Tidak ada log" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchLogs">Coba lagi</AppButton></div>
                </div>

                <div class="table-footer">
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

        <!-- Detail Modal -->
        <AppModal v-model="showDetail" title="Detail Audit Log" size="md">
            <div v-if="detailLoading" class="detail-loading text-muted">Memuat detail…</div>
            <div v-else-if="selectedLog" class="detail-wrap">
                <div class="detail-header">
                    <AppBadge :color="eventColor(selectedLog.event)" size="sm">{{ eventLabel(selectedLog.event) }}</AppBadge>
                    <span v-if="selectedLog.subject" class="detail-model">{{ selectedLog.subject.type }} #{{ selectedLog.subject.id }}</span>
                    <span class="detail-time text-muted">{{ formatTime(selectedLog.created_at) }}</span>
                </div>

                <div class="detail-meta">
                    <div><span class="meta-label">Deskripsi</span><span>{{ selectedLog.description }}</span></div>
                    <div><span class="meta-label">User</span><span>{{ selectedLog.causer ? `${selectedLog.causer.name} (${selectedLog.causer.email})` : '— sistem / tamu' }}</span></div>
                    <div v-if="selectedLog.properties?.ip"><span class="meta-label">IP</span><span class="mono">{{ selectedLog.properties.ip }}</span></div>
                    <div v-if="selectedLog.properties?.user_agent"><span class="meta-label">Perangkat</span><span class="text-xs">{{ selectedLog.properties.user_agent }}</span></div>
                    <div v-if="selectedLog.properties?.email"><span class="meta-label">Email dicoba</span><span class="mono">{{ selectedLog.properties.email }}</span></div>
                </div>

                <div v-if="hasChanges" class="diff-grid">
                    <div v-if="oldValues" class="diff-col">
                        <div class="diff-label">Sebelum</div>
                        <pre class="diff-pre diff-pre--old">{{ pretty(oldValues) }}</pre>
                    </div>
                    <div v-if="newValues" class="diff-col">
                        <div class="diff-label">Sesudah</div>
                        <pre class="diff-pre diff-pre--new">{{ pretty(newValues) }}</pre>
                    </div>
                </div>
            </div>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { Search, RefreshCw } from '@lucide/vue';
import api           from '@/lib/axios';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';

interface ActivitySubject { type: string; id: number | string }
interface ActivityCauser  { id: number; name: string; email: string }
interface ActivityLog {
    id: number;
    log_name: string | null;
    event: string | null;
    description: string;
    subject: ActivitySubject | null;
    causer: ActivityCauser | null;
    created_at: string;
    created_diff: string;
    changes?: { attributes?: Record<string, unknown>; old?: Record<string, unknown> } | null;
    properties?: Record<string, any> | null;
}

usePageGuard({ permission: 'audit.view' });

// Model yang diaudit di CORE (subject_type pendek).
const modelOptions = [
    'User', 'Person', 'Contingent', 'Participant', 'ParticipantRegistration',
    'ParticipantDocument', 'ParticipantBorrowRequest', 'GameMatch', 'MatchResult',
    'MatchMedal', 'ResultChangeRequest', 'Sport', 'SportCategory', 'Venue',
    'TournamentGroup', 'DocumentType', 'Lodging', 'CardTemplate',
];

const search      = ref('');
const filterLog   = ref('');
const filterEvent = ref('');
const filterModel = ref('');
const filterUser  = ref('');
const filterFrom  = ref('');
const filterTo    = ref('');

const logs    = ref<ActivityLog[]>([]);
const total   = ref(0);
const page    = ref(1);
const perPage = ref(25);
const loading = ref(false);
const error   = ref('');

const users = ref<{ id: number; name: string }[]>([]);

async function fetchLogs() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/activity-logs', {
            params: {
                search:       search.value || undefined,
                log_name:     filterLog.value || undefined,
                event:        filterEvent.value || undefined,
                subject_type: filterModel.value || undefined,
                causer_id:    filterUser.value || undefined,
                date_from:    filterFrom.value || undefined,
                date_to:      filterTo.value || undefined,
                page:         page.value,
                per_page:     perPage.value,
            },
        });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        logs.value  = list.filter(Boolean);
        total.value = res.data?.meta?.total ?? raw?.total ?? logs.value.length;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat audit log';
        logs.value  = [];
        total.value = 0;
    } finally {
        loading.value = false;
    }
}

// Dropdown user (untuk filter pelaku). Diam-diam dilewati bila tak punya izin users.view.
async function fetchUsers() {
    try {
        const res = await api.get('/api/v1/users', { params: { per_page: 200 } });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        users.value = list.filter(Boolean).map((u: any) => ({ id: u.id, name: u.name }));
    } catch {
        users.value = [];
    }
}

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterLog, filterEvent, filterModel, filterUser, filterFrom, filterTo], () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page.value = 1; fetchLogs(); }, 350);
});

function goToPage(p: number) {
    if (p === page.value) return;
    page.value = p;
    fetchLogs();
}
function changePerPage(n: number) {
    perPage.value = n;
    page.value = 1;
    fetchLogs();
}

onMounted(() => { fetchLogs(); fetchUsers(); });

// ── Detail ────────────────────────────────────────────────────
const showDetail   = ref(false);
const detailLoading = ref(false);
const selectedLog  = ref<ActivityLog | null>(null);

async function viewDetail(log: ActivityLog) {
    selectedLog.value  = log;     // tampilkan data ringkas dulu
    showDetail.value   = true;
    detailLoading.value = true;
    try {
        const res = await api.get(`/api/v1/activity-logs/${log.id}`);
        selectedLog.value = res.data?.data ?? log;
    } catch {
        // pakai data baris bila detail gagal dimuat
    } finally {
        detailLoading.value = false;
    }
}

const oldValues  = computed(() => selectedLog.value?.changes?.old ?? null);
const newValues  = computed(() => selectedLog.value?.changes?.attributes ?? null);
const hasChanges = computed(() => !!(oldValues.value || newValues.value));

// ── Helpers ───────────────────────────────────────────────────
function formatTime(iso: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
function pretty(v: unknown) {
    return JSON.stringify(v, null, 2);
}

const EVENT_LABELS: Record<string, string> = {
    login: 'Login', login_failed: 'Login Gagal', login_blocked: 'Login Diblokir', logout: 'Logout',
    created: 'Dibuat', updated: 'Diperbarui', deleted: 'Dihapus', restored: 'Dipulihkan',
};
function eventLabel(e: string | null) {
    return e ? (EVENT_LABELS[e] ?? e) : '—';
}
function eventColor(e: string | null): 'success' | 'warning' | 'danger' | 'info' | 'default' {
    const m: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
        login: 'success', created: 'success', restored: 'success',
        updated: 'warning',
        deleted: 'danger', login_failed: 'danger', login_blocked: 'danger',
        logout: 'info',
    };
    return e ? (m[e] ?? 'default') : 'default';
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; align-items: center; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
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
.cell-time   { display: block; }
.cell-diff   { display: block; font-size: 11px; }
.user-name   { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.text-subtle { color: var(--color-text-subtle); }
.text-xs     { font-size: 11.5px; }
.mono        { font-family: var(--font-mono); }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
.detail-loading { padding: 24px; text-align: center; font-size: 13px; }
.detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.detail-model  { font-weight: 500; font-size: 13.5px; }
.detail-time   { font-size: 12px; }
.detail-meta   { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; font-size: 13px; }
.detail-meta > div { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: start; }
.meta-label    { color: var(--color-text-muted); font-size: 12px; }
.diff-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .diff-grid { grid-template-columns: 1fr; } }
.diff-label    { font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 6px; }
.diff-pre      { font-family: var(--font-mono); font-size: 11.5px; padding: 12px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; }
.diff-pre--old { background: rgba(220,38,38,0.07); color: var(--color-danger); }
.diff-pre--new { background: rgba(5,150,105,0.07); color: var(--color-success); }
</style>
