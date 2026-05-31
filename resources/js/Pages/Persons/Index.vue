<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Data Pribadi</h1>
                    <p class="page-subtitle">Kelola data pribadi peserta PORA XV</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/persons/create')">
                    + Tambah Person
                </AppButton>
            </div>

            <!-- Filter Bar -->
            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama atau NIK..." />
                    </div>
                    <select v-model="filterGender" class="filter-select">
                        <option value="">Semua Jenis Kelamin</option>
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                    </select>
                    <!-- Provinsi dikunci ke Aceh -->
                    <select class="filter-select" disabled>
                        <option>Aceh</option>
                    </select>
                    <!-- Kabupaten/Kota dalam Aceh (searchable) -->
                    <AppSelectSearch
                        v-model="filterWilayah"
                        class="filter-kab"
                        :options="kabFilterOptions"
                        :loading="loadingKabupaten"
                        placeholder="Pilih kabupaten/kota..."
                        search-placeholder="Cari kabupaten/kota..."
                    />
                </div>

                <!-- Table -->
                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">NIK</th>
                                <th class="dt-th">Nama Lengkap</th>
                                <th class="dt-th">J. Kelamin</th>
                                <th class="dt-th">Usia</th>
                                <th class="dt-th">Kabupaten / Kota</th>
                                <th class="dt-th">No. HP</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Skeleton saat loading -->
                            <template v-if="loading">
                                <tr v-for="i in 5" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 7" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <!-- Data -->
                            <template v-else>
                            <tr v-for="person in persons" :key="person.id" class="dt-row">
                                <td class="dt-td">
                                    <button
                                        type="button"
                                        class="nik-mono nik-toggle"
                                        :title="revealed.has(person.id) ? 'Klik untuk sembunyikan' : 'Klik untuk lihat NIK'"
                                        @click="toggleNik(person.id)"
                                    >
                                        {{ revealed.has(person.id) ? person.nik : maskNik(person.nik) }}
                                    </button>
                                </td>
                                <td class="dt-td dt-td--name">{{ person.nama_lengkap }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="person.jenis_kelamin === 'male' ? 'info' : 'danger'" size="sm">
                                        {{ person.jenis_kelamin === 'male' ? 'L' : 'P' }}
                                    </AppBadge>
                                </td>
                                <td class="dt-td">{{ calcAge(person.tanggal_lahir) }}</td>
                                <td class="dt-td dt-td--kab">{{ kabName(person) }}</td>
                                <td class="dt-td">{{ person.no_hp ?? '—' }}</td>
                                <td class="dt-td dt-td--actions">
                                    <div class="action-btns">
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/persons/${encodeId(person.id)}`)">
                                            <Eye :size="14" />
                                        </AppButton>
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/persons/${encodeId(person.id)}/edit`)">
                                            <Pencil :size="14" />
                                        </AppButton>
                                    </div>
                                </td>
                            </tr>
                            </template>
                        </tbody>
                    </table>

                    <AppEmptyState
                        v-if="!loading && persons.length === 0 && !error"
                        title="Tidak ada data pribadi"
                        description="Tambah person baru atau ubah filter pencarian"
                    />
                    <div v-if="error" class="table-error">
                        <p>{{ error }}</p>
                        <AppButton size="sm" variant="secondary" @click="fetchPersons">Coba lagi</AppButton>
                    </div>
                </div>

                <div class="table-footer">
                    <AppPagination
                        :model-value="page"
                        :total="total"
                        :per-page="perPage"
                        @update:model-value="goToPage"
                        @update:per-page="changePerPage"
                    />
                </div>
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Search, Eye, Pencil } from '@lucide/vue';
import api            from '@/lib/axios';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';
import AppPagination  from '@/Components/App/AppPagination.vue';
import { encodeId } from '@/lib/hashid';

interface Person {
    id: number; nik: string; nama_lengkap: string;
    jenis_kelamin: 'male' | 'female'; tanggal_lahir: string; no_hp: string | null;
    wilayah_kode: string | null;
}

const search       = ref('');
const filterGender = ref('');
const filterWilayah= ref('11');   // dikunci ke Aceh; nilai = kode kabupaten saat dipilih

const persons = ref<Person[]>([]);
const total   = ref(0);
const page    = ref(1);
const perPage = ref(25);
const loading = ref(false);
const error   = ref('');

// ── Daftar kabupaten/kota Aceh untuk filter (provinsi dikunci) ──
const ACEH_KODE = '11';
const kabupatenOptions = ref<{ kode: string; nama: string }[]>([]);
const loadingKabupaten = ref(false);

// Opsi untuk AppSelectSearch: "Semua" + daftar kabupaten
const kabFilterOptions = computed(() => [
    { value: ACEH_KODE, label: 'Semua Kabupaten/Kota' },
    ...kabupatenOptions.value.map(k => ({ value: k.kode, label: k.nama })),
]);

// Map kode kabupaten → nama, untuk kolom Kabupaten/Kota di tabel
const kabMap = computed<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const k of kabupatenOptions.value) m[k.kode] = k.nama;
    return m;
});

// Nama kabupaten dari wilayah_kode (kode pakai titik: prov.kab.kec.desa → 2 segmen awal = kabupaten)
function kabName(person: Person) {
    const kode = person.wilayah_kode;
    if (!kode) return '—';
    const parts = kode.split('.');
    if (parts.length < 2) return '—';
    return kabMap.value[parts.slice(0, 2).join('.')] ?? '—';
}

// ── NIK masking (sensor sebagian, klik untuk lihat penuh) ──────
const revealed = ref<Set<number>>(new Set());
function toggleNik(id: number) {
    const next = new Set(revealed.value);
    next.has(id) ? next.delete(id) : next.add(id);
    revealed.value = next;
}
function maskNik(nik: string) {
    if (!nik) return '—';
    if (nik.length <= 8) return nik;
    return nik.slice(0, 4) + '•'.repeat(nik.length - 8) + nik.slice(-4);
}

// Usia dari tanggal lahir
function calcAge(d: string) {
    if (!d) return '—';
    const birth = new Date(d);
    if (isNaN(birth.getTime())) return '—';
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 0 ? `${age} thn` : '—';
}

async function fetchKabupaten() {
    loadingKabupaten.value = true;
    try {
        const res = await api.get(`/api/v1/wilayah/kabupaten/${ACEH_KODE}`);
        const raw = res.data?.data;
        kabupatenOptions.value = Array.isArray(raw) ? raw : [];
    } catch {
        kabupatenOptions.value = [];
    } finally {
        loadingKabupaten.value = false;
    }
}

// ── Fetch dari API ─────────────────────────────────────────────
async function fetchPersons() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/persons', {
            params: {
                search:        search.value || undefined,
                jenis_kelamin: filterGender.value || undefined,
                wilayah_kode:  filterWilayah.value || undefined,
                page:          page.value,
                per_page:      perPage.value,
            },
        });
        const body = res.data;
        const raw  = body?.data;
        // Tangani dua bentuk: data array langsung ATAU paginator Laravel { data: [...] }
        const list = Array.isArray(raw)
            ? raw
            : (Array.isArray(raw?.data) ? raw.data : []);
        persons.value = list.filter(Boolean);                       // buang elemen null
        total.value   = body?.meta?.total ?? raw?.total ?? persons.value.length;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data person';
        persons.value = [];
        total.value   = 0;
    } finally {
        loading.value = false;
    }
}

// Debounce saat filter berubah → reset ke halaman 1 lalu fetch
let debounce: ReturnType<typeof setTimeout>;
watch([search, filterGender, filterWilayah], () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        page.value = 1;
        fetchPersons();
    }, 350);
});

// Navigasi halaman (dari AppPagination) — fetch hanya jika halaman berubah
function goToPage(p: number) {
    if (p === page.value) return;
    page.value = p;
    fetchPersons();
}

// Ganti jumlah baris per halaman → kembali ke halaman 1
function changePerPage(n: number) {
    perPage.value = n;
    page.value = 1;
    fetchPersons();
}

onMounted(() => {
    fetchKabupaten();
    fetchPersons();
});
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }

.filter-bar   { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); flex-shrink: 0; }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.filter-kab   { width: 230px; }

.table-wrap { overflow-x: auto; }
.dt-table   { width: 100%; border-collapse: collapse; }
.dt-th      { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 80px; }
.dt-row     { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td      { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--name { font-weight: 500; text-transform: capitalize; }
.dt-td--actions { text-align: right; }
.nik-mono   { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted); }
.nik-toggle { border: none; background: transparent; padding: 0; cursor: pointer; letter-spacing: 0.06em; transition: color 100ms; }
.nik-toggle:hover { color: var(--color-text-primary); }
.dt-td--kab { text-transform: capitalize; }
.action-btns{ display: flex; gap: 4px; justify-content: flex-end; }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.table-info   { font-size: 12px; color: var(--color-text-muted); }

/* Skeleton loading */
.sk-bar {
    display: block; height: 14px; border-radius: 5px;
    background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%);
    background-size: 200% 100%; animation: sk-shimmer 1.2s ease-in-out infinite;
}
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Error state */
.table-error { padding: 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.table-error p { font-size: 13px; color: var(--color-danger); margin: 0; }
</style>
