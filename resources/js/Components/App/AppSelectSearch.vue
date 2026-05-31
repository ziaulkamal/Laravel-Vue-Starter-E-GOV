<template>
    <div ref="wrapRef" class="ss-wrap" :class="{ 'ss-wrap--error': !!error }">
        <!-- Label -->
        <label v-if="label" class="ss-label">
            {{ label }}<span v-if="required" class="ss-required"> *</span>
        </label>

        <!-- Trigger -->
        <button
            type="button"
            class="ss-trigger"
            :class="{
                'ss-trigger--open':     isOpen,
                'ss-trigger--disabled': disabled,
                'ss-trigger--loading':  loading,
            }"
            :disabled="disabled"
            @click="toggleOpen"
        >
            <span class="ss-trigger__value" :class="{ 'ss-trigger__value--placeholder': !selectedLabel }">
                {{ selectedLabel || placeholder }}
            </span>

            <!-- Spinner saat loading -->
            <span v-if="loading" class="ss-spinner" />

            <!-- Chevron -->
            <svg v-else class="ss-chevron" :class="{ 'ss-chevron--up': isOpen }"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        </button>

        <!-- Dropdown panel -->
        <Transition name="ss-drop">
            <div v-if="isOpen" class="ss-panel">
                <!-- Search input -->
                <div class="ss-search">
                    <svg class="ss-search__icon" width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        ref="searchRef"
                        v-model="query"
                        class="ss-search__input"
                        :placeholder="searchPlaceholder"
                        @keydown.esc="close"
                        @keydown.enter.prevent="selectFirst"
                        @keydown.arrow-down.prevent="focusNext"
                        @keydown.arrow-up.prevent="focusPrev"
                    />
                    <button v-if="query" type="button" class="ss-search__clear" @click="query = ''">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <!-- Opsi -->
                <div class="ss-options" ref="listRef">
                    <!-- Placeholder/clear option -->
                    <button
                        v-if="placeholder && modelValue !== '' && modelValue !== null && modelValue !== undefined"
                        type="button"
                        class="ss-option ss-option--clear"
                        @click="select('', '')"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Hapus pilihan
                    </button>

                    <!-- Loading skeleton -->
                    <template v-if="loading">
                        <div v-for="i in 4" :key="i" class="ss-skeleton" />
                    </template>

                    <!-- Empty state -->
                    <div v-else-if="filtered.length === 0" class="ss-empty">
                        {{ query ? `Tidak ada hasil untuk "${query}"` : 'Tidak ada opsi' }}
                    </div>

                    <!-- Items -->
                    <button
                        v-for="(opt, idx) in filtered"
                        :key="opt.value"
                        type="button"
                        class="ss-option"
                        :class="{
                            'ss-option--active':  opt.value === modelValue,
                            'ss-option--focused': idx === focusIdx,
                        }"
                        :data-idx="idx"
                        @click="select(opt.value, opt.label)"
                        @mouseenter="focusIdx = idx"
                    >
                        <!-- Highlight matched text -->
                        <span v-html="highlight(opt.label)" class="ss-option__label" />
                        <!-- Checkmark jika terpilih -->
                        <svg v-if="opt.value === modelValue" class="ss-option__check"
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Footer info -->
                <div v-if="!loading && filtered.length > 0" class="ss-footer">
                    {{ filtered.length }} dari {{ options.length }} opsi
                </div>
            </div>
        </Transition>

        <!-- Error / hint -->
        <p v-if="error" class="ss-msg ss-msg--error">{{ error }}</p>
        <p v-else-if="hint" class="ss-msg ss-msg--hint">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

interface Option { value: string; label: string }

interface Props {
    modelValue?:       string
    options?:          Option[]
    label?:            string
    placeholder?:      string
    searchPlaceholder?: string
    error?:            string | null
    hint?:             string
    disabled?:         boolean
    required?:         boolean
    loading?:          boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:        '',
    options:           () => [],
    label:             '',
    placeholder:       'Pilih...',
    searchPlaceholder: 'Cari...',
    error:             '',
    hint:              '',
    disabled:          false,
    required:          false,
    loading:           false,
});

const emit = defineEmits<{
    'update:modelValue': [value: string]
    'change':            [value: string, label: string]
}>();

const wrapRef   = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const listRef   = ref<HTMLElement | null>(null);
const isOpen    = ref(false);
const query     = ref('');
const focusIdx  = ref(-1);

const selectedLabel = computed(() =>
    props.options.find(o => o.value === props.modelValue)?.label ?? ''
);

const filtered = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return props.options;
    return props.options.filter(o => o.label.toLowerCase().includes(q));
});

// Reset focusIdx saat filter berubah
watch(filtered, () => { focusIdx.value = -1; });

// Reset query saat ditutup
watch(isOpen, open => {
    if (!open) { query.value = ''; focusIdx.value = -1; }
});

function toggleOpen() {
    if (props.disabled) return;
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        nextTick(() => searchRef.value?.focus());
    }
}

function close() { isOpen.value = false; }

function select(value: string, label: string) {
    emit('update:modelValue', value);
    emit('change', value, label);
    close();
}

function selectFirst() {
    if (filtered.value.length === 0) return;
    const idx = focusIdx.value >= 0 ? focusIdx.value : 0;
    const opt = filtered.value[idx];
    if (opt) select(opt.value, opt.label);
}

function focusNext() {
    focusIdx.value = Math.min(focusIdx.value + 1, filtered.value.length - 1);
    scrollToFocused();
}

function focusPrev() {
    focusIdx.value = Math.max(focusIdx.value - 1, 0);
    scrollToFocused();
}

function scrollToFocused() {
    nextTick(() => {
        const el = listRef.value?.querySelector(`[data-idx="${focusIdx.value}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    });
}

// Highlight teks yang cocok dengan query
function highlight(text: string): string {
    const q = query.value.trim();
    if (!q) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="ss-mark">$1</mark>');
}

// Tutup saat klik di luar
function onOutsideClick(e: MouseEvent) {
    if (!wrapRef.value?.contains(e.target as Node)) close();
}
onMounted(() => document.addEventListener('mousedown', onOutsideClick));
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick));
</script>

<style scoped>
.ss-wrap  { position: relative; display: flex; flex-direction: column; gap: 5px; }

.ss-label    { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em; }
.ss-required { color: var(--color-danger); }

/* ── Trigger ── */
.ss-trigger {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    width: 100%; min-height: 38px; padding: 0 10px 0 12px;
    border: 1.5px solid var(--color-border); border-radius: 8px;
    background: var(--color-surface); cursor: pointer; text-align: left;
    font-family: var(--font-sans); font-size: 13.5px; color: var(--color-text-primary);
    transition: border-color 150ms ease, box-shadow 150ms ease;
    outline: none;
}
.ss-trigger:hover:not(.ss-trigger--disabled) { border-color: var(--color-border-strong); }
.ss-trigger--open,
.ss-trigger:focus-visible {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent);
}
.ss-trigger--disabled { opacity: 0.55; cursor: not-allowed; background: var(--color-bg-subtle); }

.ss-trigger__value           { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-trigger__value--placeholder { color: var(--color-text-subtle); }

.ss-chevron   { color: var(--color-text-subtle); flex-shrink: 0; transition: transform 200ms ease; }
.ss-chevron--up { transform: rotate(180deg); }

/* ── Spinner (loading) ── */
.ss-spinner {
    width: 14px; height: 14px; flex-shrink: 0;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: ss-spin 0.6s linear infinite;
}
@keyframes ss-spin { to { transform: rotate(360deg); } }

/* ── Dropdown panel ── */
.ss-panel {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 200;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 10px;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    display: flex; flex-direction: column;
    max-height: 320px;
}

/* ── Search ── */
.ss-search {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-subtle);
    flex-shrink: 0;
}
.ss-search__icon  { color: var(--color-text-subtle); flex-shrink: 0; }
.ss-search__input {
    flex: 1; border: none; background: transparent; outline: none;
    font-size: 13px; font-family: var(--font-sans);
    color: var(--color-text-primary);
}
.ss-search__input::placeholder { color: var(--color-text-subtle); }
.ss-search__clear {
    display: flex; align-items: center; justify-content: center;
    border: none; background: transparent; cursor: pointer;
    color: var(--color-text-subtle); padding: 2px; border-radius: 4px;
    transition: color 120ms, background 120ms;
}
.ss-search__clear:hover { color: var(--color-text-primary); background: var(--color-border); }

/* ── Options list ── */
.ss-options {
    overflow-y: auto; flex: 1;
    padding: 4px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
}

.ss-option {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    width: 100%; padding: 8px 10px;
    border: none; background: transparent; cursor: pointer; text-align: left;
    font-size: 13px; font-family: var(--font-sans); color: var(--color-text-primary);
    border-radius: 6px; transition: background 80ms;
    outline: none;
}
.ss-option:hover,
.ss-option--focused { background: var(--color-bg-subtle); }
.ss-option--active  {
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    color: var(--color-accent); font-weight: 500;
}
.ss-option--active:hover,
.ss-option--active.ss-option--focused {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}
.ss-option--clear { color: var(--color-text-muted); font-size: 12px; gap: 6px; }
.ss-option--clear:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 6%, transparent); }
.ss-option__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-option__check { color: var(--color-accent); flex-shrink: 0; }

/* Highlight match */
:deep(.ss-mark) {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
    color: var(--color-accent);
    border-radius: 2px;
    font-weight: 600;
    font-style: normal;
}

/* ── Skeleton loading ── */
.ss-skeleton {
    height: 34px; border-radius: 6px; margin: 2px 4px;
    background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%);
    background-size: 200% 100%;
    animation: ss-shimmer 1.2s ease-in-out infinite;
}
@keyframes ss-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Empty ── */
.ss-empty {
    padding: 20px; text-align: center;
    font-size: 12.5px; color: var(--color-text-muted);
}

/* ── Footer ── */
.ss-footer {
    padding: 5px 12px;
    font-size: 11px; color: var(--color-text-subtle);
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-subtle);
    flex-shrink: 0;
}

/* ── Error/hint ── */
.ss-msg       { font-size: 11.5px; margin-top: 2px; }
.ss-msg--error{ color: var(--color-danger); }
.ss-msg--hint { color: var(--color-text-muted); }

/* ── Transition ── */
.ss-drop-enter-active { transition: opacity 120ms ease, transform 120ms ease; }
.ss-drop-leave-active { transition: opacity 80ms ease, transform 80ms ease; }
.ss-drop-enter-from,
.ss-drop-leave-to     { opacity: 0; transform: translateY(-6px); }
</style>
