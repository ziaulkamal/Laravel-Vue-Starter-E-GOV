<template>
    <div class="app-sel-wrap" :class="{ 'app-sel-wrap--error': !!error }">
        <label v-if="label" :for="selId" class="app-sel__label">
            {{ label }}<span v-if="required" style="color:var(--color-danger)"> *</span>
        </label>

        <div ref="rowRef" class="app-sel__row" :class="[`app-sel__row--${size}`, { 'app-sel__row--focused': isFocused, 'app-sel__row--open': isOpen }]">
            <!-- Prefix slot -->
            <span v-if="$slots.prefix" class="app-sel__prefix"><slot name="prefix" /></span>

            <!-- Native select -->
            <select
                v-if="native"
                :id="selId"
                v-bind="$attrs"
                class="app-sel__native"
                :value="modelValue"
                :disabled="disabled"
                :aria-invalid="!!error"
                @change="$emit('update:modelValue', $event.target.value)"
                @focus="isFocused = true"
                @blur="isFocused = false"
            >
                <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
                <option
                    v-for="opt in options"
                    :key="opt.value ?? opt"
                    :value="opt.value ?? opt"
                    :disabled="opt.disabled"
                >
                    {{ opt.label ?? opt }}
                </option>
            </select>

            <!-- Custom select trigger -->
            <button
                v-else
                :id="selId"
                type="button"
                class="app-sel__trigger"
                :disabled="disabled"
                :aria-haspopup="true"
                :aria-expanded="isOpen"
                @click="toggle"
                @keydown.esc="close"
                @keydown.space.prevent="toggle"
                @keydown.enter.prevent="toggle"
            >
                <ContingentLogo
                    v-if="selectedOption && selectedOption.logo"
                    :contingent="selectedOption.logo"
                    :size="20" :radius="5"
                    class="app-sel__lead"
                />
                <span class="app-sel__value" :class="{ 'app-sel__value--placeholder': !selectedLabel }">
                    {{ selectedLabel || placeholder }}
                </span>
            </button>

            <!-- Chevron -->
            <span class="app-sel__chevron" :class="{ 'app-sel__chevron--open': isOpen }" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </span>
        </div>

        <!-- Custom dropdown panel (teleported so it escapes modal/scroll clipping) -->
        <Teleport to="body">
        <Transition name="dropdown">
            <div
                v-if="!native && isOpen"
                ref="panelRef"
                class="app-sel__panel app-sel__panel--floating"
                role="listbox"
                :style="panelStyle"
                @keydown.esc="close"
            >
                <button
                    v-if="placeholder"
                    type="button"
                    class="app-sel__option app-sel__option--placeholder"
                    role="option"
                    :aria-selected="false"
                    @click="select('')"
                >
                    {{ placeholder }}
                </button>
                <button
                    v-for="opt in options"
                    :key="opt.value ?? opt"
                    type="button"
                    class="app-sel__option"
                    :class="{ 'app-sel__option--active': (opt.value ?? opt) === modelValue, 'app-sel__option--disabled': opt.disabled }"
                    role="option"
                    :aria-selected="(opt.value ?? opt) === modelValue"
                    :disabled="opt.disabled"
                    @click="select(opt.value ?? opt)"
                >
                    <span v-if="opt.icon" class="app-sel__opt-icon"><component :is="opt.icon" :size="14" /></span>
                    <ContingentLogo v-else-if="opt.logo" :contingent="opt.logo" :size="20" :radius="5" class="app-sel__lead" />
                    {{ opt.label ?? opt }}
                    <svg v-if="(opt.value ?? opt) === modelValue" class="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </button>
            </div>
        </Transition>
        </Teleport>

        <p v-if="error" class="app-sel__msg app-sel__msg--error" role="alert">{{ error }}</p>
        <p v-else-if="hint" class="app-sel__msg app-sel__msg--hint">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { AppSelectOption, AppSize } from '@/types';
import ContingentLogo from '@/Components/App/ContingentLogo.vue';

type SelectOptionRaw = AppSelectOption | string | number;

interface Props {
    modelValue?:  string | number | null
    options?:     SelectOptionRaw[]
    label?:       string
    placeholder?: string
    size?:        AppSize
    error?:       string | null
    hint?:        string
    disabled?:    boolean
    required?:    boolean
    native?:      boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:  '',
    options:     () => [],
    label:       '',
    placeholder: 'Select…',
    size:        'md',
    error:       '',
    hint:        '',
    disabled:    false,
    required:    false,
    native:      false,
});

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();
defineOptions({ inheritAttrs: false });

let _id = 0;
const selId     = `app-sel-${++_id}`;
const isFocused = ref(false);
const isOpen    = ref(false);
const rowRef    = ref<HTMLElement | null>(null);
const panelRef  = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const MAX_PANEL_H = 260;

function updatePanelPosition(): void {
    const el = rowRef.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    // open upward if not enough room below but more room above
    const openUp = spaceBelow < Math.min(MAX_PANEL_H, 180) && spaceAbove > spaceBelow;
    const style: Record<string, string> = {
        position: 'fixed',
        left: `${r.left}px`,
        width: `${r.width}px`,
        zIndex: '1100',
    };
    if (openUp) {
        style.bottom = `${window.innerHeight - r.top + 4}px`;
        style.maxHeight = `${Math.min(MAX_PANEL_H, spaceAbove - 8)}px`;
    } else {
        style.top = `${r.bottom + 4}px`;
        style.maxHeight = `${Math.min(MAX_PANEL_H, spaceBelow - 8)}px`;
    }
    panelStyle.value = style;
}

const selectedOption = computed<AppSelectOption | null>(() => {
    const opt = props.options.find(o => (typeof o === 'object' && o !== null ? (o as { value?: string | number }).value : o) === props.modelValue);
    return (typeof opt === 'object' && opt !== null) ? (opt as AppSelectOption) : null;
});

const selectedLabel = computed<string>(() => {
    const opt = props.options.find(o => (typeof o === 'object' && o !== null ? (o as { value?: string | number }).value : o) === props.modelValue);
    if (!opt) return '';
    return typeof opt === 'object' && opt !== null ? ((opt as { label?: string }).label ?? String(opt)) : String(opt);
});

function open(): void {
    isOpen.value = true;
    nextTick(updatePanelPosition);
}
function toggle(): void { isOpen.value ? close() : open(); }
function close(): void  { isOpen.value = false; }
function select(val: string | number): void {
    emit('update:modelValue', val);
    close();
}

function onOutsideClick(e: MouseEvent): void {
    const target = e.target as Element;
    if (target.closest('.app-sel-wrap') || target.closest('.app-sel__panel--floating')) return;
    close();
}
function onReposition(): void {
    if (isOpen.value) updatePanelPosition();
}
onMounted(() => {
    document.addEventListener('click', onOutsideClick);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
});
onUnmounted(() => {
    document.removeEventListener('click', onOutsideClick);
    window.removeEventListener('resize', onReposition);
    window.removeEventListener('scroll', onReposition, true);
});
</script>

<style scoped>
/* Leading logo (mis. logo kontingen) sejajar dengan label — trigger & opsi */
.app-sel__trigger { display: flex; align-items: center; }
.app-sel__lead { flex-shrink: 0; margin-right: 8px; }
</style>

