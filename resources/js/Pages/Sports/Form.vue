<template>
    <SimporaLayout :title="isEdit ? 'Edit Cabor' : 'Tambah Cabor'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Cabor', href: '/sports' }, { label: isEdit ? 'Edit Cabor' : 'Tambah Cabor' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit Cabor' : 'Tambah Cabor' }}</h1>

            <form @submit.prevent="submit">
                <AppCard>
                    <div class="form-grid">
                        <AppInput v-model="form.name" label="Nama Cabor" placeholder="Contoh: Sepak Bola" required :error="errors.name" @input="onNameInput" />
                        <AppInput
                            v-model="form.code"
                            label="Kode Cabor"
                            placeholder="Contoh: SBL"
                            required
                            hint="2–5 huruf kapital, unik"
                            :error="errors.code"
                            @input="onCodeInput"
                        />

                        <div class="form-field">
                            <label class="field-label">Status Aktif</label>
                            <AppToggle v-model="form.is_active" label="Aktif" />
                        </div>
                    </div>

                    <div class="mascot-section">
                        <div class="mascot-head">
                            <label class="field-label">Logo Maskot</label>
                            <button v-if="form.icon" type="button" class="mascot-clear" @click="form.icon = ''">Hapus pilihan</button>
                        </div>
                        <p class="mascot-hint">Pilih maskot yang mewakili cabor ini. Tampil di daftar cabang olahraga.</p>
                        <div class="mascot-grid">
                            <button
                                v-for="m in MASCOTS"
                                :key="m.file"
                                type="button"
                                class="mascot-item"
                                :class="{ 'is-selected': form.icon === m.file }"
                                :title="m.label"
                                @click="form.icon = m.file"
                            >
                                <img :src="maskotUrl(m.file)" :alt="m.label" class="mascot-item__img" loading="lazy" />
                                <span class="mascot-item__label">{{ m.label }}</span>
                            </button>
                        </div>
                    </div>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="goBack">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan Cabor</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { router }      from '@inertiajs/vue3';
import api             from '@/lib/axios';
import { encodeId, decodeId } from '@/lib/hashid';
import { useToast }    from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppToggle     from '@/Components/App/AppToggle.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';
import { MASCOTS, maskotUrl, guessMascot } from '@/config/maskot';

interface Props { id?: string | number }
usePageGuard({ anyRole: ['super_admin'] });
const props   = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const realId  = isEdit.value ? decodeId(props.id as string | number) : NaN;
const loading = ref(false);
const toast   = useToast();
const { notFound } = useNotFound();

const form = reactive({ name: '', code: '', icon: '', is_active: true });
const errors = reactive<Record<string, string>>({});

// Kode cabor: paksa huruf kapital, maks 5 karakter
function onCodeInput() {
    form.code = form.code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
}

// Saat menambah cabor baru, sarankan maskot berdasarkan nama (selama belum dipilih manual).
function onNameInput() {
    if (isEdit.value || form.icon) return;
    const guess = guessMascot(form.name);
    if (guess) form.icon = guess;
}

async function fetchSport() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/sports/${realId}`);
        const s = res.data?.data;
        if (!s) { notFound(); return; }
        form.name      = s.name ?? '';
        form.code      = s.code ?? '';
        form.icon      = s.icon ?? '';
        form.is_active = !!s.is_active;
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error(e?.response?.data?.message ?? 'Gagal memuat data cabor');
    }
}

onMounted(() => { if (isEdit.value) fetchSport(); });

function goBack() {
    if (isEdit.value && !Number.isNaN(realId)) router.visit(`/sports/${encodeId(realId)}`);
    else router.visit('/sports');
}

async function submit() {
    loading.value = true;
    Object.keys(errors).forEach((k) => delete errors[k]);

    const payload = { name: form.name, code: form.code, icon: form.icon || null, is_active: form.is_active };
    try {
        if (isEdit.value) await api.put(`/api/v1/sports/${realId}`, payload);
        else              await api.post('/api/v1/sports', payload);
        toast.success(isEdit.value ? 'Cabor berhasil diperbarui' : 'Cabor berhasil dibuat');
        goBack();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            Object.entries(errs).forEach(([k, v]) => { errors[k] = (v as string[])[0]; });
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan cabor');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 640px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.form-actions{ display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.mascot-section { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--color-border); }
.mascot-head    { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mascot-clear   { font-size: 12px; font-weight: 600; color: var(--color-danger); background: none; border: none; cursor: pointer; padding: 0; }
.mascot-clear:hover { text-decoration: underline; }
.mascot-hint    { font-size: 12px; color: var(--color-text-muted); margin: 4px 0 14px; }
.mascot-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.mascot-item    {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 10px 6px; background: var(--color-bg-subtle);
    border: 2px solid var(--color-border); border-radius: 12px; cursor: pointer;
    transition: border-color .15s ease, transform .15s ease, background .15s ease;
}
.mascot-item:hover { border-color: var(--color-accent); transform: translateY(-2px); }
.mascot-item.is-selected { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.mascot-item__img   { width: 56px; height: 56px; object-fit: contain; }
.mascot-item__label { font-size: 11px; font-weight: 600; color: var(--color-text-secondary, var(--color-text-muted)); text-align: center; line-height: 1.2; }
.mascot-item.is-selected .mascot-item__label { color: var(--color-accent); }
</style>
