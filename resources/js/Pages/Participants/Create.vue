<template>
    <SimporaLayout title="Daftarkan Peserta">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Peserta', href: '/participants' }, { label: 'Daftarkan Peserta' }]" />
            <h1 class="page-title">Daftarkan Peserta</h1>

            <AppCard>
                <!-- Step 1: Cari Person -->
                <div class="step-section">
                    <div class="step-label">
                        <span class="step-number">1</span>
                        <span class="step-title">Cari Data Pribadi</span>
                    </div>
                    <div class="search-box">
                        <div class="filter-search">
                            <Search :size="15" class="filter-search__icon" />
                            <input v-model="personSearch" class="filter-search__input" placeholder="Cari NIK atau nama..." />
                        </div>
                        <p class="search-hint">
                            Ketik <strong>minimal 4 karakter</strong> (NIK atau nama). Hanya menampilkan data pribadi yang <strong>belum terdaftar</strong> sebagai peserta.
                        </p>
                    </div>

                    <div v-if="searchReady" class="search-results">
                        <!-- Loading -->
                        <template v-if="searching">
                            <div v-for="i in 3" :key="`sk-${i}`" class="result-item">
                                <div class="result-item__info">
                                    <span class="sk-bar" style="width:140px" />
                                    <span class="sk-bar" style="width:90px; height:11px" />
                                </div>
                            </div>
                        </template>
                        <!-- Hasil -->
                        <template v-else-if="personResults.length">
                            <div v-for="p in personResults" :key="p.id"
                                :class="['result-item', selectedPerson?.id === p.id ? 'result-item--selected' : '']"
                                @click="selectPerson(p)">
                                <div class="result-item__main">
                                    <span class="result-item__name cap">{{ p.nama_lengkap }}</span>
                                    <span class="result-item__nik nik-mono">({{ maskNik(p.nik) }})</span>
                                </div>
                                <AppButton v-if="selectedPerson?.id !== p.id" size="xs" variant="secondary">Pilih</AppButton>
                                <AppBadge v-else color="success" size="sm">✓ Terpilih</AppBadge>
                            </div>
                        </template>
                        <!-- Kosong (tak ada yang available & tak ada yang sudah terdaftar) -->
                        <div v-else-if="!existingMatches.length" class="result-empty">
                            Tidak ada data pribadi yang cocok &amp; belum terdaftar.
                        </div>

                        <!-- Sudah terdaftar sebagai peserta lain -->
                        <div v-if="!searching && existingMatches.length" class="result-existing">
                            <!-- Tepat 1 → tampilkan langsung -->
                            <div v-if="existingMatches.length === 1" class="existing-item">
                                <AlertCircle :size="15" class="existing-item__icon" />
                                <span class="existing-item__text">
                                    <strong class="cap">{{ existingMatches[0].name }}</strong>
                                    <span class="nik-mono"> ({{ maskNik(existingMatches[0].nik) }})</span>
                                    sudah terdaftar sebagai <strong>{{ existingMatches[0].roles.map(roleLabel).join(', ') }}</strong>
                                    <template v-if="existingMatches[0].contingent"> di {{ existingMatches[0].contingent }}</template>.
                                </span>
                            </div>

                            <!-- Banyak → ringkas + expand/hide -->
                            <template v-else>
                                <button type="button" class="existing-toggle" @click="showExisting = !showExisting">
                                    <AlertCircle :size="15" class="existing-item__icon" />
                                    <span class="existing-item__text">
                                        Ada <strong>{{ existingMatches.length }}</strong> nama yang sama dan sudah terdaftar
                                    </span>
                                    <span class="existing-toggle__act">
                                        {{ showExisting ? 'Sembunyikan' : 'Lihat' }}
                                        <component :is="showExisting ? ChevronUp : ChevronDown" :size="15" />
                                    </span>
                                </button>
                                <div v-if="showExisting" class="existing-list">
                                    <div v-for="m in existingMatches" :key="m.nik" class="existing-row">
                                        <span class="existing-row__name cap">{{ m.name }}</span>
                                        <span class="existing-row__nik nik-mono">({{ maskNik(m.nik) }})</span>
                                        <span class="existing-row__role">
                                            {{ m.roles.map(roleLabel).join(', ') }}<template v-if="m.contingent"> · {{ m.contingent }}</template>
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <div class="result-new">
                            <Link href="/persons/create" class="result-new__link">+ Buat Person Baru (jika belum ada di sistem)</Link>
                        </div>
                    </div>
                </div>

                <AppDivider class="my-4" />

                <!-- Step 2: Isi Data Peserta -->
                <div class="step-section">
                    <div class="step-label">
                        <span class="step-number">2</span>
                        <span class="step-title">Isi Data Peserta</span>
                    </div>
                    <div v-if="selectedPerson" class="selected-person-preview">
                        <AppAvatar :user="{ name: selectedPerson.nama_lengkap }" size="md" />
                        <div class="selected-info">
                            <div class="selected-name">{{ selectedPerson.nama_lengkap }}</div>
                            <div class="selected-nik nik-mono">{{ maskNik(selectedPerson.nik) }}</div>
                        </div>
                        <button type="button" class="selected-clear" title="Batalkan pilihan" @click="clearSelection">
                            <X :size="15" /> Batalkan
                        </button>
                    </div>
                    <div v-else class="step-placeholder">Pilih data pribadi di Step 1 terlebih dahulu</div>

                    <div class="form-grid" :class="{ 'form-grid--disabled': !selectedPerson }">
                        <AppSelect v-model="form.role" label="Role" :options="roleOptions" :disabled="!selectedPerson" />
                        <AppSelect
                            v-model="form.kontingen_id"
                            label="Kontingen"
                            :options="kontingenOptions"
                            :disabled="!selectedPerson || loadingKontingen"
                            :placeholder="loadingKontingen ? 'Memuat kontingen...' : 'Pilih kontingen...'"
                        />
                        <AppSelect
                            v-if="needsSport"
                            v-model="form.sport_id"
                            label="Cabang Olahraga"
                            :options="caborOptions"
                            :disabled="!selectedPerson || loadingCabor"
                            :placeholder="loadingCabor ? 'Memuat cabor...' : 'Pilih cabor...'"
                        />
                    </div>
                    <p v-if="selectedPerson && !needsSport" class="role-note">
                        Cabang olahraga untuk <strong>Atlet</strong> ditentukan lewat registrasi sub-cabor setelah pendaftaran.
                    </p>

                    <!-- Atlet pinjaman dari daerah lain -->
                    <div v-if="selectedPerson && form.role === 'athlete'" class="borrow-box">
                        <AppToggle v-model="form.is_borrowed" label="Atlet pinjaman dari daerah lain" />
                        <div v-if="form.is_borrowed" class="borrow-fields">
                            <AppSelect v-model="form.origin_contingent_id" label="Kontingen Asal" :options="originOptions" placeholder="Pilih daerah asal atlet..." />
                            <p class="borrow-hint">
                                <Info :size="13" /> Pengajuan dikirim ke <strong>panitia besar</strong> untuk persetujuan. Atlet baru aktif di kontingen ini setelah disetujui & melengkapi berkas pinjaman.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <AppButton variant="secondary" @click="$inertia.visit('/participants')">Batal</AppButton>
                    <AppButton variant="primary" :loading="loading" :disabled="!selectedPerson" @click="submit">
                        {{ isBorrowFlow ? 'Ajukan Peminjaman' : 'Daftarkan Peserta' }}
                    </AppButton>
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Search, AlertCircle, ChevronDown, ChevronUp, X, Info } from '@lucide/vue';
import { router, Link } from '@inertiajs/vue3';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppToggle     from '@/Components/App/AppToggle.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';
import AppDivider    from '@/Components/App/AppDivider.vue';

interface Person { id: number; nama_lengkap: string; nik: string }
interface Option { value: string; label: string; logo?: any }

const toast = useToast();
usePageGuard({ permission: 'participants.create' });

interface ExistingMatch { name: string; nik: string; roles: string[]; contingent: string }

const personSearch    = ref('');
const personResults   = ref<Person[]>([]);
const existingMatches = ref<ExistingMatch[]>([]);
const showExisting    = ref(false);
const searching       = ref(false);
const selectedPerson  = ref<Person | null>(null);
const loading         = ref(false);

function roleLabel(r: string) {
    return ({ athlete: 'Atlet', coach: 'Pelatih', official: 'Official', manager: 'Manajer' } as Record<string, string>)[r] ?? r;
}
/** Sensor NIK: 4 digit awal + bullet + 4 digit akhir (privasi). */
function maskNik(nik: string) {
    if (!nik) return '—';
    if (nik.length <= 8) return nik;
    return nik.slice(0, 4) + '•'.repeat(nik.length - 8) + nik.slice(-4);
}

const form = reactive({ role: 'athlete', kontingen_id: '', sport_id: '', is_borrowed: false, origin_contingent_id: '' });

// Alur peminjaman aktif saat atlet + ditandai pinjaman
const isBorrowFlow = computed(() => form.role === 'athlete' && form.is_borrowed);
// Kontingen asal: semua kontingen kecuali kontingen peminjam yang dipilih
const originOptions = computed(() => kontingenOptions.value.filter(o => o.value !== form.kontingen_id));

const roleOptions = [
    { value: 'athlete',  label: 'Atlet' },
    { value: 'coach',    label: 'Pelatih' },
    { value: 'official', label: 'Official' },
    { value: 'manager',  label: 'Manajer' },
];

// Cabor hanya relevan untuk non-atlet (atlet → via registrasi sub-cabor)
const needsSport = computed(() => form.role !== 'athlete');

// Panel hasil hanya muncul setelah kata kunci cukup panjang (≥4 karakter)
const searchReady = computed(() => personSearch.value.trim().length >= 4);

// ── Cari person (server-side, hanya yang belum terdaftar) ──────
let debounce: ReturnType<typeof setTimeout>;
watch(personSearch, () => {
    clearTimeout(debounce);
    // Pencarian baru jalan setelah minimal 4 karakter (hindari query terlalu lebar).
    if (personSearch.value.trim().length < 4) {
        personResults.value = []; existingMatches.value = []; showExisting.value = false; searching.value = false;
        return;
    }
    searching.value = true;
    debounce = setTimeout(fetchPersons, 350);
});

function extractList(res: any): any[] {
    const raw = res.data?.data;
    return (Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])).filter(Boolean);
}

async function fetchPersons() {
    searching.value = true;
    showExisting.value = false;
    try {
        // Paralel: (1) data pribadi yang BELUM jadi peserta, (2) peserta yang sudah ada
        // dengan kata kunci sama → untuk jelaskan kenapa orang tertentu tak muncul.
        const [availRes, partRes] = await Promise.all([
            api.get('/api/v1/persons', {
                params: { search: personSearch.value || undefined, available_for_participant: 1, per_page: 20 },
            }),
            api.get('/api/v1/participants', {
                params: { search: personSearch.value || undefined, per_page: 20 },
            }),
        ]);

        personResults.value = extractList(availRes);

        // Kelompokkan peserta yang sudah ada per orang (gabung peran berderet).
        const map = new Map<number, ExistingMatch>();
        for (const p of extractList(partRes)) {
            const key = p.person_id ?? p.person?.id;
            if (key == null) continue;
            let g = map.get(key);
            if (!g) {
                g = { name: p.person?.nama_lengkap ?? '—', nik: p.person?.nik ?? '', roles: [], contingent: p.contingent?.name ?? '' };
                map.set(key, g);
            }
            if (p.role && !g.roles.includes(p.role)) g.roles.push(p.role);
        }
        existingMatches.value = [...map.values()];
    } catch {
        personResults.value = [];
        existingMatches.value = [];
    } finally {
        searching.value = false;
    }
}

function selectPerson(p: Person) {
    selectedPerson.value = p;
}

/** Batalkan pilihan person → kembali ke Step 1 untuk memilih ulang. */
function clearSelection() {
    selectedPerson.value = null;
    form.kontingen_id = '';
    form.sport_id = '';
}

// ── Kontingen & Cabor (data asli) ──────────────────────────────
const kontingenOptions = ref<Option[]>([]);
const caborOptions     = ref<Option[]>([]);
const loadingKontingen = ref(false);
const loadingCabor     = ref(false);

async function fetchKontingen() {
    loadingKontingen.value = true;
    try {
        const res  = await api.get('/api/v1/contingents', { params: { per_page: 100 } });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        kontingenOptions.value = list.filter(Boolean).map((c: any) => ({
            value: String(c.id),
            label: c.name,
            logo:  c, // {name, short_name, wilayah_kode} → <ContingentLogo>
        }));
    } catch { kontingenOptions.value = []; }
    finally { loadingKontingen.value = false; }
}

async function fetchCabor() {
    loadingCabor.value = true;
    try {
        const res  = await api.get('/api/v1/sports', { params: { per_page: 100 } });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        caborOptions.value = list.filter(Boolean).map((s: any) => ({
            value: String(s.id),
            label: s.name,
        }));
    } catch { caborOptions.value = []; }
    finally { loadingCabor.value = false; }
}

onMounted(() => {
    fetchKontingen();
    fetchCabor();
});

// ── Submit ─────────────────────────────────────────────────────
async function submit() {
    if (!selectedPerson.value) return;
    if (!form.kontingen_id) { toast.error('Pilih kontingen terlebih dahulu'); return; }
    if (needsSport.value && !form.sport_id) { toast.error('Pilih cabang olahraga untuk role ini'); return; }

    // ── Alur peminjaman: kirim pengajuan (bukan langsung daftarkan) ──
    if (isBorrowFlow.value) {
        if (!form.origin_contingent_id) { toast.error('Pilih kontingen asal atlet pinjaman'); return; }
        loading.value = true;
        try {
            const res = await api.post('/api/v1/participant-borrow-requests', {
                person_id:          selectedPerson.value.id,
                to_contingent_id:   Number(form.kontingen_id),
                from_contingent_id: Number(form.origin_contingent_id),
            });
            toast.success(res.data?.message ?? 'Pengajuan peminjaman terkirim');
            router.visit('/borrow-requests');
        } catch (e: any) {
            const errs = e?.response?.data?.errors ?? {};
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? e?.response?.data?.message ?? 'Gagal mengajukan peminjaman');
            loading.value = false;
        }
        return;
    }

    loading.value = true;
    const payload: Record<string, any> = {
        person_id:     selectedPerson.value.id,
        contingent_id: Number(form.kontingen_id),
        role:          form.role,
        is_active:     true,
    };
    if (needsSport.value) payload.sport_id = Number(form.sport_id);

    try {
        await api.post('/api/v1/participants', payload);
        toast.success('Peserta berhasil didaftarkan');
        router.visit('/participants');
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? e.response.data?.message ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal mendaftarkan peserta');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }

.step-section { display: flex; flex-direction: column; gap: 14px; }
.step-label   { display: flex; align-items: center; gap: 10px; }
.step-number  { width: 26px; height: 26px; border-radius: 50%; background: var(--color-accent); color: white; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-title   { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }

.filter-search{ display: flex; align-items: center; gap: 7px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 9px 12px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.search-hint  { font-size: 11.5px; color: var(--color-text-subtle); margin: 6px 2px 0; }

.search-results { border: 1.5px solid var(--color-border); border-radius: 10px; overflow: hidden; }
.result-item    { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 100ms; }
.result-item:last-child { border-bottom: none; }
.result-item:hover { background: var(--color-bg-subtle); }
.result-item--selected { background: var(--color-accent-subtle); }
.result-item__main { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex-wrap: wrap; }
.result-item__name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); text-transform: capitalize; }
.result-item__nik  { font-size: 12px; color: var(--color-text-muted); }
.result-empty  { padding: 18px 14px; font-size: 12.5px; color: var(--color-text-subtle); text-align: center; border-bottom: 1px solid var(--color-border); }

/* Sudah terdaftar */
.result-existing { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--color-border); background: rgba(245,158,11,.06); }
.existing-item { display: flex; align-items: flex-start; gap: 9px; }
.existing-item__icon { color: #d97706; flex-shrink: 0; margin-top: 1px; }
.existing-item__text { font-size: 12.5px; color: var(--color-text-primary); line-height: 1.5; }

.existing-toggle { display: flex; align-items: center; gap: 9px; width: 100%; padding: 0; background: transparent; border: none; cursor: pointer; text-align: left; }
.existing-toggle__act { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #d97706; white-space: nowrap; }
.existing-list { display: flex; flex-direction: column; gap: 2px; margin-left: 24px; }
.existing-row { display: grid; grid-template-columns: minmax(120px, 1.4fr) minmax(120px, 1fr) minmax(120px, 1.4fr); gap: 10px; align-items: baseline; padding: 7px 0; border-bottom: 1px dashed color-mix(in srgb, #d97706 22%, transparent); }
.existing-row:last-child { border-bottom: none; }
.existing-row__name { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.existing-row__nik  { font-size: 12px; color: var(--color-text-muted); }
.existing-row__role { font-size: 12px; color: var(--color-text-muted); }
@media (max-width: 560px) { .existing-row { grid-template-columns: 1fr; gap: 1px; } }

.cap { text-transform: capitalize; }
.result-new   { padding: 10px 14px; }
.result-new__link { font-size: 13px; color: var(--color-accent); font-weight: 500; }

.selected-person-preview { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--color-accent-subtle); border-radius: 10px; border: 1.5px solid color-mix(in srgb, var(--color-accent) 20%, transparent); }
.selected-info { flex: 1; min-width: 0; }
.selected-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); text-transform: capitalize; }
.selected-nik  { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.selected-clear { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; border: 1.5px solid var(--color-border); background: var(--color-surface); color: var(--color-text-muted); border-radius: 8px; padding: 6px 11px; font-size: 12.5px; font-weight: 500; font-family: var(--font-sans); cursor: pointer; transition: all 120ms ease; }
.selected-clear:hover { border-color: var(--color-danger); color: var(--color-danger); background: rgba(239,68,68,.08); }

.step-placeholder { font-size: 13px; color: var(--color-text-subtle); font-style: italic; }

.form-grid          { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-grid--disabled { opacity: 0.5; pointer-events: none; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.role-note { font-size: 11.5px; color: var(--color-text-subtle); margin: 2px; }
.borrow-box { margin-top: 14px; padding: 14px; border: 1.5px dashed var(--color-border); border-radius: 12px; background: var(--color-bg-subtle); display: flex; flex-direction: column; gap: 12px; }
.borrow-fields { display: flex; flex-direction: column; gap: 8px; }
.borrow-hint { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; color: var(--color-text-muted); line-height: 1.5; margin: 0; }
.borrow-hint svg { flex-shrink: 0; margin-top: 1px; color: #d97706; }

.nik-mono   { font-family: var(--font-mono); font-size: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.my-4 { margin: 20px 0; }

.sk-bar { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
