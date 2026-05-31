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
                        <div class="logo-placeholder">{{ contingent.short_name }}</div>
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
                            <AppButton variant="secondary" size="sm"><Pencil :size="14" /> Edit</AppButton>
                        </div>
                    </div>
                </AppCard>

                <!-- Tabs -->
                <AppTabs v-model="activeTab" variant="underline" :tabs="tabs">
                    <template #atlet>
                        <div class="tab-toolbar">
                            <AppButton variant="primary" size="sm">+ Tambah Peserta</AppButton>
                        </div>
                        <table v-if="participants.length" class="dt-table">
                            <thead>
                                <tr>
                                    <th class="dt-th">Foto</th>
                                    <th class="dt-th">Nama</th>
                                    <th class="dt-th">NIK</th>
                                    <th class="dt-th">Role</th>
                                    <th class="dt-th">Cabor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="p in participants" :key="p.id" class="dt-row">
                                    <td class="dt-td"><AppAvatar :user="{ name: p.person?.nama_lengkap ?? '' }" size="sm" /></td>
                                    <td class="dt-td dt-name">{{ p.person?.nama_lengkap ?? '—' }}</td>
                                    <td class="dt-td"><span class="nik-mono">{{ p.person?.nik ?? '—' }}</span></td>
                                    <td class="dt-td"><AppBadge :color="roleColor(p.role)" size="sm">{{ roleLabel(p.role) }}</AppBadge></td>
                                    <td class="dt-td">{{ p.sport?.name ?? '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                        <AppEmptyState v-else title="Belum ada peserta" size="sm" />
                    </template>

                    <template #kartu>
                        <div class="kartu-section">
                            <AppButton variant="primary" size="md">🖨 Cetak Kartu Semua Atlet (PDF)</AppButton>
                            <AppButton variant="secondary" size="md">🖨 Kartu Tamu Kontingen</AppButton>
                        </div>
                    </template>
                </AppTabs>
            </template>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Pencil } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId }   from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppAvatar      from '@/Components/App/AppAvatar.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const realId = decodeId(props.id);

const activeTab    = ref('atlet');
const tabs = [{ key: 'atlet', label: 'Peserta' }, { key: 'kartu', label: 'Kartu' }];
const contingent   = ref<any>(null);
const participants  = ref<any[]>([]);
const loading      = ref(true);

async function fetchContingent() {
    if (Number.isNaN(realId)) { notFound(); return; }
    loading.value = true;
    try {
        const res = await api.get(`/api/v1/contingents/${realId}`);
        contingent.value = res.data?.data ?? null;
        if (!contingent.value) { notFound(); return; }
        fetchParticipants();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    } finally {
        loading.value = false;
    }
}

async function fetchParticipants() {
    try {
        const res = await api.get('/api/v1/participants', { params: { contingent_id: realId, per_page: 100 } });
        const raw = res.data?.data;
        participants.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch { participants.value = []; }
}

onMounted(fetchContingent);

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
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.contingent-header  { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.logo-placeholder   { width: 64px; height: 64px; border-radius: 16px; background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase; }
.contingent-meta    { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.contingent-name    { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
.contingent-sub     { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); flex-wrap: wrap; }
.dot                { color: var(--color-text-subtle); }
.contingent-pic     { font-size: 12.5px; color: var(--color-text-muted); }
.contingent-actions { flex-shrink: 0; }

.tab-toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.dt-table    { width: 100%; border-collapse: collapse; }
.dt-th       { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); text-align: left; }
.dt-row      { border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-td       { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.dt-name     { font-weight: 500; text-transform: capitalize; }
.nik-mono    { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted); }
.kartu-section { display: flex; gap: 12px; flex-wrap: wrap; padding: 8px 0; }

.sk-logo { width: 64px; height: 64px; border-radius: 16px; background: var(--color-bg-subtle); flex-shrink: 0; animation: sk 1.2s ease-in-out infinite; }
.sk-bar  { display: block; height: 12px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk    { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
