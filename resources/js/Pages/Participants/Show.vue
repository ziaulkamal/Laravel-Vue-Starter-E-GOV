<template>
    <SimporaLayout :title="person?.nama_lengkap ?? 'Detail Peserta'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Peserta', href: '/participants' }, { label: person?.nama_lengkap ?? 'Detail' }]" />

            <div class="page-header">
                <div class="participant-hero">
                    <AppAvatar :user="{ name: person?.nama_lengkap ?? '' }" size="xl" />
                    <div>
                        <h1 class="page-title">{{ person?.nama_lengkap ?? 'Memuat...' }}</h1>
                        <div class="hero-meta">
                            <AppBadge :color="roleColor(participant?.role)" size="sm">{{ roleLabel(participant?.role) }}</AppBadge>
                            <AppBadge v-if="participant?.is_borrowed" color="warning" size="sm">Atlet Pinjaman</AppBadge>
                            <span class="dot">·</span>
                            <span class="meta-text">{{ participant?.contingent?.name ?? '—' }}</span>
                            <template v-if="participant?.is_borrowed && participant?.origin_contingent">
                                <span class="dot">·</span>
                                <span class="meta-text">asal: {{ participant.origin_contingent.name }}</span>
                            </template>
                            <span class="dot">·</span>
                            <span class="meta-text">{{ participant?.sport?.name ?? '—' }}</span>
                        </div>
                        <div class="hero-nik nik-mono">{{ person?.nik ?? '' }}</div>
                    </div>
                </div>
                <div class="hero-actions">
                    <AppButton v-if="canLend && participant?.role === 'athlete'" variant="secondary" size="sm" @click="openLend"><ArrowLeftRight :size="14" /> Pinjamkan</AppButton>
                    <AppButton v-if="can('participants.update')" variant="secondary" size="sm" @click="goEdit"><Pencil :size="14" /> Edit</AppButton>
                </div>
            </div>

            <AppTabs v-if="participant" v-model="activeTab" variant="underline" :tabs="tabs">
                <!-- Dokumen -->
                <template #dokumen>
                    <!-- Ringkasan kelengkapan -->
                    <div class="doc-summary">
                        <div class="doc-summary__chip" :class="docsComplete ? 'is-ok' : 'is-warn'">
                            <component :is="docsComplete ? CheckCircle2 : AlertTriangle" :size="15" />
                            <span>{{ docsComplete ? 'Berkas lengkap (terunggah)' : `${pendingUploadCount} berkas belum diunggah` }}</span>
                        </div>
                        <div class="doc-summary__chip" :class="docsApproved ? 'is-ok' : 'is-muted'">
                            <component :is="docsApproved ? ShieldCheck : Clock" :size="15" />
                            <span>{{ docsApproved ? 'Semua berkas disetujui' : `${pendingApproveCount} belum disetujui` }}</span>
                        </div>
                    </div>

                    <p v-if="!canUpload && !canVerify" class="doc-hint">
                        Anda hanya dapat melihat berkas. Upload dilakukan oleh admin kontingen terkait.
                    </p>

                    <div class="doc-checklist">
                        <template v-for="grp in docGroups" :key="grp.key">
                            <div v-if="grp.items.length" class="doc-group">
                                <div class="doc-group__head" :class="`doc-group__head--${grp.key}`">
                                    <component :is="grp.icon" :size="14" />
                                    <span class="doc-group__title">{{ grp.label }}</span>
                                    <span class="doc-group__count">{{ grp.items.length }}</span>
                                    <span class="doc-group__hint">{{ grp.hint }}</span>
                                </div>

                                <div v-for="doc in grp.items" :key="doc.document_type_id" class="doc-item">
                                    <span class="doc-item__icon">{{ docIcon(doc.status) }}</span>
                                    <div class="doc-item__info">
                                        <span class="doc-item__type">
                                            {{ doc.document_type_name }}
                                            <span v-if="doc.applies_when === 'borrowed_only'" class="doc-tag doc-tag--borrow">Pinjaman</span>
                                        </span>
                                        <span v-if="!doc.uploaded" class="doc-item__note doc-item__note--muted">Belum diunggah</span>
                                        <span v-else-if="doc.status === 'rejected' && doc.rejection_note" class="doc-item__note">
                                            Ditolak: {{ doc.rejection_note }}
                                        </span>
                                    </div>

                                    <AppBadge :color="docColor(doc.status)" size="sm">{{ docLabel(doc.status) }}</AppBadge>

                                    <!-- Aksi -->
                                    <div class="doc-actions">
                                        <button v-if="doc.uploaded" class="da-btn" title="Preview" @click="openPreview(doc)">
                                            <Eye :size="14" />
                                        </button>

                                        <!-- Upload pertama -->
                                        <button
                                            v-if="canUpload && !doc.uploaded"
                                            class="da-btn da-btn--primary"
                                            @click="openUpload(doc)"
                                        >
                                            <Upload :size="14" /> Upload
                                        </button>

                                        <!-- Unggah ulang (hanya rejected utk admin; super admin bebas) -->
                                        <button
                                            v-else-if="canReupload(doc)"
                                            class="da-btn da-btn--primary"
                                            @click="openUpload(doc)"
                                        >
                                            <RotateCcw :size="14" /> Ganti
                                        </button>

                                        <!-- Verifikasi (panitia besar / super admin) -->
                                        <template v-if="canVerify && doc.uploaded && doc.status === 'pending'">
                                            <button class="da-btn da-btn--ok" title="Setujui" :disabled="busyId === doc.document_id" @click="approve(doc)">
                                                <Check :size="14" />
                                            </button>
                                            <button class="da-btn da-btn--danger" title="Tolak" @click="openReject(doc)">
                                                <X :size="14" />
                                            </button>
                                        </template>

                                        <!-- Override status (super admin) -->
                                        <button
                                            v-if="isSuperAdmin && doc.uploaded"
                                            class="da-btn"
                                            title="Ubah status (super admin)"
                                            @click="openOverride(doc)"
                                        >
                                            <Settings2 :size="14" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </template>
                        <AppEmptyState v-if="!documents.length" title="Tidak ada checklist dokumen" size="sm" />
                    </div>
                </template>

                <!-- Sub-Cabor -->
                <template #subcabor>
                    <div class="subcabor-section">
                        <div v-if="isAthlete" class="subcabor-head">
                            <p class="subcabor-intro">Pendaftaran atlet ke cabor &amp; sub-cabor. Setelah didaftarkan, hanya panitia besar / super admin yang dapat membatalkan atau mengubahnya.</p>
                            <AppButton
                                v-if="canRegister"
                                variant="primary" size="sm"
                                :disabled="!docsApproved"
                                @click="openRegister"
                            >
                                <template #icon><CirclePlus :size="15" /></template> Daftarkan ke Sub-Cabor
                            </AppButton>
                        </div>

                        <div v-for="sc in registrations" :key="sc.id" class="subcabor-item">
                            <div class="subcabor-info">
                                <span class="subcabor-name">{{ sc.sport_category?.name ?? '—' }}</span>
                                <span v-if="sc.sport_category?.sport?.name" class="subcabor-sport">{{ sc.sport_category.sport.name }}</span>
                            </div>
                            <AppBadge :color="regColor(sc.status)" size="sm">{{ regLabel(sc.status) }}</AppBadge>
                            <div class="subcabor-actions">
                                <template v-if="canVerify && sc.status === 'pending'">
                                    <button class="da-btn da-btn--ok" title="Setujui" :disabled="regBusyId === sc.id" @click="approveReg(sc)"><Check :size="14" /></button>
                                    <button class="da-btn da-btn--danger" title="Tolak" :disabled="regBusyId === sc.id" @click="rejectReg(sc)"><X :size="14" /></button>
                                </template>
                                <button v-if="canRemoveReg" class="da-btn da-btn--danger" title="Batalkan registrasi" :disabled="regBusyId === sc.id" @click="confirmRemoveReg(sc)"><Trash2 :size="14" /></button>
                                <span v-else-if="!canVerify" class="subcabor-lock" title="Terkunci — hanya panitia besar/super admin"><Lock :size="13" /></span>
                            </div>
                        </div>
                        <AppEmptyState v-if="!registrations.length" title="Belum terdaftar di sub-cabor" size="sm" />

                        <AppAlert v-if="isAthlete && !docsApproved" type="warning" title="Berkas belum diverifikasi">
                            <template #description>Atlet belum bisa didaftarkan ke sub-cabor sampai seluruh berkas wajib <strong>disetujui (approved)</strong> oleh panitia besar / super admin.</template>
                        </AppAlert>
                        <AppAlert v-else-if="!isAthlete" type="info" title="Pendaftaran sub-cabor hanya untuk atlet">
                            <template #description>Peserta dengan peran ofisial/pelatih tidak didaftarkan ke sub-cabor.</template>
                        </AppAlert>
                    </div>
                </template>

                <!-- Kartu -->
                <template #kartu>
                    <div class="kartu-section">
                        <div v-if="canPrintCard">
                            <AppButton variant="primary" size="md" :loading="cardLoading" @click="printCard">🖨 Cetak Kartu Atlet (PDF)</AppButton>
                        </div>
                        <AppAlert v-else type="warning" title="Belum bisa cetak kartu">
                            <template #description>
                                {{ pendingApproveCount }} dokumen belum disetujui. Semua dokumen wajib harus approved sebelum kartu dapat dicetak.
                            </template>
                        </AppAlert>
                    </div>
                </template>
            </AppTabs>
        </div>

        <!-- ─── Upload Modal ─────────────────────────────────── -->
        <AppModal v-model="showUpload" :title="`${uploadDoc?.uploaded ? 'Ganti' : 'Upload'} — ${uploadDoc?.document_type_name ?? ''}`" size="sm">
            <div class="up-body">
                <input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" class="up-hidden" @change="onFilePicked" />
                <div class="up-drop" :class="{ 'is-set': !!uploadFile }" @click="fileInput?.click()">
                    <UploadCloud :size="26" />
                    <span v-if="!uploadFile" class="up-drop__label">Klik untuk pilih berkas</span>
                    <span v-else class="up-drop__file">{{ uploadFile.name }} · {{ fmtSize(uploadFile.size) }}</span>
                    <span class="up-drop__hint">PDF, JPG, PNG, WebP · maks 7 MB</span>
                </div>
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showUpload = false">Batal</AppButton>
                <AppButton variant="primary" :loading="uploading" :disabled="!uploadFile" @click="submitUpload">
                    <template #icon><Upload :size="15" /></template>
                    {{ uploadDoc?.uploaded ? 'Unggah Ulang' : 'Unggah' }}
                </AppButton>
            </template>
        </AppModal>

        <!-- ─── Preview Modal ─────────────────────────────────── -->
        <AppModal v-model="showPreview" :title="`Preview — ${previewDoc?.document_type_name}`" size="lg">
            <div class="preview-body">
                <div v-if="previewDoc?.status === 'rejected' && previewRejection" class="preview-reject-note">
                    <XCircle :size="16" class="prn-icon" />
                    <div>
                        <div class="prn-title">Alasan Penolakan</div>
                        <div class="prn-text">{{ previewRejection }}</div>
                    </div>
                </div>
                <div class="preview-viewer">
                    <div v-if="previewLoading" class="preview-empty"><Loader2 :size="32" class="spin" /><p>Memuat file…</p></div>
                    <img v-else-if="previewFileType === 'image' && previewUrl" :src="previewUrl" class="preview-img" alt="dokumen" />
                    <iframe v-else-if="previewFileType === 'pdf' && previewUrl" :src="previewUrl" class="preview-pdf" />
                    <div v-else class="preview-empty"><FileX :size="40" /><p>File belum tersedia</p></div>
                </div>
            </div>
            <template #footer>
                <div class="preview-foot">
                    <div class="preview-foot__left">
                        <AppButton variant="secondary" size="md" @click="showPreview = false">Tutup</AppButton>
                        <AppButton v-if="previewDownload" variant="ghost" size="md" @click="downloadDoc">
                            <template #icon><Download :size="15" /></template> Unduh
                        </AppButton>
                    </div>
                </div>
            </template>
        </AppModal>

        <!-- ─── Reject Modal ──────────────────────────────────── -->
        <AppModal v-model="showReject" title="Tolak Dokumen" size="sm">
            <div class="reject-body">
                <AppTextarea v-model="rejectNote" label="Alasan Penolakan" placeholder="Contoh: Foto buram, KTP tidak terbaca..." :rows="4" required />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showReject = false">Batal</AppButton>
                <AppButton variant="danger" :loading="busyId === rejectDoc?.document_id" :disabled="!rejectNote.trim()" @click="doReject">
                    <template #icon><X :size="15" /></template> Tolak Dokumen
                </AppButton>
            </template>
        </AppModal>

        <!-- ─── Pinjamkan Modal (panitia besar / super admin) ──── -->
        <AppModal v-model="showLend" title="Pinjamkan Atlet ke Kontingen Lain" size="sm">
            <div class="ov-body">
                <p class="ov-hint">Memindahkan <strong>{{ person?.nama_lengkap }}</strong> ke kontingen peminjam. Atlet ditandai pinjaman & kontingen asal disimpan otomatis.</p>
                <AppSelect v-model="lendTo" label="Kontingen Peminjam" :options="lendOptions" placeholder="Pilih kontingen tujuan..." />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showLend = false">Batal</AppButton>
                <AppButton variant="primary" :loading="lending" :disabled="!lendTo" @click="submitLend">Pinjamkan</AppButton>
            </template>
        </AppModal>

        <!-- ─── Override Modal (super admin) ───────────────────── -->
        <AppModal v-model="showOverride" title="Ubah Status Berkas (Super Admin)" size="sm">
            <div class="ov-body">
                <p class="ov-hint">Timpa status berkas secara manual di luar alur normal.</p>
                <AppSelect v-model="overrideStatus" label="Status" :options="overrideOptions" />
                <AppTextarea v-if="overrideStatus === 'rejected'" v-model="overrideNote" label="Alasan Penolakan" :rows="3" required />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showOverride = false">Batal</AppButton>
                <AppButton variant="primary" :loading="busyId === overrideDoc?.document_id"
                    :disabled="overrideStatus === 'rejected' && !overrideNote.trim()" @click="doOverride">
                    Simpan
                </AppButton>
            </template>
        </AppModal>

        <!-- ─── Daftarkan ke Sub-Cabor ─────────────────────────── -->
        <AppModal v-model="showRegister" title="Daftarkan ke Sub-Cabor" size="sm">
            <div class="reg-body">
                <p class="reg-hint">Pilih cabor lalu sub-cabor. Atlet hanya boleh bertanding di satu cabor (boleh beberapa sub-cabor di dalamnya).</p>
                <p v-if="hasActiveReg && !canRemoveReg" class="reg-warn">
                    ⚠️ Atlet sudah punya sub-cabor aktif. Sebagai admin kontingen, sub-cabor <strong>tambahan</strong> ini akan berstatus <strong>menunggu persetujuan</strong> panitia besar / super admin.
                </p>
                <AppSelect v-model="regSportId" label="Cabor" :options="sportOptions" placeholder="Pilih cabor..." @update:model-value="onRegSportChange" />
                <AppSelect v-model="regCategoryId" label="Sub-Cabor" :options="categoryOptions" :placeholder="regSportId ? 'Pilih sub-cabor...' : 'Pilih cabor dulu'" />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showRegister = false">Batal</AppButton>
                <AppButton variant="primary" :loading="submittingReg" :disabled="!regCategoryId" @click="submitRegister">Daftarkan</AppButton>
            </template>
        </AppModal>

        <!-- ─── Batalkan Registrasi ────────────────────────────── -->
        <AppModal v-model="showRemoveReg" title="Batalkan Registrasi" size="sm">
            <p class="ov-hint">Batalkan pendaftaran <strong>{{ removeRegTarget?.sport_category?.name }}</strong> untuk atlet ini? Tindakan ini hanya dapat dilakukan panitia besar / super admin.</p>
            <template #footer>
                <AppButton variant="secondary" @click="showRemoveReg = false">Tidak</AppButton>
                <AppButton variant="danger" :loading="removingReg" @click="doRemoveReg"><template #icon><Trash2 :size="15" /></template> Batalkan</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import {
    Pencil, Eye, Upload, UploadCloud, RotateCcw, Check, X, Settings2,
    Download, FileX, XCircle, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Clock, CirclePlus, ArrowLeftRight, Trash2, Lock,
} from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId, encodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }   from '@/Composables/useToast';
import { useAuth }    from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppAvatar      from '@/Components/App/AppAvatar.vue';
import AppAlert       from '@/Components/App/AppAlert.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppModal       from '@/Components/App/AppModal.vue';
import AppSelect      from '@/Components/App/AppSelect.vue';
import AppTextarea    from '@/Components/App/AppTextarea.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
usePageGuard({ anyRole: ['super_admin', 'panitia_besar', 'admin_kontingen'] });
const { user, isSuperAdmin, hasRole, can } = useAuth();
const realId = decodeId(props.id);

const activeTab = ref('dokumen');
const tabs = [
    { value: 'dokumen',  label: 'Dokumen' },
    { value: 'subcabor', label: 'Sub-Cabor' },
    { value: 'kartu',    label: 'Kartu' },
];

const participant   = ref<any>(null);
const person        = computed(() => participant.value?.person ?? null);
const registrations = computed(() => participant.value?.registrations ?? []);
const documents     = ref<any[]>([]);
const docsComplete  = ref(false);
const docsApproved  = ref(false);

const contingentId = computed(() => participant.value?.contingent_id ?? participant.value?.contingent?.id ?? null);

// Otorisasi (cermin backend; backend tetap final)
const canUpload = computed(() =>
    isSuperAdmin.value || (hasRole('admin_kontingen') && user.value?.kontingen_id === contingentId.value)
);
const canVerify = computed(() => isSuperAdmin.value || hasRole('panitia_besar'));
const canLend   = computed(() => isSuperAdmin.value || hasRole('panitia_besar'));

function canReupload(doc: any) {
    if (!doc.uploaded) return false;
    if (isSuperAdmin.value) return true;
    return canUpload.value && doc.status === 'rejected';
}

// ── Pendaftaran sub-cabor ────────────────────────────────────────
const isAthlete = computed(() => participant.value?.role === 'athlete');
// Boleh mendaftarkan: super admin, panitia besar, atau admin kontingen pemilik.
const canRegister = computed(() =>
    isSuperAdmin.value || hasRole('panitia_besar') ||
    (hasRole('admin_kontingen') && user.value?.kontingen_id === contingentId.value)
);
// Kunci: setelah terdaftar, hanya panitia besar / super admin yang boleh ubah/batalkan.
const canRemoveReg = computed(() => isSuperAdmin.value || hasRole('panitia_besar'));
// Sudah punya sub-cabor aktif (approved/pending) → pendaftaran berikutnya oleh
// admin kontingen akan menunggu persetujuan.
const hasActiveReg = computed(() => registrations.value.some((r: any) => r.status !== 'rejected'));

async function fetchParticipant() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/participants/${realId}`);
        participant.value = res.data?.data ?? null;
        if (!participant.value) { notFound(); return; }
        fetchChecklist();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    }
}
async function fetchChecklist() {
    try {
        const res = await api.get(`/api/v1/participants/${realId}/documents/checklist`);
        const data = res.data?.data ?? {};
        documents.value     = data.checklist ?? [];
        docsComplete.value  = !!data.summary?.documents_complete;
        docsApproved.value  = !!data.summary?.documents_approved;
    } catch { documents.value = []; }
}
onMounted(fetchParticipant);

const requiredDocs        = computed(() => documents.value.filter(d => d.is_required));
const optionalDocs        = computed(() => documents.value.filter(d => !d.is_required));
const pendingUploadCount  = computed(() => requiredDocs.value.filter(d => !d.uploaded).length);
const pendingApproveCount = computed(() => requiredDocs.value.filter(d => d.status !== 'approved').length);
const canPrintCard        = computed(() => docsApproved.value && requiredDocs.value.length > 0);

// Pisahkan berkas wajib vs opsional agar mudah ditinjau petugas.
const docGroups = computed(() => [
    { key: 'wajib',    label: 'Berkas Wajib',    hint: 'Harus dilengkapi', icon: ShieldCheck, items: requiredDocs.value },
    { key: 'opsional', label: 'Berkas Opsional', hint: 'Pelengkap',        icon: CirclePlus,  items: optionalDocs.value },
]);

function goEdit() { router.visit(`/participants/${encodeId(realId)}/edit`); }

// ── Upload / Re-upload ───────────────────────────────────────────
const showUpload = ref(false);
const uploadDoc  = ref<any>(null);
const uploadFile = ref<File | null>(null);
const uploading  = ref(false);
const fileInput  = ref<HTMLInputElement | null>(null);

function openUpload(doc: any) {
    uploadDoc.value  = doc;
    uploadFile.value = null;
    showUpload.value = true;
}
function onFilePicked(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    uploadFile.value = f;
    (e.target as HTMLInputElement).value = '';
}
async function submitUpload() {
    if (!uploadFile.value || !uploadDoc.value) return;
    uploading.value = true;
    try {
        const fd = new FormData();
        fd.append('file', uploadFile.value);
        let url: string;
        if (uploadDoc.value.uploaded && uploadDoc.value.document_id) {
            // Unggah ulang → method spoofing (PUT lewat POST agar multipart terbaca Laravel)
            fd.append('_method', 'PUT');
            url = `/api/v1/participants/${realId}/documents/${uploadDoc.value.document_id}`;
        } else {
            fd.append('document_type_id', String(uploadDoc.value.document_type_id));
            url = `/api/v1/participants/${realId}/documents`;
        }
        await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`Berkas ${uploadDoc.value.document_type_name} berhasil diunggah`);
        showUpload.value = false;
        await fetchChecklist();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal mengunggah berkas');
    } finally {
        uploading.value = false;
    }
}

// ── Preview ──────────────────────────────────────────────────────
const showPreview      = ref(false);
const previewDoc       = ref<any>(null);
const previewUrl       = ref('');
const previewDownload  = ref('');
const previewFileType  = ref<'image' | 'pdf' | ''>('');
const previewRejection = ref('');
const previewLoading   = ref(false);

async function openPreview(doc: any) {
    previewDoc.value = doc;
    previewUrl.value = ''; previewDownload.value = ''; previewRejection.value = ''; previewFileType.value = '';
    showPreview.value = true; previewLoading.value = true;
    try {
        const res  = await api.get(`/api/v1/participants/${realId}/documents/${doc.document_id}`);
        const data = res.data?.data;
        const mime = data?.mime_type ?? '';
        previewFileType.value  = mime.startsWith('image/') ? 'image' : (mime === 'application/pdf' ? 'pdf' : '');
        previewUrl.value       = data?.download_url ?? '';
        previewDownload.value  = data?.download_file_url ?? data?.download_url ?? '';
        previewRejection.value = data?.rejection_note ?? '';
    } catch { previewUrl.value = ''; } finally { previewLoading.value = false; }
}
function downloadDoc() {
    if (!previewDownload.value) return;
    const a = document.createElement('a');
    a.href = previewDownload.value; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
}

// ── Verifikasi (approve/reject) ──────────────────────────────────
const busyId     = ref<number | null>(null);
const showReject = ref(false);
const rejectDoc  = ref<any>(null);
const rejectNote = ref('');

async function approve(doc: any) {
    busyId.value = doc.document_id;
    try {
        await api.post(`/api/v1/participants/${realId}/documents/${doc.document_id}/verify`);
        toast.success(`Berkas ${doc.document_type_name} disetujui`);
        await fetchChecklist();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menyetujui berkas');
    } finally { busyId.value = null; }
}
function openReject(doc: any) { rejectDoc.value = doc; rejectNote.value = ''; showReject.value = true; }
async function doReject() {
    if (!rejectDoc.value || !rejectNote.value.trim()) return;
    busyId.value = rejectDoc.value.document_id;
    try {
        await api.post(`/api/v1/participants/${realId}/documents/${rejectDoc.value.document_id}/reject`, { rejection_note: rejectNote.value.trim() });
        toast.success(`Berkas ${rejectDoc.value.document_type_name} ditolak`);
        showReject.value = false;
        await fetchChecklist();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menolak berkas');
    } finally { busyId.value = null; }
}

// ── Override status (super admin) ────────────────────────────────
const showOverride   = ref(false);
const overrideDoc    = ref<any>(null);
const overrideStatus = ref('pending');
const overrideNote   = ref('');
const overrideOptions = [
    { value: 'pending',  label: 'Pending (dikembalikan)' },
    { value: 'approved', label: 'Approved (paksa setujui)' },
    { value: 'rejected', label: 'Rejected (tolak)' },
];
function openOverride(doc: any) {
    overrideDoc.value = doc;
    overrideStatus.value = doc.status ?? 'pending';
    overrideNote.value = doc.rejection_note ?? '';
    showOverride.value = true;
}
async function doOverride() {
    if (!overrideDoc.value) return;
    busyId.value = overrideDoc.value.document_id;
    try {
        await api.patch(`/api/v1/participants/${realId}/documents/${overrideDoc.value.document_id}/override-status`, {
            status: overrideStatus.value,
            rejection_note: overrideStatus.value === 'rejected' ? overrideNote.value.trim() : undefined,
        });
        toast.success('Status berkas diperbarui');
        showOverride.value = false;
        await fetchChecklist();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal mengubah status');
    } finally { busyId.value = null; }
}

// ── Pinjamkan (panitia/super → buat request auto-approved) ───────
const showLend    = ref(false);
const lendTo      = ref('');
const lending     = ref(false);
const lendOptions = ref<any[]>([]);
async function openLend() {
    lendTo.value = '';
    showLend.value = true;
    if (!lendOptions.value.length) {
        try {
            const res = await api.get('/api/v1/contingents', { params: { per_page: 100 } });
            const raw = res.data?.data;
            const list = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
            lendOptions.value = list
                .filter((c: any) => c.id !== contingentId.value)
                .map((c: any) => ({ value: String(c.id), label: c.name, logo: c }));
        } catch { lendOptions.value = []; }
    } else {
        lendOptions.value = lendOptions.value.filter(o => o.value !== String(contingentId.value));
    }
}
async function submitLend() {
    if (!lendTo.value) return;
    lending.value = true;
    try {
        const res = await api.post('/api/v1/participant-borrow-requests', {
            participant_id: realId,
            to_contingent_id: Number(lendTo.value),
        });
        toast.success(res.data?.message ?? 'Atlet dipinjamkan');
        showLend.value = false;
        await fetchParticipant();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal memproses peminjaman');
    } finally { lending.value = false; }
}

// ── Daftarkan ke sub-cabor ───────────────────────────────────────
const showRegister   = ref(false);
const regSportId     = ref('');
const regCategoryId  = ref('');
const sportOptions   = ref<{ value: string; label: string }[]>([]);
const categoryOptions = ref<{ value: string; label: string }[]>([]);
const submittingReg  = ref(false);
const regBusyId      = ref<number | null>(null);

async function openRegister() {
    regSportId.value = ''; regCategoryId.value = ''; categoryOptions.value = [];
    showRegister.value = true;
    if (!sportOptions.value.length) {
        try {
            const res = await api.get('/api/v1/sports', { params: { per_page: 200 } });
            const raw = res.data?.data;
            const list = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
            sportOptions.value = list.map((s: any) => ({ value: String(s.id), label: s.name }));
        } catch { sportOptions.value = []; }
    }
}
async function onRegSportChange() {
    regCategoryId.value = ''; categoryOptions.value = [];
    if (!regSportId.value) return;
    try {
        const res = await api.get('/api/v1/sport-categories', { params: { sport_id: regSportId.value, per_page: 300 } });
        const raw = res.data?.data;
        const list = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
        categoryOptions.value = list.map((c: any) => ({ value: String(c.id), label: c.name }));
    } catch { categoryOptions.value = []; }
}
async function submitRegister() {
    if (!regCategoryId.value) return;
    submittingReg.value = true;
    try {
        const res = await api.post(`/api/v1/participants/${realId}/registrations`, { sport_category_id: Number(regCategoryId.value) });
        toast.success(res.data?.message ?? 'Atlet didaftarkan ke sub-cabor');
        showRegister.value = false;
        await fetchParticipant();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? e.response.data?.message ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal mendaftarkan');
        }
    } finally { submittingReg.value = false; }
}

// ── Persetujuan / pembatalan registrasi (panitia besar / super admin) ──
async function approveReg(sc: any) {
    regBusyId.value = sc.id;
    try {
        await api.patch(`/api/v1/participants/${realId}/registrations/${sc.id}/status`, { status: 'approved' });
        toast.success('Registrasi disetujui');
        await fetchParticipant();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal menyetujui'); }
    finally { regBusyId.value = null; }
}
async function rejectReg(sc: any) {
    regBusyId.value = sc.id;
    try {
        await api.patch(`/api/v1/participants/${realId}/registrations/${sc.id}/status`, { status: 'rejected' });
        toast.success('Registrasi ditolak');
        await fetchParticipant();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal menolak'); }
    finally { regBusyId.value = null; }
}
const showRemoveReg   = ref(false);
const removeRegTarget = ref<any>(null);
const removingReg     = ref(false);
function confirmRemoveReg(sc: any) { removeRegTarget.value = sc; showRemoveReg.value = true; }
async function doRemoveReg() {
    if (!removeRegTarget.value) return;
    removingReg.value = true;
    try {
        await api.delete(`/api/v1/participants/${realId}/registrations/${removeRegTarget.value.id}`);
        toast.success('Registrasi dibatalkan');
        showRemoveReg.value = false;
        await fetchParticipant();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Gagal membatalkan registrasi'); }
    finally { removingReg.value = false; }
}

// ── Kartu ────────────────────────────────────────────────────────
const cardLoading = ref(false);
async function printCard() {
    cardLoading.value = true;
    try {
        const res = await api.get(`/api/v1/participants/${realId}/card`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal mencetak kartu');
    } finally { cardLoading.value = false; }
}

// ── Helpers ──────────────────────────────────────────────────────
function fmtSize(b: number) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`; }
function roleColor(r?: string) {
    const m: Record<string, 'success' | 'info' | 'warning' | 'primary'> = { athlete: 'success', coach: 'info', official: 'warning', manager: 'primary' };
    return m[r ?? ''] ?? 'default' as 'success';
}
function roleLabel(r?: string) {
    return ({ athlete: 'Atlet', coach: 'Pelatih', official: 'Official', manager: 'Manajer' } as Record<string,string>)[r ?? ''] ?? (r ?? '—');
}
function regColor(s?: string) {
    const m: Record<string, 'success' | 'warning' | 'danger'> = { approved: 'success', pending: 'warning', rejected: 'danger' };
    return m[s ?? ''] ?? 'warning';
}
function regLabel(s?: string) { return ({ approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' } as Record<string,string>)[s ?? ''] ?? 'Terdaftar'; }
function docIcon(s: string | null)  { return ({ approved: '🟢', pending: '🟡', rejected: '🔴' } as Record<string,string>)[s ?? ''] ?? '⚪'; }
function docColor(s: string | null) {
    const m: Record<string, 'success' | 'warning' | 'danger' | 'default'> = { approved: 'success', pending: 'warning', rejected: 'danger' };
    return m[s ?? ''] ?? 'default';
}
function docLabel(s: string | null) { return ({ approved: 'Approved', pending: 'Pending', rejected: 'Ditolak' } as Record<string,string>)[s ?? ''] ?? 'Belum Upload'; }
</script>

<style scoped>
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header{ display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; text-transform: capitalize; }
.participant-hero { display: flex; align-items: flex-start; gap: 14px; }
.hero-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hero-meta  { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.dot        { color: var(--color-text-subtle); }
.meta-text  { font-size: 13px; color: var(--color-text-muted); }
.hero-nik   { font-size: 12.5px; color: var(--color-text-muted); margin-top: 4px; }
.nik-mono   { font-family: var(--font-mono); }

/* Ringkasan kelengkapan */
.doc-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.doc-summary__chip { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; padding: 7px 12px; border-radius: 99px; }
.doc-summary__chip.is-ok    { background: rgba(16,185,129,.12); color: #059669; }
.doc-summary__chip.is-warn  { background: rgba(245,158,11,.12); color: #d97706; }
.doc-summary__chip.is-muted { background: var(--color-bg-subtle); color: var(--color-text-muted); }
.doc-hint { font-size: 12px; color: var(--color-text-muted); margin: 0 0 10px; }

.doc-checklist { display: flex; flex-direction: column; }
.doc-group { display: flex; flex-direction: column; }
.doc-group + .doc-group { margin-top: 18px; }
.doc-group__head {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 8px; margin-bottom: 4px;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
}
.doc-group__head--wajib    { background: rgba(245,158,11,.1);  color: #d97706; }
.doc-group__head--opsional { background: var(--color-bg-subtle); color: var(--color-text-muted); }
.doc-group__title { letter-spacing: .05em; }
.doc-group__count {
    display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px;
    padding: 0 5px; border-radius: 99px; background: color-mix(in srgb, currentColor 18%, transparent);
    font-size: 11px; font-weight: 700;
}
.doc-group__hint { margin-left: auto; font-size: 10.5px; font-weight: 600; text-transform: none; letter-spacing: 0; opacity: .8; }
.doc-item      { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.doc-item:last-child { border-bottom: none; }
.doc-item__icon{ font-size: 18px; flex-shrink: 0; }
.doc-item__info{ flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.doc-item__type{ font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.doc-tag       { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 2px 6px; border-radius: 5px; }
.doc-tag--borrow { background: rgba(245,158,11,.14); color: #d97706; }
.doc-item__note{ font-size: 11.5px; color: var(--color-danger); }
.doc-item__note--muted { color: var(--color-text-subtle); }

.doc-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.da-btn {
    display: inline-flex; align-items: center; gap: 5px;
    border: 1.5px solid var(--color-border); background: var(--color-bg-subtle);
    color: var(--color-text-muted); border-radius: 7px; cursor: pointer;
    font-size: 12px; font-weight: 500; font-family: var(--font-sans);
    padding: 5px 9px; transition: all 120ms ease;
}
.da-btn:hover:not(:disabled) { background: var(--color-border); color: var(--color-text-primary); }
.da-btn:disabled { opacity: .5; cursor: not-allowed; }
.da-btn--primary { background: rgba(99,102,241,.1); color: #4f46e5; border-color: rgba(99,102,241,.25); }
.da-btn--primary:hover { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.da-btn--ok { background: rgba(16,185,129,.12); color: #059669; border-color: rgba(16,185,129,.25); }
.da-btn--ok:hover:not(:disabled) { background: #059669; color: #fff; }
.da-btn--danger { background: rgba(239,68,68,.1); color: #dc2626; border-color: rgba(239,68,68,.25); }
.da-btn--danger:hover { background: #dc2626; color: #fff; }

.subcabor-section { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
.subcabor-head    { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
.subcabor-intro   { font-size: 12.5px; color: var(--color-text-muted); margin: 0; max-width: 460px; line-height: 1.5; }
.subcabor-item    { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.subcabor-info    { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.subcabor-name    { font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.subcabor-sport   { font-size: 11.5px; color: var(--color-text-muted); }
.subcabor-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.subcabor-lock    { display: inline-flex; align-items: center; color: var(--color-text-subtle); }
.reg-body { display: flex; flex-direction: column; gap: 14px; }
.reg-hint { font-size: 12px; color: var(--color-text-muted); margin: 0; line-height: 1.5; }
.reg-warn { font-size: 12px; color: #d97706; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.25); border-radius: 8px; padding: 9px 11px; margin: 0; line-height: 1.5; }
.kartu-section { padding-top: 8px; display: flex; flex-direction: column; gap: 14px; }

/* Upload modal */
.up-body { display: flex; flex-direction: column; gap: 12px; }
.up-hidden { display: none; }
.up-drop {
    border: 2px dashed var(--color-border); border-radius: 12px; padding: 26px 18px;
    display: flex; flex-direction: column; align-items: center; gap: 7px; cursor: pointer;
    text-align: center; background: var(--color-bg-subtle); color: var(--color-text-muted); transition: all 160ms ease;
}
.up-drop:hover { border-color: #6366f1; }
.up-drop.is-set { border-style: solid; border-color: #6366f1; }
.up-drop__label { font-size: 13px; font-weight: 600; color: #4f46e5; }
.up-drop__file  { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); word-break: break-all; }
.up-drop__hint  { font-size: 11px; color: var(--color-text-subtle); }

/* Preview modal */
.preview-body   { display: flex; flex-direction: column; gap: 16px; }
.preview-reject-note { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 10px; background: rgba(239,68,68,.08); border: 1.5px solid rgba(239,68,68,.22); }
.prn-icon  { color: #dc2626; flex-shrink: 0; margin-top: 1px; }
.prn-title { font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #dc2626; margin-bottom: 3px; }
.prn-text  { font-size: 13px; color: var(--color-text-primary); line-height: 1.5; }
.preview-viewer { min-height: 260px; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--color-border); border-radius: 10px; overflow: hidden; background: var(--color-bg-subtle); }
.preview-img    { max-width: 100%; max-height: 480px; display: block; }
.preview-pdf    { width: 100%; height: 480px; border: none; }
.preview-empty  { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--color-text-subtle); padding: 40px; text-align: center; }
.preview-empty p { font-size: 13.5px; font-weight: 500; margin: 0; }
.preview-foot       { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; flex-wrap: wrap; }
.preview-foot__left { display: flex; align-items: center; gap: 8px; }
.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Reject / Override modal */
.reject-body, .ov-body { display: flex; flex-direction: column; gap: 14px; }
.ov-hint { font-size: 12px; color: var(--color-text-muted); margin: 0; }
</style>
