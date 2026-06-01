<template>
    <SimporaLayout title="Keahlian Juri">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Keahlian Juri</h1>
                    <p class="page-subtitle">Tetapkan cabang olahraga yang boleh dinilai tiap juri. Hanya juri ber-keahlian cabor terkait yang bisa ditugaskan & menilai pertandingannya.</p>
                </div>
                <AppButton v-if="isSuperAdmin" variant="primary" size="md" @click="openAdd">+ Tambah Keahlian</AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama / email juri..." />
                    </div>
                    <select v-model="filterCabor" class="filter-select">
                        <option value="">Semua Cabor</option>
                        <option v-for="s in sports" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Juri</th>
                                <th class="dt-th">Email</th>
                                <th class="dt-th">Cabor Keahlian</th>
                                <th v-if="isSuperAdmin" class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="n in 4" :key="'sk'+n" class="dt-row">
                                    <td class="dt-td" :colspan="isSuperAdmin ? 4 : 3"><div class="skel" /></td>
                                </tr>
                            </template>
                            <tr v-for="j in filtered" v-else :key="j.user_id" class="dt-row">
                                <td class="dt-td">
                                    <div class="user-cell">
                                        <AppAvatar :user="{ name: j.name }" size="sm" />
                                        <span class="user-name">{{ j.name }}</span>
                                    </div>
                                </td>
                                <td class="dt-td text-muted">{{ j.email }}</td>
                                <td class="dt-td">
                                    <div class="chip-list">
                                        <span v-for="sc in j.scopes" :key="sc.scopeId" class="scope-chip">
                                            {{ sc.sportName }}
                                            <button v-if="isSuperAdmin" class="chip-x" :disabled="removingId === sc.scopeId" title="Hapus keahlian" @click="removeScope(sc)">×</button>
                                        </span>
                                        <span v-if="!j.scopes.length" class="text-muted">—</span>
                                    </div>
                                </td>
                                <td v-if="isSuperAdmin" class="dt-td dt-td--actions">
                                    <AppButton size="xs" variant="ghost" @click="openAdd(j.user_id)"><Plus :size="13" /></AppButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !filtered.length" title="Belum ada keahlian juri" :description="isSuperAdmin ? 'Tambahkan keahlian untuk mulai menugaskan juri ke pertandingan.' : ''" size="sm" />
                    <div v-if="error" class="err-state">
                        Gagal memuat data. <button class="link" @click="fetchAll">Coba lagi</button>
                    </div>
                </div>
            </AppCard>
        </div>

        <!-- Add Modal -->
        <AppModal v-model="showAddModal" title="Tambah Keahlian Juri" size="sm">
            <div class="modal-form">
                <AppSelect v-model="addForm.user_id"  label="Juri (User)" :options="userOptions" :error="addErrors.user_id" />
                <AppSelect v-model="addForm.sport_id" label="Cabor"       :options="sportOptions" :error="addErrors.sport_id" />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showAddModal = false">Batal</AppButton>
                <AppButton variant="primary" :loading="adding" @click="doAdd">Tambahkan</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { Search, Plus } from '@lucide/vue';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import { useAuth }   from '@/Composables/useAuth';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

const toast = useToast();
const { isSuperAdmin } = useAuth();

const loading   = ref(true);
const error     = ref(false);
const scopes    = ref<any[]>([]);
const sports    = ref<any[]>([]);
const users     = ref<any[]>([]);
const search    = ref('');
const filterCabor = ref<string | number>('');
const removingId  = ref<number | null>(null);

const showAddModal = ref(false);
const adding       = ref(false);
const addForm      = reactive({ user_id: '', sport_id: '' });
const addErrors    = reactive<Record<string, string>>({});

// ── Helpers extraction (shape { success, data, meta }) ───────────────────────
function listFrom(res: any): any[] {
    const raw = res?.data?.data;
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    return list.filter(Boolean);
}

async function fetchAll() {
    loading.value = true;
    error.value = false;
    try {
        const [scRes, spRes, usRes] = await Promise.all([
            api.get('/api/v1/judge-scopes', { params: { per_page: 200 } }),
            api.get('/api/v1/sports'),
            api.get('/api/v1/users', { params: { per_page: 200 } }),
        ]);
        scopes.value = listFrom(scRes);
        sports.value = listFrom(spRes);
        users.value  = listFrom(usRes);
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}
onMounted(fetchAll);

// ── Group scopes per juri ────────────────────────────────────────────────────
const grouped = computed(() => {
    const map: Record<number, any> = {};
    for (const s of scopes.value) {
        const uid = s.user_id ?? s.user?.id;
        if (uid == null) continue;
        if (!map[uid]) map[uid] = { user_id: uid, name: s.user?.name ?? '—', email: s.user?.email ?? '', scopes: [] };
        map[uid].scopes.push({ scopeId: s.id, sportId: s.sport_id ?? s.sport?.id, sportName: s.sport?.name ?? '—' });
    }
    return Object.values(map).sort((a: any, b: any) => a.name.localeCompare(b.name));
});

const filtered = computed(() => grouped.value.filter((j: any) => {
    const q = search.value.trim().toLowerCase();
    const okSearch = !q || j.name.toLowerCase().includes(q) || j.email.toLowerCase().includes(q);
    const okCabor  = !filterCabor.value || j.scopes.some((sc: any) => String(sc.sportId) === String(filterCabor.value));
    return okSearch && okCabor;
}));

// ── Options untuk modal ──────────────────────────────────────────────────────
const userOptions  = computed(() => users.value.map((u: any) => ({ value: String(u.id), label: `${u.name} — ${u.email}` })));
const sportOptions = computed(() => sports.value.map((s: any) => ({ value: String(s.id), label: s.name })));

function openAdd(userId?: number) {
    addForm.user_id  = userId ? String(userId) : '';
    addForm.sport_id = '';
    Object.keys(addErrors).forEach(k => delete addErrors[k]);
    showAddModal.value = true;
}

async function doAdd() {
    Object.keys(addErrors).forEach(k => delete addErrors[k]);
    if (!addForm.user_id)  { addErrors.user_id = 'Pilih juri.'; return; }
    if (!addForm.sport_id) { addErrors.sport_id = 'Pilih cabor.'; return; }
    adding.value = true;
    try {
        await api.post('/api/v1/judge-scopes', { user_id: Number(addForm.user_id), sport_id: Number(addForm.sport_id) });
        toast.success('Keahlian juri ditambahkan');
        showAddModal.value = false;
        await fetchAll();
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            for (const k in errs) addErrors[k] = Array.isArray(errs[k]) ? errs[k][0] : String(errs[k]);
            if (!Object.keys(errs).length) toast.error(e.response.data?.message ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menambahkan keahlian');
        }
    } finally {
        adding.value = false;
    }
}

async function removeScope(sc: any) {
    removingId.value = sc.scopeId;
    try {
        await api.delete(`/api/v1/judge-scopes/${sc.scopeId}`);
        toast.success('Keahlian dihapus');
        scopes.value = scopes.value.filter(s => s.id !== sc.scopeId);
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus keahlian');
    } finally {
        removingId.value = null;
    }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; max-width: 640px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
.filter-search__icon  { color: var(--color-text-subtle); }
.filter-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); }
.filter-search__input::placeholder { color: var(--color-text-subtle); }
.filter-select{ border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); font-size: 13px; color: var(--color-text-primary); font-family: var(--font-sans); outline: none; cursor: pointer; }
.table-wrap  { overflow-x: auto; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { text-align: right; width: 60px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.user-cell   { display: flex; align-items: center; gap: 10px; }
.user-name   { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.chip-list   { display: flex; gap: 6px; flex-wrap: wrap; }
.scope-chip  { display: inline-flex; align-items: center; gap: 5px; padding: 3px 4px 3px 10px; border-radius: 999px; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 12px; font-weight: 600; }
.chip-x      { border: none; background: transparent; color: var(--color-accent); width: 18px; height: 18px; border-radius: 50%; font-size: 14px; line-height: 1; cursor: pointer; }
.chip-x:hover:not(:disabled) { background: var(--color-danger); color: #fff; }
.chip-x:disabled { opacity: .4; cursor: default; }
.modal-form  { display: flex; flex-direction: column; gap: 14px; }
.skel        { height: 16px; border-radius: 6px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.err-state   { padding: 20px; text-align: center; font-size: 13px; color: var(--color-text-muted); }
.link        { color: var(--color-accent); background: none; border: none; cursor: pointer; font-weight: 600; }
</style>
