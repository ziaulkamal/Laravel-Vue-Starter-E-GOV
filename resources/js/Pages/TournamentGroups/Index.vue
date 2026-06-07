<template>
    <SimporaLayout title="Grup Pertandingan">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Grup Pertandingan</h1>
                    <p class="page-subtitle">Definisikan daftar grup per sub-cabor (format grup → gugur). Daftar ini menjadi pilihan grup saat membuat jadwal — bukan ketik bebas.</p>
                </div>
                <AppButton v-if="canManage" variant="primary" size="md" :disabled="!selectedCategoryId" @click="openCreate">
                    + Tambah Grup
                </AppButton>
            </div>

            <AppCard>
                <div class="picker">
                    <AppSelectSearch
                        v-model="selectedCategoryId"
                        label="Sub-Cabor (format grup → gugur)"
                        placeholder="Pilih sub-cabor"
                        :loading="loadingCategories"
                        :options="categoryOptions"
                        @change="fetchGroups"
                    />
                </div>
                <p v-if="!loadingCategories && !categoryOptions.length" class="picker-hint">
                    Belum ada sub-cabor berformat <strong>grup → gugur (league_knockout)</strong>. Atur format ini lebih dulu di menu Sub-Cabor.
                </p>
            </AppCard>

            <AppCard v-if="selectedCategoryId" padding="none">
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th dt-th--label">Label</th>
                                <th class="dt-th">Nama Grup</th>
                                <th class="dt-th dt-th--c">Jumlah Laga</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 4" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 4" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="g in groups" :key="g.id" class="dt-row">
                                    <td class="dt-td"><span class="group-label">{{ g.label }}</span></td>
                                    <td class="dt-td dt-td--muted">{{ g.name || '—' }}</td>
                                    <td class="dt-td dt-td--c">{{ g.matches_count ?? '—' }}</td>
                                    <td class="dt-td dt-td--actions">
                                        <div class="action-btns">
                                            <AppButton v-if="canManage" size="xs" variant="ghost" @click="openEdit(g)"><Pencil :size="14" /></AppButton>
                                            <AppButton v-if="canManage" size="xs" variant="ghost" @click="confirmDelete(g)"><Trash2 :size="14" /></AppButton>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !groups.length && !error" title="Belum ada grup" description="Tambahkan grup (mis. A, B, C, D) untuk sub-cabor ini." size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchGroups">Coba lagi</AppButton></div>
                </div>
            </AppCard>
        </div>

        <!-- Modal Tambah / Edit -->
        <AppModal v-model="showForm" :title="editTarget ? 'Edit Grup' : 'Tambah Grup'" size="sm">
            <div class="form-body">
                <AppInput
                    v-model="formLabel"
                    label="Label Grup"
                    placeholder="Contoh: A"
                    hint="1–5 karakter huruf/angka. Otomatis huruf besar."
                    :error="formError.label"
                    @input="formError.label = ''"
                />
                <AppInput
                    v-model="formName"
                    label="Nama Grup (opsional)"
                    placeholder="Contoh: Grup A — Wilayah Barat"
                    :error="formError.name"
                />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showForm = false">Batal</AppButton>
                <AppButton variant="primary" :loading="saving" :disabled="!formLabel.trim()" @click="save">
                    {{ editTarget ? 'Simpan' : 'Tambah' }}
                </AppButton>
            </template>
        </AppModal>

        <!-- Modal Hapus -->
        <AppModal v-model="showDelete" title="Hapus Grup" size="sm">
            <p class="del-text">Hapus <strong>Grup {{ deleteTarget?.label }}</strong>? Tindakan ini ditolak jika grup masih dipakai jadwal pertandingan.</p>
            <template #footer>
                <AppButton variant="secondary" @click="showDelete = false">Batal</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete"><template #icon><Trash2 :size="15" /></template> Hapus</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil, Trash2 } from '@lucide/vue';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import { useAuth }   from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';

interface Option { value: string; label: string }

const toast = useToast();
usePageGuard({ anyRole: ['super_admin', 'panitia_besar'] });
const { can } = useAuth();
const canManage = computed(() => can('matches.manage'));

// ── Sub-cabor (hanya format league_knockout) ──
const categoryOptions   = ref<Option[]>([]);
const loadingCategories  = ref(false);
const selectedCategoryId = ref('');

async function fetchCategories() {
    loadingCategories.value = true;
    try {
        const res = await api.get('/api/v1/sport-categories', { params: { per_page: 300, active_only: 0 } });
        const raw = res.data?.data;
        const list = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
        categoryOptions.value = list
            .filter((c: any) => c.match_format === 'league_knockout')
            .map((c: any) => ({ value: String(c.id), label: c.name }));
    } catch {
        categoryOptions.value = [];
    } finally { loadingCategories.value = false; }
}

// ── Grup ──
const groups  = ref<any[]>([]);
const loading = ref(false);
const error   = ref('');

async function fetchGroups() {
    if (!selectedCategoryId.value) { groups.value = []; return; }
    loading.value = true; error.value = '';
    try {
        const res = await api.get('/api/v1/tournament-groups', { params: { sport_category_id: selectedCategoryId.value } });
        const raw = res.data?.data;
        groups.value = (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat grup';
        groups.value = [];
    } finally { loading.value = false; }
}

onMounted(fetchCategories);

// ── Tambah / Edit ──
const showForm   = ref(false);
const editTarget = ref<any>(null);
const formLabel  = ref('');
const formName   = ref('');
const formError  = ref<{ label?: string; name?: string }>({});
const saving     = ref(false);

function openCreate() {
    editTarget.value = null; formLabel.value = ''; formName.value = ''; formError.value = {};
    showForm.value = true;
}
function openEdit(g: any) {
    editTarget.value = g; formLabel.value = g.label; formName.value = g.name ?? ''; formError.value = {};
    showForm.value = true;
}

async function save() {
    if (!formLabel.value.trim()) return;
    saving.value = true; formError.value = {};
    const payload = {
        sport_category_id: Number(selectedCategoryId.value),
        label: formLabel.value.trim().toUpperCase(),
        name:  formName.value.trim() || null,
    };
    try {
        if (editTarget.value) {
            await api.put(`/api/v1/tournament-groups/${editTarget.value.id}`, { label: payload.label, name: payload.name });
            toast.success('Grup diperbarui');
        } else {
            await api.post('/api/v1/tournament-groups', payload);
            toast.success('Grup ditambahkan');
        }
        showForm.value = false;
        fetchGroups();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            if (errs.label) formError.value.label = errs.label[0];
            if (errs.name)  formError.value.name = errs.name[0];
            if (!errs.label && !errs.name) toast.error(e.response.data?.message ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan grup');
        }
    } finally { saving.value = false; }
}

// ── Hapus ──
const showDelete   = ref(false);
const deleteTarget = ref<any>(null);
const deleting     = ref(false);
function confirmDelete(g: any) { deleteTarget.value = g; showDelete.value = true; }
async function doDelete() {
    if (!deleteTarget.value) return;
    deleting.value = true;
    try {
        await api.delete(`/api/v1/tournament-groups/${deleteTarget.value.id}`);
        toast.success('Grup dihapus');
        showDelete.value = false;
        fetchGroups();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus grup');
    } finally { deleting.value = false; }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; max-width: 640px; line-height: 1.5; }
.picker      { max-width: 420px; }
.picker-hint { margin-top: 12px; font-size: 12.5px; color: var(--color-text-muted); line-height: 1.5; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); background: var(--color-bg-subtle); }
.dt-th--label { width: 100px; }
.dt-th--c     { text-align: center; width: 120px; }
.dt-th--actions { text-align: right; width: 100px; }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 16px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--muted { color: var(--color-text-muted); font-size: 12.5px; }
.dt-td--c    { text-align: center; }
.dt-td--actions { text-align: right; }
.group-label { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 26px; padding: 0 8px; border-radius: 7px; background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 700; font-size: 13px; }
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.form-body   { display: flex; flex-direction: column; gap: 14px; }
.del-text    { font-size: 13.5px; color: var(--color-text-primary); line-height: 1.5; margin: 0; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
