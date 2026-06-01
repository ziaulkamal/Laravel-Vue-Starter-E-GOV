<template>
    <SimporaLayout :title="sport?.name ?? 'Detail Cabor'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Cabor', href: '/sports' }, { label: sport?.name ?? 'Detail' }]" />

            <div class="sport-hero-card">
                <span class="sport-badge">{{ sport?.code ?? '—' }}</span>
                <div class="sport-hero-card__info">
                    <h1 class="page-title">{{ sport?.name ?? 'Memuat...' }}</h1>
                    <div class="sport-hero-card__meta">
                        <span class="sport-code">{{ sport?.code }}</span>
                        <AppBadge v-if="sport" :color="sport.is_active ? 'success' : 'default'" size="sm">
                            {{ sport.is_active ? 'Aktif' : 'Nonaktif' }}
                        </AppBadge>
                        <span class="sport-hero-card__count">{{ categories.length }} sub-cabor</span>
                    </div>
                </div>
                <div class="hero-actions">
                    <button type="button" class="edit-btn" @click="sport && $inertia.visit(`/sports/${encodeId(sport.id)}/edit`)">
                        <Pencil :size="15" />
                        <span>Edit</span>
                    </button>
                    <button
                        type="button"
                        class="del-btn"
                        :disabled="!canDeleteSport"
                        :title="canDeleteSport ? 'Hapus cabor' : 'Hapus dulu seluruh sub-cabor sebelum menghapus cabor'"
                        @click="confirmDeleteSport = true"
                    >
                        <Trash2 :size="15" />
                        <span>Hapus</span>
                    </button>
                </div>
            </div>

            <AppTabs v-model="activeTab" variant="underline" :tabs="tabs">
                <template #subcabor>
                    <div class="tab-toolbar">
                        <span class="tab-toolbar__count">{{ categories.length }} sub-cabor terdaftar</span>
                        <div class="tab-toolbar__actions">
                            <AppButton
                                v-if="isSuperAdmin && categories.length"
                                variant="danger"
                                size="sm"
                                @click="confirmBulkDelete = true"
                            >
                                <template #icon><Trash2 :size="14" /></template>
                                Hapus Semua
                            </AppButton>
                            <AppButton variant="primary" size="sm" @click="$inertia.visit('/sport-categories/create')">
                                + Tambah Sub-Cabor
                            </AppButton>
                        </div>
                    </div>

                    <div v-if="!loadingCat && !categories.length" class="subcabor-empty">
                        <div class="subcabor-empty__icon"><Layers :size="26" /></div>
                        <div class="subcabor-empty__title">Belum ada sub-cabor</div>
                        <p class="subcabor-empty__text">Cabor <strong>{{ sport?.name }}</strong> belum memiliki sub-cabor. Tambahkan untuk mulai mengelola nomor pertandingan.</p>
                        <AppButton variant="primary" size="sm" @click="$inertia.visit('/sport-categories/create')">
                            + Tambah Sub-Cabor
                        </AppButton>
                    </div>

                    <table v-else class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Nama</th>
                                <th class="dt-th">Gender</th>
                                <th class="dt-th">Tipe</th>
                                <th class="dt-th">Min-Max Pemain</th>
                                <th class="dt-th">Usia</th>
                                <th class="dt-th">Scoring</th>
                                <th class="dt-th">Status</th>
                                <th class="dt-th dt-th--actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loadingCat">
                                <tr v-for="i in 3" :key="i" class="dt-row"><td class="dt-td" v-for="c in 8" :key="c"><span class="sk-bar" /></td></tr>
                            </template>
                            <template v-else>
                            <tr v-for="sc in categories" :key="sc.id" class="dt-row">
                                <td class="dt-td dt-name">{{ sc.name }}</td>
                                <td class="dt-td"><AppBadge :color="genderColor(sc.gender_rule)" size="sm">{{ genderLabel(sc.gender_rule) }}</AppBadge></td>
                                <td class="dt-td">{{ typeLabel(sc.participant_type) }}</td>
                                <td class="dt-td">{{ sc.min_players }}–{{ sc.max_players }}</td>
                                <td class="dt-td">{{ sc.min_age ?? '—' }}–{{ sc.max_age ?? '—' }}</td>
                                <td class="dt-td">{{ sc.scoring_type }}</td>
                                <td class="dt-td"><AppBadge :color="sc.is_active ? 'success' : 'default'" size="sm">{{ sc.is_active ? 'Aktif' : 'Nonaktif' }}</AppBadge></td>
                                <td class="dt-td dt-td--actions">
                                    <AppButton size="xs" variant="ghost" @click="$inertia.visit(`/sport-categories/${encodeId(sc.id)}/edit`)"><Pencil :size="13" /></AppButton>
                                </td>
                            </tr>
                            </template>
                        </tbody>
                    </table>
                </template>
            </AppTabs>
        </div>

        <!-- Hapus cabor -->
        <AppModal v-model="confirmDeleteSport" title="Hapus Cabor" size="sm">
            <p class="modal-text">
                Hapus cabor <strong class="cap">{{ sport?.name }}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="confirmDeleteSport = false">Batal</AppButton>
                <AppButton variant="danger" :loading="deletingSport" @click="deleteSport">Hapus</AppButton>
            </template>
        </AppModal>

        <!-- Hapus semua sub-cabor (superadmin) -->
        <AppModal v-model="confirmBulkDelete" title="Hapus Semua Sub-Cabor" size="sm">
            <p class="modal-text">
                Hapus <strong>{{ categories.length }} sub-cabor</strong> dari cabor <strong class="cap">{{ sport?.name }}</strong>?
                Seluruh nomor pertandingan pada cabor ini akan dihapus permanen.
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="confirmBulkDelete = false">Batal</AppButton>
                <AppButton variant="danger" :loading="bulkDeleting" @click="bulkDeleteCategories">
                    {{ bulkDeleting ? `Menghapus ${bulkDone}/${categories.length}…` : 'Hapus Semua' }}
                </AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { router }     from '@inertiajs/vue3';
import { Pencil, Layers, Trash2 } from '@lucide/vue';
import api            from '@/lib/axios';
import { encodeId, decodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }    from '@/Composables/useToast';
import { useAuth }     from '@/Composables/useAuth';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppModal       from '@/Components/App/AppModal.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
const { isSuperAdmin } = useAuth();
const realId = decodeId(props.id);

const activeTab  = ref('subcabor');
const tabs = [{ value: 'subcabor', label: 'Sub-Cabor' }];
const sport      = ref<any>(null);
const categories = ref<any[]>([]);
const loadingCat = ref(true);

// Cabor hanya boleh dihapus jika tidak punya sub-cabor.
const canDeleteSport = computed(() => !loadingCat.value && categories.value.length === 0);

// ── Hapus cabor ───────────────────────────────────────────────
const confirmDeleteSport = ref(false);
const deletingSport      = ref(false);
async function deleteSport() {
    deletingSport.value = true;
    try {
        await api.delete(`/api/v1/sports/${realId}`);
        toast.success('Cabor berhasil dihapus');
        router.visit('/sports');
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus cabor');
        deletingSport.value = false;
    }
}

// ── Hapus semua sub-cabor (superadmin) ────────────────────────
const confirmBulkDelete = ref(false);
const bulkDeleting      = ref(false);
const bulkDone          = ref(0);
async function bulkDeleteCategories() {
    if (!isSuperAdmin.value) { toast.error('Hanya Super Admin yang dapat menghapus seluruh sub-cabor'); return; }
    bulkDeleting.value = true;
    bulkDone.value = 0;
    const targets = [...categories.value];
    let failed = 0;
    for (const sc of targets) {
        try {
            await api.delete(`/api/v1/sport-categories/${sc.id}`);
            bulkDone.value++;
        } catch {
            failed++;
        }
    }
    bulkDeleting.value = false;
    confirmBulkDelete.value = false;
    if (failed) toast.error(`${failed} sub-cabor gagal dihapus`);
    else toast.success('Seluruh sub-cabor berhasil dihapus');
    fetchCategories();
}

async function fetchSport() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/sports/${realId}`);
        sport.value = res.data?.data ?? null;
        if (!sport.value) { notFound(); return; }
        fetchCategories();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    }
}
async function fetchCategories() {
    loadingCat.value = true;
    try {
        const res = await api.get('/api/v1/sport-categories', { params: { sport_id: realId, active_only: false } });
        const raw = res.data?.data;
        categories.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch { categories.value = []; }
    finally { loadingCat.value = false; }
}
onMounted(fetchSport);

function genderColor(g: string) {
    const m: Record<string, 'info' | 'danger' | 'warning'> = { male: 'info', female: 'danger', mixed: 'warning' };
    return m[g] ?? 'default' as 'info';
}
function genderLabel(g: string) { return ({ male: 'Putra', female: 'Putri', mixed: 'Campuran' } as Record<string,string>)[g] ?? g; }
function typeLabel(t: string)   { return ({ individual: 'Individual', pair: 'Pasangan', team: 'Beregu' } as Record<string,string>)[t] ?? t; }
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }

.sport-hero-card {
    display: flex; align-items: center; gap: 16px;
    padding: 18px 20px; border-radius: 16px;
    background: var(--color-bg-card, var(--color-bg-subtle));
    border: 1px solid var(--color-border);
}
.sport-hero-card__info { flex: 1 1 auto; min-width: 0; }
.sport-hero-card__meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.sport-hero-card__count { font-size: 12px; color: var(--color-text-muted); }
.sport-badge { flex: 0 0 auto; width: 54px; height: 54px; border-radius: 14px; background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; }
.sport-code  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-subtle); }

.edit-btn {
    flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px; cursor: pointer;
    background: var(--color-accent-subtle); color: var(--color-accent);
    border: 1px solid transparent; font-size: 13px; font-weight: 600;
    transition: background .15s ease, border-color .15s ease;
}
.edit-btn:hover { border-color: var(--color-accent); }
.edit-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

.hero-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
.del-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px; cursor: pointer;
    background: transparent; color: var(--color-danger);
    border: 1px solid var(--color-border); font-size: 13px; font-weight: 600;
    transition: background .15s ease, border-color .15s ease, opacity .15s ease;
}
.del-btn:hover:not(:disabled) { border-color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
.del-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.del-btn:focus-visible { outline: 2px solid var(--color-danger); outline-offset: 2px; }

.tab-toolbar__actions { display: flex; align-items: center; gap: 8px; }
.modal-text { font-size: 13.5px; color: var(--color-text-muted); line-height: 1.5; margin: 0; }
.modal-text .cap { text-transform: capitalize; color: var(--color-text-primary); }
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.tab-toolbar__count { font-size: 12px; color: var(--color-text-muted); }

.subcabor-empty {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 12px; padding: 56px 24px; border-radius: 16px;
    border: 1px dashed var(--color-border); background: var(--color-bg-subtle);
}
.subcabor-empty__icon { width: 56px; height: 56px; border-radius: 16px; background: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; }
.subcabor-empty__title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.subcabor-empty__text  { font-size: 13px; color: var(--color-text-muted); max-width: 380px; margin: 0; line-height: 1.5; }
.subcabor-empty__text strong { color: var(--color-text-primary); text-transform: capitalize; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.dt-th--actions { width: 50px; }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-td--actions { text-align: right; }
.dt-name     { font-weight: 500; }
.sk-bar  { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
