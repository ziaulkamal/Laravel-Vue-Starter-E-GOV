<template>
    <SimporaLayout :title="isEdit ? 'Edit Jenis Berkas' : 'Tambah Jenis Berkas'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Jenis Berkas', href: '/document-types' }, { label: isEdit ? 'Edit' : 'Tambah' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit Jenis Berkas' : 'Tambah Jenis Berkas' }}</h1>

            <form @submit.prevent="submit">
                <AppCard>
                    <div class="form-grid">
                        <AppInput v-model="form.name" label="Nama Berkas" placeholder="Contoh: KTP / Kartu Identitas" required :error="errors.name" />
                        <AppInput v-model="form.description" label="Deskripsi (opsional)" placeholder="Keterangan singkat" :error="errors.description" />

                        <AppSelect v-model="form.applies_to_role" label="Berlaku untuk" :options="roleOptions" :error="errors.applies_to_role" />
                        <AppSelect v-model="form.applies_when" label="Kondisi" :options="whenOptions" :error="errors.applies_when" />

                        <div class="form-field">
                            <label class="field-label">Wajib dilampirkan</label>
                            <AppToggle v-model="form.is_required" label="Wajib" />
                            <p class="field-hint">Jika aktif, berkas ini menentukan kelengkapan & jadi syarat pendaftaran.</p>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Status</label>
                            <AppToggle v-model="form.is_active" label="Aktif" />
                            <p class="field-hint">Berkas nonaktif tidak muncul di checklist peserta.</p>
                        </div>
                    </div>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="goBack">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { router }      from '@inertiajs/vue3';
import api             from '@/lib/axios';
import { decodeId }    from '@/lib/hashid';
import { useToast }    from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import { useAuth }     from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppToggle     from '@/Components/App/AppToggle.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';

interface Props { id?: string | number }
const props   = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const realId  = isEdit.value ? decodeId(props.id as string | number) : NaN;
const loading = ref(false);
const toast   = useToast();
usePageGuard({ anyRole: ['super_admin', 'panitia_besar'] });
const { notFound } = useNotFound();
const { isSuperAdmin, hasRole } = useAuth();

const form = reactive({
    name: '', description: '', applies_to_role: 'semua', applies_when: 'always',
    is_required: true, is_active: true,
});
const errors = reactive<Record<string, string>>({});

const roleOptions = [
    { value: 'semua',   label: 'Atlet & Ofisial' },
    { value: 'atlet',   label: 'Atlet saja' },
    { value: 'ofisial', label: 'Ofisial saja' },
];
const whenOptions = [
    { value: 'always',        label: 'Selalu' },
    { value: 'borrowed_only', label: 'Khusus atlet pinjaman' },
];

async function fetchType() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/document-types/${realId}`);
        const t = res.data?.data;
        if (!t) { notFound(); return; }
        form.name            = t.name ?? '';
        form.description     = t.description ?? '';
        form.applies_to_role = t.applies_to_role ?? 'semua';
        form.applies_when    = t.applies_when ?? 'always';
        form.is_required     = !!t.is_required;
        form.is_active       = !!t.is_active;
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error(e?.response?.data?.message ?? 'Gagal memuat data');
    }
}

onMounted(() => {
    if (!isSuperAdmin.value && !hasRole('panitia_besar')) { router.visit('/dashboard'); return; }
    if (isEdit.value) fetchType();
});

function goBack() { router.visit('/document-types'); }

async function submit() {
    loading.value = true;
    Object.keys(errors).forEach((k) => delete errors[k]);

    const payload: Record<string, any> = {
        name:            form.name,
        description:     form.description || null,
        applies_to_role: form.applies_to_role,
        applies_when:    form.applies_when,
        is_required:     form.is_required,
        is_active:       form.is_active,
    };

    try {
        if (isEdit.value) await api.put(`/api/v1/document-types/${realId}`, payload);
        else              await api.post('/api/v1/document-types', payload);
        toast.success(isEdit.value ? 'Jenis berkas diperbarui' : 'Jenis berkas dibuat');
        goBack();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            Object.entries(errs).forEach(([k, v]) => { errors[k] = (v as string[])[0]; });
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.field-hint  { font-size: 11px; color: var(--color-text-muted); margin: 2px 0 0; line-height: 1.4; }
.form-actions{ display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
