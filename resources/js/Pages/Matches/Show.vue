<template>
    <SimporaLayout>
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Jadwal', href: '/matches' }, { label: match?.match_code ?? 'Detail' }]" />

            <AppCard v-if="match">
                <div class="match-header">
                    <div class="match-info">
                        <div class="match-code">{{ match.match_code }}</div>
                        <h1 class="match-name">{{ match.sport_category?.name ?? '—' }}</h1>
                        <div class="match-meta">
                            <span>📍 {{ match.venue?.name ?? '—' }}</span>
                            <span>🕐 {{ formatTime(match.scheduled_at) }}</span>
                            <AppBadge :color="statusColor(match.status)" size="md">
                                <span v-if="match.status === 'ongoing'" class="pulse-dot" />
                                {{ statusLabel(match.status) }}
                            </AppBadge>
                        </div>
                    </div>
                    <div class="match-actions">
                        <AppDropdown v-if="statusMenuItems.length" :items="statusMenuItems" placement="right">
                            <AppButton variant="secondary" size="sm">Ubah Status ▾</AppButton>
                        </AppDropdown>
                        <AppButton v-if="match && ['scheduled','postponed'].includes(match.status)" variant="ghost" size="sm" @click="$inertia.visit(`/matches/${encodeId(realId)}/edit`)"><Pencil :size="14" /> Edit</AppButton>
                    </div>
                </div>
            </AppCard>

            <AppTabs v-if="match" v-model="activeTab" variant="underline" :tabs="tabs">
                <template #kontingen>
                    <div class="kontingen-list">
                        <div v-for="p in (match.participants ?? [])" :key="p.id" class="kontingen-item">
                            <div class="logo-sm">{{ p.contingent?.short_name ?? '—' }}</div>
                            <span class="kontingen-name">{{ p.contingent?.name ?? '—' }}</span>
                            <AppBadge v-if="p.side" color="default" size="sm">{{ p.side }}</AppBadge>
                        </div>
                        <AppEmptyState v-if="!(match.participants?.length)" title="Belum ada kontingen" size="sm" />
                    </div>
                </template>

                <template #info>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Ronde</span><span class="info-value">{{ match.round ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Durasi</span><span class="info-value">{{ match.duration_minutes ? match.duration_minutes + ' menit' : '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Catatan</span><span class="info-value">{{ match.notes ?? '—' }}</span></div>
                    </div>
                </template>
            </AppTabs>
        </div>

        <AppModal v-model:open="showConfirm" :title="`Ubah status → ${pendingLabel}`" size="sm">
            <p style="font-size:13px;color:var(--color-text-muted)">
                Konfirmasi ubah status <strong>{{ match?.match_code }}</strong> menjadi <strong>{{ pendingLabel }}</strong>?
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="showConfirm = false">Batal</AppButton>
                <AppButton variant="primary" :loading="changing" @click="applyStatus">Konfirmasi</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId, encodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }   from '@/Composables/useToast';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppDropdown    from '@/Components/App/AppDropdown.vue';
import AppModal       from '@/Components/App/AppModal.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
const realId = decodeId(props.id);

const activeTab   = ref('kontingen');
const tabs = [{ key: 'kontingen', label: 'Kontingen' }, { key: 'info', label: 'Info' }];
const match       = ref<any>(null);
const showConfirm = ref(false);
const pendingStatus = ref('');
const changing    = ref(false);

// Transisi status sesuai GUIDE_API.md §13
const TRANSITIONS: Record<string, string[]> = {
    scheduled: ['ongoing', 'postponed', 'cancelled'],
    ongoing:   ['finished', 'postponed', 'cancelled'],
    postponed: ['scheduled', 'cancelled'],
    cancelled: ['scheduled'],
    finished:  [],
};

const statusMenuItems = computed(() => {
    const cur = match.value?.status;
    if (!cur) return [];
    return (TRANSITIONS[cur] ?? []).map(s => ({
        label: `${statusEmoji(s)} ${statusLabel(s)}`,
        onClick: () => openConfirm(s),
    }));
});
const pendingLabel = computed(() => statusLabel(pendingStatus.value));

async function fetchMatch() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/matches/${realId}`);
        match.value = res.data?.data ?? null;
        if (!match.value) { notFound(); return; }
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
    }
}
function openConfirm(s: string) { pendingStatus.value = s; showConfirm.value = true; }
async function applyStatus() {
    changing.value = true;
    try {
        await api.patch(`/api/v1/matches/${realId}/status`, { status: pendingStatus.value });
        toast.success(`Status diubah ke ${statusLabel(pendingStatus.value)}`);
        showConfirm.value = false;
        fetchMatch();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal mengubah status');
    } finally { changing.value = false; }
}
onMounted(fetchMatch);

function formatTime(dt: string) {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? dt : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function statusColor(s: string) {
    const m: Record<string, 'info' | 'success' | 'default' | 'warning'> = { scheduled: 'info', ongoing: 'success', finished: 'default', postponed: 'warning', cancelled: 'default' };
    return m[s] ?? 'default';
}
function statusLabel(s: string) {
    return ({ scheduled: 'Terjadwal', ongoing: 'Berlangsung', finished: 'Selesai', postponed: 'Ditunda', cancelled: 'Dibatalkan' } as Record<string,string>)[s] ?? s;
}
function statusEmoji(s: string) {
    return ({ ongoing: '▶', finished: '✅', postponed: '⏸', scheduled: '📅', cancelled: '✖' } as Record<string,string>)[s] ?? '';
}
</script>

<style scoped>
.page-wrap      { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.match-header   { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.match-info     { flex: 1; }
.match-code     { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--color-text-subtle); letter-spacing: 0.08em; margin-bottom: 4px; }
.match-name     { font-size: 20px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 8px; }
.match-meta     { display: flex; align-items: center; gap: 14px; font-size: 13px; color: var(--color-text-muted); flex-wrap: wrap; }
.match-actions  { display: flex; gap: 8px; flex-shrink: 0; }
.kontingen-list { display: flex; flex-direction: column; gap: 4px; }
.kontingen-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.kontingen-item:last-child { border-bottom: none; }
.logo-sm        { width: 32px; height: 32px; border-radius: 8px; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase; }
.kontingen-name { flex: 1; font-weight: 500; font-size: 13.5px; }
.info-grid   { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.info-item   { display: flex; align-items: center; gap: 12px; }
.info-label  { font-size: 12px; font-weight: 600; color: var(--color-text-muted); width: 90px; flex-shrink: 0; }
.info-value  { font-size: 13.5px; color: var(--color-text-primary); }
.pulse-dot   { display: inline-block; width: 7px; height: 7px; background: var(--color-success); border-radius: 50%; margin-right: 4px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
