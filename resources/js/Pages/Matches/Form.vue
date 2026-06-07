<template>
    <SimporaLayout :title="isEdit ? 'Edit Jadwal Pertandingan' : 'Buat Jadwal Pertandingan'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Jadwal', href: '/matches' }, { label: isEdit ? 'Edit Jadwal' : 'Buat Jadwal' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit Jadwal Pertandingan' : 'Buat Jadwal Pertandingan' }}</h1>

            <form @submit.prevent="submit">
                <!-- ── Nomor pertandingan ── -->
                <AppCard>
                    <div class="card-title">Nomor Pertandingan</div>
                    <div class="form-grid">
                        <AppSelectSearch
                            v-model="form.sport_id"
                            label="Cabor"
                            placeholder="Pilih cabor"
                            required
                            :disabled="isEdit"
                            :loading="loadingSports"
                            :options="sportOptions"
                            :error="errors.sport_id"
                            @change="onSportChange"
                        />
                        <AppSelectSearch
                            v-model="form.sport_category_id"
                            label="Sub-Cabor"
                            placeholder="Pilih sub-cabor"
                            required
                            :disabled="isEdit || !form.sport_id"
                            :loading="loadingCategories"
                            :options="categoryOptions"
                            :error="errors.sport_category_id"
                            @change="onCategoryChange"
                        />
                    </div>
                    <p v-if="selectedCategory" class="kind-hint">
                        <AppBadge :color="isVersus ? 'info' : 'success'" size="sm">
                            {{ isVersus ? 'Head-to-head' : 'Multi-entry / ranking' }}
                        </AppBadge>
                        <AppBadge v-if="usesBo3" color="warning" size="sm">Best of 3</AppBadge>
                        <span class="kind-hint__text">
                            {{ isVersus
                                ? (usesBo3 ? 'Maksimal 2 kontingen (home/away), hasil per set (BO3).' : 'Maksimal 2 kontingen (home/away).')
                                : 'Banyak kontingen bertanding, hasil diranking.' }}
                        </span>
                    </p>
                </AppCard>

                <!-- ── Jadwal & tempat ── -->
                <AppCard>
                    <div class="card-title">Jadwal &amp; Tempat</div>
                    <div class="form-grid">
                        <AppSelectSearch
                            v-model="form.venue_id"
                            label="Venue"
                            placeholder="Pilih venue"
                            required
                            :loading="loadingVenues"
                            :options="venueOptions"
                            :error="errors.venue_id"
                        />
                        <div class="form-field">
                            <label class="field-label">Tanggal &amp; Waktu <span class="req">*</span></label>
                            <div class="datetime-row">
                                <AppDatePicker v-model="form.date" placeholder="Pilih tanggal" :error="errors.scheduled_at" />
                                <input v-model="form.time" type="time" class="time-input" />
                            </div>
                        </div>
                        <AppInput
                            v-model="form.duration_minutes"
                            type="number"
                            label="Durasi (menit)"
                            placeholder="90"
                            hint="10–480 menit"
                            :error="errors.duration_minutes"
                        />
                        <AppInput
                            v-if="isEdit || !hasStaging"
                            v-model="form.round"
                            label="Ronde / Babak"
                            placeholder="Contoh: Penyisihan Grup A, Final"
                            :error="errors.round"
                        />
                        <AppInput
                            v-if="!isEdit"
                            v-model="form.match_code"
                            label="Kode Pertandingan"
                            placeholder="Kosongkan untuk otomatis"
                            hint="Dibuat otomatis jika kosong"
                            :error="errors.match_code"
                        />
                    </div>
                    <div class="form-field" style="margin-top:16px">
                        <AppTextarea v-model="form.notes" label="Catatan" placeholder="Catatan opsional" :rows="2" :error="errors.notes" />
                    </div>
                </AppCard>

                <!-- ── Fase (grup → gugur) untuk format league_knockout ── -->
                <AppCard v-if="!isEdit && hasStaging">
                    <div class="card-title">Fase Pertandingan</div>
                    <div class="stage-toggle">
                        <button type="button" :class="['stage-opt', { active: form.stage === 'group' }]" @click="form.stage = 'group'">🏁 Penyisihan Grup</button>
                        <button type="button" :class="['stage-opt', { active: form.stage === 'knockout' }]" @click="form.stage = 'knockout'">🏆 Fase Gugur</button>
                    </div>
                    <div class="form-grid" style="margin-top:16px">
                        <AppSelectSearch
                            v-if="form.stage === 'group'"
                            v-model="form.group_label"
                            label="Grup"
                            placeholder="Pilih grup"
                            :loading="loadingGroups"
                            :options="groupOptions"
                            :error="errors.group_label"
                        />
                        <AppSelectSearch
                            v-if="form.stage === 'knockout'"
                            v-model="form.round"
                            label="Ronde Gugur"
                            placeholder="Pilih ronde"
                            :options="ROUND_OPTIONS"
                            :error="errors.round"
                        />
                        <AppInput
                            v-if="form.stage === 'knockout'"
                            v-model="form.bracket_slot"
                            type="number"
                            label="Slot Bagan (opsional)"
                            placeholder="mis. 1"
                            hint="Urutan posisi di bagan"
                            :error="errors.bracket_slot"
                        />
                    </div>
                    <p v-if="form.stage === 'group' && !loadingGroups && !groupOptions.length" class="stage-warn">
                        Belum ada grup untuk sub-cabor ini. Tambahkan dulu di menu
                        <a href="/tournament-groups" class="stage-link">Grup Pertandingan</a>.
                    </p>
                    <p class="stage-note">
                        {{ form.stage === 'knockout'
                            ? 'Laga gugur: skor imbang diselesaikan lewat adu penalti saat input hasil.'
                            : 'Laga grup mengisi klasemen. Grup dipilih dari daftar yang sudah diatur (bukan ketik bebas).' }}
                    </p>
                </AppCard>

                <!-- ── Kontingen (create saja — edit tidak mengubah peserta) ── -->
                <AppCard v-if="!isEdit && selectedCategory">
                    <div class="card-title">Kontingen Peserta</div>

                    <!-- versus: home/away -->
                    <div v-if="isVersus" class="form-grid">
                        <AppSelectSearch
                            v-model="versusHome"
                            label="Kontingen Home"
                            placeholder="Pilih kontingen"
                            :loading="loadingContingents"
                            :options="contingentOptions"
                        />
                        <AppSelectSearch
                            v-model="versusAway"
                            label="Kontingen Away"
                            placeholder="Pilih kontingen"
                            :loading="loadingContingents"
                            :options="awayOptions"
                        />
                    </div>

                    <!-- ranking: tambah banyak -->
                    <div v-else>
                        <div class="ranking-add">
                            <AppSelectSearch
                                v-model="rankingPick"
                                placeholder="Pilih kontingen untuk ditambahkan"
                                :loading="loadingContingents"
                                :options="rankingAvailableOptions"
                            />
                            <AppButton type="button" variant="secondary" size="sm" :disabled="!rankingPick" @click="addRanking">+ Tambah</AppButton>
                        </div>
                        <div v-if="rankingList.length" class="chips">
                            <span v-for="c in rankingList" :key="c.value" class="chip">
                                {{ c.label }}
                                <button type="button" class="chip__x" @click="removeRanking(c.value)">×</button>
                            </span>
                        </div>
                        <p v-else class="chips-empty">Belum ada kontingen ditambahkan.</p>
                    </div>
                    <p v-if="errors.participants" class="field-error">{{ errors.participants }}</p>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="goBack">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">{{ isEdit ? 'Simpan Perubahan' : 'Buat Jadwal' }}</AppButton>
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
import SimporaLayout   from '@/Layouts/SimporaLayout.vue';
import AppCard         from '@/Components/App/AppCard.vue';
import AppButton       from '@/Components/App/AppButton.vue';
import AppInput        from '@/Components/App/AppInput.vue';
import AppTextarea     from '@/Components/App/AppTextarea.vue';
import AppBadge        from '@/Components/App/AppBadge.vue';
import AppBreadcrumb   from '@/Components/App/AppBreadcrumb.vue';
import AppDatePicker   from '@/Components/App/AppDatePicker.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';

interface Option { value: string; label: string }
interface Props { id?: string | number }
const props   = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const realId  = isEdit.value ? decodeId(props.id as string | number) : NaN;
const toast   = useToast();
usePageGuard({ permission: 'matches.manage' });
const { notFound } = useNotFound();

const loading           = ref(false);
const loadingSports     = ref(false);
const loadingCategories = ref(false);
const loadingVenues     = ref(false);
const loadingContingents= ref(false);
const loadingGroups     = ref(false);

const form = reactive({
    sport_id:          '',
    sport_category_id: '',
    venue_id:          '',
    date:              '' as string | null,
    time:              '',
    duration_minutes:  '90' as string | number,
    round:             '',
    stage:             '',
    group_label:       '',
    bracket_slot:      '' as string | number,
    match_code:        '',
    notes:             '',
});
const errors = reactive<Record<string, string>>({});

const sportOptions     = ref<Option[]>([]);
const categoryOptions  = ref<Option[]>([]);
const venueOptions     = ref<Option[]>([]);
const contingentOptions= ref<Option[]>([]);
const groupOptions     = ref<Option[]>([]); // daftar grup (select option) untuk fase grup
const categories       = ref<any[]>([]);   // simpan objek penuh untuk derive kind

// ── Kontingen state ──
const versusHome  = ref('');
const versusAway  = ref('');
const rankingPick = ref('');
const rankingList = ref<Option[]>([]);

const selectedCategory = computed(() => categories.value.find(c => String(c.id) === form.sport_category_id) ?? null);
const isVersus = computed(() => ['score', 'point'].includes(selectedCategory.value?.scoring_type));
const usesBo3  = computed(() => isVersus.value && !!selectedCategory.value?.uses_bo3);
// Format grup → gugur: tampilkan pemilih fase (grup/gugur)
const hasStaging = computed(() => selectedCategory.value?.match_format === 'league_knockout');
const ROUND_OPTIONS: Option[] = [
    { value: '16-besar', label: '16 Besar' },
    { value: '8-besar', label: '8 Besar' },
    { value: 'perempatfinal', label: 'Perempat Final' },
    { value: 'semifinal', label: 'Semifinal' },
    { value: 'perebutan-3', label: 'Perebutan Juara 3' },
    { value: 'final', label: 'Final' },
];

// Away tak boleh sama dengan home
const awayOptions = computed(() => contingentOptions.value.filter(o => o.value !== versusHome.value));
// Ranking: sembunyikan yang sudah ditambahkan
const rankingAvailableOptions = computed(() => {
    const taken = new Set(rankingList.value.map(c => c.value));
    return contingentOptions.value.filter(o => !taken.has(o.value));
});

function addRanking() {
    const opt = contingentOptions.value.find(o => o.value === rankingPick.value);
    if (opt && !rankingList.value.some(c => c.value === opt.value)) rankingList.value.push(opt);
    rankingPick.value = '';
}
function removeRanking(value: string) {
    rankingList.value = rankingList.value.filter(c => c.value !== value);
}

// ── Fetch helpers ──
function extractList(res: any): any[] {
    const raw = res.data?.data;
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    return list.filter(Boolean);
}

async function fetchSports() {
    loadingSports.value = true;
    try {
        const res = await api.get('/api/v1/sports', { params: { per_page: 200 } });
        sportOptions.value = extractList(res).map(s => ({ value: String(s.id), label: s.name }));
    } catch { /* abaikan */ } finally { loadingSports.value = false; }
}

async function fetchCategories(sportId: string) {
    if (!sportId) { categoryOptions.value = []; categories.value = []; return; }
    loadingCategories.value = true;
    try {
        const res = await api.get('/api/v1/sport-categories', { params: { sport_id: sportId, per_page: 200 } });
        const list = extractList(res);
        categories.value = list;
        categoryOptions.value = list.map(c => ({ value: String(c.id), label: c.name }));
    } catch { /* abaikan */ } finally { loadingCategories.value = false; }
}

async function fetchVenues() {
    loadingVenues.value = true;
    try {
        const res = await api.get('/api/v1/venues', { params: { per_page: 200 } });
        venueOptions.value = extractList(res).map(v => ({ value: String(v.id), label: v.name }));
    } catch { /* abaikan */ } finally { loadingVenues.value = false; }
}

async function fetchContingents() {
    loadingContingents.value = true;
    try {
        const res = await api.get('/api/v1/contingents', { params: { per_page: 200 } });
        contingentOptions.value = extractList(res).map(c => ({ value: String(c.id), label: c.name }));
    } catch { /* abaikan */ } finally { loadingContingents.value = false; }
}

async function fetchGroups(categoryId: string) {
    groupOptions.value = [];
    if (!categoryId) return;
    loadingGroups.value = true;
    try {
        const res = await api.get('/api/v1/tournament-groups', { params: { sport_category_id: categoryId } });
        groupOptions.value = extractList(res).map(g => ({
            value: String(g.label),
            label: g.name ? `Grup ${g.label} — ${g.name}` : `Grup ${g.label}`,
        }));
    } catch { /* abaikan */ } finally { loadingGroups.value = false; }
}

function onSportChange() {
    form.sport_category_id = '';
    categoryOptions.value = [];
    fetchCategories(form.sport_id);
}
function onCategoryChange() {
    // reset pilihan kontingen saat sub-cabor berganti (kind bisa berubah)
    versusHome.value = ''; versusAway.value = ''; rankingPick.value = ''; rankingList.value = [];
    // default fase untuk format grup → gugur
    form.stage = hasStaging.value ? 'group' : '';
    form.group_label = '';
    form.bracket_slot = '';
    if (hasStaging.value) { form.round = ''; fetchGroups(form.sport_category_id); }
    else groupOptions.value = [];
}

// ── Edit: muat data match ──
async function fetchMatch() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/matches/${realId}`);
        const m = res.data?.data;
        if (!m) { notFound(); return; }
        if (!['scheduled', 'postponed'].includes(m.status)) {
            toast.error('Hanya pertandingan terjadwal/ditunda yang dapat diedit.');
            router.visit(`/matches/${encodeId(realId)}`);
            return;
        }
        form.sport_id          = String(m.sport_category?.sport_id ?? m.sport_category?.sport?.id ?? '');
        form.sport_category_id = String(m.sport_category_id ?? m.sport_category?.id ?? '');
        form.venue_id          = String(m.venue_id ?? m.venue?.id ?? '');
        form.duration_minutes  = m.duration_minutes ?? 90;
        form.round             = m.round ?? '';
        form.notes             = m.notes ?? '';
        // scheduled_at → date + time (perlakukan sebagai wall-clock, hindari geser zona)
        const raw = String(m.scheduled_at ?? '');
        const sep = raw.includes('T') ? 'T' : ' ';
        const [datePart, timePart] = raw.split(sep);
        form.date = datePart || null;
        form.time = (timePart || '').slice(0, 5);
        // tampilkan label sub-cabor walau opsi tak di-fetch (edit: field disabled)
        if (form.sport_category_id) {
            categories.value = [{ id: Number(form.sport_category_id), name: m.sport_category?.name, scoring_type: m.sport_category?.scoring_type }];
            categoryOptions.value = [{ value: form.sport_category_id, label: m.sport_category?.name ?? '—' }];
        }
        if (form.sport_id) sportOptions.value = [{ value: form.sport_id, label: m.sport_category?.sport?.name ?? 'Cabor' }];
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error(e?.response?.data?.message ?? 'Gagal memuat data pertandingan');
    }
}

onMounted(() => {
    fetchVenues();
    if (isEdit.value) {
        fetchMatch();
    } else {
        fetchSports();
        fetchContingents();
    }
});

function goBack() {
    if (isEdit.value && !Number.isNaN(realId)) router.visit(`/matches/${encodeId(realId)}`);
    else router.visit('/matches');
}

function buildParticipants(): { contingent_id: number; side?: string }[] | undefined {
    if (isVersus.value) {
        const arr: { contingent_id: number; side?: string }[] = [];
        if (versusHome.value) arr.push({ contingent_id: Number(versusHome.value), side: 'home' });
        if (versusAway.value) arr.push({ contingent_id: Number(versusAway.value), side: 'away' });
        return arr.length ? arr : undefined;
    }
    return rankingList.value.length
        ? rankingList.value.map(c => ({ contingent_id: Number(c.value) }))
        : undefined;
}

async function submit() {
    loading.value = true;
    Object.keys(errors).forEach(k => delete errors[k]);

    const scheduled_at = form.date ? `${form.date} ${form.time || '00:00'}` : '';

    try {
        if (isEdit.value) {
            await api.put(`/api/v1/matches/${realId}`, {
                venue_id:         Number(form.venue_id),
                round:            form.round || null,
                scheduled_at,
                duration_minutes: Number(form.duration_minutes) || 90,
                notes:            form.notes || null,
            });
            toast.success('Jadwal berhasil diperbarui');
            router.visit(`/matches/${encodeId(realId)}`);
        } else {
            const payload: Record<string, any> = {
                sport_category_id: Number(form.sport_category_id),
                venue_id:          Number(form.venue_id),
                match_code:        form.match_code || null,
                round:             form.round || null,
                scheduled_at,
                duration_minutes:  Number(form.duration_minutes) || 90,
                notes:             form.notes || null,
                participants:      buildParticipants(),
            };
            // Fase grup/gugur (format league_knockout)
            if (hasStaging.value) {
                payload.stage = form.stage || 'group';
                if (form.stage === 'group')    payload.group_label = form.group_label || null;
                if (form.stage === 'knockout') payload.bracket_slot = form.bracket_slot ? Number(form.bracket_slot) : null;
            }
            await api.post('/api/v1/matches', payload);
            toast.success('Jadwal berhasil dibuat');
            router.visit('/matches');
        }
    } catch (e: any) {
        const status = e?.response?.status;
        if (status === 422) {
            const errs = e.response.data?.errors ?? {};
            Object.entries(errs).forEach(([k, v]) => { errors[k.split('.')[0]] = (v as string[])[0]; });
            toast.error((Object.values(errs)[0] as string[] | undefined)?.[0] ?? 'Data tidak valid');
        } else if (status === 409) {
            toast.error(e.response.data?.message ?? 'Jadwal bentrok (venue/kontingen).');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan jadwal');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
.page-wrap form { display: flex; flex-direction: column; gap: 20px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.card-title  { font-size: 13px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.req         { color: var(--color-danger); }
.datetime-row{ display: flex; gap: 8px; }
.datetime-row > :first-child { flex: 1; }
.time-input  { width: 110px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 8px 10px; background: var(--color-surface); font-size: 13.5px; font-family: var(--font-sans); color: var(--color-text-primary); outline: none; }
.time-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent); }
.kind-hint   { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 12.5px; color: var(--color-text-muted); }
.kind-hint__text { line-height: 1.4; }
.ranking-add { display: flex; gap: 8px; align-items: flex-start; }
.ranking-add > :first-child { flex: 1; }
.chips       { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.chip        { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--color-accent-subtle); color: var(--color-accent); border-radius: 999px; font-size: 12.5px; font-weight: 500; }
.chip__x     { border: none; background: transparent; color: inherit; cursor: pointer; font-size: 16px; line-height: 1; padding: 0; }
.chips-empty { margin-top: 12px; font-size: 12.5px; color: var(--color-text-subtle); }
.field-error { margin-top: 10px; font-size: 11.5px; color: var(--color-danger); }
.form-actions{ display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.stage-toggle { display: flex; gap: 8px; }
.stage-opt   { flex: 1; padding: 12px; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg-subtle); font-size: 13.5px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; transition: border-color .15s ease, background .15s ease, color .15s ease; }
.stage-opt:hover  { border-color: var(--color-accent); }
.stage-opt.active { border-color: var(--color-accent); background: var(--color-accent-subtle); color: var(--color-accent); }
.stage-note  { margin-top: 12px; font-size: 12px; color: var(--color-text-muted); line-height: 1.45; }
.stage-warn  { margin-top: 12px; font-size: 12px; color: var(--color-danger); line-height: 1.45; }
.stage-link  { color: var(--color-accent); font-weight: 600; text-decoration: underline; }
</style>
