<template>
    <SimporaLayout :title="isEdit ? 'Edit Kontingen' : 'Tambah Kontingen'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Kontingen', href: '/contingents' }, { label: isEdit ? 'Edit Kontingen' : 'Tambah Kontingen' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit Kontingen' : 'Tambah Kontingen' }}</h1>

            <form @submit.prevent="submit">
                <AppCard>
                    <div class="form-grid">
                        <AppInput v-model="form.name" label="Nama Kontingen" placeholder="Contoh: Kabupaten Aceh Barat" required :error="errors.name" />
                        <AppInput
                            v-model="form.short_name"
                            label="Singkatan"
                            placeholder="Contoh: ABAR"
                            required
                            hint="Maks. 10 karakter, otomatis huruf kapital"
                            :error="errors.short_name"
                            @input="form.short_name = (form.short_name || '').toUpperCase()"
                        />

                        <div class="form-field">
                            <AppSelectSearch
                                v-model="form.wilayah_kode"
                                label="Kabupaten / Kota"
                                placeholder="Pilih kabupaten/kota"
                                search-placeholder="Cari kabupaten/kota..."
                                :options="kabOptions"
                                :error="errors.wilayah_kode"
                            />
                            <p class="field-hint">Daerah yang sudah dipakai kontingen lain tidak ditampilkan — satu daerah hanya untuk satu kontingen.</p>
                        </div>

                        <AppInput v-model="form.contact_person" label="Narahubung (PIC)" placeholder="Nama penanggung jawab" :error="errors.contact_person" />
                        <AppInput v-model="form.contact_phone" label="No. HP Narahubung" placeholder="08xxxxxxxxxx" :error="errors.contact_phone" />

                        <div class="form-field">
                            <label class="field-label">Status</label>
                            <AppToggle v-model="form.is_active" label="Aktif" />
                        </div>
                        <div class="form-field">
                            <label class="field-label">Tuan Rumah</label>
                            <AppToggle
                                v-model="form.is_host"
                                label="Kontingen tuan rumah event"
                                description="Hanya satu kontingen — mengaktifkan ini otomatis melepas tuan rumah lain."
                            />
                        </div>
                    </div>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="goBack">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">{{ isEdit ? 'Simpan Perubahan' : 'Simpan Kontingen' }}</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { router }      from '@inertiajs/vue3';
import api             from '@/lib/axios';
import { decodeId, encodeId } from '@/lib/hashid';
import { useToast }    from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout   from '@/Layouts/SimporaLayout.vue';
import AppCard         from '@/Components/App/AppCard.vue';
import AppButton       from '@/Components/App/AppButton.vue';
import AppInput        from '@/Components/App/AppInput.vue';
import AppToggle       from '@/Components/App/AppToggle.vue';
import AppBreadcrumb   from '@/Components/App/AppBreadcrumb.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';

interface Props { id?: string | number }
const props = defineProps<Props>();
const toast = useToast();
usePageGuard({ anyPermission: ['contingents.create', 'contingents.update'] });
const { notFound } = useNotFound();

const isEdit = computed(() => props.id != null && props.id !== '');
const realId = computed(() => (isEdit.value ? decodeId(props.id as string) : NaN));

const loading = ref(false);
const errors  = reactive<Record<string, string>>({});
const allKab  = ref<{ value: string; label: string }[]>([]);
const usedCodes = ref<Set<string>>(new Set());

// Sembunyikan daerah yang sudah dipakai kontingen lain; daerah milik kontingen ini (edit) tetap muncul.
const kabOptions = computed(() =>
    allKab.value.filter(o => !usedCodes.value.has(o.value) || o.value === form.wilayah_kode)
);

const form = reactive({
    name: '',
    short_name: '',
    wilayah_kode: '',
    contact_person: '',
    contact_phone: '',
    is_active: true,
    is_host: false,
});

async function loadKabupaten() {
    try {
        // Provinsi Aceh = 11 (event PORA Aceh). Kontingen = kabupaten/kota Aceh.
        const res = await api.get('/api/v1/wilayah/kabupaten/11');
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        allKab.value = list.filter(Boolean).map((w: any) => ({ value: w.kode, label: w.nama }));
    } catch { allKab.value = []; }
}

async function loadUsedCodes() {
    try {
        // Ambil semua kontingen (termasuk non-aktif) untuk tahu daerah yang sudah terpakai.
        const res = await api.get('/api/v1/contingents', { params: { active_only: 0 } });
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        usedCodes.value = new Set(list.filter(Boolean).map((c: any) => c.wilayah_kode).filter(Boolean));
    } catch { usedCodes.value = new Set(); }
}

async function loadExisting() {
    if (!isEdit.value) return;
    if (Number.isNaN(realId.value)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/contingents/${realId.value}`);
        const c = res.data?.data;
        if (!c) { notFound(); return; }
        form.name           = c.name ?? '';
        form.short_name     = c.short_name ?? '';
        form.wilayah_kode   = c.wilayah_kode ?? '';
        form.contact_person = c.contact_person ?? '';
        form.contact_phone  = c.contact_phone ?? '';
        form.is_active      = !!c.is_active;
        form.is_host        = !!c.is_host;
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error('Gagal memuat data kontingen');
    }
}

onMounted(async () => { await Promise.all([loadKabupaten(), loadUsedCodes(), loadExisting()]); });

async function submit() {
    Object.keys(errors).forEach(k => delete errors[k]);
    loading.value = true;
    const payload = {
        name: form.name,
        short_name: form.short_name,
        wilayah_kode: form.wilayah_kode || null,
        contact_person: form.contact_person || null,
        contact_phone: form.contact_phone || null,
        is_active: form.is_active,
        is_host: form.is_host,
    };
    try {
        let id = realId.value;
        if (isEdit.value) {
            await api.put(`/api/v1/contingents/${realId.value}`, payload);
            toast.success('Kontingen diperbarui');
        } else {
            const res = await api.post('/api/v1/contingents', payload);
            id = res.data?.data?.id ?? NaN;
            toast.success('Kontingen ditambahkan');
        }
        router.visit(Number.isNaN(id) ? '/contingents' : `/contingents/${encodeId(id)}`);
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            for (const k in errs) errors[k] = Array.isArray(errs[k]) ? errs[k][0] : String(errs[k]);
            toast.error('Periksa kembali isian form');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan kontingen');
        }
    } finally {
        loading.value = false;
    }
}

function goBack() {
    if (isEdit.value && !Number.isNaN(realId.value)) router.visit(`/contingents/${encodeId(realId.value)}`);
    else router.visit('/contingents');
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.form-grid   { display: flex; flex-direction: column; gap: 18px; }
.form-field  { display: flex; flex-direction: column; gap: 7px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.field-hint  { font-size: 11.5px; line-height: 1.5; color: var(--color-text-subtle); margin-top: 2px; }
.form-actions{ display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
</style>
