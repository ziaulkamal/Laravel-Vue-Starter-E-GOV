<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Keahlian Juri</h1>
                    <p class="page-subtitle">Kelola keahlian juri per cabang olahraga</p>
                </div>
                <AppButton variant="primary" size="md" @click="showAddModal = true">+ Tambah Keahlian</AppButton>
            </div>

            <AppCard padding="none">
                <div class="filter-bar">
                    <div class="filter-search">
                        <Search :size="15" class="filter-search__icon" />
                        <input v-model="search" class="filter-search__input" placeholder="Cari nama juri..." />
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
                                <th class="dt-th">Nama Juri</th>
                                <th class="dt-th">Email</th>
                                <th class="dt-th">Cabor Keahlian</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="j in filtered" :key="j.id" class="dt-row">
                                <td class="dt-td">
                                    <div class="user-cell">
                                        <AppAvatar :user="{ name: j.name }" size="sm" />
                                        <span class="user-name">{{ j.name }}</span>
                                    </div>
                                </td>
                                <td class="dt-td text-muted">{{ j.email }}</td>
                                <td class="dt-td">
                                    <div class="chip-list">
                                        <AppBadge v-for="cabor in j.cabors" :key="cabor" color="primary" size="sm">{{ cabor }}</AppBadge>
                                    </div>
                                </td>
                                <td class="dt-td dt-td--actions">
                                    <AppButton size="xs" variant="ghost" class="danger-btn"><Trash2 :size="13" /></AppButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <AppEmptyState v-if="!filtered.length" title="Tidak ada data juri" size="sm" />
                </div>
            </AppCard>
        </div>

        <!-- Add Modal -->
        <AppModal v-model:open="showAddModal" title="Tambah Keahlian Juri" size="sm">
            <div class="modal-form">
                <AppSelect v-model="addForm.user_id"  label="Juri (User)"  :options="userOptions" />
                <AppSelect v-model="addForm.sport_id" label="Cabor"        :options="sportOptions" />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showAddModal = false">Batal</AppButton>
                <AppButton variant="primary" :loading="adding" @click="doAdd">Tambahkan</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Trash2 } from '@lucide/vue';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

const search       = ref('');
const filterCabor  = ref('');
const showAddModal = ref(false);
const adding       = ref(false);
const addForm      = ref({ user_id: '', sport_id: '' });

const sports      = [{ id: 1, name: 'Silat' }, { id: 2, name: 'Renang' }, { id: 3, name: 'Atletik' }];
const userOptions = [{ value: '1', label: 'Hasan Basri' }, { value: '2', label: 'Dewi Susanti' }];
const sportOptions= sports.map(s => ({ value: String(s.id), label: s.name }));

const judges = [
    { id: 1, name: 'Hasan Basri',   email: 'hasan@simpora.dev',  cabors: ['Silat', 'Tinju'] },
    { id: 2, name: 'Dewi Susanti',  email: 'dewi@simpora.dev',   cabors: ['Renang'] },
    { id: 3, name: 'Rudi Hartono',  email: 'rudi@simpora.dev',   cabors: ['Atletik', 'Silat'] },
];

const filtered = computed(() => judges.filter(j => {
    const q = search.value.toLowerCase();
    return !q || j.name.toLowerCase().includes(q);
}));

function doAdd() {
    adding.value = true;
    setTimeout(() => { adding.value = false; showAddModal.value = false; }, 800);
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
.dt-th--actions { text-align: right; width: 60px; }
.dt-row      { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.dt-row:hover { background: var(--color-bg-subtle); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.user-cell   { display: flex; align-items: center; gap: 10px; }
.user-name   { font-weight: 500; }
.text-muted  { color: var(--color-text-muted); }
.chip-list   { display: flex; gap: 5px; flex-wrap: wrap; }
.danger-btn  { color: var(--color-danger); }
.modal-form  { display: flex; flex-direction: column; gap: 14px; }
</style>
