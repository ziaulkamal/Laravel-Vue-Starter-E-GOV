<template>
    <SimporaLayout>
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Penginapan', href: '/lodgings' }, { label: lodging?.name ?? 'Detail' }]" />

            <div class="page-header">
                <h1 class="page-title">{{ lodging?.name ?? 'Memuat...' }}</h1>
                <AppButton variant="secondary" size="sm"><Pencil :size="14" /> Edit</AppButton>
            </div>

            <AppTabs v-if="lodging" v-model="activeTab" variant="underline" :tabs="tabs">
                <template #info>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Alamat</span><span class="info-value">{{ lodging.address ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Kapasitas</span><span class="info-value">{{ lodging.capacity ?? '—' }} orang</span></div>
                        <div class="info-item"><span class="info-label">PIC</span><span class="info-value">{{ lodging.pic_name ?? '—' }} · {{ lodging.pic_phone ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Terisi</span>
                            <div class="capacity-bar">
                                <AppProgressBar :value="occupied" :max="lodging.capacity || 1" size="md" color="accent" />
                                <span class="capacity-text">{{ occupied }}/{{ lodging.capacity ?? '—' }}</span>
                            </div>
                        </div>
                    </div>
                </template>

                <template #alokasi>
                    <div class="tab-toolbar">
                        <AppButton variant="primary" size="sm" @click="openAdd">+ Tambah Alokasi</AppButton>
                    </div>
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Kontingen</th>
                                <th class="dt-th">Kamar</th>
                                <th class="dt-th">Jumlah</th>
                                <th class="dt-th">Check-in</th>
                                <th class="dt-th">Check-out</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="a in allocations" :key="a.id" class="dt-row">
                                <td class="dt-td dt-name">{{ a.contingent?.name ?? '—' }}</td>
                                <td class="dt-td">{{ a.room_info ?? '—' }}</td>
                                <td class="dt-td">{{ a.headcount ?? '—' }}</td>
                                <td class="dt-td text-muted">{{ a.check_in ?? '—' }}</td>
                                <td class="dt-td text-muted">{{ a.check_out ?? '—' }}</td>
                                <td class="dt-td dt-td--actions">
                                    <AppButton size="xs" variant="ghost" class="danger-btn" @click="removeAlloc(a.id)"><Trash2 :size="13" /></AppButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!allocations.length" title="Belum ada alokasi" size="sm" />
                </template>
            </AppTabs>
        </div>

        <AppModal v-model:open="showAddModal" title="Tambah Alokasi Kamar" size="sm">
            <div class="modal-form">
                <AppSelect v-model="addForm.contingent_id" label="Kontingen"  :options="kontingenOptions" placeholder="Pilih kontingen..." />
                <AppInput  v-model="addForm.room_info"     label="Info Kamar" placeholder="Contoh: Lantai 2, Kamar 201-210" />
                <AppInput  v-model="addForm.headcount"     label="Jumlah Orang" type="number" />
                <AppInput  v-model="addForm.check_in"      label="Check-in"   type="date" />
                <AppInput  v-model="addForm.check_out"     label="Check-out"  type="date" />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showAddModal = false">Batal</AppButton>
                <AppButton variant="primary" :loading="saving" @click="saveAlloc">Simpan Alokasi</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil, Trash2 } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId }   from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }   from '@/Composables/useToast';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppProgressBar from '@/Components/App/AppProgressBar.vue';
import AppModal       from '@/Components/App/AppModal.vue';
import AppInput       from '@/Components/App/AppInput.vue';
import AppSelect      from '@/Components/App/AppSelect.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
const realId = decodeId(props.id);

const activeTab    = ref('info');
const showAddModal = ref(false);
const saving       = ref(false);
const tabs = [{ key: 'info', label: 'Info' }, { key: 'alokasi', label: 'Alokasi Kamar' }];

const lodging     = ref<any>(null);
const allocations = ref<any[]>([]);
const kontingenOptions = ref<{ value: string; label: string }[]>([]);
const addForm = ref({ contingent_id: '', room_info: '', headcount: '', check_in: '', check_out: '' });

const occupied = computed(() => allocations.value.reduce((s, a) => s + (Number(a.headcount) || 0), 0));

async function fetchLodging() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/lodgings/${realId}`);
        lodging.value = res.data?.data ?? null;
        if (!lodging.value) { notFound(); return; }
        allocations.value = (lodging.value.allocations ?? []).filter(Boolean);
        if (!lodging.value.allocations) fetchAllocations();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    }
}
async function fetchAllocations() {
    try {
        const res = await api.get(`/api/v1/lodgings/${realId}/allocations`);
        const raw = res.data?.data;
        allocations.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch { allocations.value = []; }
}
async function openAdd() {
    showAddModal.value = true;
    if (!kontingenOptions.value.length) {
        try {
            const res = await api.get('/api/v1/contingents', { params: { per_page: 100 } });
            const raw = res.data?.data;
            const list = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
            kontingenOptions.value = list.map((c: any) => ({ value: String(c.id), label: c.name }));
        } catch { /* ignore */ }
    }
}
async function saveAlloc() {
    saving.value = true;
    try {
        await api.post(`/api/v1/lodgings/${realId}/allocations`, {
            contingent_id: addForm.value.contingent_id,
            room_info:     addForm.value.room_info || null,
            headcount:     addForm.value.headcount || null,
            check_in:      addForm.value.check_in || null,
            check_out:     addForm.value.check_out || null,
        });
        toast.success('Alokasi berhasil ditambahkan');
        showAddModal.value = false;
        addForm.value = { contingent_id: '', room_info: '', headcount: '', check_in: '', check_out: '' };
        fetchAllocations();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menambah alokasi');
    } finally { saving.value = false; }
}
async function removeAlloc(allocId: number) {
    try {
        await api.delete(`/api/v1/lodgings/${realId}/allocations/${allocId}`);
        toast.success('Alokasi dihapus');
        fetchAllocations();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus alokasi');
    }
}
onMounted(fetchLodging);
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.info-grid   { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.info-item   { display: flex; align-items: center; gap: 12px; }
.info-label  { font-size: 12px; font-weight: 600; color: var(--color-text-muted); width: 100px; flex-shrink: 0; }
.info-value  { font-size: 13.5px; color: var(--color-text-primary); }
.capacity-bar{ display: flex; align-items: center; gap: 10px; flex: 1; }
.capacity-text{ font-size: 12px; color: var(--color-text-muted); white-space: nowrap; }
.tab-toolbar { margin-bottom: 14px; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 60px; }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.dt-name     { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.danger-btn  { color: var(--color-danger); }
.modal-form  { display: flex; flex-direction: column; gap: 14px; }
</style>
