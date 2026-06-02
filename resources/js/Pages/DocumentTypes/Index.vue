<template>
    <SimporaLayout title="Jenis Berkas">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Jenis Berkas</h1>
                    <p class="page-subtitle">Atur berkas yang wajib/opsional dilampirkan peserta (atlet & ofisial)</p>
                </div>
                <AppButton v-if="can('documents.verify')" variant="primary" size="md" @click="$inertia.visit('/document-types/create')">
                    + Tambah Jenis Berkas
                </AppButton>
            </div>

            <AppCard padding="none">
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama Berkas</th>
                                <th class="dt-th">Berlaku untuk</th>
                                <th class="dt-th">Kondisi</th>
                                <th class="dt-th dt-th--c">Wajib</th>
                                <th class="dt-th dt-th--c">Aktif</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 6" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 6" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="t in types" :key="t.id" class="dt-row">
                                    <td class="dt-td">
                                        <div class="name-cell">
                                            <span class="name-cell__name">{{ t.name }}</span>
                                            <span v-if="t.description" class="name-cell__desc">{{ t.description }}</span>
                                        </div>
                                    </td>
                                    <td class="dt-td">
                                        <AppBadge :color="roleColor(t.applies_to_role)" size="sm">{{ roleLabel(t.applies_to_role) }}</AppBadge>
                                    </td>
                                    <td class="dt-td dt-td--muted">{{ whenLabel(t.applies_when) }}</td>
                                    <td class="dt-td dt-td--c">
                                        <AppToggle :model-value="!!t.is_required" :disabled="busyId === t.id" @update:model-value="(v) => toggleField(t, 'is_required', v)" />
                                    </td>
                                    <td class="dt-td dt-td--c">
                                        <AppToggle :model-value="!!t.is_active" :disabled="busyId === t.id" @update:model-value="(v) => toggleField(t, 'is_active', v)" />
                                    </td>
                                    <td class="dt-td dt-td--actions">
                                        <div class="action-btns">
                                            <AppButton v-if="can('documents.verify')" size="xs" variant="ghost" @click="$inertia.visit(`/document-types/${encodeId(t.id)}/edit`)"><Pencil :size="14" /></AppButton>
                                            <AppButton v-if="can('documents.verify')" size="xs" variant="ghost" @click="confirmDelete(t)"><Trash2 :size="14" /></AppButton>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !types.length && !error" title="Belum ada jenis berkas" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchTypes">Coba lagi</AppButton></div>
                </div>
            </AppCard>
        </div>

        <AppModal v-model="showDelete" title="Hapus Jenis Berkas" size="sm">
            <p class="del-text">Hapus <strong>{{ deleteTarget?.name }}</strong>? Berkas peserta yang sudah diunggah untuk jenis ini tidak akan terpengaruh, tetapi jenis ini tak lagi muncul di checklist.</p>
            <template #footer>
                <AppButton variant="secondary" @click="showDelete = false">Batal</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete"><template #icon><Trash2 :size="15" /></template> Hapus</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import { Pencil, Trash2 } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import { useToast }  from '@/Composables/useToast';
import { useAuth }   from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppToggle     from '@/Components/App/AppToggle.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

const toast = useToast();
usePageGuard({ anyRole: ['super_admin', 'panitia_besar'] });
const { isSuperAdmin, hasRole, can } = useAuth();

const types   = ref<any[]>([]);
const loading = ref(false);
const error   = ref('');
const busyId  = ref<number | null>(null);

async function fetchTypes() {
    loading.value = true;
    error.value = '';
    try {
        const res = await api.get('/api/v1/document-types', { params: { active_only: 0 } });
        const raw = res.data?.data;
        types.value = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat jenis berkas';
        types.value = [];
    } finally { loading.value = false; }
}

onMounted(() => {
    // Master config → super admin / panitia besar saja.
    if (!isSuperAdmin.value && !hasRole('panitia_besar')) { router.visit('/dashboard'); return; }
    fetchTypes();
});

async function toggleField(t: any, field: 'is_required' | 'is_active', value: boolean) {
    busyId.value = t.id;
    const prev = t[field];
    t[field] = value; // optimistic
    try {
        await api.put(`/api/v1/document-types/${t.id}`, { [field]: value });
        toast.success(`${t.name} diperbarui`);
    } catch (e: any) {
        t[field] = prev; // rollback
        toast.error(e?.response?.data?.message ?? 'Gagal memperbarui');
    } finally { busyId.value = null; }
}

// ── Delete ───────────────────────────────────────────────────────
const showDelete   = ref(false);
const deleteTarget = ref<any>(null);
const deleting     = ref(false);
function confirmDelete(t: any) { deleteTarget.value = t; showDelete.value = true; }
async function doDelete() {
    if (!deleteTarget.value) return;
    deleting.value = true;
    try {
        await api.delete(`/api/v1/document-types/${deleteTarget.value.id}`);
        toast.success('Jenis berkas dihapus');
        showDelete.value = false;
        fetchTypes();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus');
    } finally { deleting.value = false; }
}

// ── Labels ───────────────────────────────────────────────────────
function roleColor(r?: string) { return ({ semua: 'info', atlet: 'success', ofisial: 'warning' } as Record<string, any>)[r ?? ''] ?? 'default'; }
function roleLabel(r?: string) { return ({ semua: 'Atlet & Ofisial', atlet: 'Atlet', ofisial: 'Ofisial' } as Record<string, string>)[r ?? ''] ?? '—'; }
function whenLabel(w?: string) { return ({ always: 'Selalu', borrowed_only: 'Atlet pinjaman' } as Record<string, string>)[w ?? ''] ?? '—'; }
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--c    { text-align: center; width: 80px; }
.dt-th--actions { text-align: right; width: 100px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--muted { color: var(--color-text-muted); font-size: 12.5px; }
.dt-td--c    { text-align: center; }
.dt-td--actions { text-align: right; }
.name-cell__name { font-weight: 600; }
.name-cell__desc { display: block; font-size: 11.5px; color: var(--color-text-subtle); margin-top: 2px; }
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
.del-text { font-size: 13.5px; color: var(--color-text-primary); line-height: 1.5; margin: 0; }
</style>
