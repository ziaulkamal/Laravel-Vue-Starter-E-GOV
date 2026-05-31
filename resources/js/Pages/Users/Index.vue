<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Manajemen User</h1>
                    <p class="page-subtitle">Kelola akun pengguna sistem SIMPORA</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/users/create')">+ Tambah User</AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama atau email..." />
                    </div>
                    <select v-model="filterRole"   class="filter-select"><option value="">Semua Role</option><option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option></select>
                    <select v-model="filterStatus" class="filter-select"><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
                </div>

                <div class="table-wrap">
                    <table class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama</th>
                                <th class="dt-th">Email</th>
                                <th class="dt-th">Role</th>
                                <th class="dt-th">Kontingen</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr v-for="i in 5" :key="`sk-${i}`" class="dt-row">
                                    <td class="dt-td" v-for="c in 6" :key="c"><span class="sk-bar" /></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="u in users" :key="u.id" class="dt-row">
                                    <td class="dt-td">
                                        <div class="user-cell">
                                            <AppAvatar :user="{ name: u.name }" size="sm" />
                                            <span class="user-name">{{ u.name }}</span>
                                        </div>
                                    </td>
                                    <td class="dt-td text-muted">{{ u.email }}</td>
                                    <td class="dt-td">
                                        <div class="chip-list">
                                            <AppBadge v-for="r in u.roles" :key="r" :color="roleColor(r)" size="sm">{{ roleLabel(r) }}</AppBadge>
                                        </div>
                                    </td>
                                    <td class="dt-td">{{ u.kontingen ?? '—' }}</td>
                                    <td class="dt-td">
                                        <AppBadge :color="u.is_active ? 'success' : 'default'" size="sm">
                                            {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
                                        </AppBadge>
                                    </td>
                                    <td class="dt-td dt-td--actions">
                                        <div class="action-btns">
                                            <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/users/${encodeId(u.id)}/edit`)"><Pencil :size="13" /></AppButton>
                                            <AppButton size="xs" variant="ghost" @click="askDelete(u)"><Trash2 :size="13" /></AppButton>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!loading && !users.length && !error" title="Tidak ada user" size="sm" />
                    <div v-if="error" class="state-error"><p>{{ error }}</p><AppButton size="sm" variant="secondary" @click="fetchUsers">Coba lagi</AppButton></div>
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

        <AppModal v-model:open="confirmDelete" title="Hapus User" size="sm">
            <p style="font-size:13.5px; color:var(--color-text-muted)">
                Hapus akun <strong>{{ deleteTarget?.name }}</strong> ({{ deleteTarget?.email }})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="confirmDelete = false">Batal</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete">Hapus</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Search, Pencil, Trash2 } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import { useToast }  from '@/Composables/useToast';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import AppPagination from '@/Components/App/AppPagination.vue';

interface UserRow {
    id: number; name: string; email: string;
    roles: string[]; kontingen: string | null; is_active: boolean;
}

const toast = useToast();

const search       = ref('');
const filterRole   = ref('');
const filterStatus = ref('');

const users   = ref<UserRow[]>([]);
const total   = ref(0);
const page    = ref(1);
const perPage = ref(25);
const loading = ref(false);
const error   = ref('');

const roles = [
    { value: 'super_admin',      label: 'Super Admin' },
    { value: 'panitia_besar',    label: 'Panitia Besar' },
    { value: 'admin_kontingen',  label: 'Admin Kontingen' },
    { value: 'admin_penilaian',  label: 'Admin Penilaian' },
    { value: 'admin_venue',      label: 'Admin Venue' },
    { value: 'viewer',           label: 'Viewer' },
];

async function fetchUsers() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/users', {
            params: {
                search: search.value || undefined,
                role:   filterRole.value || undefined,
                status: filterStatus.value || undefined,
                page:   page.value,
                per_page: perPage.value,
            },
        });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        users.value = list.filter(Boolean);
        total.value = res.data?.meta?.total ?? raw?.total ?? users.value.length;
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data user';
        users.value = [];
        total.value = 0;
    } finally {
        loading.value = false;
    }
}

let debounce: ReturnType<typeof setTimeout>;
watch([search, filterRole, filterStatus], () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page.value = 1; fetchUsers(); }, 350);
});

function goToPage(p: number) {
    if (p === page.value) return;
    page.value = p;
    fetchUsers();
}
function changePerPage(n: number) {
    perPage.value = n;
    page.value = 1;
    fetchUsers();
}

onMounted(fetchUsers);

// ── Delete ────────────────────────────────────────────────────
const confirmDelete = ref(false);
const deleteTarget  = ref<UserRow | null>(null);
const deleting      = ref(false);

function askDelete(u: UserRow) {
    deleteTarget.value  = u;
    confirmDelete.value = true;
}
async function doDelete() {
    if (!deleteTarget.value) return;
    deleting.value = true;
    try {
        await api.delete(`/api/v1/users/${deleteTarget.value.id}`);
        toast.success('User berhasil dihapus');
        confirmDelete.value = false;
        fetchUsers();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus user');
    } finally {
        deleting.value = false;
    }
}

function roleColor(r: string) {
    const m: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'default'> = {
        super_admin: 'primary', panitia_besar: 'info', admin_kontingen: 'success',
        admin_penilaian: 'warning', admin_venue: 'info', viewer: 'default',
    };
    return m[r] ?? 'default';
}
function roleLabel(r: string) {
    return roles.find(x => x.value === r)?.label ?? r;
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.filter-bar  { display: flex; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.filter-search{ display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 7px 10px; background: var(--color-bg-subtle); }
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
.user-cell   { display: flex; align-items: center; gap: 10px; }
.user-name   { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.chip-list   { display: flex; gap: 5px; flex-wrap: wrap; }
.action-btns { display: flex; gap: 4px; justify-content: flex-end; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.table-footer { padding: 10px 16px; border-top: 1px solid var(--color-border); }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
