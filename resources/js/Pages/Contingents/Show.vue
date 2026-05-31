<template>
    <SimporaLayout>
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Kontingen', href: '/contingents' }, { label: contingent?.name ?? 'Detail' }]" />

            <!-- Loading -->
            <AppCard v-if="loading">
                <div class="contingent-header">
                    <span class="sk-logo" />
                    <div style="flex:1; display:flex; flex-direction:column; gap:8px">
                        <span class="sk-bar" style="width:180px; height:18px" />
                        <span class="sk-bar" style="width:120px" />
                    </div>
                </div>
            </AppCard>

            <template v-else-if="contingent">
                <!-- Header -->
                <AppCard>
                    <div class="contingent-header">
                        <ContingentLogo :contingent="contingent" :size="64" :radius="16" />
                        <div class="contingent-meta">
                            <div class="contingent-name">{{ contingent.name }}</div>
                            <div class="contingent-sub">
                                <span>{{ contingent.short_name }}</span>
                                <span class="dot">·</span>
                                <span v-if="contingent.wilayah">{{ contingent.wilayah.nama }}</span>
                                <span class="dot">·</span>
                                <AppBadge :color="contingent.is_active ? 'success' : 'default'" size="sm">
                                    {{ contingent.is_active ? 'Aktif' : 'Tidak Aktif' }}
                                </AppBadge>
                            </div>
                            <div class="contingent-pic">
                                PIC: {{ contingent.contact_person ?? '—' }} · {{ contingent.contact_phone ?? '—' }}
                            </div>
                        </div>
                        <div class="contingent-actions">
                            <button type="button" class="act-btn act-edit" @click="$inertia.visit(`/contingents/${encodeId(realId)}/edit`)">
                                <Pencil :size="15" /> <span>Edit</span>
                            </button>
                            <button v-if="isSuperAdmin" type="button" class="act-btn act-delete" @click="showDelete = true">
                                <Trash2 :size="15" /> <span>Hapus</span>
                            </button>
                        </div>
                    </div>
                </AppCard>

                <!-- Atlet per cabang olahraga (interaktif) -->
                <AppCard>
                    <div class="stats-head">
                        <h2 class="section-title">Atlet per Cabang Olahraga</h2>
                        <span class="stats-total">Total <b>{{ totalAthletes }}</b> atlet</span>
                    </div>

                    <!-- Chips filter (klik untuk filter per cabor) -->
                    <div class="sport-stats">
                        <button type="button" class="sport-stat" :class="{ active: selectedSport === null }" @click="selectSport(null)">
                            <span class="sport-stat__name">Semua</span>
                            <span class="sport-stat__count">{{ totalAthletes }}</span>
                        </button>
                        <button v-for="s in caborChips" :key="s.id" type="button" class="sport-stat" :class="{ active: selectedSport === s.id }" @click="selectSport(s.id)">
                            <span class="sport-stat__name">{{ s.name }}</span>
                            <span class="sport-stat__count">{{ s.count }}</span>
                        </button>
                    </div>

                    <!-- Search realtime -->
                    <div class="athlete-search">
                        <Search :size="15" class="athlete-search__icon" />
                        <input v-model="athleteSearch" class="athlete-search__input" placeholder="Cari nama atau NIK atlet..." />
                    </div>

                    <!-- Daftar atlet -->
                    <div v-if="filteredAthletes.length" class="athlete-table-wrap">
                        <table class="dt-table">
                            <thead>
                                <tr>
                                    <th class="dt-th">Atlet</th>
                                    <th class="dt-th">NIK</th>
                                    <th class="dt-th">L/P</th>
                                    <th class="dt-th">Usia</th>
                                    <th class="dt-th">Cabor / Nomor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="a in filteredAthletes" :key="a.id" class="dt-row">
                                    <td class="dt-td">
                                        <div class="ath-cell">
                                            <AppAvatar :user="{ name: a.nama ?? '' }" size="sm" />
                                            <span class="dt-name">{{ a.nama ?? '—' }}</span>
                                        </div>
                                    </td>
                                    <td class="dt-td"><span class="nik-mono">{{ a.nik ?? '—' }}</span></td>
                                    <td class="dt-td">{{ a.gender === 'male' ? 'L' : a.gender === 'female' ? 'P' : '—' }}</td>
                                    <td class="dt-td">{{ calcAge(a.tanggal_lahir) }}</td>
                                    <td class="dt-td">
                                        <div class="cat-chips">
                                            <span v-for="c in a.categories" :key="c" class="cat-chip">{{ c }}</span>
                                            <span v-if="!a.categories?.length" class="text-muted">—</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <AppEmptyState v-else :title="emptyTitle" size="sm" />
                </AppCard>
            </template>
        </div>

        <AppModal v-model="showDelete" title="Hapus Kontingen" size="sm">
            <p style="font-size:13px;color:var(--color-text-muted)">
                Yakin menghapus kontingen <strong>{{ contingent?.name }}</strong>? Tindakan ini menghapus kontingen beserta keterkaitannya.
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="showDelete = false">Batal</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete">Hapus</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { router }     from '@inertiajs/vue3';
import { Pencil, Trash2, Search } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId, encodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }   from '@/Composables/useToast';
import { useAuth }    from '@/Composables/useAuth';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppAvatar      from '@/Components/App/AppAvatar.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppModal       from '@/Components/App/AppModal.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
const { isSuperAdmin } = useAuth();
const realId = decodeId(props.id);

const showDelete = ref(false);
const deleting   = ref(false);
async function doDelete() {
    deleting.value = true;
    try {
        await api.delete(`/api/v1/contingents/${realId}`);
        toast.success('Kontingen dihapus');
        router.visit('/contingents');
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus kontingen');
    } finally {
        deleting.value = false;
    }
}

const contingent   = ref<any>(null);
const athletes     = ref<any[]>([]);
const loading      = ref(true);

// Browser atlet interaktif
const selectedSport = ref<number | null>(null);
const athleteSearch = ref('');

const totalAthletes = computed(() => athletes.value.length);

// Hitung jumlah atlet per cabor dari data atlet (sumber tunggal → konsisten dgn daftar).
const caborChips = computed(() => {
    const map: Record<number, { id: number; name: string; count: number }> = {};
    for (const a of athletes.value) {
        for (const s of (a.sports ?? [])) {
            if (!map[s.id]) map[s.id] = { id: s.id, name: s.name, count: 0 };
            map[s.id].count++;
        }
    }
    return Object.values(map).sort((x, y) => x.name.localeCompare(y.name));
});

const filteredAthletes = computed(() => {
    const q = athleteSearch.value.trim().toLowerCase();
    return athletes.value.filter(a => {
        const okSport  = selectedSport.value == null || (a.sports ?? []).some((s: any) => s.id === selectedSport.value);
        const okSearch = !q || (a.nama ?? '').toLowerCase().includes(q) || String(a.nik ?? '').includes(q);
        return okSport && okSearch;
    });
});

const emptyTitle = computed(() => athletes.value.length === 0 ? 'Data atlet belum ada' : 'Tidak ada atlet yang cocok');

function selectSport(id: number | null) {
    selectedSport.value = (id != null && selectedSport.value === id) ? null : id;
}
function calcAge(dob?: string) {
    if (!dob) return '—';
    const d = new Date(dob);
    if (isNaN(d.getTime())) return '—';
    return `${Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))} thn`;
}

async function fetchContingent() {
    if (Number.isNaN(realId)) { notFound(); return; }
    loading.value = true;
    try {
        const res = await api.get(`/api/v1/contingents/${realId}`);
        contingent.value = res.data?.data ?? null;
        if (!contingent.value) { notFound(); return; }
        fetchAthletes();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    } finally {
        loading.value = false;
    }
}

async function fetchAthletes() {
    try {
        const res = await api.get(`/api/v1/contingents/${realId}/athletes`);
        const raw = res.data?.data;
        athletes.value = Array.isArray(raw) ? raw.filter(Boolean) : [];
    } catch { athletes.value = []; }
}

onMounted(fetchContingent);
</script>

<style scoped>
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.contingent-header  { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.contingent-meta    { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.contingent-name    { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
.contingent-sub     { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); flex-wrap: wrap; }
.dot                { color: var(--color-text-subtle); }
.contingent-pic     { font-size: 12.5px; color: var(--color-text-muted); }
.contingent-actions { flex-shrink: 0; display: flex; align-items: center; gap: 10px; }
.act-btn   { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: var(--font-sans); line-height: 1; cursor: pointer; border: 1.5px solid transparent; transition: background .16s ease, color .16s ease, box-shadow .16s ease, transform .1s ease; white-space: nowrap; }
.act-btn:active { transform: translateY(1px); }
.act-edit  { background: var(--color-accent-subtle); color: var(--color-accent); }
.act-edit:hover  { background: var(--color-accent); color: #fff; box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--color-accent) 60%, transparent); }
.act-delete { background: var(--color-danger-light); color: var(--color-danger); }
.act-delete:hover { background: var(--color-danger); color: #fff; box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--color-danger) 55%, transparent); }

.stats-head    { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.section-title { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
.stats-total   { font-size: 12.5px; color: var(--color-text-muted); }
.stats-total b { color: var(--color-text-primary); }
.sport-stats   { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.sport-stat    { display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px 7px 12px; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg-subtle); cursor: pointer; font-family: var(--font-sans); transition: border-color .15s ease, background .15s ease; }
.sport-stat:hover  { border-color: var(--color-accent); }
.sport-stat.active { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.sport-stat__name  { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.sport-stat__count { min-width: 22px; height: 22px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 12px; font-weight: 800; font-family: var(--font-mono); }
.sport-stat.active .sport-stat__count { background: var(--color-accent); color: #fff; }

.athlete-search        { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: 9px; background: var(--color-bg-subtle); margin-bottom: 14px; }
.athlete-search__icon  { color: var(--color-text-subtle); flex-shrink: 0; }
.athlete-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.athlete-search__input::placeholder { color: var(--color-text-subtle); }
.athlete-table-wrap    { overflow-x: auto; }
.ath-cell    { display: flex; align-items: center; gap: 10px; }
.cat-chips   { display: flex; flex-wrap: wrap; gap: 5px; }
.cat-chip    { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--color-accent-subtle); color: var(--color-accent); white-space: nowrap; }
.text-muted  { color: var(--color-text-muted); }

.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); text-align: left; }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-name     { font-weight: 500; text-transform: capitalize; }
.nik-mono    { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted); }

.sk-logo { width: 64px; height: 64px; border-radius: 16px; background: var(--color-bg-subtle); flex-shrink: 0; animation: sk 1.2s ease-in-out infinite; }
.sk-bar  { display: block; height: 12px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk    { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
