<template>
    <SimporaLayout :title="category?.name ?? 'Detail Sub-Cabor'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[
                { label: 'Cabor', href: '/sports' },
                { label: category?.sport?.name ?? 'Cabor', href: category?.sport ? `/sports/${encodeId(category.sport.id)}` : '/sports' },
                { label: category?.name ?? 'Detail' },
            ]" />

            <!-- Hero -->
            <div class="hero-card">
                <span class="hero-badge">{{ category?.sport?.code ?? '—' }}</span>
                <div class="hero-card__info">
                    <h1 class="page-title">{{ category?.name ?? 'Memuat...' }}</h1>
                    <div class="hero-card__meta">
                        <AppBadge :color="genderColor(category?.gender_rule)" size="sm">{{ genderLabel(category?.gender_rule) }}</AppBadge>
                        <AppBadge color="info" size="sm">{{ formatLabel(category?.match_format) }}</AppBadge>
                        <span class="meta-chip">{{ scoringLabel(category?.scoring_type) }}</span>
                        <AppBadge v-if="category && !category.is_active" color="default" size="sm">Nonaktif</AppBadge>
                    </div>
                </div>
                <button v-if="category" type="button" class="edit-btn" @click="$inertia.visit(`/sport-categories/${encodeId(category.id)}/edit`)">
                    <Pencil :size="15" /><span>Edit</span>
                </button>
            </div>

            <AppTabs v-model="activeTab" variant="underline" :tabs="tabs">
                <!-- ── Klasemen ─────────────────────────────────────────── -->
                <template #klasemen>
                    <div v-if="loadingStandings" class="card-grid">
                        <div class="std-card"><span class="sk-bar lg" /><span class="sk-bar" /><span class="sk-bar" /></div>
                    </div>
                    <div v-else-if="standingsError" class="state-box">
                        <p>{{ standingsError }}</p>
                        <AppButton size="sm" variant="secondary" @click="fetchStandings">Coba lagi</AppButton>
                    </div>
                    <div v-else-if="!groups.length" class="state-box">
                        <Trophy :size="26" class="state-icon" />
                        <div class="state-title">Klasemen belum tersedia</div>
                        <p class="state-text">Belum ada laga fase grup untuk sub-cabor ini.</p>
                    </div>
                    <div v-else class="card-grid">
                        <div v-for="g in groups" :key="g.group" class="std-card">
                            <div class="std-card__head">
                                <span class="std-card__title">Grup {{ g.group }}</span>
                                <span class="std-card__hint">{{ g.standings.length }} tim · top {{ qualify }} lolos</span>
                            </div>
                            <table class="std-table">
                                <thead>
                                    <tr>
                                        <th class="c">#</th>
                                        <th>Tim</th>
                                        <th class="c" title="Main">M</th>
                                        <th class="c" title="Menang">M</th>
                                        <th class="c" title="Seri">S</th>
                                        <th class="c" title="Kalah">K</th>
                                        <th class="c" title="Gol Memasukkan">GM</th>
                                        <th class="c" title="Gol Kemasukan">GK</th>
                                        <th class="c" title="Selisih Gol">SG</th>
                                        <th class="c pts" title="Poin">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in g.standings" :key="row.contingent_id" :class="{ qualified: row.qualified }">
                                        <td class="c rank">{{ row.rank }}</td>
                                        <td class="team-cell">
                                            <ContingentLogo :contingent="row.contingent" :size="22" :radius="6" />
                                            <span class="team-name">{{ row.contingent?.name ?? '—' }}</span>
                                        </td>
                                        <td class="c">{{ row.P }}</td>
                                        <td class="c">{{ row.W }}</td>
                                        <td class="c">{{ row.D }}</td>
                                        <td class="c">{{ row.L }}</td>
                                        <td class="c">{{ row.GF }}</td>
                                        <td class="c">{{ row.GA }}</td>
                                        <td class="c">{{ row.GD > 0 ? '+' + row.GD : row.GD }}</td>
                                        <td class="c pts">{{ row.Pts }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>

                <!-- ── Bagan / Bracket ──────────────────────────────────── -->
                <template #bagan>
                    <div v-if="loadingBracket" class="state-box"><span class="sk-bar lg" /></div>
                    <div v-else-if="bracketError" class="state-box">
                        <p>{{ bracketError }}</p>
                        <AppButton size="sm" variant="secondary" @click="fetchBracket">Coba lagi</AppButton>
                    </div>
                    <div v-else-if="!rounds.length" class="state-box">
                        <GitFork :size="26" class="state-icon" />
                        <div class="state-title">Bagan belum tersedia</div>
                        <p class="state-text">Fase gugur belum dibuat. Susun jadwal laga dengan <strong>fase = Gugur</strong> di menu Jadwal.</p>
                    </div>
                    <div v-else class="bracket-scroll">
                        <div class="bracket">
                            <div v-for="r in rounds" :key="r.round" class="bracket-col">
                                <div class="bracket-col__head">{{ roundLabel(r.round) }}</div>
                                <div class="bracket-col__matches">
                                    <button
                                        v-for="m in r.matches" :key="m.id"
                                        type="button" class="bm" @click="$inertia.visit(`/matches/${encodeId(m.id)}`)"
                                    >
                                        <div class="bm__side" :class="{ win: m.winner_side === 'home' }">
                                            <ContingentLogo :contingent="m.home?.contingent" :short-name="m.home?.contingent?.short_name" :size="18" :radius="5" />
                                            <span class="bm__name">{{ m.home?.contingent?.short_name ?? m.home?.contingent?.name ?? 'TBD' }}</span>
                                            <span class="bm__score">{{ m.home?.score ?? '–' }}<sup v-if="m.penalty">({{ m.penalty.home }})</sup></span>
                                        </div>
                                        <div class="bm__side" :class="{ win: m.winner_side === 'away' }">
                                            <ContingentLogo :contingent="m.away?.contingent" :short-name="m.away?.contingent?.short_name" :size="18" :radius="5" />
                                            <span class="bm__name">{{ m.away?.contingent?.short_name ?? m.away?.contingent?.name ?? 'TBD' }}</span>
                                            <span class="bm__score">{{ m.away?.score ?? '–' }}<sup v-if="m.penalty">({{ m.penalty.away }})</sup></span>
                                        </div>
                                        <div class="bm__foot">
                                            <span class="bm__code">{{ m.match_code }}</span>
                                            <AppBadge :color="statusColor(m.status)" size="sm">{{ statusLabel(m.status) }}</AppBadge>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ── Info ─────────────────────────────────────────────── -->
                <template #info>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-k">Cabor</span><span class="info-v">{{ category?.sport?.name ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-k">Gender</span><span class="info-v">{{ genderLabel(category?.gender_rule) }}</span></div>
                        <div class="info-item"><span class="info-k">Tipe Peserta</span><span class="info-v">{{ typeLabel(category?.participant_type) }}</span></div>
                        <div class="info-item"><span class="info-k">Jumlah Pemain</span><span class="info-v">{{ category?.min_players }}–{{ category?.max_players }}</span></div>
                        <div class="info-item"><span class="info-k">Format</span><span class="info-v">{{ formatLabel(category?.match_format) }}</span></div>
                        <div class="info-item"><span class="info-k">Penilaian</span><span class="info-v">{{ scoringLabel(category?.scoring_type) }}</span></div>
                        <div class="info-item"><span class="info-k">Best of 3</span><span class="info-v">{{ category?.uses_bo3 ? 'Ya' : 'Tidak' }}</span></div>
                        <div class="info-item"><span class="info-k">Status</span><span class="info-v">{{ category?.is_active ? 'Aktif' : 'Nonaktif' }}</span></div>
                    </div>
                </template>
            </AppTabs>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Pencil, Trophy, GitFork } from '@lucide/vue';
import api from '@/lib/axios';
import { encodeId, decodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';
import AppBadge from '@/Components/App/AppBadge.vue';
import AppButton from '@/Components/App/AppButton.vue';
import AppTabs from '@/Components/App/AppTabs.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const realId = decodeId(props.id);

const category = ref<any>(null);
const qualify = 2;

// Format → ketersediaan tab
const hasGroup    = computed(() => ['league', 'league_knockout'].includes(category.value?.match_format));
const hasKnockout = computed(() => ['knockout', 'elimination', 'league_knockout'].includes(category.value?.match_format));

const tabs = computed(() => {
    const t: { value: string; label: string }[] = [];
    if (hasGroup.value)    t.push({ value: 'klasemen', label: 'Klasemen' });
    if (hasKnockout.value) t.push({ value: 'bagan', label: 'Bagan' });
    t.push({ value: 'info', label: 'Info' });
    return t;
});
const activeTab = ref('info');

// ── Klasemen ───────────────────────────────────────────────────
const groups = ref<any[]>([]);
const loadingStandings = ref(false);
const standingsError = ref('');
async function fetchStandings() {
    loadingStandings.value = true;
    standingsError.value = '';
    try {
        const res = await api.get(`/api/v1/sport-categories/${realId}/standings`, { params: { qualify } });
        groups.value = (res.data?.data?.groups ?? []).filter(Boolean);
    } catch {
        standingsError.value = 'Gagal memuat klasemen.';
    } finally {
        loadingStandings.value = false;
    }
}

// ── Bagan ──────────────────────────────────────────────────────
const rounds = ref<any[]>([]);
const loadingBracket = ref(false);
const bracketError = ref('');
async function fetchBracket() {
    loadingBracket.value = true;
    bracketError.value = '';
    try {
        const res = await api.get(`/api/v1/sport-categories/${realId}/bracket`);
        rounds.value = (res.data?.data?.rounds ?? []).filter(Boolean);
    } catch {
        bracketError.value = 'Gagal memuat bagan.';
    } finally {
        loadingBracket.value = false;
    }
}

// Lazy-load isi tab saat pertama dibuka
const loadedStandings = ref(false);
const loadedBracket = ref(false);
watch(activeTab, (t) => {
    if (t === 'klasemen' && !loadedStandings.value) { loadedStandings.value = true; fetchStandings(); }
    if (t === 'bagan'    && !loadedBracket.value)   { loadedBracket.value = true; fetchBracket(); }
});

async function fetchCategory() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/sport-categories/${realId}`);
        category.value = res.data?.data ?? null;
        if (!category.value) { notFound(); return; }
        // Default tab: klasemen jika ada grup, lalu bagan, lalu info
        activeTab.value = hasGroup.value ? 'klasemen' : (hasKnockout.value ? 'bagan' : 'info');
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        notFound();
    }
}
onMounted(fetchCategory);

// ── Label helpers ──────────────────────────────────────────────
const ROUND_LABELS: Record<string, string> = {
    '64-besar': '64 Besar', '32-besar': '32 Besar', '16-besar': '16 Besar', '8-besar': '8 Besar',
    'perempatfinal': 'Perempat Final', 'semifinal': 'Semifinal', 'perebutan-3': 'Perebutan Juara 3', 'final': 'Final',
};
function roundLabel(r: string) { return ROUND_LABELS[r] ?? (r === '-' ? 'Gugur' : r); }
function genderColor(g?: string) { return ({ male: 'info', female: 'danger', mixed: 'warning' } as Record<string, any>)[g ?? ''] ?? 'default'; }
function genderLabel(g?: string) { return ({ male: 'Putra', female: 'Putri', mixed: 'Campuran' } as Record<string, string>)[g ?? ''] ?? '—'; }
function typeLabel(t?: string) { return ({ individual: 'Individual', pair: 'Pasangan', team: 'Beregu' } as Record<string, string>)[t ?? ''] ?? '—'; }
function formatLabel(f?: string) { return ({ final_only: 'Final Saja', elimination: 'Eliminasi', knockout: 'Gugur', league: 'Liga', league_knockout: 'Grup → Gugur' } as Record<string, string>)[f ?? ''] ?? (f ?? '—'); }
function scoringLabel(s?: string) { return ({ score: 'Skor', time: 'Waktu', distance: 'Jarak', point: 'Poin', rank: 'Peringkat' } as Record<string, string>)[s ?? ''] ?? (s ?? '—'); }
function statusColor(s: string) { return ({ scheduled: 'info', ongoing: 'warning', finished: 'success', postponed: 'default', cancelled: 'danger' } as Record<string, any>)[s] ?? 'default'; }
function statusLabel(s: string) { return ({ scheduled: 'Terjadwal', ongoing: 'Berlangsung', finished: 'Selesai', postponed: 'Ditunda', cancelled: 'Batal' } as Record<string, string>)[s] ?? s; }
</script>

<style scoped>
.page-wrap  { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }

.hero-card { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 16px; background: var(--color-bg-card, var(--color-bg-subtle)); border: 1px solid var(--color-border); }
.hero-card__info { flex: 1 1 auto; min-width: 0; }
.hero-card__meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; flex-wrap: wrap; }
.hero-badge { flex: 0 0 auto; width: 54px; height: 54px; border-radius: 14px; background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; }
.meta-chip { font-size: 11px; font-weight: 600; color: var(--color-text-muted); background: var(--color-bg-subtle); border: 1px solid var(--color-border); padding: 2px 8px; border-radius: 6px; }

.edit-btn { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 10px; cursor: pointer; background: var(--color-accent-subtle); color: var(--color-accent); border: 1px solid transparent; font-size: 13px; font-weight: 600; }
.edit-btn:hover { border-color: var(--color-accent); }

/* Klasemen */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
.std-card { border: 1px solid var(--color-border); border-radius: 14px; overflow: hidden; background: var(--color-bg-card, var(--color-bg-subtle)); }
.std-card__head { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--color-border); }
.std-card__title { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
.std-card__hint { font-size: 11px; color: var(--color-text-muted); }
.std-table { width: 100%; border-collapse: collapse; }
.std-table th { padding: 8px 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); }
.std-table td { padding: 8px 6px; font-size: 12.5px; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.std-table tbody tr:last-child td { border-bottom: none; }
.std-table .c { text-align: center; }
.std-table th:nth-child(2) { text-align: left; }
.std-table .pts { font-weight: 700; }
.std-table .rank { color: var(--color-text-muted); font-weight: 600; }
.team-cell { display: flex; align-items: center; gap: 8px; }
.team-name { font-weight: 500; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.std-table tr.qualified td { background: color-mix(in srgb, var(--color-success) 8%, transparent); }
.std-table tr.qualified .rank { color: var(--color-success); }

/* Bagan */
.bracket-scroll { overflow-x: auto; padding-bottom: 8px; }
.bracket { display: inline-flex; gap: 20px; align-items: stretch; min-width: 100%; }
.bracket-col { display: flex; flex-direction: column; min-width: 200px; }
.bracket-col__head { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-subtle); padding: 0 0 12px; text-align: center; }
.bracket-col__matches { display: flex; flex-direction: column; gap: 14px; justify-content: space-around; flex: 1; }
.bm { text-align: left; width: 100%; cursor: pointer; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-bg-card, var(--color-bg-subtle)); padding: 8px; display: flex; flex-direction: column; gap: 4px; transition: border-color .15s ease; }
.bm:hover { border-color: var(--color-accent); }
.bm__side { display: flex; align-items: center; gap: 7px; padding: 3px 4px; border-radius: 6px; }
.bm__side.win { background: color-mix(in srgb, var(--color-success) 12%, transparent); }
.bm__name { flex: 1; font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bm__side.win .bm__name { font-weight: 700; color: var(--color-success); }
.bm__score { font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
.bm__score sup { font-size: 9px; color: var(--color-text-muted); font-weight: 600; }
.bm__foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding-top: 4px; border-top: 1px dashed var(--color-border); margin-top: 2px; }
.bm__code { font-size: 10px; color: var(--color-text-muted); font-weight: 600; }

/* Info */
.info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.info-item { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-bg-card, var(--color-bg-subtle)); }
.info-k { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-subtle); }
.info-v { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }

/* States */
.state-box { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 24px; text-align: center; border: 1px dashed var(--color-border); border-radius: 16px; background: var(--color-bg-subtle); }
.state-icon { color: var(--color-text-subtle); }
.state-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.state-text { font-size: 13px; color: var(--color-text-muted); max-width: 380px; margin: 0; line-height: 1.5; }
.sk-bar { display: block; height: 13px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; margin: 6px 0; }
.sk-bar.lg { height: 22px; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
