<template>
    <SimporaLayout title="Klasemen">
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Klasemen PORA XV 2026</h1>
                    <p class="page-subtitle">Diperbarui: {{ lastUpdated }}</p>
                </div>
                <div class="header-actions">
                    <AppButton variant="secondary" size="sm" :loading="refreshing" @click="refresh">
                        🔄 Refresh
                    </AppButton>
                </div>
            </div>

            <!-- Overall Leaderboard -->
            <AppCard>
                <template #header>
                    <span class="section-title">Klasemen Umum</span>
                </template>
                <table class="lb-table">
                    <thead>
                        <tr class="lb-thead">
                            <th class="lb-th" style="width:40px">#</th>
                            <th class="lb-th">Kontingen</th>
                            <th class="lb-th lb-medal">🥇 Emas</th>
                            <th class="lb-th lb-medal">🥈 Perak</th>
                            <th class="lb-th lb-medal">🥉 Perunggu</th>
                            <th class="lb-th lb-medal">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, i) in leaderboard" :key="entry.name"
                            :class="['lb-row', i === 0 ? 'lb-row--gold' : i === 1 ? 'lb-row--silver' : i === 2 ? 'lb-row--bronze' : '']">
                            <td class="lb-td lb-rank">
                                <span v-if="i === 0">🥇</span>
                                <span v-else-if="i === 1">🥈</span>
                                <span v-else-if="i === 2">🥉</span>
                                <span v-else>{{ i + 1 }}</span>
                            </td>
                            <td class="lb-td lb-name">
                                <div class="kontingen-cell">
                                    <ContingentLogo
                                        :wilayah-kode="entry.wilayah_kode"
                                        :short-name="entry.short"
                                        :name="entry.name"
                                        :size="32"
                                        :radius="8"
                                    />
                                    <span>{{ entry.name }}</span>
                                </div>
                            </td>
                            <td class="lb-td lb-medal lb-gold-count">{{ entry.gold }}</td>
                            <td class="lb-td lb-medal">{{ entry.silver }}</td>
                            <td class="lb-td lb-medal">{{ entry.bronze }}</td>
                            <td class="lb-td lb-medal lb-total">{{ entry.gold + entry.silver + entry.bronze }}</td>
                        </tr>
                    </tbody>
                </table>
            </AppCard>

            <!-- Per Cabor -->
            <AppCard>
                <template #header>
                    <div class="card-header-row">
                        <span class="section-title">Klasemen per Cabor</span>
                        <AppSelect v-model="selectedCabor" :options="caborOptions" style="width:200px" />
                    </div>
                </template>
                <table v-if="selectedCabor" class="lb-table">
                    <thead>
                        <tr class="lb-thead">
                            <th class="lb-th">#</th>
                            <th class="lb-th">Kontingen</th>
                            <th class="lb-th lb-medal">🥇</th>
                            <th class="lb-th lb-medal">🥈</th>
                            <th class="lb-th lb-medal">🥉</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(e, i) in caborLeaderboard" :key="e.name" class="lb-row">
                            <td class="lb-td lb-rank">{{ i + 1 }}</td>
                            <td class="lb-td lb-name">{{ e.name }}</td>
                            <td class="lb-td lb-medal lb-gold-count">{{ e.gold }}</td>
                            <td class="lb-td lb-medal">{{ e.silver }}</td>
                            <td class="lb-td lb-medal">{{ e.bronze }}</td>
                        </tr>
                    </tbody>
                </table>
                <AppEmptyState v-else title="Pilih cabor untuk melihat klasemen" size="sm" />
            </AppCard>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

const refreshing    = ref(false);
const lastUpdated   = ref('5 menit lalu');
const selectedCabor = ref('');

const leaderboard = [
    { name: 'Aceh Jaya',    short: 'ACJ', wilayah_kode: '11.14', gold: 8, silver: 5, bronze: 3 },
    { name: 'Banda Aceh',   short: 'BNA', wilayah_kode: '11.71', gold: 7, silver: 4, bronze: 4 },
    { name: 'Aceh Besar',   short: 'ABR', wilayah_kode: '11.06', gold: 5, silver: 6, bronze: 2 },
    { name: 'Pidie',        short: 'PDI', wilayah_kode: '11.07', gold: 4, silver: 3, bronze: 5 },
    { name: 'Lhokseumawe', short: 'LHO', wilayah_kode: '11.73', gold: 3, silver: 4, bronze: 6 },
    { name: 'Bireuen',      short: 'BIR', wilayah_kode: '11.11', gold: 2, silver: 2, bronze: 3 },
];

const caborOptions = [
    { value: 'silat',  label: 'Silat' },
    { value: 'renang', label: 'Renang' },
    { value: 'atletik',label: 'Atletik' },
];

const caborLeaderboard = [
    { name: 'Aceh Jaya',  gold: 3, silver: 1, bronze: 0 },
    { name: 'Pidie',      gold: 1, silver: 2, bronze: 1 },
    { name: 'Banda Aceh', gold: 1, silver: 0, bronze: 2 },
];

function refresh() {
    refreshing.value = true;
    setTimeout(() => {
        refreshing.value = false;
        lastUpdated.value = 'Baru saja';
    }, 1000);
}
</script>

<style scoped>
.page-wrap      { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header    { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title     { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle  { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.header-actions { display: flex; gap: 8px; }
.section-title  { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.card-header-row{ display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; }

.lb-table   { width: 100%; border-collapse: collapse; }
.lb-thead   { }
.lb-th      { padding: 9px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); background: var(--color-bg-subtle); }
.lb-medal   { text-align: center; }
.lb-row     { border-bottom: 1px solid var(--color-border); transition: background 100ms; }
.lb-row:hover  { background: var(--color-bg-subtle); }
.lb-row:last-child { border-bottom: none; }
.lb-row--gold   { background: rgba(183,140,43,0.08); }
.lb-row--silver { background: rgba(148,163,184,0.08); }
.lb-row--bronze { background: rgba(180,100,50,0.06); }
.lb-td      { padding: 12px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }
.lb-rank    { font-weight: 700; font-size: 16px; }
.lb-name    { font-weight: 500; }
.lb-gold-count { font-weight: 700; color: var(--color-gold); }
.lb-total   { font-weight: 700; color: var(--color-accent); }
.kontingen-cell { display: flex; align-items: center; gap: 10px; }
</style>
