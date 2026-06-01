<template>
    <SimporaLayout :title="person?.nama_lengkap ?? 'Detail Peserta'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Peserta', href: '/participants' }, { label: person?.nama_lengkap ?? 'Detail' }]" />

            <div class="page-header">
                <div class="participant-hero">
                    <AppAvatar :user="{ name: person?.nama_lengkap ?? '' }" size="xl" />
                    <div>
                        <h1 class="page-title">{{ person?.nama_lengkap ?? 'Memuat...' }}</h1>
                        <div class="hero-meta">
                            <AppBadge :color="roleColor(participant?.role)" size="sm">{{ roleLabel(participant?.role) }}</AppBadge>
                            <span class="dot">·</span>
                            <span class="meta-text">{{ participant?.contingent?.name ?? '—' }}</span>
                            <span class="dot">·</span>
                            <span class="meta-text">{{ participant?.sport?.name ?? '—' }}</span>
                        </div>
                        <div class="hero-nik nik-mono">{{ person?.nik ?? '' }}</div>
                    </div>
                </div>
                <AppButton variant="secondary" size="sm"><Pencil :size="14" /> Edit</AppButton>
            </div>

            <AppTabs v-if="participant" v-model="activeTab" variant="underline" :tabs="tabs">
                <!-- Dokumen -->
                <template #dokumen>
                    <div class="doc-checklist">
                        <div v-for="doc in documents" :key="doc.document_type_id" class="doc-item">
                            <span class="doc-item__icon">{{ docIcon(doc.status) }}</span>
                            <div class="doc-item__info">
                                <span class="doc-item__type">{{ doc.document_type_name }}</span>
                                <span v-if="!doc.uploaded" class="doc-item__note doc-item__note--muted">Belum diunggah</span>
                            </div>
                            <AppBadge :color="docColor(doc.status)" size="sm">{{ docLabel(doc.status) }}</AppBadge>
                        </div>
                        <AppEmptyState v-if="!documents.length" title="Tidak ada checklist dokumen" size="sm" />
                    </div>
                </template>

                <!-- Sub-Cabor -->
                <template #subcabor>
                    <div class="subcabor-section">
                        <div v-for="sc in registrations" :key="sc.id" class="subcabor-item">
                            <span class="subcabor-name">{{ sc.sport_category?.name ?? '—' }}</span>
                            <AppBadge color="success" size="sm">Terdaftar</AppBadge>
                        </div>
                        <AppEmptyState v-if="!registrations.length" title="Belum terdaftar di sub-cabor" size="sm" />
                        <AppButton variant="secondary" size="sm" class="mt-2">+ Daftarkan ke Sub-Cabor lain</AppButton>
                    </div>
                </template>

                <!-- Kartu -->
                <template #kartu>
                    <div class="kartu-section">
                        <div v-if="canPrintCard">
                            <AppButton variant="primary" size="md">🖨 Cetak Kartu Atlet (PDF)</AppButton>
                        </div>
                        <AppAlert v-else type="warning" title="Belum bisa cetak kartu">
                            <template #description>
                                {{ pendingDocCount }} dokumen belum disetujui. Semua dokumen wajib harus approved sebelum kartu dapat dicetak.
                            </template>
                        </AppAlert>
                    </div>
                </template>
            </AppTabs>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId }   from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppAvatar      from '@/Components/App/AppAvatar.vue';
import AppAlert       from '@/Components/App/AppAlert.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const realId = decodeId(props.id);

const activeTab = ref('dokumen');
const tabs = [
    { key: 'dokumen',  label: 'Dokumen' },
    { key: 'subcabor', label: 'Sub-Cabor' },
    { key: 'kartu',    label: 'Kartu' },
];

const participant   = ref<any>(null);
const person        = computed(() => participant.value?.person ?? null);
const registrations = computed(() => participant.value?.registrations ?? []);
const documents     = ref<any[]>([]);

async function fetchParticipant() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/participants/${realId}`);
        participant.value = res.data?.data ?? null;
        if (!participant.value) { notFound(); return; }
        fetchChecklist();
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    }
}
async function fetchChecklist() {
    try {
        const res = await api.get(`/api/v1/participants/${realId}/documents/checklist`);
        documents.value = res.data?.data?.checklist ?? [];
    } catch { documents.value = []; }
}
onMounted(fetchParticipant);

const pendingDocCount = computed(() =>
    documents.value.filter(d => d.is_required && d.status !== 'approved').length
);
const canPrintCard = computed(() => documents.value.length > 0 && pendingDocCount.value === 0);

function roleColor(r?: string) {
    const m: Record<string, 'success' | 'info' | 'warning' | 'primary'> = { athlete: 'success', coach: 'info', official: 'warning', manager: 'primary' };
    return m[r ?? ''] ?? 'default' as 'success';
}
function roleLabel(r?: string) {
    return ({ athlete: 'Atlet', coach: 'Pelatih', official: 'Official', manager: 'Manajer' } as Record<string,string>)[r ?? ''] ?? (r ?? '—');
}
function docIcon(s: string | null)  { return ({ approved: '🟢', pending: '🟡', rejected: '🔴' } as Record<string,string>)[s ?? ''] ?? '⚪'; }
function docColor(s: string | null) {
    const m: Record<string, 'success' | 'warning' | 'danger' | 'default'> = { approved: 'success', pending: 'warning', rejected: 'danger' };
    return m[s ?? ''] ?? 'default';
}
function docLabel(s: string | null) { return ({ approved: 'Approved', pending: 'Pending', rejected: 'Ditolak' } as Record<string,string>)[s ?? ''] ?? 'Belum Upload'; }
</script>

<style scoped>
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header{ display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; text-transform: capitalize; }
.participant-hero { display: flex; align-items: flex-start; gap: 14px; }
.hero-meta  { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.dot        { color: var(--color-text-subtle); }
.meta-text  { font-size: 13px; color: var(--color-text-muted); }
.hero-nik   { font-size: 12.5px; color: var(--color-text-muted); margin-top: 4px; }
.nik-mono   { font-family: var(--font-mono); }
.doc-checklist { display: flex; flex-direction: column; gap: 2px; }
.doc-item      { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.doc-item:last-child { border-bottom: none; }
.doc-item__icon{ font-size: 18px; flex-shrink: 0; }
.doc-item__info{ flex: 1; display: flex; flex-direction: column; gap: 2px; }
.doc-item__type{ font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.doc-item__note{ font-size: 11.5px; color: var(--color-danger); }
.doc-item__note--muted { color: var(--color-text-subtle); }
.subcabor-section { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
.subcabor-item    { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.subcabor-name    { font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.mt-2             { margin-top: 4px; }
.kartu-section { padding-top: 8px; display: flex; flex-direction: column; gap: 14px; }
</style>
