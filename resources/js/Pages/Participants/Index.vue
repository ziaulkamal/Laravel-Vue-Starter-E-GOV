<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Peserta</h1>
                    <p class="page-subtitle">{{ total }} peserta PORA XV Aceh Jaya 2026</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/participants/create')">
                    + Daftarkan Peserta
                </AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama atau NIK..." />
                    </div>
                    <select v-model="filterRole" class="filter-select">
                        <option value="">Semua Role</option>
                        <option value="athlete">Atlet</option>
                        <option value="coach">Pelatih</option>
                        <option value="official">Official</option>
                        <option value="manager">Manajer</option>
                    </select>
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama</th>
                                <th class="dt-th">NIK</th>
                                <th class="dt-th">Role</th>
                                <th class="dt-th">Kontingen</th>
                                <th class="dt-th">Cabor</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 6" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 7" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                            <tr v-for="g in groupedParticipants" :key="g.key" class="dt-row">
                                <td class="dt-td">
                                    <div class="name-cell">
                                        <AppAvatar :user="{ name: g.person?.nama_lengkap ?? '' }" size="sm" />
                                        <span class="name-cell__text">{{ g.person?.nama_lengkap ?? '—' }}</span>
                                    </div>
                                </td>
                                <td class="dt-td">
                                    <button
                                        type="button"
                                        class="nik-mono nik-toggle"
                                        :title="revealed.has(g.id) ? 'Klik untuk sembunyikan' : 'Klik untuk lihat NIK'"
                                        @click="toggleNik(g.id)"
                                    >
                                        {{ revealed.has(g.id) ? (g.person?.nik ?? '—') : maskNik(g.person?.nik ?? '') }}
                                    </button>
                                </td>
                                <td class="dt-td">
                                    <div class="badge-wrap">
                                        <AppBadge v-for="r in g.roles" :key="r" :color="roleColor(r)" size="sm">{{ roleLabel(r) }}</AppBadge>
                                    </div>
                                </td>
                                <td class="dt-td">{{ g.contingent?.name ?? '—' }}</td>
                                <td class="dt-td">
                                    <div v-if="g.sports.length" class="badge-wrap">
                                        <AppBadge v-for="s in g.sports" :key="s" color="default" size="sm">{{ s }}</AppBadge>
                                    </div>
                                    <span v-else>—</span>
                                </td>
                                <td class="dt-td">
                                    <AppBadge :color="g.is_active ? 'success' : 'default'" size="sm">
                                        {{ g.is_active ? 'Aktif' : 'Nonaktif' }}
                                    </AppBadge>
                                </td>
                                <td class="dt-td dt-td--actions">
                                    <div class="action-btns">
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/participants/${encodeId(g.id)}`)"><Eye :size="14" /></AppButton>
                                        <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/participants/${encodeId(g.id)}/edit`)"><Pencil :size="14" /></AppButton>
                                    </div>
                                </td>
                            </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !participants.length && !error" title="Tidak ada peserta" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchParticipants">Coba lagi</AppButton></div>
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
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';

const search       = ref('');
const filterRole   = ref('');
const participants = ref<any[]>([]);
const total        = ref(0);
const page         = ref(1);
const perPage      = ref(25);
const loading      = ref(false);
const error        = ref('');

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

async function fetchParticipants() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/participants', {
            params: {
                search: search.value || undefined,
                role:   filterRole.value || undefined,
                page:   page.value,
                per_page: perPage.value,
            },
        });
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        participants.value = list.filter(Boolean);
        total.value = res.data?.meta?.total ?? raw?.total ?? participants.value.length;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data peserta';
        participants.value = [];
    } finally {
        loading.value = false;
    }
}

// Gabung baris dengan orang + kontingen sama → satu baris, role & cabor jadi badge berderet
const groupedParticipants = computed(() => {
    const map = new Map<string, any>();
    for (const p of participants.value) {
        const key = `${p.person_id}-${p.contingent_id}`;
        let g = map.get(key);
        if (!g) {
            g = { key, id: p.id, person: p.person, contingent: p.contingent, roles: [] as string[], sports: [] as string[], is_active: p.is_active };
            map.set(key, g);
        }
        if (p.role && !g.roles.includes(p.role)) g.roles.push(p.role);
        if (p.sport?.name && !g.sports.includes(p.sport.name)) g.sports.push(p.sport.name);
        g.is_active = g.is_active || p.is_active;
    }
    return [...map.values()];
});

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterRole], () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page.value = 1; fetchParticipants(); }, 350);
});

// Navigasi halaman (dari AppPagination) — fetch hanya jika halaman berubah
function goToPage(p: number) {
    if (p === page.value) return;
    page.value = p;
    fetchParticipants();
}
function changePerPage(n: number) {
    perPage.value = n;
    page.value = 1;
    fetchParticipants();
}

onMounted(fetchParticipants);

function roleColor(r: string) {
    const m: Record<string, 'success' | 'info' | 'warning' | 'primary'> = { athlete: 'success', coach: 'info', official: 'warning', manager: 'primary' };
    return m[r] ?? 'default' as 'success';
}
function roleLabel(r: string) {
    const m: Record<string, string> = { athlete: 'Atlet', coach: 'Pelatih', official: 'Official', manager: 'Manajer' };
    return m[r] ?? r;
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 90px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.name-cell   { display: flex; align-items: center; gap: 10px; }
.name-cell__text { font-weight: 500; text-transform: capitalize; }
.nik-mono    { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted); }
.nik-toggle  { border: none; background: transparent; padding: 0; cursor: pointer; letter-spacing: 0.06em; transition: color 100ms; }
.nik-toggle:hover { color: var(--color-text-primary); }
.badge-wrap  { display: flex; flex-wrap: wrap; gap: 5px; }
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.table-info   { font-size: 12px; color: var(--color-text-muted); }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
