<template>
    <SimporaLayout>
        <div class="page-wrap">
            <AppBreadcrumb :items="[
                { label: 'Peserta', href: '/participants' },
                { label: participant ? (participant.person?.nama_lengkap ?? 'Detail') : 'Edit', href: participant ? `/participants/${encodeId(realId)}` : undefined },
                { label: 'Edit' },
            ]" />
            <h1 class="page-title">Edit Peserta</h1>

            <!-- Loading -->
            <AppCard v-if="loadingData">
                <div class="sk-hero">
                    <span class="sk-avatar" />
                    <div class="sk-lines">
                        <span class="sk-bar" style="width:200px; height:18px" />
                        <span class="sk-bar" style="width:140px" />
                    </div>
                </div>
            </AppCard>

            <!-- Error -->
            <AppCard v-else-if="error">
                <div class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchParticipant">Coba lagi</AppButton></div>
            </AppCard>

            <template v-else-if="participant">
                <AppCard>
                    <!-- Person & kontingen (tetap/tidak bisa diubah) -->
                    <div class="fixed-info">
                        <div class="selected-person-preview">
                            <AppAvatar :user="{ name: participant.person?.nama_lengkap ?? '' }" size="md" />
                            <div>
                                <div class="selected-name">{{ participant.person?.nama_lengkap }}</div>
                                <div class="selected-nik nik-mono">{{ participant.person?.nik }}</div>
                            </div>
                        </div>
                        <div class="fixed-kontingen">
                            <span class="fixed-label">Kontingen</span>
                            <span class="fixed-value">{{ participant.contingent?.name ?? '—' }}</span>
                        </div>
                    </div>
                    <p class="fixed-hint">Data pribadi &amp; kontingen tidak dapat diubah. Untuk memindahkan peserta, hapus lalu daftarkan ulang.</p>

                    <AppDivider class="my-4" />

                    <div class="form-grid">
                        <AppSelect v-model="form.role" label="Role" :options="roleOptions" />
                        <AppSelect
                            v-if="needsSport"
                            v-model="form.sport_id"
                            label="Cabang Olahraga"
                            :options="caborOptions"
                            :disabled="loadingCabor"
                            :placeholder="loadingCabor ? 'Memuat cabor...' : 'Pilih cabor...'"
                        />
                        <div class="toggle-field">
                            <span class="field-label">Status</span>
                            <AppToggle v-model="form.is_active" label="Aktif" />
                        </div>
                    </div>
                    <p v-if="!needsSport" class="role-note">
                        Cabang olahraga untuk <strong>Atlet</strong> ditentukan lewat registrasi sub-cabor, bukan di sini.
                    </p>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" @click="$inertia.visit(`/participants/${encodeId(realId)}`)">Batal</AppButton>
                    <AppButton variant="primary" :loading="loading" @click="submit">Simpan Perubahan</AppButton>
                </div>
            </template>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import api            from '@/lib/axios';
import { encodeId, decodeId } from '@/lib/hashid';
import { useToast }   from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppAvatar      from '@/Components/App/AppAvatar.vue';
import AppSelect      from '@/Components/App/AppSelect.vue';
import AppToggle      from '@/Components/App/AppToggle.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppDivider     from '@/Components/App/AppDivider.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const toast = useToast();
const { notFound } = useNotFound();
const realId = decodeId(props.id);

interface Participant {
    id: number; role: string; sport_id: number | null; is_active: boolean;
    person: { id: number; nama_lengkap: string; nik: string } | null;
    contingent: { id: number; name: string; short_name: string } | null;
}

const participant = ref<Participant | null>(null);
const loadingData = ref(true);
const loading     = ref(false);
const error       = ref('');

const form = reactive({ role: 'athlete', sport_id: '', is_active: true });

const roleOptions = [
    { value: 'athlete',  label: 'Atlet' },
    { value: 'coach',    label: 'Pelatih' },
    { value: 'official', label: 'Official' },
    { value: 'manager',  label: 'Manajer' },
];
const needsSport = computed(() => form.role !== 'athlete');

// ── Fetch participant ──────────────────────────────────────────
async function fetchParticipant() {
    if (Number.isNaN(realId)) { notFound(); return; }
    loadingData.value = true;
    error.value = '';
    try {
        const res = await api.get(`/api/v1/participants/${realId}`);
        const p = res.data?.data;
        if (!p) { notFound(); return; }
        participant.value = p;
        form.role      = p.role ?? 'athlete';
        form.sport_id  = p.sport_id != null ? String(p.sport_id) : '';
        form.is_active = !!p.is_active;
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        error.value = e?.response?.data?.message ?? 'Gagal memuat data peserta';
    } finally {
        loadingData.value = false;
    }
}

// ── Cabor ──────────────────────────────────────────────────────
const caborOptions = ref<{ value: string; label: string }[]>([]);
const loadingCabor = ref(false);
async function fetchCabor() {
    loadingCabor.value = true;
    try {
        const res  = await api.get('/api/v1/sports', { params: { per_page: 100 } });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        caborOptions.value = list.filter(Boolean).map((s: any) => ({ value: String(s.id), label: s.name }));
    } catch { caborOptions.value = []; }
    finally { loadingCabor.value = false; }
}

// Jika ganti ke Atlet, kosongkan sport
watch(needsSport, (need) => { if (!need) form.sport_id = ''; });

onMounted(() => {
    fetchParticipant();
    fetchCabor();
});

// ── Submit ─────────────────────────────────────────────────────
async function submit() {
    loading.value = true;
    const payload: Record<string, any> = {
        role:      form.role,
        // Atlet → sport via registrasi sub-cabor (null). Non-atlet → kirim pilihan (boleh null, backend mengizinkan).
        sport_id:  needsSport.value ? (form.sport_id ? Number(form.sport_id) : null) : null,
        is_active: form.is_active,
    };
    try {
        await api.put(`/api/v1/participants/${realId}`, payload);
        toast.success('Perubahan peserta berhasil disimpan');
        router.visit('/participants');
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? e.response.data?.message ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan perubahan');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }

.fixed-info { display: flex; gap: 16px; flex-wrap: wrap; align-items: stretch; }
.selected-person-preview { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--color-accent-subtle); border-radius: 10px; border: 1.5px solid color-mix(in srgb, var(--color-accent) 20%, transparent); }
.selected-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); text-transform: capitalize; }
.selected-nik  { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.fixed-kontingen { display: flex; flex-direction: column; justify-content: center; gap: 3px; padding: 12px 16px; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg-subtle); min-width: 180px; }
.fixed-label { font-size: 11px; font-weight: 600; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; }
.fixed-value { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.fixed-hint  { font-size: 11.5px; color: var(--color-text-subtle); margin: 10px 2px 0; }

.form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.toggle-field { display: flex; flex-direction: column; gap: 7px; }
.field-label  { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.role-note { font-size: 11.5px; color: var(--color-text-subtle); margin: 2px; }

.nik-mono   { font-family: var(--font-mono); font-size: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.my-4 { margin: 20px 0; }

.state-error { padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
.sk-hero   { display: flex; gap: 18px; align-items: center; }
.sk-lines  { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-avatar { width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; background: var(--color-bg-subtle); animation: sk 1.2s ease-in-out infinite; }
.sk-bar    { display: block; height: 14px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk    { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
