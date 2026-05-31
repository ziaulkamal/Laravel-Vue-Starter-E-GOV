<template>
    <div ref="wrapRef" class="dp-wrap">
        <!-- Label -->
        <label v-if="label" class="dp-label">
            {{ label }}<span v-if="required" class="dp-label__req"> *</span>
        </label>

        <!-- Trigger -->
        <button
            type="button"
            class="dp-trigger"
            :class="{ 'dp-trigger--open': isOpen, 'dp-trigger--filled': !!displayText }"
            :disabled="disabled"
            @click="toggle"
        >
            <CalendarDays :size="15" class="dp-trigger__icon" />
            <span class="dp-trigger__text" :class="{ 'dp-trigger__text--ph': !displayText }">
                {{ displayText || placeholder }}
            </span>
            <button
                v-if="displayText"
                type="button"
                class="dp-trigger__clear"
                @click.stop="clear"
                tabindex="-1"
            >
                <X :size="13" />
            </button>
            <ChevronDown v-else :size="14" class="dp-trigger__chevron" :class="{ 'dp-trigger__chevron--up': isOpen }" />
        </button>

        <!-- Error -->
        <p v-if="error" class="dp-error">{{ error }}</p>

        <!-- Panel -->
        <Transition name="dp-fade">
            <div v-if="isOpen" class="dp-panel" :class="dropUp ? 'dp-panel--up' : ''">

                <!-- ── Header: nav bulan & tahun ── -->
                <div class="dp-head">
                    <button type="button" class="dp-nav" @click="prevMonth">
                        <ChevronLeft :size="15" />
                    </button>

                    <div class="dp-head__center">
                        <!-- Bulan — klik untuk grid, atau ketik nama/angka -->
                        <div class="dp-month-inp-wrap">
                            <input
                                ref="monthInputRef"
                                v-model="monthQuery"
                                class="dp-month-inp"
                                :placeholder="MONTHS_ID[viewMonth]"
                                maxlength="10"
                                autocomplete="off"
                                @click="openMonthGrid"
                                @input="viewMode = 'months'"
                                @keydown.enter.prevent="applyMonthQuery"
                                @keydown.escape.prevent="closeMonthGrid"
                            />
                            <span class="dp-month-inp__caret">
                                <ChevronDown :size="10" />
                            </span>
                        </div>

                        <!-- Tahun — ketik langsung -->
                        <div class="dp-year">
                            <button type="button" class="dp-year__nav" @click="viewYear--">
                                <ChevronLeft :size="11" />
                            </button>
                            <input
                                v-model.number="yearInput"
                                class="dp-year__input"
                                type="number"
                                min="1900"
                                max="2100"
                                @blur="applyYear"
                                @keydown.enter.prevent="applyYear"
                                @focus="($event.target as HTMLInputElement).select()"
                            />
                            <button type="button" class="dp-year__nav" @click="viewYear++">
                                <ChevronRight :size="11" />
                            </button>
                        </div>
                    </div>

                    <button type="button" class="dp-nav" @click="nextMonth">
                        <ChevronRight :size="15" />
                    </button>
                </div>

                <!-- ── Month picker — difilter saat mengetik ── -->
                <div v-if="viewMode === 'months'" class="dp-months">
                    <template v-if="filteredMonths.length">
                        <button
                            v-for="{ idx, name } in filteredMonths"
                            :key="idx"
                            type="button"
                            class="dp-month-btn"
                            :class="{ 'dp-month-btn--active': idx === viewMonth }"
                            @click="selectMonth(idx)"
                        >{{ name }}</button>
                    </template>
                    <p v-else class="dp-months__empty">Tidak ditemukan</p>
                </div>

                <!-- ── Calendar ── -->
                <template v-else>
                    <!-- Nama hari — mulai Senin -->
                    <div class="dp-weekdays">
                        <span v-for="d in DAYS_ID" :key="d" class="dp-weekday">{{ d }}</span>
                    </div>

                    <div class="dp-grid">
                        <button
                            v-for="cell in cells"
                            :key="cell.key"
                            type="button"
                            class="dp-day"
                            :class="{
                                'dp-day--outside':  cell.outside,
                                'dp-day--today':    cell.today,
                                'dp-day--selected': cell.selected,
                                'dp-day--weekend':  cell.weekend,
                            }"
                            :disabled="cell.disabled"
                            @click="selectDay(cell.date)"
                        >
                            {{ cell.day }}
                        </button>
                    </div>
                </template>

                <!-- ── Footer ── -->
                <div class="dp-footer">
                    <button type="button" class="dp-footer__today" @click="selectToday">
                        Hari Ini
                    </button>
                    <span v-if="displayText" class="dp-footer__selected">
                        {{ displayText }}
                    </span>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, X } from '@lucide/vue';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_ID   = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

interface Props {
    modelValue?: string | null   // format YYYY-MM-DD
    label?:      string
    placeholder?: string
    disabled?:   boolean
    required?:   boolean
    error?:      string | null
    minDate?:    string | null
    maxDate?:    string | null
    dropUp?:     boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:  null,
    label:       '',
    placeholder: 'Pilih tanggal...',
    disabled:    false,
    required:    false,
    error:       null,
    minDate:     null,
    maxDate:     null,
    dropUp:      false,
});

const emit = defineEmits<{ 'update:modelValue': [v: string | null] }>();

const wrapRef      = ref<HTMLElement | null>(null);
const monthInputRef= ref<HTMLInputElement | null>(null);
const isOpen       = ref(false);
const viewMode     = ref<'days' | 'months'>('days');
const monthQuery   = ref('');       // teks yang diketik di input bulan
const yearInput    = ref(0);        // nilai yang diketik di input tahun

const today     = new Date(); today.setHours(0, 0, 0, 0);
const viewYear  = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());

// Sync yearInput ↔ viewYear
watch(viewYear, v => { yearInput.value = v; }, { immediate: true });

// Bulan yang difilter berdasarkan query (nama atau angka 1-12)
const filteredMonths = computed(() => {
    const q = monthQuery.value.trim().toLowerCase();
    return MONTHS_ID
        .map((name, idx) => ({ idx, name }))
        .filter(({ idx, name }) => {
            if (!q) return true;
            const num = parseInt(q, 10);
            if (!isNaN(num)) return idx === num - 1;          // ketik angka 1-12
            return name.toLowerCase().startsWith(q);          // ketik nama
        });
});

function applyYear() {
    const y = Math.max(1900, Math.min(2100, yearInput.value || today.getFullYear()));
    viewYear.value  = y;
    yearInput.value = y;
}

function applyMonthQuery() {
    // Pilih hasil pertama yang cocok lalu kembali ke kalender
    if (filteredMonths.value.length >= 1) {
        viewMonth.value  = filteredMonths.value[0].idx;
        closeMonthGrid();
    }
}

function openMonthGrid() {
    monthQuery.value = '';
    viewMode.value   = 'months';
}

function selectMonth(idx: number) {
    viewMonth.value = idx;
    closeMonthGrid();
}

function closeMonthGrid() {
    viewMode.value   = 'days';
    monthQuery.value = '';
}

// Parse modelValue → seed view ke bulan/tahun yg dipilih
function parseValue(v: string | null | undefined): Date | null {
    if (!v) return null;
    const d = new Date(v + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function displayFormat(d: Date): string {
    const day  = String(d.getDate()).padStart(2, '0');
    const mon  = MONTHS_ID[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${mon} ${year}`;
}

const selected = computed(() => parseValue(props.modelValue));

const displayText = computed(() =>
    selected.value ? displayFormat(selected.value) : ''
);

function toggle() {
    if (props.disabled) return;
    isOpen.value = !isOpen.value;
    if (isOpen.value && selected.value) {
        viewYear.value  = selected.value.getFullYear();
        viewMonth.value = selected.value.getMonth();
    }
}

function clear() {
    emit('update:modelValue', null);
}

function selectDay(d: Date) {
    emit('update:modelValue', formatDate(d));
    isOpen.value = false;
}

function selectToday() {
    selectDay(new Date(today));
}

function prevMonth() {
    if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value--; }
    else viewMonth.value--;
}
function nextMonth() {
    if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++; }
    else viewMonth.value++;
}

// ── Bangun grid kalender (mulai Senin) ──────────────────────────
const cells = computed(() => {
    const result: any[] = [];
    const firstDay = new Date(viewYear.value, viewMonth.value, 1);
    // ISO: 0=Sun → ubah ke Mon-start: Mon=0…Sun=6
    let startDow = firstDay.getDay(); // 0=Sun,1=Mon,...
    startDow = startDow === 0 ? 6 : startDow - 1;

    // Isi tanggal bulan sebelumnya
    for (let i = startDow - 1; i >= 0; i--) {
        const d = new Date(viewYear.value, viewMonth.value, -i);
        result.push(makeCell(d, true));
    }

    const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        result.push(makeCell(new Date(viewYear.value, viewMonth.value, i), false));
    }

    // Isi tanggal bulan berikutnya agar grid penuh
    let next = 1;
    while (result.length % 7 !== 0) {
        result.push(makeCell(new Date(viewYear.value, viewMonth.value + 1, next++), true));
    }

    return result;
});

function makeCell(date: Date, outside: boolean) {
    const ts      = date.getTime();
    const todayTs = today.getTime();
    const selTs   = selected.value?.getTime();
    const dow     = date.getDay(); // 0=Sun,6=Sat
    const isWeekend = dow === 0 || dow === 6;

    const minTs = props.minDate ? new Date(props.minDate + 'T00:00:00').getTime() : null;
    const maxTs = props.maxDate ? new Date(props.maxDate + 'T00:00:00').getTime() : null;
    const disabled = (minTs !== null && ts < minTs) || (maxTs !== null && ts > maxTs);

    return {
        date, day: date.getDate(), key: ts, outside,
        today:    ts === todayTs,
        selected: ts === selTs,
        weekend:  isWeekend,
        disabled,
    };
}

// Close on outside click
function onOutside(e: MouseEvent) {
    if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) isOpen.value = false;
}
onMounted(() => document.addEventListener('mousedown', onOutside));
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside));
</script>

<style scoped>
.dp-wrap { position: relative; display: flex; flex-direction: column; gap: 5px; }

/* ── Label ── */
.dp-label      { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em; }
.dp-label__req { color: var(--color-danger); }
.dp-error      { font-size: 11.5px; color: var(--color-danger); margin-top: 2px; }

/* ── Trigger ── */
.dp-trigger {
    display: flex; align-items: center; gap: 8px;
    width: 100%; min-height: 38px; padding: 0 10px 0 12px;
    border: 1.5px solid var(--color-border); border-radius: 8px;
    background: var(--color-surface); cursor: pointer; text-align: left;
    font-family: var(--font-sans); font-size: 13.5px;
    color: var(--color-text-primary);
    transition: border-color 150ms ease, box-shadow 150ms ease;
    outline: none;
}
.dp-trigger:hover:not(:disabled) { border-color: var(--color-border-strong); }
.dp-trigger--open,
.dp-trigger:focus-visible {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent);
}
.dp-trigger:disabled { opacity: 0.55; cursor: not-allowed; background: var(--color-bg-subtle); }

.dp-trigger__icon    { color: var(--color-accent); flex-shrink: 0; }
.dp-trigger__text    { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-trigger__text--ph{ color: var(--color-text-subtle); }

.dp-trigger__clear {
    display: flex; align-items: center; border: none; background: transparent;
    cursor: pointer; color: var(--color-text-subtle); padding: 3px;
    border-radius: 4px; transition: color 120ms, background 120ms; flex-shrink: 0;
}
.dp-trigger__clear:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }

.dp-trigger__chevron { color: var(--color-text-subtle); flex-shrink: 0; transition: transform 200ms ease; }
.dp-trigger__chevron--up { transform: rotate(180deg); }

/* ── Panel ── */
.dp-panel {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 300;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
    padding: 14px;
    min-width: 300px;
    width: 300px;
}
.dp-panel--up { top: auto; bottom: calc(100% + 6px); }

/* ── Header ── */
.dp-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; gap: 6px;
}
.dp-head__center {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.dp-head__label {
    font-size: 14px; font-weight: 700; color: var(--color-text-primary);
    border: none; background: transparent; cursor: pointer;
    font-family: var(--font-sans); padding: 2px 8px; border-radius: 6px;
    transition: background 120ms;
    line-height: 1.2;
}
.dp-head__label:hover { background: var(--color-bg-subtle); }

/* Year navigation */
/* ── Month input ── */
.dp-month-inp-wrap {
    position: relative; display: flex; align-items: center;
}
.dp-month-inp {
    font-size: 14px; font-weight: 700; color: var(--color-text-primary);
    border: none; background: transparent; cursor: pointer;
    font-family: var(--font-sans); padding: 2px 20px 2px 8px;
    border-radius: 6px; outline: none; text-align: center;
    width: 108px;
    transition: background 120ms;
}
.dp-month-inp::placeholder { color: var(--color-text-primary); font-weight: 700; }
.dp-month-inp:hover, .dp-month-inp:focus {
    background: var(--color-bg-subtle);
    cursor: text;
}
.dp-month-inp__caret {
    position: absolute; right: 5px; color: var(--color-text-subtle);
    pointer-events: none; display: flex; align-items: center;
}

/* ── Year input ── */
.dp-year { display: flex; align-items: center; gap: 2px; }
.dp-year__input {
    font-size: 12px; font-weight: 600; color: var(--color-text-muted);
    width: 44px; text-align: center; border: none; background: transparent;
    font-family: var(--font-sans); outline: none; padding: 2px 4px; border-radius: 4px;
    /* Sembunyikan arrow number input */
    -moz-appearance: textfield;
    transition: background 100ms;
}
.dp-year__input::-webkit-outer-spin-button,
.dp-year__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.dp-year__input:hover, .dp-year__input:focus {
    background: var(--color-bg-subtle); color: var(--color-text-primary); cursor: text;
}
.dp-year__nav {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 4px; border: none;
    background: transparent; cursor: pointer; color: var(--color-text-subtle);
    transition: background 100ms;
}
.dp-year__nav:hover { background: var(--color-bg-subtle); color: var(--color-text-primary); }

.dp-nav {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 8px; border: none;
    background: transparent; cursor: pointer; color: var(--color-text-muted);
    transition: background 100ms, color 100ms; flex-shrink: 0;
}
.dp-nav:hover { background: var(--color-bg-subtle); color: var(--color-text-primary); }

/* ── Month picker grid ── */
.dp-months {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 6px;
}
.dp-month-btn {
    padding: 8px 4px; border-radius: 8px; border: none;
    background: transparent; cursor: pointer; font-size: 12.5px;
    font-family: var(--font-sans); color: var(--color-text-muted);
    transition: all 120ms;
}
.dp-month-btn:hover { background: var(--color-bg-subtle); color: var(--color-text-primary); }
.dp-month-btn--active {
    background: var(--color-accent); color: #fff; font-weight: 600;
}
.dp-month-btn--active:hover { background: var(--color-accent-hover); }
.dp-months__empty {
    grid-column: 1 / -1; text-align: center; padding: 16px 0;
    font-size: 12px; color: var(--color-text-subtle); margin: 0;
}

/* ── Weekday headers ── */
.dp-weekdays {
    display: grid; grid-template-columns: repeat(7, 1fr);
    margin-bottom: 4px;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 6px;
}
.dp-weekday {
    text-align: center; font-size: 10px; font-weight: 700;
    color: var(--color-text-subtle); text-transform: uppercase;
    letter-spacing: 0.04em; padding: 3px 0;
}

/* ── Day grid ── */
.dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }

.dp-day {
    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; border: none; background: transparent;
    font-size: 12.5px; font-family: var(--font-sans); cursor: pointer;
    color: var(--color-text-primary); transition: all 100ms ease;
    font-weight: 400;
}
.dp-day:hover:not(:disabled):not(.dp-day--selected) {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    color: var(--color-accent); font-weight: 600;
}
.dp-day--outside  { color: var(--color-text-subtle); opacity: 0.45; }
.dp-day--weekend:not(.dp-day--outside):not(.dp-day--selected) { color: var(--color-accent); }
.dp-day--today:not(.dp-day--selected) {
    font-weight: 800; border: 1.5px solid var(--color-accent);
    color: var(--color-accent);
}
.dp-day--selected {
    background: var(--color-accent) !important;
    color: #fff !important; font-weight: 700;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent) 40%, transparent);
}
.dp-day:disabled { opacity: 0.25; cursor: not-allowed; }

/* ── Footer ── */
.dp-footer {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 10px; padding-top: 10px;
    border-top: 1px solid var(--color-border);
}
.dp-footer__today {
    font-size: 12px; font-weight: 600; color: var(--color-accent);
    border: none; background: transparent; cursor: pointer;
    font-family: var(--font-sans); padding: 3px 8px; border-radius: 6px;
    transition: background 120ms;
}
.dp-footer__today:hover { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
.dp-footer__selected {
    font-size: 11.5px; color: var(--color-text-muted); font-weight: 500;
}

/* ── Transition ── */
.dp-fade-enter-active { transition: all 160ms cubic-bezier(0.16,1,0.3,1); }
.dp-fade-leave-active { transition: all 100ms ease; }
.dp-fade-enter-from, .dp-fade-leave-to { opacity: 0; transform: translateY(-8px) scale(0.97); }
</style>
