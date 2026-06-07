<template>
    <SimporaLayout :title="match?.match_code ?? 'Detail Pertandingan'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Jadwal', href: '/matches' }, { label: match?.match_code ?? 'Detail' }]" />

            <AppCard v-if="match">
                <div class="match-header">
                    <div class="match-info">
                        <div class="match-code">{{ match.match_code }}</div>
                        <h1 class="match-name">{{ match.sport_category?.name ?? '—' }}</h1>
                        <div class="match-meta">
                            <span v-if="match.sport_category?.sport?.name" class="meta-chip">🏅 {{ match.sport_category.sport.name }}</span>
                            <span class="meta-chip">📍 {{ match.venue?.name ?? '—' }}</span>
                            <span class="meta-chip">🕐 {{ formatSchedule(match.scheduled_at) }}</span>
                            <span v-if="match.round" class="meta-chip">🔁 {{ match.round }}</span>
                            <AppBadge :color="statusColor(match.status)" size="md">
                                <span v-if="match.status === 'ongoing'" class="pulse-dot" />
                                {{ statusLabel(match.status) }}
                            </AppBadge>
                        </div>
                    </div>
                    <div class="match-actions">
                        <AppDropdown v-if="statusMenuItems.length" :items="statusMenuItems" align="right">
                            <template #trigger>
                                <AppButton variant="secondary" size="sm">Ubah Status ▾</AppButton>
                            </template>
                        </AppDropdown>
                        <AppButton v-if="can('matches.manage') && ['scheduled','postponed'].includes(match.status)" variant="ghost" size="sm" @click="$inertia.visit(`/matches/${encodeId(realId)}/edit`)"><Pencil :size="14" /> Edit</AppButton>
                    </div>
                </div>
            </AppCard>

            <!-- ── Penilaian langsung (saat berlangsung, juri / super admin) ─ -->
            <AppCard v-if="match && isScoring" class="scoreboard scoring">
                <div class="scoreboard-status scoring-status"><span class="pulse-dot" /> Penilaian Langsung</div>

                <!-- Versus tanpa BO3 -->
                <div v-if="kind === 'versus' && !isBo3" class="versus">
                    <div class="vs-side">
                        <ContingentLogo :contingent="homeC" :size="56" :radius="14" />
                        <div class="vs-name">{{ cap(homeC?.name) ?? 'Home' }}</div>
                        <input type="number" min="0" class="score-input" v-model.number="scoreForm.home" />
                    </div>
                    <div class="vs-score"><span class="sep">:</span></div>
                    <div class="vs-side">
                        <ContingentLogo :contingent="awayC" :size="56" :radius="14" />
                        <div class="vs-name">{{ cap(awayC?.name) ?? 'Away' }}</div>
                        <input type="number" min="0" class="score-input" v-model.number="scoreForm.away" />
                    </div>
                </div>

                <!-- Versus BO3 (set) -->
                <div v-else-if="kind === 'versus' && isBo3" class="bo3-editor">
                    <div class="bo3-head">
                        <span>{{ cap(homeC?.name) ?? 'Home' }}</span>
                        <span></span>
                        <span>{{ cap(awayC?.name) ?? 'Away' }}</span>
                    </div>
                    <div v-for="(s, i) in setsForm" :key="i" class="bo3-row">
                        <input type="number" min="0" class="score-input sm" v-model.number="s.home" />
                        <span class="bo3-label">Set {{ i + 1 }}<button v-if="setsForm.length > 1" class="set-x" @click="removeSet(i)">×</button></span>
                        <input type="number" min="0" class="score-input sm" v-model.number="s.away" />
                    </div>
                    <button v-if="setsForm.length < 3" class="add-set" @click="addSet">+ Tambah Set</button>
                    <p class="bo3-current">Set dimenangkan: <b :class="{ win: bo3Home > bo3Away }">{{ bo3Home }}</b> – <b :class="{ win: bo3Away > bo3Home }">{{ bo3Away }}</b></p>
                </div>

                <!-- Ranking -->
                <div v-else class="rank-editor">
                    <div v-for="p in (match.participants ?? [])" :key="p.id" class="rank-edit-row">
                        <ContingentLogo :contingent="p.contingent" :size="32" :radius="8" />
                        <span class="rank-name">{{ cap(p.contingent?.name) ?? '—' }}</span>
                        <input class="score-input rank-in" :placeholder="rankPlaceholder" v-model="rankValues[p.contingent_id ?? p.contingent?.id]" />
                    </div>
                    <p class="rank-hint">{{ rankHint }}</p>
                </div>

                <!-- Adu penalti (fase gugur, skor imbang) -->
                <div v-if="needPenalty" class="penalty-box">
                    <div class="penalty-title">⚽ Adu Penalti — skor imbang di fase gugur</div>
                    <div class="penalty-inputs">
                        <input type="number" min="0" class="score-input sm" v-model.number="penaltyForm.home" />
                        <span class="penalty-sep">–</span>
                        <input type="number" min="0" class="score-input sm" v-model.number="penaltyForm.away" />
                    </div>
                    <p class="penalty-hint">Wajib ada pemenang (skor adu penalti harus berbeda). Pemenang ditentukan server.</p>
                </div>

                <div class="scoring-actions">
                    <AppButton variant="secondary" :loading="savingScore" @click="saveScore">💾 Simpan Skor</AppButton>
                    <AppButton variant="primary" @click="showFinish = true">🏁 Selesaikan</AppButton>
                </div>
            </AppCard>

            <!-- ── Scoreboard / hasil pertandingan (read-only) ─────────────── -->
            <AppCard v-if="match && !isScoring" :class="['scoreboard', { 'is-final': match.status === 'finished' }]">
                <div class="scoreboard-status">
                    <template v-if="match.status === 'finished'">
                        <span class="dot dot-final" /> Hasil Akhir
                    </template>
                    <template v-else-if="match.status === 'ongoing'">
                        <span class="pulse-dot" /> Sedang Berlangsung
                    </template>
                    <template v-else>
                        <span class="dot" /> {{ statusLabel(match.status) }}
                    </template>
                </div>

                <!-- VERSUS: home vs away -->
                <div v-if="kind === 'versus'" class="versus">
                    <div :class="['vs-side', { winner: versusWinner === 'home' }]">
                        <ContingentLogo :contingent="homeC" :size="56" :radius="14" />
                        <div class="vs-name">{{ cap(homeC?.name) ?? 'Kontingen A' }}</div>
                        <AppBadge size="sm" color="info">Home</AppBadge>
                    </div>
                    <div class="vs-score">
                        <template v-if="hasResult">
                            <span :class="{ win: versusWinner === 'home' }">{{ homeScore }}</span>
                            <span class="sep">:</span>
                            <span :class="{ win: versusWinner === 'away' }">{{ awayScore }}</span>
                        </template>
                        <span v-else class="vs-pending">VS</span>
                    </div>
                    <div :class="['vs-side', { winner: versusWinner === 'away' }]">
                        <ContingentLogo :contingent="awayC" :size="56" :radius="14" />
                        <div class="vs-name">{{ cap(awayC?.name) ?? 'Kontingen B' }}</div>
                        <AppBadge size="sm" color="default">Away</AppBadge>
                    </div>
                </div>

                <!-- Adu penalti (read-only) -->
                <div v-if="kind === 'versus' && penalty" class="pen-line">
                    <span class="pen-tag">Adu Penalti</span>
                    <b :class="{ win: versusWinner === 'home' }">{{ penalty.home }}</b>
                    <span class="pen-dash">–</span>
                    <b :class="{ win: versusWinner === 'away' }">{{ penalty.away }}</b>
                </div>

                <!-- Set breakdown (BO3) -->
                <div v-if="kind === 'versus' && sets.length" class="sets">
                    <div v-for="(s, i) in sets" :key="i" class="set-cell">
                        <span class="set-label">Set {{ i + 1 }}</span>
                        <span class="set-score"><b :class="{ win: s.home > s.away }">{{ s.home }}</b>–<b :class="{ win: s.away > s.home }">{{ s.away }}</b></span>
                    </div>
                </div>

                <!-- RANKING: urutan kontingen -->
                <div v-else-if="kind === 'ranking'" class="ranking">
                    <template v-if="hasResult">
                        <div v-for="r in rankingRows" :key="r.contingent_id" class="rank-row">
                            <span class="rank-pos" :data-medal="r.rank <= 3">{{ medalEmoji(r.rank) || r.rank }}</span>
                            <ContingentLogo :contingent="contingentMap[r.contingent_id]" :size="32" :radius="8" />
                            <span class="rank-name">{{ cap(contingentMap[r.contingent_id]?.name) ?? '—' }}</span>
                            <span class="rank-val">{{ formatRankValue(r.result) }}</span>
                        </div>
                    </template>
                    <template v-else>
                        <div v-for="p in (match.participants ?? [])" :key="p.id" class="rank-row">
                            <ContingentLogo :contingent="p.contingent" :size="32" :radius="8" />
                            <span class="rank-name">{{ cap(p.contingent?.name) ?? '—' }}</span>
                        </div>
                        <AppEmptyState v-if="!(match.participants?.length)" title="Belum ada kontingen" size="sm" />
                    </template>
                </div>

                <div v-if="result?.notes" class="result-notes">📝 {{ result.notes }}</div>
                <div v-if="canScore && ['scheduled','postponed'].includes(match.status)" class="score-hint">
                    💡 Ubah status ke <strong>Berlangsung</strong> (menu "Ubah Status") untuk mulai melakukan penilaian.
                </div>
                <div v-if="canRequestChange && match.status === 'finished' && hasResult" class="change-req-bar">
                    <AppButton variant="secondary" size="sm" @click="openChangeReq">
                        <template #icon><FileEdit :size="14" /></template> Ajukan Perubahan Skor
                    </AppButton>
                    <span class="change-req-hint">Perubahan skor pertandingan yang sudah selesai harus diajukan dengan keterangan & disetujui panitia besar.</span>
                </div>
            </AppCard>

            <!-- ── Medali ──────────────────────────────────────────────────── -->
            <AppCard v-if="medals.length">
                <h2 class="section-title">🏆 Perolehan Medali</h2>
                <div class="medal-list">
                    <div v-for="m in medalsSorted" :key="m.id" class="medal-item">
                        <span class="medal-icon">{{ medalIconByName(m.medal) }}</span>
                        <div class="medal-body">
                            <span class="medal-cont">{{ cap(m.contingent?.name) ?? '—' }}</span>
                            <span v-if="m.participant?.person?.nama_lengkap" class="medal-person">{{ cap(m.participant.person.nama_lengkap) }}</span>
                        </div>
                        <AppBadge :color="medalColor(m.medal)" size="sm">{{ medalLabel(m.medal) }}</AppBadge>
                    </div>
                </div>
            </AppCard>

            <AppTabs v-if="match" v-model="activeTab" variant="underline" :tabs="tabs">
                <!-- Susunan Tim: ofisial + atlet per kontingen -->
                <template #lineup>
                    <div v-if="loadingExtra" class="muted">Memuat…</div>
                    <div v-else-if="!squadEmpty" class="lineup-groups">
                        <div v-for="g in squadGroups" :key="g.contingent_id" class="lineup-group">
                            <div class="lineup-head">
                                <ContingentLogo :wilayah-kode="g.wilayah_kode" :short-name="g.short_name" :size="32" :radius="8" />
                                <span>{{ cap(g.name) ?? '—' }}</span>
                                <AppBadge v-if="g.side" :color="g.side === 'home' ? 'info' : 'default'" size="sm">{{ g.side === 'home' ? 'Home' : 'Away' }}</AppBadge>
                                <span class="lineup-count">{{ g.athletes.length }} atlet</span>
                                <AppButton
                                    v-if="canEditLineupFor(g.contingent_id) && lineupEditable"
                                    class="lineup-add" size="xs" variant="ghost"
                                    @click="openAddLineup(g)"
                                >
                                    <Plus :size="14" /> Atlet
                                </AppButton>
                            </div>

                            <!-- Ofisial -->
                            <div v-if="g.officials.length" class="official-block">
                                <div class="block-label">Ofisial</div>
                                <div v-for="o in g.officials" :key="o.id" class="official-row">
                                    <span class="off-avatar">{{ initials(o.person?.nama_lengkap) }}</span>
                                    <span class="official-name">{{ cap(o.person?.nama_lengkap) ?? '—' }}</span>
                                    <AppBadge :color="roleBadge(o.role)" size="sm">{{ roleLabel(o.role) }}</AppBadge>
                                </div>
                            </div>

                            <!-- Atlet -->
                            <div v-if="g.athletes.length" class="lineup-athletes">
                                <div class="block-label">Atlet</div>
                                <div v-for="a in g.athletes" :key="a.id" class="athlete-row">
                                    <span class="jersey">{{ a.jersey_number ?? '–' }}</span>
                                    <span class="athlete-name">{{ cap(a.name) ?? '—' }}</span>
                                    <span v-if="a.gender" class="athlete-gender">{{ a.gender === 'male' ? 'Putra' : a.gender === 'female' ? 'Putri' : a.gender }}</span>
                                    <button
                                        v-if="canEditLineupFor(g.contingent_id) && lineupEditable"
                                        class="lineup-del" title="Keluarkan dari susunan"
                                        :disabled="removingId === a.id"
                                        @click="removeLineup(a.id)"
                                    >
                                        <Trash2 :size="13" />
                                    </button>
                                </div>
                            </div>

                            <div v-if="!g.officials.length && !g.athletes.length" class="empty-mini">Belum ada ofisial / atlet</div>
                        </div>
                    </div>
                    <AppEmptyState v-else title="Belum ada susunan tim" description="Ofisial & atlet belum didaftarkan untuk pertandingan ini." size="sm" />
                </template>

                <!-- Riwayat hasil (timeline) -->
                <template #riwayat>
                    <div v-if="loadingExtra" class="muted">Memuat…</div>
                    <div v-else-if="historyEntries.length" class="history">
                        <div v-for="(h, i) in historyEntries" :key="i" class="hist-row">
                            <span class="hist-dot" :class="h.kind" />
                            <div class="hist-body">
                                <div class="hist-top">
                                    <span class="hist-score">
                                        <template v-if="h.kind === 'update'"><span class="hist-from">{{ h.from }}</span> → <b>{{ h.to }}</b></template>
                                        <template v-else><b>{{ h.to }}</b></template>
                                    </span>
                                    <span class="hist-time">{{ formatTime(h.time) }}</span>
                                </div>
                                <div class="hist-meta">
                                    <span class="hist-tag">{{ h.kind === 'created' ? '✍️ Hasil pertama diinput' : (h.reason || 'Pembaruan skor') }}</span>
                                    <span v-if="h.by" class="hist-by"> · oleh {{ h.by }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <AppEmptyState v-else title="Belum ada riwayat hasil" description="Riwayat muncul setelah skor diinput atau diperbarui." size="sm" />
                </template>

                <!-- Juri -->
                <template #juri>
                    <div v-if="canManageJudges" class="juri-toolbar">
                        <span class="juri-toolbar__hint">{{ judges.length }} juri ditugaskan</span>
                        <AppButton
                            v-if="matchEditable"
                            size="sm" variant="primary"
                            @click="openAddJudge"
                        >+ Tambah Juri</AppButton>
                        <span v-else class="juri-toolbar__lock">Penugasan hanya saat status Terjadwal/Ditunda</span>
                    </div>
                    <div v-if="loadingExtra" class="muted">Memuat…</div>
                    <div v-else-if="judges.length" class="judge-list">
                        <div v-for="j in judges" :key="j.id" class="judge-item">
                            <div class="judge-avatar">{{ initials(j.user?.name) }}</div>
                            <div class="judge-body">
                                <span class="judge-name">{{ j.user?.name ?? '—' }}</span>
                                <span class="judge-email">{{ j.user?.email ?? '' }}</span>
                            </div>
                            <AppBadge color="primary" size="sm">{{ j.role ?? 'Juri' }}</AppBadge>
                            <button
                                v-if="canManageJudges && matchEditable"
                                type="button" class="juri-del" title="Lepas juri"
                                @click="removeJudge(j)"
                            ><Trash2 :size="14" /></button>
                        </div>
                    </div>
                    <AppEmptyState v-else title="Belum ada juri ditugaskan" size="sm" />
                </template>

                <!-- Info -->
                <template #info>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Cabor</span><span class="info-value">{{ match.sport_category?.sport?.name ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Sub-cabor</span><span class="info-value">{{ match.sport_category?.name ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Venue</span><span class="info-value">{{ match.venue?.name ?? '—' }}<template v-if="match.venue?.address"> — {{ match.venue.address }}</template></span></div>
                        <div class="info-item"><span class="info-label">Jadwal</span><span class="info-value">{{ formatSchedule(match.scheduled_at) }}</span></div>
                        <div class="info-item"><span class="info-label">Ronde</span><span class="info-value">{{ match.round ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Durasi</span><span class="info-value">{{ match.duration_minutes ? match.duration_minutes + ' menit' : '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Dibuat oleh</span><span class="info-value">{{ match.created_by?.name ?? '—' }}</span></div>
                        <div class="info-item"><span class="info-label">Catatan</span><span class="info-value">{{ match.notes ?? '—' }}</span></div>
                    </div>
                </template>
            </AppTabs>
        </div>

        <AppModal v-model="showConfirm" :title="`Ubah status → ${pendingLabel}`" size="sm">
            <p style="font-size:13px;color:var(--color-text-muted)">
                Konfirmasi ubah status <strong>{{ match?.match_code }}</strong> menjadi <strong>{{ pendingLabel }}</strong>?
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="showConfirm = false">Batal</AppButton>
                <AppButton variant="primary" :loading="changing" @click="applyStatus">Konfirmasi</AppButton>
            </template>
        </AppModal>

        <AppModal v-model="showFinish" title="Selesaikan Pertandingan?" size="sm">
            <p style="font-size:13px;color:var(--color-text-muted)">
                Skor saat ini akan dikunci sebagai <strong>hasil akhir</strong> {{ match?.match_code }} dan status menjadi <strong>Selesai</strong>. Hasil masih dapat diralat setelahnya. Lanjutkan?
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="showFinish = false">Batal</AppButton>
                <AppButton variant="primary" :loading="finishing" @click="finishMatch">Ya, Selesaikan</AppButton>
            </template>
        </AppModal>

        <AppModal v-model="showAddJudge" title="Tambah Juri" size="sm">
            <div class="add-judge">
                <AppSelectSearch
                    v-model="judgePick"
                    label="Juri (sesuai keahlian cabor)"
                    placeholder="Pilih juri"
                    :loading="loadingJudgeOpts"
                    :options="judgeOptions"
                />
                <p v-if="!loadingJudgeOpts && !judgeOptions.length" class="add-judge__empty">
                    Belum ada juri ber-keahlian untuk cabor <strong>{{ match?.sport_category?.sport?.name ?? '—' }}</strong>.
                    Tambahkan keahlian dulu di menu <strong>Juri</strong> (Keahlian).
                </p>
                <AppSelectSearch
                    v-model="judgeRole"
                    label="Peran"
                    placeholder="Pilih peran"
                    :options="ROLE_OPTIONS"
                />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showAddJudge = false">Batal</AppButton>
                <AppButton variant="primary" :loading="savingJudge" :disabled="!judgePick" @click="addJudge">Tugaskan</AppButton>
            </template>
        </AppModal>

        <AppModal v-model="showAddLineup" :title="`Tambah Atlet — ${cap(lineupTarget?.name) ?? 'Kontingen'}`" size="sm">
            <div class="add-lineup">
                <AppSelectSearch
                    v-model="lineupPick"
                    label="Atlet (terdaftar di sub-cabor ini)"
                    placeholder="Pilih atlet"
                    :loading="loadingLineupOpts"
                    :options="lineupOptions"
                />
                <p v-if="!loadingLineupOpts && !lineupOptions.length" class="add-lineup__empty">
                    Tidak ada atlet yang bisa ditambahkan. Pastikan atlet sudah <strong>terdaftar &amp; disetujui</strong>
                    di sub-cabor <strong>{{ match?.sport_category?.name ?? '—' }}</strong> (menu Sub-Cabor → Daftarkan Atlet),
                    atau semua atlet sudah masuk susunan.
                </p>
                <label class="add-lineup__jersey">
                    <span>No. Punggung (opsional)</span>
                    <input v-model="lineupJersey" type="number" min="1" max="99" placeholder="—" />
                </label>
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showAddLineup = false">Batal</AppButton>
                <AppButton variant="primary" :loading="savingLineup" :disabled="!lineupPick" @click="saveLineup">Tambahkan</AppButton>
            </template>
        </AppModal>

        <!-- Modal Ajukan Perubahan Skor (pertandingan selesai) -->
        <AppModal v-model="showChangeReq" title="Ajukan Perubahan Skor" size="sm">
            <div class="chg-body">
                <p class="chg-hint">Usulkan hasil baru untuk <strong>{{ match?.match_code }}</strong>. Perubahan baru berlaku setelah disetujui panitia besar.</p>

                <!-- Ranking: nilai per kontingen -->
                <div v-if="kind === 'ranking'" class="chg-rank">
                    <div v-for="p in (match?.participants ?? [])" :key="p.id" class="chg-rank-row">
                        <span class="chg-rank-name">{{ cap(p.contingent?.name) ?? '—' }}</span>
                        <input class="chg-input chg-input--rank" :placeholder="rankPlaceholder" v-model="rankValues[p.contingent_id ?? p.contingent?.id]" />
                    </div>
                    <p class="chg-rank-hint">{{ rankHint }}</p>
                </div>

                <!-- BO3: per set -->
                <div v-else-if="isBo3" class="chg-sets">
                    <div v-for="(s, i) in setsForm" :key="i" class="chg-set-row">
                        <span class="chg-set-label">Set {{ i + 1 }}</span>
                        <input type="number" min="0" class="chg-input" v-model.number="s.home" />
                        <span class="chg-sep">–</span>
                        <input type="number" min="0" class="chg-input" v-model.number="s.away" />
                        <button v-if="setsForm.length > 1" type="button" class="chg-set-x" @click="removeSet(i)">×</button>
                    </div>
                    <AppButton v-if="setsForm.length < 3" size="xs" variant="ghost" @click="addSet">+ Set</AppButton>
                </div>

                <!-- Versus skor tunggal -->
                <div v-else class="chg-score">
                    <div class="chg-side">
                        <span class="chg-side-name">{{ cap(homeC?.name) ?? 'Home' }}</span>
                        <input type="number" min="0" class="chg-input" v-model.number="scoreForm.home" />
                    </div>
                    <span class="chg-colon">:</span>
                    <div class="chg-side">
                        <span class="chg-side-name">{{ cap(awayC?.name) ?? 'Away' }}</span>
                        <input type="number" min="0" class="chg-input" v-model.number="scoreForm.away" />
                    </div>
                </div>

                <!-- Adu penalti (fase gugur, imbang) -->
                <div v-if="needPenalty" class="chg-penalty">
                    <span class="chg-pen-label">⚽ Adu Penalti</span>
                    <input type="number" min="0" class="chg-input" v-model.number="penaltyForm.home" />
                    <span class="chg-sep">–</span>
                    <input type="number" min="0" class="chg-input" v-model.number="penaltyForm.away" />
                </div>

                <AppTextarea v-model="changeReason" label="Keterangan / Alasan Perubahan" :rows="3" placeholder="Wajib diisi — mis. koreksi salah input gol menit ke-80" />
            </div>
            <template #footer>
                <AppButton variant="secondary" @click="showChangeReq = false">Batal</AppButton>
                <AppButton variant="primary" :loading="submittingChange" :disabled="!changeReason.trim()" @click="submitChangeReq">Ajukan</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { Pencil, Trash2, Plus, FileEdit } from '@lucide/vue';
import api            from '@/lib/axios';
import { decodeId, encodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import { useToast }   from '@/Composables/useToast';
import { useAuth }    from '@/Composables/useAuth';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppBadge       from '@/Components/App/AppBadge.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import AppTabs        from '@/Components/App/AppTabs.vue';
import AppDropdown    from '@/Components/App/AppDropdown.vue';
import AppModal       from '@/Components/App/AppModal.vue';
import AppEmptyState  from '@/Components/App/AppEmptyState.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';
import AppTextarea    from '@/Components/App/AppTextarea.vue';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const { notFound } = useNotFound();
const toast = useToast();
const { user, isSuperAdmin, hasRole, can, kontingenId } = useAuth();
const realId = decodeId(props.id);

// ── State penilaian (scoring) ────────────────────────────────────────────────
const scoreForm   = reactive({ home: 0, away: 0 });
const setsForm    = ref<{ home: number; away: number }[]>([]);
const rankValues  = reactive<Record<number, string>>({});
const penaltyForm = reactive({ home: 0, away: 0 });
const savingScore = ref(false);
const finishing   = ref(false);
const showFinish  = ref(false);

// ── Pengajuan perubahan skor (pertandingan selesai) ──
const showChangeReq    = ref(false);
const changeReason     = ref('');
const submittingChange = ref(false);

const activeTab   = ref('lineup');
const tabs = [{ value: 'lineup', label: 'Susunan Tim' }, { value: 'juri', label: 'Juri' }, { value: 'riwayat', label: 'Riwayat' }, { value: 'info', label: 'Info' }];
const match       = ref<any>(null);
const result      = ref<any>(null);
const judges      = ref<any[]>([]);
const lineups     = ref<any[]>([]);
const officials   = ref<Record<number, any[]>>({});
const medals      = ref<any[]>([]);
const loadingExtra = ref(true);
const showConfirm = ref(false);
const pendingStatus = ref('');
const changing    = ref(false);

// ── Derived: kontingen map & jenis pertandingan ──────────────────────────────
const contingentMap = computed<Record<number, any>>(() => {
    const m: Record<number, any> = {};
    for (const p of match.value?.participants ?? []) {
        if (p.contingent) m[p.contingent_id ?? p.contingent.id] = p.contingent;
    }
    return m;
});

const scoringType = computed(() => result.value?.scoring_type ?? match.value?.sport_category?.scoring_type ?? null);
const kind = computed<'versus' | 'ranking'>(() => {
    const st = scoringType.value;
    if (st === 'score' || st === 'point') return 'versus';
    if (st === 'time' || st === 'distance' || st === 'rank') return 'ranking';
    // fallback: jika ada side home/away → versus
    return (match.value?.participants ?? []).some((p: any) => p.side) ? 'versus' : 'ranking';
});

const hasResult = computed(() => !!result.value?.result_data);

// Versus
const homeP = computed(() => (match.value?.participants ?? []).find((p: any) => p.side === 'home') ?? match.value?.participants?.[0] ?? null);
const awayP = computed(() => (match.value?.participants ?? []).find((p: any) => p.side === 'away') ?? match.value?.participants?.[1] ?? null);
const homeC = computed(() => homeP.value?.contingent ?? null);
const awayC = computed(() => awayP.value?.contingent ?? null);
const homeScore = computed(() => result.value?.result_data?.score?.home ?? result.value?.result_data?.home ?? 0);
const awayScore = computed(() => result.value?.result_data?.score?.away ?? result.value?.result_data?.away ?? 0);
const sets = computed<any[]>(() => result.value?.result_data?.sets ?? []);
const penalty = computed<{ home: number; away: number } | null>(() => result.value?.result_data?.penalty ?? null);
const versusWinner = computed(() => {
    if (!hasResult.value) return null;
    // Fase gugur: winner_side dari server (mis. hasil adu penalti) jadi acuan.
    const ws = result.value?.result_data?.winner_side;
    if (ws === 'home' || ws === 'away') return ws;
    if (homeScore.value === awayScore.value) return null;
    return homeScore.value > awayScore.value ? 'home' : 'away';
});

// Ranking
const rankingRows = computed<any[]>(() => {
    const ranks = result.value?.result_data?.ranks;
    if (Array.isArray(ranks)) return [...ranks].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    return [];
});

// Susunan tim per kontingen: ofisial (pelatih/official/manajer) + atlet (lineup).
// Basis = match.participants agar kontingen tetap tampil walau belum ada lineup.
const ROLE_ORDER: Record<string, number> = { manager: 0, coach: 1, official: 2 };
const squadGroups = computed(() => {
    const parts = match.value?.participants ?? [];
    return parts.map((p: any) => {
        const c = p.contingent;
        const cid = p.contingent_id ?? c?.id;
        const athletes = lineups.value
            .filter((l: any) => (l.match_participant?.contingent?.id ?? l.match_participant?.contingent_id) === cid)
            .map((l: any) => ({
                id: l.id,
                name: l.participant?.person?.nama_lengkap,
                gender: l.participant?.person?.jenis_kelamin,
                jersey_number: l.jersey_number,
            }))
            .sort((a: any, b: any) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99));
        const offs = [...(officials.value[cid] ?? [])]
            .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
        return { contingent_id: cid, match_participant_id: p.id, name: c?.name, short_name: c?.short_name, wilayah_kode: c?.wilayah_kode, side: p.side, athletes, officials: offs };
    });
});
const squadEmpty = computed(() => squadGroups.value.every((g: any) => !g.athletes.length && !g.officials.length));

// ── Editor lineup (susunan atlet per pertandingan) ───────────────────────────
// Hak: panitia/penilaian (results.manage) untuk semua kontingen; admin kontingen
// hanya kontingennya sendiri. Lihat MatchLineupController::canManageLineup di backend.
// Status yang mengizinkan ubah susunan: Terjadwal (semua yg berhak),
// Ditunda hanya super admin. Berlangsung/Selesai/Dibatalkan terkunci total.
const lineupEditable = computed(() => {
    const s = match.value?.status;
    if (s === 'scheduled') return true;
    if (s === 'postponed') return isSuperAdmin.value;
    return false;
});
function canEditLineupFor(cid: number): boolean {
    if (can('results.manage')) return true;
    return hasRole('admin_kontingen') && kontingenId.value != null && Number(kontingenId.value) === Number(cid);
}

const showAddLineup = ref(false);
const lineupTarget  = ref<{ contingent_id: number; match_participant_id: number; name?: string } | null>(null);
const lineupOptions = ref<{ value: number; label: string }[]>([]);
const loadingLineupOpts = ref(false);
const lineupPick    = ref<number | null>(null);
const lineupJersey  = ref<string>('');
const savingLineup  = ref(false);
const removingId    = ref<number | null>(null);

async function openAddLineup(g: any) {
    lineupTarget.value = { contingent_id: g.contingent_id, match_participant_id: g.match_participant_id, name: g.name };
    lineupPick.value = null;
    lineupJersey.value = '';
    showAddLineup.value = true;
    await fetchLineupOptions(g.contingent_id);
}

async function fetchLineupOptions(cid: number) {
    loadingLineupOpts.value = true;
    lineupOptions.value = [];
    const scId = match.value?.sport_category?.id ?? match.value?.sport_category_id;
    try {
        const res = await api.get('/api/v1/participants', {
            params: { contingent_id: cid, sport_category_id: scId, registration_status: 'approved', role: 'athlete', per_page: 200 },
        });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        // Buang atlet yang sudah ada di lineup kontingen ini.
        const taken = new Set(
            lineups.value
                .filter((l: any) => (l.match_participant?.contingent?.id ?? l.match_participant?.contingent_id) === cid)
                .map((l: any) => l.participant_id ?? l.participant?.id),
        );
        lineupOptions.value = list
            .filter(Boolean)
            .filter((p: any) => !taken.has(p.id))
            .map((p: any) => ({ value: p.id, label: cap(p.person?.nama_lengkap) ?? `Peserta #${p.id}` }));
    } catch {
        lineupOptions.value = [];
    } finally {
        loadingLineupOpts.value = false;
    }
}

async function saveLineup() {
    if (!lineupTarget.value || !lineupPick.value) return;
    savingLineup.value = true;
    try {
        await api.post(`/api/v1/matches/${realId}/lineups`, {
            match_participant_id: lineupTarget.value.match_participant_id,
            participant_id:       lineupPick.value,
            jersey_number:        lineupJersey.value ? Number(lineupJersey.value) : null,
        });
        toast.success('Atlet ditambahkan ke susunan');
        showAddLineup.value = false;
        await refreshLineups();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menambah atlet');
    } finally {
        savingLineup.value = false;
    }
}

async function removeLineup(lineupId: number) {
    removingId.value = lineupId;
    try {
        await api.delete(`/api/v1/matches/${realId}/lineups/${lineupId}`);
        toast.success('Atlet dikeluarkan dari susunan');
        await refreshLineups();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal mengeluarkan atlet');
    } finally {
        removingId.value = null;
    }
}

async function refreshLineups() {
    const ln = await safeGet(`/api/v1/matches/${realId}/lineups`);
    lineups.value = Array.isArray(ln) ? ln : [];
}

const medalOrder: Record<string, number> = { gold: 0, silver: 1, bronze: 2 };
const medalsSorted = computed(() => [...medals.value].sort((a, b) => (medalOrder[a.medal] ?? 9) - (medalOrder[b.medal] ?? 9)));

// ── Riwayat hasil (timeline) — dari result.logs + saat hasil dibuat ──────────
const historyEntries = computed(() => {
    const r = result.value;
    if (!r) return [];
    const logs = Array.isArray(r.logs) ? [...r.logs] : [];
    logs.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
    const entries: any[] = logs.map(l => ({
        kind:   'update',
        time:   l.changed_at,
        by:     l.changed_by?.name ?? null,
        reason: l.reason,
        from:   scoreSummary(l.old_data),
        to:     scoreSummary(l.new_data),
    }));
    // Baris paling bawah = saat hasil pertama diinput (nilai awal = old_data log terlama, atau current bila belum pernah diubah).
    const firstData = logs.length ? logs[logs.length - 1].old_data : r.result_data;
    entries.push({
        kind: 'created',
        time: r.created_at,
        by:   r.inputted_by?.name ?? null,
        to:   scoreSummary(firstData),
    });
    return entries;
});

// ── Penilaian: hak akses & mode ──────────────────────────────────────────────
const isBo3 = computed(() => kind.value === 'versus' && !!match.value?.sport_category?.uses_bo3);
const isKnockout = computed(() => match.value?.stage === 'knockout');
// Adu penalti hanya untuk versus skor (bukan BO3) di fase gugur saat skor imbang.
const needPenalty = computed(() =>
    kind.value === 'versus' && !isBo3.value && isKnockout.value
    && scoringType.value === 'score'
    && Number(scoreForm.home) === Number(scoreForm.away)
);
const canScore = computed(() =>
    isSuperAdmin.value || judges.value.some(j => (j.user?.id ?? j.user_id) === user.value?.id)
);
// Penilaian hanya saat pertandingan berlangsung & oleh super admin / juri ditugaskan.
const isScoring = computed(() => match.value?.status === 'ongoing' && canScore.value);
// Pengajuan perubahan: juri ditugaskan / penilai / super admin. Berlaku untuk
// semua jenis laga (versus head-to-head maupun ranking).
const canRequestChange = computed(() => canScore.value || can('results.manage'));

const bo3Home = computed(() => setsForm.value.filter(s => (Number(s.home) || 0) > (Number(s.away) || 0)).length);
const bo3Away = computed(() => setsForm.value.filter(s => (Number(s.away) || 0) > (Number(s.home) || 0)).length);
const rankPlaceholder = computed(() =>
    scoringType.value === 'time' ? 'mm:ss.SS' : scoringType.value === 'distance' ? 'meter' : 'nilai'
);
const rankHint = computed(() =>
    scoringType.value === 'time'     ? 'Waktu terkecil = juara. Format bebas asal konsisten (mis. 00:51.23).'
    : scoringType.value === 'distance' ? 'Jarak terbesar (meter) = juara.'
    : 'Nilai terbesar = juara.'
);

// ── Status transitions (GUIDE_API.md §13) ────────────────────────────────────
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
    // Manajemen jadwal (panitia/super) boleh semua transisi; juri/penilai yang
    // ditugaskan hanya boleh ongoing/finished (mulai & selesaikan penilaian);
    // role lain = view-only → menu tidak muncul.
    const canManageSchedule = can('matches.manage');
    let targets = TRANSITIONS[cur] ?? [];
    if (!canManageSchedule) {
        if (!canScore.value) return [];
        targets = targets.filter(s => ['ongoing', 'finished'].includes(s));
    }
    return targets.map(s => ({
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
    fetchExtras();
}

async function safeGet(url: string) {
    try {
        const res = await api.get(url);
        const raw = res.data?.data;
        return Array.isArray(raw) ? raw.filter(Boolean) : raw;
    } catch { return null; }
}

async function fetchExtras() {
    loadingExtra.value = true;
    const [res, jd, ln, md] = await Promise.all([
        safeGet(`/api/v1/matches/${realId}/result`),
        safeGet(`/api/v1/matches/${realId}/judges`),
        safeGet(`/api/v1/matches/${realId}/lineups`),
        safeGet(`/api/v1/matches/${realId}/medals`),
    ]);
    result.value  = res ?? null;
    judges.value  = Array.isArray(jd) ? jd : [];
    lineups.value = Array.isArray(ln) ? ln : [];
    medals.value  = Array.isArray(md) ? md : [];
    await fetchOfficials();
    loadingExtra.value = false;
    syncScoreForm();
}

/** Ambil ofisial (pelatih/official/manajer) tiap kontingen utk cabor match ini.
 *  `sport_id` menyaring atlet keluar otomatis (atlet sport_id null). */
async function fetchOfficials() {
    const sportId = match.value?.sport_category?.sport_id ?? match.value?.sport_category?.sport?.id;
    const parts   = match.value?.participants ?? [];
    if (!sportId || !parts.length) { officials.value = {}; return; }
    const map: Record<number, any[]> = {};
    await Promise.all(parts.map(async (p: any) => {
        const cid = p.contingent_id ?? p.contingent?.id;
        if (cid == null) return;
        try {
            const res = await api.get('/api/v1/participants', { params: { contingent_id: cid, sport_id: sportId, per_page: 100 } });
            const raw  = res.data?.data;
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            map[cid] = list.filter(Boolean).filter((x: any) => x.role && x.role !== 'athlete');
        } catch { map[cid] = []; }
    }));
    officials.value = map;
}

/** Isi form penilaian dari hasil yang sudah ada (atau default kosong). */
function syncScoreForm() {
    const rd = result.value?.result_data;
    if (kind.value === 'versus') {
        if (isBo3.value) {
            setsForm.value = Array.isArray(rd?.sets) && rd.sets.length
                ? rd.sets.map((s: any) => ({ home: Number(s.home) || 0, away: Number(s.away) || 0 }))
                : [{ home: 0, away: 0 }];
        } else {
            scoreForm.home = Number(rd?.score?.home ?? rd?.home ?? 0);
            scoreForm.away = Number(rd?.score?.away ?? rd?.away ?? 0);
            penaltyForm.home = Number(rd?.penalty?.home ?? 0);
            penaltyForm.away = Number(rd?.penalty?.away ?? 0);
        }
    } else {
        const ranks = rd?.ranks;
        for (const p of match.value?.participants ?? []) {
            const cid = p.contingent_id ?? p.contingent?.id;
            if (cid == null) continue;
            const found = Array.isArray(ranks) ? ranks.find((r: any) => r.contingent_id === cid) : null;
            rankValues[cid] = found ? String(found.result ?? '') : (rankValues[cid] ?? '');
        }
    }
}

function addSet()      { if (setsForm.value.length < 3) setsForm.value.push({ home: 0, away: 0 }); }
function removeSet(i: number) { if (setsForm.value.length > 1) setsForm.value.splice(i, 1); }

/** Susun result_data sesuai jenis penilaian (sesuai shape backend). */
function buildResultData(): any {
    if (kind.value === 'versus') {
        if (isBo3.value) {
            const sets = setsForm.value.map(s => ({ home: Number(s.home) || 0, away: Number(s.away) || 0 }));
            const homeSets = sets.filter(s => s.home > s.away).length;
            const awaySets = sets.filter(s => s.away > s.home).length;
            return { home: homeSets, away: awaySets, score: { home: homeSets, away: awaySets }, sets };
        }
        const home = Number(scoreForm.home) || 0;
        const away = Number(scoreForm.away) || 0;
        const data: any = { home, away, score: { home, away } };
        // Fase gugur & skor imbang → sertakan adu penalti (winner_side diisi server).
        if (isKnockout.value && scoringType.value === 'score' && home === away) {
            data.penalty = { home: Number(penaltyForm.home) || 0, away: Number(penaltyForm.away) || 0 };
        }
        return data;
    }
    // ranking (time/distance/rank)
    const st = scoringType.value;
    const entries = (match.value?.participants ?? [])
        .map((p: any) => {
            const cid = p.contingent_id ?? p.contingent?.id;
            return { contingent_id: cid, value: rankValues[cid] ?? '' };
        })
        .filter((e: any) => e.value !== '' && e.value != null);
    entries.sort((a: any, b: any) =>
        st === 'time' ? String(a.value).localeCompare(String(b.value))
                      : (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0)
    );
    const ranks = entries.map((e: any, i: number) => ({ rank: i + 1, contingent_id: e.contingent_id, result: e.value }));
    return { result: entries[0]?.value ?? null, rank: ranks.map((r: any) => r.contingent_id), ranks };
}

async function saveScore(): Promise<boolean> {
    // Fase gugur tak boleh berakhir imbang — adu penalti wajib ada pemenang.
    if (needPenalty.value && Number(penaltyForm.home) === Number(penaltyForm.away)) {
        toast.error('Skor imbang di fase gugur — isi adu penalti dengan pemenang (skor berbeda).');
        return false;
    }
    savingScore.value = true;
    try {
        const result_data = buildResultData();
        if (result.value) await api.put(`/api/v1/matches/${realId}/result`,  { result_data });
        else              await api.post(`/api/v1/matches/${realId}/result`, { result_data });
        toast.success('Skor tersimpan');
        result.value = (await safeGet(`/api/v1/matches/${realId}/result`)) ?? result.value;
        return true;
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menyimpan skor');
        return false;
    } finally { savingScore.value = false; }
}

// ── Pengajuan perubahan skor (laga selesai) ──────────────────────────────────
function openChangeReq() {
    syncScoreForm();      // prefill dari hasil terkini
    changeReason.value = '';
    showChangeReq.value = true;
}
async function submitChangeReq() {
    if (!changeReason.value.trim()) return;
    if (needPenalty.value && Number(penaltyForm.home) === Number(penaltyForm.away)) {
        toast.error('Skor imbang di fase gugur — isi adu penalti dengan pemenang (skor berbeda).');
        return;
    }
    submittingChange.value = true;
    try {
        await api.post(`/api/v1/matches/${realId}/result-change-requests`, {
            new_data: buildResultData(),
            reason: changeReason.value.trim(),
        });
        toast.success('Pengajuan perubahan skor terkirim, menunggu persetujuan panitia besar.');
        showChangeReq.value = false;
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? e.response.data?.message ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal mengajukan perubahan');
        }
    } finally { submittingChange.value = false; }
}

async function finishMatch() {
    finishing.value = true;
    try {
        if (!result.value) {
            const ok = await saveScore();
            if (!ok) return;
        }
        await api.patch(`/api/v1/matches/${realId}/status`, { status: 'finished' });
        toast.success('Pertandingan diselesaikan');
        showFinish.value = false;
        fetchMatch();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menyelesaikan pertandingan');
    } finally { finishing.value = false; }
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
// ── Penugasan juri (super admin / panitia besar) ─────────────────────────────
const showAddJudge     = ref(false);
const judgePick        = ref('');
const judgeRole        = ref('');
const judgeOptions     = ref<{ value: string; label: string }[]>([]);
const loadingJudgeOpts = ref(false);
const savingJudge      = ref(false);
const ROLE_OPTIONS = [
    { value: 'Ketua Juri', label: 'Ketua Juri' },
    { value: 'Juri 1',     label: 'Juri 1' },
    { value: 'Juri 2',     label: 'Juri 2' },
    { value: 'Wasit',      label: 'Wasit' },
    { value: 'Hakim Garis', label: 'Hakim Garis' },
];
const canManageJudges = computed(() => isSuperAdmin.value || hasRole('panitia_besar'));
const matchEditable   = computed(() => ['scheduled', 'postponed'].includes(match.value?.status));

async function openAddJudge() {
    judgePick.value = '';
    judgeRole.value = 'Ketua Juri';
    showAddJudge.value = true;
    await fetchJudgeOptions();
}

/** Hanya juri yang punya keahlian (judge_sport_scope) cabor laga ini, belum ditugaskan. */
async function fetchJudgeOptions() {
    const sportId = match.value?.sport_category?.sport_id ?? match.value?.sport_category?.sport?.id;
    if (!sportId) { judgeOptions.value = []; return; }
    loadingJudgeOpts.value = true;
    try {
        const res = await api.get('/api/v1/judge-scopes', { params: { sport_id: sportId, per_page: 200 } });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const assigned = new Set(judges.value.map((j: any) => j.user?.id ?? j.user_id));
        judgeOptions.value = list
            .filter(Boolean)
            .filter((s: any) => s.user && !assigned.has(s.user.id))
            .map((s: any) => ({ value: String(s.user.id), label: s.user.name + (s.user.email ? ' · ' + s.user.email : '') }));
    } catch { judgeOptions.value = []; }
    finally { loadingJudgeOpts.value = false; }
}

async function addJudge() {
    if (!judgePick.value) return;
    savingJudge.value = true;
    try {
        await api.post(`/api/v1/matches/${realId}/judges`, { user_id: Number(judgePick.value), role: judgeRole.value || null });
        toast.success('Juri ditugaskan');
        showAddJudge.value = false;
        await fetchJudges();
    } catch (e: any) {
        const st = e?.response?.status;
        if (st === 409)      toast.error(e.response.data?.message ?? 'Juri bentrok jadwal di laga lain.');
        else if (st === 422) toast.error(e.response.data?.message ?? 'Juri tidak memenuhi syarat (keahlian/status).');
        else                 toast.error(e?.response?.data?.message ?? 'Gagal menugaskan juri');
    } finally { savingJudge.value = false; }
}

async function removeJudge(j: any) {
    try {
        await api.delete(`/api/v1/matches/${realId}/judges/${j.id}`);
        toast.success('Juri dilepas');
        await fetchJudges();
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal melepas juri');
    }
}

async function fetchJudges() {
    const jd = await safeGet(`/api/v1/matches/${realId}/judges`);
    judges.value = Array.isArray(jd) ? jd : [];
}

onMounted(fetchMatch);

// ── Formatters ───────────────────────────────────────────────────────────────
function cap(s?: string | null) { return s ? s.replace(/\b\w/g, c => c.toUpperCase()) : s ?? null; }
function initials(name?: string | null) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}
function formatRankValue(v: any) {
    if (v == null || v === '') return '—';
    return String(v);
}
/** Ringkas result_data jadi string pendek utk timeline riwayat. */
function scoreSummary(data: any): string {
    if (!data) return '—';
    if (kind.value === 'versus') {
        if (Array.isArray(data.sets) && data.sets.length) {
            const hs = data.sets.filter((s: any) => (+s.home || 0) > (+s.away || 0)).length;
            const as = data.sets.filter((s: any) => (+s.away || 0) > (+s.home || 0)).length;
            return `${hs}–${as} set`;
        }
        const h = data.score?.home ?? data.home ?? 0;
        const a = data.score?.away ?? data.away ?? 0;
        return `${h} : ${a}`;
    }
    const ranks = data.ranks;
    if (Array.isArray(ranks) && ranks.length) {
        const top  = ranks.find((r: any) => r.rank === 1) ?? ranks[0];
        const name = contingentMap.value[top.contingent_id]?.short_name ?? contingentMap.value[top.contingent_id]?.name ?? `#${top.contingent_id}`;
        return `🥇 ${cap(name)} · ${ranks.length} peringkat`;
    }
    return '—';
}
function roleLabel(r?: string) {
    return ({ athlete: 'Atlet', coach: 'Pelatih', official: 'Official', manager: 'Manajer' } as Record<string,string>)[r ?? ''] ?? (r ?? '—');
}
function roleBadge(r?: string): 'success' | 'info' | 'warning' | 'primary' | 'default' {
    return ({ athlete: 'success', coach: 'info', official: 'warning', manager: 'primary' } as Record<string, 'success' | 'info' | 'warning' | 'primary'>)[r ?? ''] ?? 'default';
}
// Timestamp nyata (riwayat: changed_at/created_at) → konversi ke zona lokal benar.
function formatTime(dt: string) {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? dt : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
// scheduled_at = WALL-CLOCK (backend UTC tanpa makna zona). Tampilkan apa adanya,
// JANGAN konversi (new Date() langsung menggeser +7 → 15:13 jadi 22:13).
function formatSchedule(dt: string) {
    if (!dt) return '—';
    const m = String(dt).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return dt;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
function medalEmoji(rank: number) {
    return ({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number,string>)[rank] ?? '';
}
function medalIconByName(m: string) {
    return ({ gold: '🥇', silver: '🥈', bronze: '🥉' } as Record<string,string>)[m] ?? '🏅';
}
function medalLabel(m: string) {
    return ({ gold: 'Emas', silver: 'Perak', bronze: 'Perunggu' } as Record<string,string>)[m] ?? m;
}
function medalColor(m: string) {
    return ({ gold: 'warning', silver: 'default', bronze: 'danger' } as Record<string, 'warning' | 'default' | 'danger'>)[m] ?? 'default';
}
</script>

<style scoped>
.page-wrap      { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.match-header   { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.match-info     { flex: 1; }
.match-code     { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--color-text-subtle); letter-spacing: 0.08em; margin-bottom: 4px; }
.match-name     { font-size: 20px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 8px; }
.match-meta     { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-text-muted); flex-wrap: wrap; }
.meta-chip      { white-space: nowrap; }
.match-actions  { display: flex; gap: 8px; flex-shrink: 0; }

/* Scoreboard */
.scoreboard          { position: relative; }
.scoreboard.is-final { border-color: var(--color-accent); }
.scoreboard-status   { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-subtle); margin-bottom: 16px; }
.dot                 { width: 7px; height: 7px; border-radius: 50%; background: var(--color-text-subtle); display: inline-block; }
.dot-final           { background: var(--color-accent); }

.versus       { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
.vs-side      { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 8px; border-radius: 12px; transition: background .2s; }
.vs-side.winner { background: var(--color-accent-subtle); }
.vs-name      { font-weight: 600; font-size: 14px; text-transform: capitalize; }
.vs-score     { display: flex; align-items: center; gap: 10px; font-size: 40px; font-weight: 800; font-family: var(--font-mono); color: var(--color-text-primary); }
.vs-score .sep { color: var(--color-text-subtle); font-weight: 400; }
.vs-score .win { color: var(--color-accent); }
.vs-pending   { font-size: 22px; font-weight: 700; color: var(--color-text-subtle); letter-spacing: 0.1em; }

.sets         { display: flex; justify-content: center; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
.set-cell     { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 8px; min-width: 64px; }
.set-label    { font-size: 10px; font-weight: 600; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; }
.set-score    { font-family: var(--font-mono); font-size: 15px; font-weight: 700; }
.set-score b  { font-weight: 700; }
.set-score .win { color: var(--color-accent); }

.ranking      { display: flex; flex-direction: column; gap: 2px; }
.rank-row     { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--color-border); }
.rank-row:last-child { border-bottom: none; }
.rank-pos     { width: 28px; text-align: center; font-weight: 800; font-size: 14px; color: var(--color-text-muted); }
.rank-pos[data-medal="true"] { font-size: 18px; }
.rank-name    { flex: 1; font-weight: 600; font-size: 14px; text-transform: capitalize; }
.rank-val     { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--color-text-primary); }

.result-notes { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--color-border); font-size: 12.5px; color: var(--color-text-muted); }
.score-hint   { margin-top: 16px; padding: 10px 12px; border-radius: 8px; background: var(--color-accent-subtle); font-size: 12.5px; color: var(--color-text-muted); }
.change-req-bar { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.change-req-hint { font-size: 11.5px; color: var(--color-text-subtle); max-width: 420px; line-height: 1.45; }
.chg-body    { display: flex; flex-direction: column; gap: 14px; }
.chg-hint    { font-size: 12.5px; color: var(--color-text-muted); margin: 0; line-height: 1.5; }
.chg-score   { display: flex; align-items: flex-end; justify-content: center; gap: 14px; }
.chg-side    { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.chg-side-name { font-size: 12px; font-weight: 600; color: var(--color-text-primary); max-width: 120px; text-align: center; }
.chg-colon   { font-size: 22px; font-weight: 800; color: var(--color-text-subtle); padding-bottom: 6px; }
.chg-input   { width: 72px; text-align: center; font-family: var(--font-mono); font-size: 20px; font-weight: 800; padding: 6px 8px; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg-subtle); color: var(--color-text-primary); outline: none; }
.chg-input:focus { border-color: var(--color-accent); }
.chg-penalty { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px; border: 1.5px dashed var(--color-warning); border-radius: 10px; }
.chg-pen-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.chg-sep     { font-size: 16px; font-weight: 700; color: var(--color-text-subtle); }
.chg-sets    { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.chg-set-row { display: flex; align-items: center; gap: 8px; }
.chg-set-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); width: 48px; }
.chg-set-x   { border: none; background: transparent; color: var(--color-danger); cursor: pointer; font-size: 18px; line-height: 1; }
.chg-rank      { display: flex; flex-direction: column; gap: 8px; }
.chg-rank-row  { display: flex; align-items: center; gap: 10px; }
.chg-rank-name { flex: 1; font-size: 13px; color: var(--color-text-primary); min-width: 0; }
.chg-input--rank { width: 130px; font-size: 14px; font-weight: 600; text-align: left; }
.chg-rank-hint { font-size: 11.5px; color: var(--color-text-muted); margin: 2px 0 0; line-height: 1.4; }

/* Penilaian (scoring editor) */
.scoreboard.scoring  { border-color: var(--color-success); }
.scoring-status      { color: var(--color-success); }
.score-input         { width: 88px; text-align: center; font-family: var(--font-mono); font-size: 22px; font-weight: 800; padding: 6px 8px; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg-subtle); color: var(--color-text-primary); outline: none; }
.score-input:focus   { border-color: var(--color-accent); }
.score-input.sm      { width: 64px; font-size: 17px; }
.score-input.rank-in { width: 120px; font-size: 14px; font-weight: 600; }
.bo3-editor   { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.bo3-head     { display: grid; grid-template-columns: 64px 1fr 64px; gap: 16px; width: min(420px, 100%); text-align: center; font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: capitalize; }
.bo3-row      { display: grid; grid-template-columns: 64px 1fr 64px; gap: 16px; align-items: center; width: min(420px, 100%); }
.bo3-label    { text-align: center; font-size: 12px; font-weight: 600; color: var(--color-text-subtle); display: flex; align-items: center; justify-content: center; gap: 6px; }
.set-x        { border: none; background: var(--color-danger); color: #fff; width: 18px; height: 18px; border-radius: 50%; font-size: 13px; line-height: 1; cursor: pointer; }
.add-set      { border: 1.5px dashed var(--color-border); background: transparent; color: var(--color-text-muted); border-radius: 8px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.add-set:hover { border-color: var(--color-accent); color: var(--color-accent); }
.bo3-current  { font-size: 13px; color: var(--color-text-muted); margin-top: 4px; }
.bo3-current .win { color: var(--color-accent); }
.rank-editor  { display: flex; flex-direction: column; gap: 6px; }
.rank-edit-row { display: flex; align-items: center; gap: 12px; padding: 6px 4px; }
.rank-hint    { font-size: 12px; color: var(--color-text-subtle); margin-top: 6px; }
.scoring-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border); }

/* Adu penalti (editor) */
.penalty-box   { margin-top: 16px; padding: 14px; border: 1.5px dashed var(--color-warning); border-radius: 12px; background: color-mix(in srgb, var(--color-warning) 7%, transparent); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.penalty-title { font-size: 12.5px; font-weight: 700; color: var(--color-warning); }
.penalty-inputs{ display: flex; align-items: center; gap: 14px; }
.penalty-sep   { font-size: 20px; font-weight: 800; color: var(--color-text-subtle); }
.penalty-hint  { font-size: 11.5px; color: var(--color-text-muted); margin: 0; text-align: center; }
/* Adu penalti (read-only) */
.pen-line      { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--color-text-muted); }
.pen-tag       { font-family: var(--font-sans); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 12%, transparent); padding: 2px 8px; border-radius: 6px; }
.pen-line .win { color: var(--color-accent); }
.pen-dash      { color: var(--color-text-subtle); }

/* Medali */
.section-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; color: var(--color-text-primary); }
.medal-list    { display: flex; flex-direction: column; gap: 6px; }
.medal-item    { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--color-border); }
.medal-item:last-child { border-bottom: none; }
.medal-icon    { font-size: 22px; }
.medal-body    { flex: 1; display: flex; flex-direction: column; }
.medal-cont    { font-weight: 600; font-size: 13.5px; text-transform: capitalize; }
.medal-person  { font-size: 12px; color: var(--color-text-muted); text-transform: capitalize; }

/* Lineup */
.lineup-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; padding-top: 4px; }
.lineup-group  { border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden; }
.lineup-head   { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--color-surface-2, var(--color-accent-subtle)); font-weight: 600; font-size: 13.5px; text-transform: capitalize; }
.lineup-count  { margin-left: auto; font-size: 11px; font-weight: 500; color: var(--color-text-muted); text-transform: none; }
.lineup-athletes { display: flex; flex-direction: column; }
.block-label   { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-subtle); padding: 8px 12px 4px; border-top: 1px solid var(--color-border); }
.official-block { display: flex; flex-direction: column; }
.official-row  { display: flex; align-items: center; gap: 10px; padding: 7px 12px; }
.off-avatar    { width: 26px; height: 26px; border-radius: 50%; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.official-name { flex: 1; font-size: 13px; font-weight: 500; text-transform: capitalize; }
.empty-mini    { padding: 12px; font-size: 12.5px; color: var(--color-text-subtle); border-top: 1px solid var(--color-border); }
.athlete-row   { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-top: 1px solid var(--color-border); }
.block-label + .athlete-row { border-top: none; }
.jersey        { width: 26px; height: 26px; border-radius: 6px; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 12px; font-weight: 700; font-family: var(--font-mono); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.athlete-name  { flex: 1; font-size: 13px; font-weight: 500; text-transform: capitalize; }
.athlete-gender { font-size: 11px; color: var(--color-text-muted); }
.lineup-add    { text-transform: none; }
.lineup-del    { display: inline-flex; align-items: center; justify-content: center; padding: 4px; border: none; background: transparent; color: var(--color-text-subtle); border-radius: 6px; cursor: pointer; transition: color .12s, background .12s; }
.lineup-del:hover:not(:disabled) { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, transparent); }
.lineup-del:disabled { opacity: .5; cursor: default; }

/* Modal tambah atlet */
.add-lineup        { display: flex; flex-direction: column; gap: 14px; }
.add-lineup__empty { font-size: 12px; color: var(--color-text-muted); line-height: 1.5; margin: 0; }
.add-lineup__jersey { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.add-lineup__jersey input { padding: 9px 12px; border: 1px solid var(--color-border); border-radius: 8px; font-size: 13px; font-family: var(--font-sans); background: var(--color-bg); color: var(--color-text-primary); }
.add-lineup__jersey input:focus { outline: none; border-color: var(--color-accent); }

/* Juri */
.judge-list    { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
.judge-item    { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.judge-item:last-child { border-bottom: none; }
.judge-avatar  { width: 36px; height: 36px; border-radius: 50%; background: var(--color-accent-subtle); color: var(--color-accent); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.judge-body    { flex: 1; display: flex; flex-direction: column; }
.judge-name    { font-weight: 600; font-size: 13.5px; }
.judge-email   { font-size: 12px; color: var(--color-text-muted); }
.juri-toolbar  { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.juri-toolbar__hint { font-size: 12px; color: var(--color-text-muted); }
.juri-toolbar__lock { font-size: 11.5px; color: var(--color-text-subtle); font-style: italic; }
.juri-del      { border: none; background: transparent; color: var(--color-text-subtle); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background .12s, color .12s; }
.juri-del:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); }
.add-judge     { display: flex; flex-direction: column; gap: 14px; }
.add-judge__empty { font-size: 12px; color: var(--color-warning); margin: -6px 0 0; line-height: 1.45; }

/* Riwayat (timeline) */
.history     { display: flex; flex-direction: column; padding-top: 4px; }
.hist-row    { display: grid; grid-template-columns: 16px 1fr; gap: 12px; padding: 4px 0; position: relative; }
.hist-row::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: -4px; width: 2px; background: var(--color-border); }
.hist-row:last-child::before { display: none; }
.hist-dot    { width: 12px; height: 12px; border-radius: 50%; margin-top: 5px; background: var(--color-accent); border: 2px solid var(--color-surface, #fff); box-shadow: 0 0 0 1px var(--color-border); z-index: 1; }
.hist-dot.created { background: var(--color-text-subtle); }
.hist-body   { padding-bottom: 14px; }
.hist-top    { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.hist-score  { font-size: 14px; color: var(--color-text-muted); }
.hist-score b { font-family: var(--font-mono); font-weight: 800; color: var(--color-text-primary); }
.hist-from   { font-family: var(--font-mono); color: var(--color-text-subtle); }
.hist-time   { font-size: 12px; color: var(--color-text-subtle); white-space: nowrap; }
.hist-meta   { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.hist-by     { color: var(--color-text-subtle); }

.info-grid   { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.info-item   { display: flex; align-items: flex-start; gap: 12px; }
.info-label  { font-size: 12px; font-weight: 600; color: var(--color-text-muted); width: 100px; flex-shrink: 0; }
.info-value  { font-size: 13.5px; color: var(--color-text-primary); }

.muted       { font-size: 13px; color: var(--color-text-muted); padding: 12px 0; }
.pulse-dot   { display: inline-block; width: 7px; height: 7px; background: var(--color-success); border-radius: 50%; margin-right: 2px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
