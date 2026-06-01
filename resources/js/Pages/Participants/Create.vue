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
                        <p class="search-hint">Hanya menampilkan data pribadi yang <strong>belum terdaftar</strong> sebagai peserta.</p>
                    </div>

                    <div v-if="personSearch" class="search-results">
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
                                <div class="result-item__info">
                                    <span class="result-item__name">{{ p.nama_lengkap }}</span>
                                    <span class="result-item__nik nik-mono">{{ p.nik }}</span>
                                </div>
                                <AppButton v-if="selectedPerson?.id !== p.id" size="xs" variant="secondary">Pilih</AppButton>
                                <AppBadge v-else color="success" size="sm">✓ Terpilih</AppBadge>
                            </div>
                        </template>
                        <!-- Kosong -->
                        <div v-else class="result-empty">
                            Tidak ada data pribadi yang cocok &amp; belum terdaftar.
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
                        <div>
                            <div class="selected-name">{{ selectedPerson.nama_lengkap }}</div>
                            <div class="selected-nik nik-mono">{{ selectedPerson.nik }}</div>
                        </div>
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
                </div>

                <div class="form-actions">
                    <AppButton variant="secondary" @click="$inertia.visit('/participants')">Batal</AppButton>
                    <AppButton variant="primary" :loading="loading" :disabled="!selectedPerson" @click="submit">
                        Daftarkan Peserta
                    </AppButton>
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Search } from '@lucide/vue';
import { router, Link } from '@inertiajs/vue3';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';
import AppDivider    from '@/Components/App/AppDivider.vue';

interface Person { id: number; nama_lengkap: string; nik: string }
interface Option { value: string; label: string }

const toast = useToast();

const personSearch   = ref('');
const personResults  = ref<Person[]>([]);
const searching      = ref(false);
const selectedPerson = ref<Person | null>(null);
const loading        = ref(false);

const form = reactive({ role: 'athlete', kontingen_id: '', sport_id: '' });

const roleOptions = [
    { value: 'athlete',  label: 'Atlet' },
    { value: 'coach',    label: 'Pelatih' },
    { value: 'official', label: 'Official' },
    { value: 'manager',  label: 'Manajer' },
];

// Cabor hanya relevan untuk non-atlet (atlet → via registrasi sub-cabor)
const needsSport = computed(() => form.role !== 'athlete');

// ── Cari person (server-side, hanya yang belum terdaftar) ──────
let debounce: ReturnType<typeof setTimeout>;
watch(personSearch, () => {
    clearTimeout(debounce);
    if (!personSearch.value.trim()) { personResults.value = []; searching.value = false; return; }
    searching.value = true;
    debounce = setTimeout(fetchPersons, 350);
});

async function fetchPersons() {
    searching.value = true;
    try {
        const res = await api.get('/api/v1/persons', {
            params: {
                search: personSearch.value || undefined,
                available_for_participant: 1,
                per_page: 20,
            },
        });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        personResults.value = list.filter(Boolean);
    } catch {
        personResults.value = [];
    } finally {
        searching.value = false;
    }
}

function selectPerson(p: Person) {
    selectedPerson.value = p;
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
            label: c.name + (c.short_name ? ` (${c.short_name})` : ''),
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
.result-item__info { display: flex; flex-direction: column; gap: 2px; }
.result-item__name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-transform: capitalize; }
.result-item__nik  { font-size: 11.5px; color: var(--color-text-muted); }
.result-empty  { padding: 18px 14px; font-size: 12.5px; color: var(--color-text-subtle); text-align: center; border-bottom: 1px solid var(--color-border); }
.result-new   { padding: 10px 14px; }
.result-new__link { font-size: 13px; color: var(--color-accent); font-weight: 500; }

.selected-person-preview { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--color-accent-subtle); border-radius: 10px; border: 1.5px solid color-mix(in srgb, var(--color-accent) 20%, transparent); }
.selected-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); text-transform: capitalize; }
.selected-nik  { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

.step-placeholder { font-size: 13px; color: var(--color-text-subtle); font-style: italic; }

.form-grid          { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-grid--disabled { opacity: 0.5; pointer-events: none; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.role-note { font-size: 11.5px; color: var(--color-text-subtle); margin: 2px; }

.nik-mono   { font-family: var(--font-mono); font-size: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.my-4 { margin: 20px 0; }

.sk-bar { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
