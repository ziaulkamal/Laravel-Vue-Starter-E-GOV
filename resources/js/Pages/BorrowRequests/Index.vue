<template>
    <SimporaLayout title="Peminjaman Atlet">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Peminjaman Atlet</h1>
                    <p class="page-subtitle">Pengajuan & persetujuan atlet pinjaman antar kontingen</p>
                </div>
                <AppButton v-if="canRequest" variant="primary" size="md" @click="openRequest">
                    + Ajukan Peminjaman
                </AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="14" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama atau NIK atlet..." />
                    </div>
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
                                <th class="dt-th">Atlet</th>
                                <th class="dt-th">Asal → Peminjam</th>
                                <th class="dt-th">Pengaju</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 5" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 5" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="r in rows" :key="r.id" class="dt-row" :class="`dt-row--${r.status}`">
                                    <td class="dt-td">
                                        <div class="person-cell">
                                            <AppAvatar :user="{ name: r.person?.nama_lengkap }" size="sm" />
                                            <div class="person-cell__info">
                                                <span class="person-cell__name">{{ r.person?.nama_lengkap ?? '—' }}</span>
                                                <span class="person-cell__sub nik-mono">{{ maskNik(r.person?.nik) }}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="dt-td">
                                        <div class="route-cell">
                                            <span class="route-chip">
                                                <ContingentLogo :contingent="r.from_contingent" :size="18" :radius="5" />
                                                {{ r.from_contingent?.name ?? '—' }}
                                            </span>
                                            <ArrowRight :size="13" class="route-arrow" />
                                            <span class="route-chip">
                                                <ContingentLogo :contingent="r.to_contingent" :size="18" :radius="5" />
                                                {{ r.to_contingent?.name ?? '—' }}
                                            </span>
                                        </div>
                                    </td>
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
                    <AppEmptyState v-if="!loading && !rows.length && !error" title="Belum ada pengajuan peminjaman" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchRows">Coba lagi</AppButton></div>
                </div>

                <div class="table-footer">
                    <AppPagination :model-value="page" :total="total" :per-page="perPage" @update:model-value="goToPage" @update:per-page="changePerPage" />
                </div>
            </AppCard>
        </div>

        <!-- Modal Ajukan Peminjaman -->
        <AppModal v-model="showRequest" title="Ajukan Peminjaman Atlet" size="md">
            <div class="rq-body">
                <AppSelect v-if="canReview" v-model="reqForm.to_contingent_id" label="Kontingen Peminjam" :options="contingentOptions" placeholder="Pilih kontingen peminjam..." />
                <p v-else class="rq-hint">Peminjaman atas nama kontingen Anda. Pilih atlet dari daerah lain, lalu panitia besar akan meninjau.</p>

                <div class="rq-field">
                    <label class="rq-label">Cari Atlet (NIK / nama)</label>
                    <div class="filter-search">
                        <Search :size="14" class="filter-search__icon" />
                        <input v-model="personSearch" class="filter-search__input" placeholder="Ketik min. 4 karakter..." />
                    </div>
                    <div v-if="personSearch.trim().length >= 4" class="rq-results">
                        <div v-if="searchingPerson" class="rq-loading"><span class="sk-bar" /><span class="sk-bar" /></div>
                        <template v-else-if="personResults.length">
                            <button
                                v-for="p in personResults" :key="p.id" type="button"
                                class="rq-person" :class="{ 'rq-person--sel': selectedPerson?.id === p.id }"
                                @click="selectedPerson = p"
                            >
                                <span class="rq-person__name">{{ p.nama_lengkap }}</span>
                                <span class="rq-person__nik nik-mono">{{ maskNik(p.nik) }}</span>
                                <Check v-if="selectedPerson?.id === p.id" :size="15" class="rq-person__check" />
                            </button>
                        </template>
                        <div v-else class="rq-empty">Tidak ada orang yang cocok.</div>
                    </div>
                </div>

                <AppSelect v-model="reqForm.from_contingent_id" label="Kontingen Asal (opsional)" :options="contingentOptions" placeholder="Pilih jika diketahui / kosongkan" />
                <AppTextarea v-model="reqForm.reason" label="Alasan / Keterangan (opsional)" :rows="3" placeholder="Mis. mengisi posisi yang kosong di cabor X" />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showRequest = false">Batal</AppButton>
                <AppButton variant="primary" :loading="submitting" :disabled="!canSubmitRequest" @click="submitRequest">Ajukan</AppButton>
            </template>
        </AppModal>

        <!-- Modal Tolak -->
        <AppModal v-model="showReject" title="Tolak Pengajuan" size="sm">
            <AppTextarea v-model="rejectNote" label="Alasan Penolakan (opsional)" :rows="3" placeholder="Mis. kuota penuh / berkas tidak sesuai" />
            <template #footer>
                <AppButton variant="secondary" @click="showReject = false">Batal</AppButton>
                <AppButton variant="danger" :loading="busyId === rejectTarget?.id" @click="doReject"><template #icon><X :size="15" /></template> Tolak</AppButton>
            </template>
        </AppModal>

        <!-- Modal Hapus -->
        <AppModal v-model="showDelete" title="Batalkan Pengajuan" size="sm">
            <p class="del-text">Batalkan pengajuan peminjaman <strong>{{ deleteTarget?.person?.nama_lengkap }}</strong>?</p>
            <template #footer>
                <AppButton variant="secondary" @click="showDelete = false">Tidak</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete">Batalkan</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Search, Check, X, ArrowRight, Trash2, Loader2 } from '@lucide/vue';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import { useAuth }   from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppTextarea   from '@/Components/App/AppTextarea.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

const toast = useToast();
usePageGuard({ anyRole: ['super_admin', 'panitia_besar', 'admin_kontingen'] });
const { user, isSuperAdmin, hasRole } = useAuth();

const canReview  = computed(() => isSuperAdmin.value || hasRole('panitia_besar'));
const canRequest = computed(() => canReview.value || hasRole('admin_kontingen'));

const search       = ref('');
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
        const res = await api.get('/api/v1/participant-borrow-requests', {
            params: { search: search.value || undefined, status: filterStatus.value || undefined, page: page.value, per_page: perPage.value },
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
watch([search, filterStatus], () => { clearTimeout(debounce); debounce = setTimeout(() => { page.value = 1; fetchRows(); }, 350); });
function goToPage(p: number) { if (p === page.value) return; page.value = p; fetchRows(); }
function changePerPage(n: number) { perPage.value = n; page.value = 1; fetchRows(); }

const contingentOptions = ref<any[]>([]);
async function fetchContingents() {
    try {
        const res = await api.get('/api/v1/contingents', { params: { per_page: 100 } });
        const raw = res.data?.data;
        const list = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
        contingentOptions.value = list.map((c: any) => ({ value: String(c.id), label: c.name, logo: c }));
    } catch { contingentOptions.value = []; }
}

onMounted(() => { fetchRows(); fetchContingents(); });

// ── Approve / Reject ────────────────────────────────────────────
async function approve(r: any) {
    busyId.value = r.id;
    try {
        await api.patch(`/api/v1/participant-borrow-requests/${r.id}/status`, { status: 'approved' });
        toast.success('Peminjaman disetujui');
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
        await api.patch(`/api/v1/participant-borrow-requests/${rejectTarget.value.id}/status`, { status: 'rejected', review_note: rejectNote.value.trim() || undefined });
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
        await api.delete(`/api/v1/participant-borrow-requests/${deleteTarget.value.id}`);
        toast.success('Pengajuan dibatalkan');
        showDelete.value = false; fetchRows();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal membatalkan'); }
    finally { deleting.value = false; }
}

// ── Ajukan (request) ────────────────────────────────────────────
const showRequest   = ref(false);
const reqForm       = ref<{ to_contingent_id: string; from_contingent_id: string; reason: string }>({ to_contingent_id: '', from_contingent_id: '', reason: '' });
const personSearch  = ref('');
const personResults = ref<any[]>([]);
const searchingPerson = ref(false);
const selectedPerson  = ref<any>(null);
const submitting    = ref(false);

function openRequest() {
    reqForm.value = { to_contingent_id: '', from_contingent_id: '', reason: '' };
    personSearch.value = ''; personResults.value = []; selectedPerson.value = null;
    showRequest.value = true;
}
let personDebounce: ReturnType<typeof setTimeout>;
watch(personSearch, () => {
    clearTimeout(personDebounce);
    if (personSearch.value.trim().length < 4) { personResults.value = []; searchingPerson.value = false; return; }
    searchingPerson.value = true;
    personDebounce = setTimeout(searchPersons, 350);
});
async function searchPersons() {
    searchingPerson.value = true;
    try {
        const res = await api.get('/api/v1/persons', { params: { search: personSearch.value || undefined, per_page: 15 } });
        const raw = res.data?.data;
        personResults.value = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
    } catch { personResults.value = []; }
    finally { searchingPerson.value = false; }
}

const canSubmitRequest = computed(() => {
    if (!selectedPerson.value) return false;
    if (canReview.value && !reqForm.value.to_contingent_id) return false;
    return true;
});
async function submitRequest() {
    if (!canSubmitRequest.value) return;
    submitting.value = true;
    const to = canReview.value ? Number(reqForm.value.to_contingent_id) : user.value?.kontingen_id;
    try {
        const res = await api.post('/api/v1/participant-borrow-requests', {
            person_id: selectedPerson.value.id,
            to_contingent_id: to,
            from_contingent_id: reqForm.value.from_contingent_id ? Number(reqForm.value.from_contingent_id) : undefined,
            reason: reqForm.value.reason || undefined,
        });
        toast.success(res.data?.message ?? 'Pengajuan terkirim');
        showRequest.value = false; fetchRows();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? e.response.data?.message ?? 'Data tidak valid');
        } else { toast.error(e?.response?.data?.message ?? 'Gagal mengajukan'); }
    } finally { submitting.value = false; }
}

// ── Helpers ─────────────────────────────────────────────────────
function maskNik(nik?: string) { if (!nik) return '—'; if (nik.length <= 8) return nik; return nik.slice(0, 4) + '•'.repeat(nik.length - 8) + nik.slice(-4); }
function statusLabel(s: string) { return ({ pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' } as Record<string, string>)[s] ?? s; }
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; align-items: center; }
.filter-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); flex-shrink: 0; }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
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
.person-cell { display: flex; align-items: center; gap: 10px; }
.person-cell__info { display: flex; flex-direction: column; gap: 1px; }
.person-cell__name { font-weight: 600; text-transform: capitalize; }
.person-cell__sub  { font-size: 11.5px; color: var(--color-text-muted); }
.route-cell  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.route-chip  { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-text-primary); }
.route-arrow { color: var(--color-text-subtle); }
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
.nik-mono { font-family: var(--font-mono); }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }

/* Modal Ajukan */
.rq-body { display: flex; flex-direction: column; gap: 14px; }
.rq-hint { font-size: 12.5px; color: var(--color-text-muted); margin: 0; line-height: 1.5; }
.rq-field { display: flex; flex-direction: column; gap: 6px; }
.rq-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.rq-results { border: 1.5px solid var(--color-border); border-radius: 10px; overflow: hidden; max-height: 220px; overflow-y: auto; }
.rq-person { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; border-bottom: 1px solid var(--color-border); background: transparent; cursor: pointer; text-align: left; }
.rq-person:last-child { border-bottom: none; }
.rq-person:hover { background: var(--color-bg-subtle); }
.rq-person--sel { background: var(--color-accent-subtle); }
.rq-person__name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-transform: capitalize; }
.rq-person__nik { font-size: 11.5px; color: var(--color-text-muted); }
.rq-person__check { margin-left: auto; color: var(--color-accent); }
.rq-loading { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.rq-empty { padding: 18px; text-align: center; font-size: 12.5px; color: var(--color-text-subtle); }
.del-text { font-size: 13.5px; color: var(--color-text-primary); margin: 0; }
</style>
