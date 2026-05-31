<template>
    <SimporaLayout>
        <div class="page-wrap">

            <!-- Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Verifikasi Dokumen</h1>
                    <p class="page-subtitle">Tinjau dan verifikasi dokumen peserta PORA XV</p>
                </div>
            </div>

            <!-- Stat bar -->
            <div class="stat-bar">
                <div class="stat-item stat-item--pending">
                    <Clock :size="16" />
                    <span class="stat-num">{{ stats.pending }}</span>
                    <span class="stat-label">Menunggu</span>
                </div>
                <div class="stat-divider" />
                <div class="stat-item stat-item--approved">
                    <CheckCircle2 :size="16" />
                    <span class="stat-num">{{ stats.approved }}</span>
                    <span class="stat-label">Disetujui</span>
                </div>
                <div class="stat-divider" />
                <div class="stat-item stat-item--rejected">
                    <XCircle :size="16" />
                    <span class="stat-num">{{ stats.rejected }}</span>
                    <span class="stat-label">Ditolak</span>
                </div>
                <div class="stat-divider" />
                <div class="stat-item">
                    <FileText :size="16" />
                    <span class="stat-num">{{ stats.total }}</span>
                    <span class="stat-label">Total</span>
                </div>
            </div>

            <!-- Card -->
            <AppCard padding="none">
                <!-- Filter bar -->
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="14" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama atau NIK peserta..." />
                    </div>
                    <select v-model="filterContingent" class="filter-select">
                        <option value="">Semua Kontingen</option>
                        <option v-for="c in contingents" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
                    </select>
                    <select v-model="filterDocType" class="filter-select">
                        <option value="">Semua Jenis</option>
                        <option v-for="t in docTypes" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
                    </select>
                    <select v-model="filterStatus" class="filter-select">
                        <option value="">Semua Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                </div>

                <!-- Table -->
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Peserta</th>
                                <th class="dt-th">Jenis Dokumen</th>
                                <th class="dt-th">Tgl. Upload</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 6" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 5" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr
                                    v-for="doc in docs"
                                    :key="doc.id"
                                    class="dt-row"
                                    :class="`dt-row--${doc.status}`"
                                >
                                    <!-- Peserta -->
                                    <td class="dt-td">
                                        <div class="person-cell">
                                            <AppAvatar :user="{ name: doc.participant }" size="sm" />
                                            <div class="person-cell__info">
                                                <span class="person-cell__name">{{ doc.participant }}</span>
                                                <span class="person-cell__sub">{{ doc.kontingen }}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <!-- Jenis -->
                                    <td class="dt-td">
                                        <div class="doc-type">
                                            <div class="doc-type__icon">
                                                <FileText :size="14" />
                                            </div>
                                            {{ doc.type }}
                                        </div>
                                    </td>

                                    <!-- Tanggal -->
                                    <td class="dt-td dt-td--muted">{{ formatDate(doc.uploaded_at) }}</td>

                                    <!-- Status -->
                                    <td class="dt-td">
                                        <span :class="['status-badge', `status-badge--${doc.status}`]">
                                            <component :is="statusIcon(doc.status)" :size="12" />
                                            {{ statusLabel(doc.status) }}
                                        </span>
                                    </td>

                                    <!-- Aksi -->
                                    <td class="dt-td dt-td--actions">
                                        <div class="action-group">
                                            <button class="act-btn act-btn--preview" title="Preview dokumen" @click="openPreview(doc)">
                                                <Eye :size="15" />
                                                <span>Preview</span>
                                            </button>

                                            <template v-if="doc.status === 'pending'">
                                                <button class="act-btn act-btn--approve" title="Setujui dokumen" :disabled="processingId === doc.id" @click="approve(doc)">
                                                    <Loader2 v-if="processingId === doc.id" :size="15" class="spin" />
                                                    <Check v-else :size="15" />
                                                </button>
                                                <button class="act-btn act-btn--reject" title="Tolak dokumen" @click="openReject(doc)">
                                                    <X :size="15" />
                                                </button>
                                            </template>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>

                    <AppEmptyState
                        v-if="!loading && !docs.length && !error"
                        title="Tidak ada dokumen"
                        description="Tidak ada dokumen yang sesuai dengan filter yang dipilih"
                        size="sm"
                    />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchDocs">Coba lagi</AppButton></div>
                </div>

                <!-- Footer -->
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

        <!-- ─── Preview Modal ─────────────────────────────────── -->
        <AppModal v-model:open="showPreview" :title="`Preview — ${previewDoc?.type}`" size="lg">
            <div class="preview-body">
                <!-- Info peserta -->
                <div class="preview-meta">
                    <AppAvatar :user="{ name: previewDoc?.participant ?? '' }" size="sm" />
                    <div>
                        <div class="preview-meta__name">{{ previewDoc?.participant }}</div>
                        <div class="preview-meta__sub">{{ previewDoc?.kontingen }} · {{ previewDoc?.type }}</div>
                    </div>
                    <span :class="['status-badge', `status-badge--${previewDoc?.status}`]" style="margin-left:auto">
                        <component :is="statusIcon(previewDoc?.status ?? '')" :size="12" />
                        {{ statusLabel(previewDoc?.status ?? '') }}
                    </span>
                </div>

                <!-- File viewer -->
                <div class="preview-viewer">
                    <div v-if="previewLoading" class="preview-empty">
                        <Loader2 :size="32" class="spin" />
                        <p>Memuat file…</p>
                    </div>
                    <img
                        v-else-if="previewFileType === 'image' && previewUrl"
                        :src="previewUrl"
                        class="preview-img"
                        alt="dokumen"
                    />
                    <iframe
                        v-else-if="previewFileType === 'pdf' && previewUrl"
                        :src="previewUrl"
                        class="preview-pdf"
                    />
                    <div v-else class="preview-empty">
                        <FileX :size="40" />
                        <p>File belum tersedia</p>
                        <p class="preview-empty__sub">File dokumen tidak dapat dimuat</p>
                    </div>
                </div>
            </div>

            <!-- Aksi di footer modal (hanya jika pending) -->
            <template v-if="previewDoc?.status === 'pending'" #footer>
                <AppButton variant="secondary" @click="showPreview = false">Tutup</AppButton>
                <AppButton variant="danger" @click="showPreview = false; openReject(previewDoc)">
                    <X :size="15" /> Tolak
                </AppButton>
                <AppButton variant="primary" :loading="processingId === previewDoc?.id" @click="approve(previewDoc)">
                    <Check :size="15" /> Setujui
                </AppButton>
            </template>
            <template v-else #footer>
                <AppButton variant="secondary" @click="showPreview = false">Tutup</AppButton>
            </template>
        </AppModal>

        <!-- ─── Reject Modal ──────────────────────────────────── -->
        <AppModal v-model:open="showReject" title="Tolak Dokumen" size="sm">
            <div class="reject-body">
                <div class="reject-target">
                    <div class="reject-target__icon"><FileX :size="20" /></div>
                    <div>
                        <div class="reject-target__name">{{ rejectDoc?.participant }}</div>
                        <div class="reject-target__doc">{{ rejectDoc?.type }} · {{ rejectDoc?.kontingen }}</div>
                    </div>
                </div>
                <AppTextarea
                    v-model="rejectNote"
                    label="Alasan Penolakan"
                    placeholder="Contoh: Foto buram, KTP tidak terbaca, dokumen kedaluwarsa..."
                    :rows="4"
                    required
                />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showReject = false">Batal</AppButton>
                <AppButton variant="danger" :loading="rejecting" :disabled="!rejectNote.trim()" @click="doReject">
                    <X :size="15" /> Tolak Dokumen
                </AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import {
    Search, Eye, Check, X, FileText, FileX,
    Clock, CheckCircle2, XCircle, Loader2,
} from '@lucide/vue';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppTextarea   from '@/Components/App/AppTextarea.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';

const toast = useToast();

// ── Filter state ────────────────────────────────────────────────
const search           = ref('');
const filterContingent = ref('');
const filterDocType    = ref('');
const filterStatus     = ref('');

// ── List state ──────────────────────────────────────────────────
interface DocRow {
    id: number; participant_id: number;
    participant: string; nik: string; kontingen: string;
    type: string; status: string; uploaded_at: string;
}
const docs    = ref<DocRow[]>([]);
const total   = ref(0);
const page    = ref(1);
const perPage = ref(25);
const loading = ref(false);
const error   = ref('');
const stats   = reactive({ pending: 0, approved: 0, rejected: 0, total: 0 });

// ── Filter option sources ───────────────────────────────────────
const contingents = ref<{ id: number; name: string }[]>([]);
const docTypes    = ref<{ id: number; name: string }[]>([]);

async function fetchContingents() {
    try {
        const res = await api.get('/api/v1/contingents', { params: { per_page: 100 } });
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        contingents.value = list.filter(Boolean);
    } catch { contingents.value = []; }
}
async function fetchDocTypes() {
    try {
        const res = await api.get('/api/v1/document-types');
        const raw = res.data?.data;
        docTypes.value = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
    } catch { docTypes.value = []; }
}

// ── Fetch antrian dokumen ───────────────────────────────────────
async function fetchDocs() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/documents/review', {
            params: {
                search:           search.value || undefined,
                contingent_id:    filterContingent.value || undefined,
                document_type_id: filterDocType.value || undefined,
                status:           filterStatus.value || undefined,
                page:             page.value,
                per_page:         perPage.value,
            },
        });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        docs.value = list.filter(Boolean).map((d: any) => ({
            id:             d.id,
            participant_id: d.participant_id ?? d.participant?.id,
            participant:    d.participant?.person?.nama_lengkap ?? '—',
            nik:            d.participant?.person?.nik ?? '',
            kontingen:      d.participant?.contingent?.name ?? '—',
            type:           d.document_type?.name ?? '—',
            status:         d.status,
            uploaded_at:    d.created_at,
        }));
        total.value = res.data?.meta?.total ?? raw?.total ?? docs.value.length;
        const s = res.data?.stats;
        if (s) { stats.pending = s.pending; stats.approved = s.approved; stats.rejected = s.rejected; stats.total = s.total; }
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat dokumen';
        docs.value = [];
        total.value = 0;
    } finally {
        loading.value = false;
    }
}

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterContingent, filterDocType, filterStatus], () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page.value = 1; fetchDocs(); }, 350);
});
function goToPage(p: number) { if (p === page.value) return; page.value = p; fetchDocs(); }
function changePerPage(n: number) { perPage.value = n; page.value = 1; fetchDocs(); }

onMounted(() => {
    fetchContingents();
    fetchDocTypes();
    fetchDocs();
});

// ── Preview (ambil download_url dari endpoint detail) ───────────
const showPreview     = ref(false);
const previewDoc      = ref<DocRow | null>(null);
const previewUrl      = ref('');
const previewFileType = ref<'image' | 'pdf' | ''>('');
const previewLoading  = ref(false);

async function openPreview(doc: DocRow) {
    previewDoc.value      = doc;
    previewUrl.value      = '';
    previewFileType.value = '';
    showPreview.value     = true;
    previewLoading.value  = true;
    try {
        const res = await api.get(`/api/v1/participants/${doc.participant_id}/documents/${doc.id}`);
        const data = res.data?.data;
        previewUrl.value = data?.download_url ?? '';
        const mime = data?.mime_type ?? '';
        previewFileType.value = mime.startsWith('image/') ? 'image' : (mime === 'application/pdf' ? 'pdf' : '');
    } catch {
        previewUrl.value = '';
    } finally {
        previewLoading.value = false;
    }
}

// ── Reject ──────────────────────────────────────────────────────
const showReject   = ref(false);
const rejectDoc    = ref<DocRow | null>(null);
const rejectNote   = ref('');
const rejecting    = ref(false);
const processingId = ref<number | null>(null);

function openReject(doc: DocRow | null) {
    if (!doc) return;
    rejectDoc.value  = doc;
    rejectNote.value = '';
    showReject.value = true;
}

async function approve(doc: DocRow | null) {
    if (!doc) return;
    processingId.value = doc.id;
    try {
        await api.post(`/api/v1/participants/${doc.participant_id}/documents/${doc.id}/verify`);
        toast.success(`Dokumen ${doc.type} — ${doc.participant} disetujui`);
        showPreview.value = false;
        fetchDocs();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menyetujui dokumen');
    } finally {
        processingId.value = null;
    }
}

async function doReject() {
    if (!rejectDoc.value || !rejectNote.value.trim()) return;
    rejecting.value = true;
    try {
        await api.post(`/api/v1/participants/${rejectDoc.value.participant_id}/documents/${rejectDoc.value.id}/reject`, {
            rejection_note: rejectNote.value.trim(),
        });
        toast.success(`Dokumen ${rejectDoc.value.type} — ${rejectDoc.value.participant} ditolak`);
        showReject.value = false;
        rejectNote.value = '';
        fetchDocs();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menolak dokumen');
    } finally {
        rejecting.value = false;
    }
}

// ── Helpers ──────────────────────────────────────────────────────
function statusLabel(s: string) {
    return { approved: 'Disetujui', pending: 'Pending', rejected: 'Ditolak' }[s] ?? s;
}
function statusIcon(s: string) {
    return { approved: CheckCircle2, pending: Clock, rejected: XCircle }[s] ?? FileText;
}
function formatDate(d: string) {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }

/* ── Stat bar ── */
.stat-bar {
    display: flex; align-items: center; gap: 0;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 12px;
    padding: 14px 20px;
    flex-wrap: wrap; gap: 4px;
}
.stat-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-radius: 8px;
    font-size: 13px; color: var(--color-text-muted);
}
.stat-item--pending  { color: #d97706; background: rgba(217,119,6,.07); }
.stat-item--approved { color: #059669; background: rgba(5,150,105,.07); }
.stat-item--rejected { color: #dc2626; background: rgba(220,38,38,.07); }
.stat-num   { font-size: 18px; font-weight: 800; letter-spacing: -0.03em; color: inherit; }
.stat-label { font-size: 11.5px; font-weight: 500; }
.stat-divider { width: 1px; height: 28px; background: var(--color-border); margin: 0 8px; }

/* ── Filter ── */
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; align-items: center; }
.filter-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); flex-shrink: 0; }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select { border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
.dt-table   { width: 100%; border-collapse: collapse; }
.dt-th      { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); background: var(--color-bg-subtle); }
.dt-th--actions { text-align: right; width: 180px; }
.dt-row     { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }

/* Row tinting per status */
.dt-row--pending  { border-left: 3px solid #f59e0b; }
.dt-row--approved { border-left: 3px solid #10b981; }
.dt-row--rejected { border-left: 3px solid #ef4444; opacity: 0.85; }

.dt-td         { padding: 13px 16px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--muted  { color: var(--color-text-muted); font-size: 12.5px; }
.dt-td--actions{ text-align: right; }

/* ── Person cell ── */
.person-cell       { display: flex; align-items: center; gap: 10px; }
.person-cell__info { display: flex; flex-direction: column; gap: 1px; }
.person-cell__name { font-weight: 600; font-size: 13px; color: var(--color-text-primary); text-transform: capitalize; }
.person-cell__sub  { font-size: 11.5px; color: var(--color-text-muted); }

/* ── Doc type cell ── */
.doc-type       { display: flex; align-items: center; gap: 8px; }
.doc-type__icon {
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--color-bg-subtle); color: var(--color-text-muted);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* ── Status badge (scoped, bukan AppBadge) ── */
.status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 600; padding: 4px 9px; border-radius: 99px;
    white-space: nowrap;
}
.status-badge--pending  { background: rgba(245,158,11,.12); color: #d97706; }
.status-badge--approved { background: rgba(16,185,129,.12);  color: #059669; }
.status-badge--rejected { background: rgba(239,68,68,.12);   color: #dc2626; }

/* ── Action group ── */
.action-group { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }

.act-btn {
    display: inline-flex; align-items: center; gap: 5px;
    border: none; border-radius: 7px; cursor: pointer;
    font-size: 12px; font-weight: 500; font-family: var(--font-sans);
    padding: 5px 10px; transition: all 120ms ease; outline: none;
}
.act-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.act-btn--preview {
    background: var(--color-bg-subtle); color: var(--color-text-muted);
    border: 1.5px solid var(--color-border);
}
.act-btn--preview:hover { background: var(--color-border); color: var(--color-text-primary); }

.act-btn--approve {
    background: rgba(16,185,129,.12); color: #059669;
    border: 1.5px solid rgba(16,185,129,.25);
    padding: 5px 8px;
}
.act-btn--approve:hover:not(:disabled) { background: #059669; color: white; border-color: #059669; }

.act-btn--reject {
    background: rgba(239,68,68,.10); color: #dc2626;
    border: 1.5px solid rgba(239,68,68,.25);
    padding: 5px 8px;
}
.act-btn--reject:hover { background: #dc2626; color: white; border-color: #dc2626; }

.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.sk-bar { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Table footer ── */
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }

/* ── Preview modal ── */
.preview-body   { display: flex; flex-direction: column; gap: 16px; }
.preview-meta   { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--color-bg-subtle); border-radius: 10px; }
.preview-meta__name { font-weight: 600; font-size: 13.5px; color: var(--color-text-primary); text-transform: capitalize; }
.preview-meta__sub  { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.preview-viewer { min-height: 260px; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--color-border); border-radius: 10px; overflow: hidden; background: var(--color-bg-subtle); }
.preview-img    { max-width: 100%; max-height: 480px; display: block; }
.preview-pdf    { width: 100%; height: 480px; border: none; }
.preview-empty  { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--color-text-subtle); padding: 40px; text-align: center; }
.preview-empty p { font-size: 13.5px; font-weight: 500; margin: 0; }
.preview-empty__sub { font-size: 12px; color: var(--color-text-subtle); margin-top: 2px; }

/* ── Reject modal ── */
.reject-body   { display: flex; flex-direction: column; gap: 16px; }
.reject-target {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 10px;
    background: rgba(239,68,68,.07); border: 1.5px solid rgba(239,68,68,.2);
}
.reject-target__icon { color: #dc2626; display: flex; align-items: center; }
.reject-target__name { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); text-transform: capitalize; }
.reject-target__doc  { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
</style>
