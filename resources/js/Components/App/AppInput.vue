<template>
    <div class="app-input-wrap" :class="{ 'app-input-wrap--error': !!error, 'app-input-wrap--disabled': disabled }">
        <!-- Label -->
        <label v-if="label" :for="inputId" class="app-input__label">
            {{ label }}
            <span v-if="required" class="app-input__required" aria-hidden="true"> *</span>
        </label>

        <!-- Input row -->
        <div class="app-input__row" :class="[`app-input__row--${size}`, { 'app-input__row--focused': isFocused }]">
            <!-- Prefix slot (icon/text) -->
            <span v-if="$slots.prefix" class="app-input__affix app-input__affix--prefix">
                <slot name="prefix" />
            </span>

            <!-- Native input -->
            <input
                :id="inputId"
                ref="inputRef"
                v-bind="$attrs"
                class="app-input__native"
                :class="{ 'app-input__native--has-prefix': $slots.prefix, 'app-input__native--has-suffix': $slots.suffix || (type === 'password') || (clearable && modelValue) }"
                :type="currentType"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :required="required"
                :aria-invalid="!!error"
                :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
                @input="$emit('update:modelValue', $event.target.value)"
                @focus="isFocused = true"
                @blur="isFocused = false"
            />

            <!-- Clear button -->
            <button
                v-if="clearable && modelValue && !disabled"
                type="button"
                class="app-input__clear"
                aria-label="Clear"
                tabindex="-1"
                @click="$emit('update:modelValue', ''); inputRef?.focus()"
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
            </button>

            <!-- Password toggle -->
            <button
                v-if="type === 'password'"
                type="button"
                class="app-input__clear"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                tabindex="-1"
                @click="showPassword = !showPassword"
            >
                <svg v-if="showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </button>

            <!-- Suffix slot -->
            <span v-if="$slots.suffix" class="app-input__affix app-input__affix--suffix">
                <slot name="suffix" />
            </span>
        </div>

        <!-- Hint / Error -->
        <p v-if="error" :id="`${inputId}-error`" class="app-input__msg app-input__msg--error" role="alert">{{ error }}</p>
        <p v-else-if="hint" :id="`${inputId}-hint`" class="app-input__msg app-input__msg--hint">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AppSize } from '@/types';

interface Props {
    modelValue?:  string | number
    label?:       string
    placeholder?: string
    type?:        string
    size?:        AppSize
    error?:       string | null
    hint?:        string
    disabled?:    boolean
    required?:    boolean
    clearable?:   boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:  '',
    label:       '',
    placeholder: '',
    type:        'text',
    size:        'md',
    error:       '',
    hint:        '',
    disabled:    false,
    required:    false,
    clearable:   false,
});

defineEmits<{ 'update:modelValue': [value: string] }>();
defineOptions({ inheritAttrs: false });

let _id = 0;
const inputId      = `app-input-${++_id}`;
const inputRef     = ref<HTMLInputElement | null>(null);
const isFocused    = ref(false);
const showPassword = ref(false);
const currentType  = computed<string>(() => props.type === 'password' && showPassword.value ? 'text' : props.type);
</script>

