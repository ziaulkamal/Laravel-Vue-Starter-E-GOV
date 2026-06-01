<template>
    <SimporaLayout :title="isEdit ? 'Edit Sub-Cabor' : 'Tambah Sub-Cabor'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Cabor', href: '/sports' }, { label: isEdit ? 'Edit Sub-Cabor' : 'Tambah Sub-Cabor' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit Sub-Cabor' : 'Tambah Sub-Cabor' }}</h1>

            <form @submit.prevent="submit">
                <AppCard>
                    <div class="form-grid">
                        <AppSelect v-model="form.sport_id" label="Cabor Induk" :options="caborOptions" :placeholder="loadingCabor ? 'Memuat cabor…' : 'Pilih cabor…'" required :error="errors.sport_id" />
                        <AppInput  v-model="form.name"     label="Nama Kategori" placeholder="Contoh: Kumite 60kg Putra" required :error="errors.name" />

                        <div class="form-field">
                            <label class="field-label">Aturan Gender <span class="required">*</span></label>
                            <div class="radio-row">
                                <AppRadio v-model="form.gender_rule" value="male"   label="Putra" />
                                <AppRadio v-model="form.gender_rule" value="female" label="Putri" />
                                <AppRadio v-model="form.gender_rule" value="mixed"  label="Campuran" />
                            </div>
                        </div>

                        <div class="form-field">
                            <label class="field-label">Tipe Peserta <span class="required">*</span></label>
                            <div class="radio-row">
                                <AppRadio v-model="form.participant_type" value="individual" label="Individual" />
                                <AppRadio v-model="form.participant_type" value="pair"       label="Pasangan" />
                                <AppRadio v-model="form.participant_type" value="team"       label="Beregu" />
                            </div>
                        </div>

                        <AppInput v-if="showPlayerCount" v-model.number="form.min_players" label="Min. Pemain" type="number" min="1" max="50" :error="errors.min_players" />
                        <AppInput v-if="showPlayerCount" v-model.number="form.max_players" label="Maks. Pemain" type="number" min="1" max="50" :error="errors.max_players" />

                        <AppSelect v-model="form.match_format" label="Format Pertandingan" :options="matchFormatOptions" required :error="errors.match_format" />
                        <AppSelect v-model="form.scoring_type" label="Tipe Scoring" :options="scoringOptions" required :error="errors.scoring_type" />
                        <AppInput v-model="form.min_age" label="Usia Min. (opsional)" type="number" min="0" :error="errors.min_age" />
                        <AppInput v-model="form.max_age" label="Usia Maks. (opsional)" type="number" min="0" :error="errors.max_age" />

                        <div class="form-field">
                            <label class="field-label">Status Aktif</label>
                            <AppToggle v-model="form.is_active" label="Aktif" />
                        </div>
                    </div>

                    <!-- Best of 3 — hanya untuk sub-cabor head-to-head (scoring skor/poin) -->
                    <div v-if="isVersus" class="bo3-field">
                        <AppCheckbox v-model="form.uses_bo3" label="Aktifkan format Best of 3 (sistem set)" />
                        <p class="bo3-hint">Pertandingan ditentukan dari kemenangan 2 dari 3 set. Hanya tersedia untuk scoring Skor/Poin.</p>
                    </div>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="goBack">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan Sub-Cabor</AppButton>
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
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppRadio      from '@/Components/App/AppRadio.vue';
import AppToggle     from '@/Components/App/AppToggle.vue';
import AppCheckbox   from '@/Components/App/AppCheckbox.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';

interface Props { id?: string | number }
const props   = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const realId  = isEdit.value ? decodeId(props.id as string | number) : NaN;
const loading = ref(false);
const toast   = useToast();
const { notFound } = useNotFound();

const form = reactive({
    sport_id: '', name: '', gender_rule: 'male', participant_type: 'individual',
    min_players: 1, max_players: 1, match_format: 'final_only',
    scoring_type: 'point', uses_bo3: false, min_age: '', max_age: '', is_active: true,
});
const errors = reactive<Record<string, string>>({});

const showPlayerCount = computed(() => form.participant_type !== 'individual');
// BO3 hanya relevan untuk head-to-head (scoring skor/poin)
const isVersus = computed(() => ['score', 'point'].includes(form.scoring_type));

const matchFormatOptions = [
    { value: 'final_only',      label: 'Final Saja' },
    { value: 'elimination',     label: 'Eliminasi' },
    { value: 'knockout',        label: 'Sistem Gugur' },
    { value: 'league',          label: 'Liga' },
    { value: 'league_knockout', label: 'Liga + Gugur' },
];
const scoringOptions = [
    { value: 'score',    label: 'Skor' },
    { value: 'time',     label: 'Waktu' },
    { value: 'distance', label: 'Jarak' },
    { value: 'point',    label: 'Poin' },
    { value: 'rank',     label: 'Peringkat' },
];

// ── Cabor induk ───────────────────────────────────────────────
const caborOptions = ref<{ value: string; label: string }[]>([]);
const loadingCabor = ref(false);

async function fetchCabor() {
    loadingCabor.value = true;
    try {
        const res = await api.get('/api/v1/sports', { params: { per_page: 100 } });
        const raw = res.data?.data;
        const list = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
        caborOptions.value = list.map((s: any) => ({ value: String(s.id), label: s.name }));
    } catch {
        toast.error('Gagal memuat daftar cabor');
    } finally {
        loadingCabor.value = false;
    }
}

// ── Load existing sub-cabor saat edit ─────────────────────────
async function fetchCategory() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/sport-categories/${realId}`);
        const c = res.data?.data;
        if (!c) { notFound(); return; }
        form.sport_id         = c.sport_id != null ? String(c.sport_id) : '';
        form.name             = c.name ?? '';
        form.gender_rule      = c.gender_rule ?? 'male';
        form.participant_type = c.participant_type ?? 'individual';
        form.min_players      = c.min_players ?? 1;
        form.max_players      = c.max_players ?? 1;
        form.match_format     = c.match_format ?? 'final_only';
        form.scoring_type     = c.scoring_type ?? 'point';
        form.uses_bo3         = !!c.uses_bo3;
        form.min_age          = c.min_age != null ? String(c.min_age) : '';
        form.max_age          = c.max_age != null ? String(c.max_age) : '';
        form.is_active        = !!c.is_active;
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error(e?.response?.data?.message ?? 'Gagal memuat data sub-cabor');
    }
}

onMounted(() => {
    fetchCabor();
    if (isEdit.value) fetchCategory();
});

function goBack() {
    if (form.sport_id) router.visit(`/sports/${encodeId(Number(form.sport_id))}`);
    else router.visit('/sports');
}

async function submit() {
    loading.value = true;
    Object.keys(errors).forEach((k) => delete errors[k]);

    const individual = !showPlayerCount.value;
    const payload: Record<string, any> = {
        sport_id:         Number(form.sport_id),
        name:             form.name,
        gender_rule:      form.gender_rule,
        participant_type: form.participant_type,
        min_players:      individual ? 1 : Number(form.min_players),
        max_players:      individual ? 1 : Number(form.max_players),
        match_format:     form.match_format,
        scoring_type:     form.scoring_type,
        // BO3 dipaksa false jika bukan head-to-head (backend juga menolak)
        uses_bo3:         isVersus.value ? form.uses_bo3 : false,
        min_age:          form.min_age !== '' ? Number(form.min_age) : null,
        max_age:          form.max_age !== '' ? Number(form.max_age) : null,
        is_active:        form.is_active,
    };

    try {
        if (isEdit.value) await api.put(`/api/v1/sport-categories/${realId}`, payload);
        else              await api.post('/api/v1/sport-categories', payload);
        toast.success(isEdit.value ? 'Sub-cabor berhasil diperbarui' : 'Sub-cabor berhasil dibuat');
        goBack();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            Object.entries(errs).forEach(([k, v]) => { errors[k] = (v as string[])[0]; });
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan sub-cabor');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 860px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.required    { color: var(--color-danger); }
.radio-row   { display: flex; gap: 16px; flex-wrap: wrap; }
.bo3-field   { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.bo3-hint    { margin-top: 6px; font-size: 11.5px; color: var(--color-text-muted); line-height: 1.4; }
.form-actions{ display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
