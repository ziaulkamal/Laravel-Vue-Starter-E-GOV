<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Cabang Olahraga</h1>
                    <p class="page-subtitle">Kelola cabor dan sub-cabor PORA XV</p>
                </div>
                <AppButton variant="primary" size="md" @click="$inertia.visit('/sports/create')">+ Tambah Cabor</AppButton>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="sports-grid">
                <div v-for="i in 8" :key="i" class="sport-card sport-card--skeleton">
                    <span class="sk-chip" />
                    <div class="sport-card__body">
                        <span class="sk-bar" style="width:70%" />
                        <span class="sk-bar" style="width:40%" />
                    </div>
                </div>
            </div>

            <div v-else-if="sports.length" class="sports-grid">
                <button
                    v-for="sport in sports"
                    :key="sport.id"
                    type="button"
                    class="sport-card"
                    @click="$inertia.visit(`/sports/${encodeId(sport.id)}`)"
                >
                    <div class="sport-card__badge">{{ sport.code }}</div>
                    <div class="sport-card__body">
                        <div class="sport-card__name">{{ sport.name }}</div>
                        <AppBadge :color="sport.is_active ? 'success' : 'default'" size="sm">
                            {{ sport.is_active ? 'Aktif' : 'Nonaktif' }}
                        </AppBadge>
                    </div>
                    <ChevronRight class="sport-card__chevron" :size="18" />
                </button>
            </div>

            <AppEmptyState v-else-if="!error" title="Belum ada cabang olahraga" size="sm" />
            <div v-else class="state-error">
                <p>{{ error }}</p>
                <AppButton size="sm" variant="secondary" @click="fetchSports">Coba lagi</AppButton>
            </div>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChevronRight } from '@lucide/vue';
import api           from '@/lib/axios';
import { encodeId }  from '@/lib/hashid';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

interface Sport { id: number; name: string; code: string; is_active: boolean }

const sports  = ref<Sport[]>([]);
const loading = ref(false);
const error   = ref('');

async function fetchSports() {
    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get('/api/v1/sports');
        const raw = res.data?.data;
        sports.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Gagal memuat data cabor';
        sports.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchSports);
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }

.sports-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 1100px) { .sports-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 760px)  { .sports-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 460px)  { .sports-grid { grid-template-columns: 1fr; } }

.sport-card {
    display: flex; align-items: center; gap: 14px;
    width: 100%; padding: 16px; text-align: left;
    background: var(--color-bg-card, var(--color-bg-subtle));
    border: 1px solid var(--color-border);
    border-radius: 16px; cursor: pointer;
    transition: border-color .15s ease, background .15s ease, transform .15s ease;
}
.sport-card:hover { border-color: var(--color-accent); background: var(--color-bg-subtle); transform: translateY(-2px); }
.sport-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.sport-card--skeleton { cursor: default; }

.sport-card__badge {
    flex: 0 0 auto; width: 52px; height: 52px; border-radius: 14px;
    background: var(--color-accent-subtle); color: var(--color-accent);
    font-weight: 700; font-size: 14px; letter-spacing: 0.04em;
    display: flex; align-items: center; justify-content: center;
}
.sport-card__body  { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.sport-card__name  { font-size: 15px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.sport-card__chevron { flex: 0 0 auto; color: var(--color-text-muted); transition: color .15s ease, transform .15s ease; }
.sport-card:hover .sport-card__chevron { color: var(--color-accent); transform: translateX(2px); }

.sk-chip { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 14px; background: var(--color-bg-subtle); animation: sk 1.2s ease-in-out infinite; }
.sk-bar  { display: block; height: 12px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk    { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.state-error { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-error p { color: var(--color-danger); font-size: 13px; margin: 0; }
</style>
