<template>
    <SimporaLayout title="Perubahan Hasil">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Pengajuan Perubahan Hasil</h1>
                    <p class="page-subtitle">Ralat skor pertandingan yang sudah selesai — wajib diajukan dengan keterangan, lalu disetujui panitia besar.</p>
                </div>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <select v-model="filterStatus" class="filter-select">
                        <option value="">Semua Status</option>
                        <option value="pending">Menunggu</option>
                        <option value="approved">Disetujui</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Pertandingan</th>
                                <th class="dt-th">Perubahan Skor</th>
                                <th class="dt-th">Keterangan</th>
                                <th class="dt-th">Pengaju</th>
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
                                <tr v-for="r in rows" :key="r.id" class="dt-row" :class="`dt-row--${r.status}`">
                                    <td class="dt-td">
                                        <div class="match-cell">
                                            <span class="match-cell__code">{{ r.match?.match_code ?? '—' }}</span>
                                            <span class="match-cell__sub">{{ r.match?.sport_category?.name ?? '—' }}</span>
                                        </div>
                                    </td>
                                    <td class="dt-td">
                                        <div class="score-change">
                                            <span class="score-old">{{ scoreText(r.old_data) }}</span>
                                            <ArrowRight :size="13" class="score-arrow" />
                                            <span class="score-new">{{ scoreText(r.new_data) }}</span>
                                        </div>
                                    </td>
                                    <td class="dt-td dt-td--muted reason-cell">{{ r.reason || '—' }}</td>
                                    <td class="dt-td dt-td--muted">{{ r.requested_by?.name ?? '—' }}</td>
                                    <td class="dt-td">
                                        <span :class="['status-badge', `status-badge--${r.status}`]">{{ statusLabel(r.status) }}</span>
                                        <div v-if="r.status === 'rejected' && r.review_note" class="reject-note">{{ r.review_note }}</div>
                                    </td>
                                    <td class="dt-td dt-td--actions">
                                        <div class="action-group">
                                            <template v-if="canReview && r.status === 'pending'">
                                                <button class="act-btn act-btn--approve" title="Setujui" :disabled="busyId === r.id" @click="approve(r)">
                                                    <Loader2 v-if="busyId === r.id" :size="14" class="spin" /><Check v-else :size="14" />
                                                </button>
                                                <button class="act-btn act-btn--reject" title="Tolak" @click="openReject(r)">
                                                    <X :size="14" />
                                                </button>
                                            </template>
                                            <button v-if="canDelete(r)" class="act-btn" title="Batalkan" :disabled="busyId === r.id" @click="confirmDelete(r)">
                                                <Trash2 :size="14" />
                                            </button>
                                            <span v-if="r.status !== 'pending' && !canDelete(r)" class="muted-dash">—</span>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !rows.length && !error" title="Belum ada pengajuan perubahan hasil" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchRows">Coba lagi</AppButton></div>
                </div>

                <div class="table-footer">
                    <AppPagination :model-value="page" :total="total" :per-page="perPage" @update:model-value="goToPage" @update:per-page="changePerPage" />
                </div>
            </AppCard>
        </div>

        <!-- Modal Tolak -->
        <AppModal v-model="showReject" title="Tolak Pengajuan" size="sm">
            <AppTextarea v-model="rejectNote" label="Alasan Penolakan (opsional)" :rows="3" placeholder="Mis. bukti skor tidak memadai" />
            <template #footer>
                <AppButton variant="secondary" @click="showReject = false">Batal</AppButton>
                <AppButton variant="danger" :loading="busyId === rejectTarget?.id" @click="doReject"><template #icon><X :size="15" /></template> Tolak</AppButton>
            </template>
        </AppModal>

        <!-- Modal Hapus -->
        <AppModal v-model="showDelete" title="Batalkan Pengajuan" size="sm">
            <p class="del-text">Batalkan pengajuan perubahan hasil untuk <strong>{{ deleteTarget?.match?.match_code }}</strong>?</p>
            <template #footer>
                <AppButton variant="secondary" @click="showDelete = false">Tidak</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete">Batalkan</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Check, X, ArrowRight, Trash2, Loader2 } from '@lucide/vue';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import { useAuth }   from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppTextarea   from '@/Components/App/AppTextarea.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';

const toast = useToast();
usePageGuard({ anyRole: ['super_admin', 'panitia_besar', 'admin_penilaian'] });
const { user, isSuperAdmin, can } = useAuth();

const canReview = computed(() => isSuperAdmin.value || can('results.verify'));

const filterStatus = ref('');
const rows    = ref<any[]>([]);
const total   = ref(0);
const page    = ref(1);
const perPage = ref(20);
const loading = ref(false);
const error   = ref('');
const busyId  = ref<number | null>(null);

async function fetchRows() {
    loading.value = true; error.value = '';
    try {
        const res = await api.get('/api/v1/result-change-requests', {
            params: { status: filterStatus.value || undefined, page: page.value, per_page: perPage.value },
        });
        const raw = res.data?.data;
        rows.value = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
        total.value = res.data?.meta?.total ?? raw?.total ?? rows.value.length;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data';
        rows.value = []; total.value = 0;
    } finally { loading.value = false; }
}

let debounce: ReturnType<typeof setTimeout>;
watch(filterStatus, () => { clearTimeout(debounce); debounce = setTimeout(() => { page.value = 1; fetchRows(); }, 250); });
function goToPage(p: number) { if (p === page.value) return; page.value = p; fetchRows(); }
function changePerPage(n: number) { perPage.value = n; page.value = 1; fetchRows(); }

onMounted(fetchRows);

// ── Approve / Reject ────────────────────────────────────────────
async function approve(r: any) {
    busyId.value = r.id;
    try {
        await api.patch(`/api/v1/result-change-requests/${r.id}/status`, { status: 'approved' });
        toast.success('Perubahan hasil disetujui');
        fetchRows();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal menyetujui'); }
    finally { busyId.value = null; }
}
const showReject = ref(false);
const rejectTarget = ref<any>(null);
const rejectNote = ref('');
function openReject(r: any) { rejectTarget.value = r; rejectNote.value = ''; showReject.value = true; }
async function doReject() {
    if (!rejectTarget.value) return;
    busyId.value = rejectTarget.value.id;
    try {
        await api.patch(`/api/v1/result-change-requests/${rejectTarget.value.id}/status`, { status: 'rejected', review_note: rejectNote.value.trim() || undefined });
        toast.success('Pengajuan ditolak');
        showReject.value = false; fetchRows();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal menolak'); }
    finally { busyId.value = null; }
}

// ── Delete ──────────────────────────────────────────────────────
function canDelete(r: any) { return r.status === 'pending' && (canReview.value || r.requested_by?.id === user.value?.id); }
const showDelete = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);
function confirmDelete(r: any) { deleteTarget.value = r; showDelete.value = true; }
async function doDelete() {
    if (!deleteTarget.value) return;
    deleting.value = true;
    try {
        await api.delete(`/api/v1/result-change-requests/${deleteTarget.value.id}`);
        toast.success('Pengajuan dibatalkan');
        showDelete.value = false; fetchRows();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal membatalkan'); }
    finally { deleting.value = false; }
}

// ── Helpers ─────────────────────────────────────────────────────
function scoreText(data: any): string {
    if (!data) return '—';
    const home = data?.score?.home ?? data?.home;
    const away = data?.score?.away ?? data?.away;
    if (home === undefined || away === undefined) return '—';
    let s = `${home} – ${away}`;
    if (data?.penalty && (data.penalty.home !== undefined || data.penalty.away !== undefined)) {
        s += ` (pen ${data.penalty.home ?? 0}–${data.penalty.away ?? 0})`;
    }
    return s;
}
function statusLabel(s: string) { return ({ pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' } as Record<string, string>)[s] ?? s; }
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; max-width: 640px; line-height: 1.5; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; align-items: center; }
.filter-select { border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); background: var(--color-bg-subtle); }
.dt-th--actions { text-align: right; width: 120px; }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row--pending  { border-left: 3px solid #f59e0b; }
.dt-row--approved { border-left: 3px solid #10b981; }
.dt-row--rejected { border-left: 3px solid #ef4444; opacity: .9; }
.dt-td       { padding: 12px 16px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--muted { color: var(--color-text-muted); font-size: 12.5px; }
.dt-td--actions { text-align: right; }
.match-cell  { display: flex; flex-direction: column; gap: 1px; }
.match-cell__code { font-weight: 600; font-family: var(--font-mono); }
.match-cell__sub  { font-size: 11.5px; color: var(--color-text-muted); }
.score-change { display: flex; align-items: center; gap: 8px; }
.score-old   { color: var(--color-text-muted); text-decoration: line-through; }
.score-new   { font-weight: 700; color: var(--color-text-primary); }
.score-arrow { color: var(--color-text-subtle); }
.reason-cell { max-width: 240px; }
.status-badge { display: inline-flex; align-items: center; font-size: 11.5px; font-weight: 600; padding: 4px 9px; border-radius: 99px; }
.status-badge--pending  { background: rgba(245,158,11,.12); color: #d97706; }
.status-badge--approved { background: rgba(16,185,129,.12); color: #059669; }
.status-badge--rejected { background: rgba(239,68,68,.12);  color: #dc2626; }
.reject-note { font-size: 11px; color: var(--color-text-muted); margin-top: 3px; max-width: 200px; }
.action-group { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
.act-btn { display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid var(--color-border); background: var(--color-bg-subtle); color: var(--color-text-muted); border-radius: 7px; cursor: pointer; padding: 5px 8px; transition: all 120ms; }
.act-btn:hover:not(:disabled) { background: var(--color-border); color: var(--color-text-primary); }
.act-btn:disabled { opacity: .5; cursor: not-allowed; }
.act-btn--approve { background: rgba(16,185,129,.12); color: #059669; border-color: rgba(16,185,129,.25); }
.act-btn--approve:hover:not(:disabled) { background: #059669; color: #fff; }
.act-btn--reject { background: rgba(239,68,68,.1); color: #dc2626; border-color: rgba(239,68,68,.25); }
.act-btn--reject:hover { background: #dc2626; color: #fff; }
.muted-dash { color: var(--color-text-subtle); }
.spin { animation: spin .7s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.del-text { font-size: 13.5px; color: var(--color-text-primary); margin: 0; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
