<template>
    <component
        :is="tag"
        v-bind="attrs"
        class="app-btn"
        :class="[`app-btn--${variant}`, `app-btn--${size}`, { 'app-btn--loading': loading, 'app-btn--icon-only': iconOnly }]"
        :disabled="disabled || loading"
        :aria-busy="loading"
    >
        <!-- Left icon / Spinner -->
        <span v-if="loading" class="app-btn__spinner" aria-hidden="true">
            <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="10"/>
            </svg>
        </span>
        <span v-else-if="$slots.icon" class="app-btn__icon" aria-hidden="true">
            <slot name="icon" />
        </span>

        <!-- Label -->
        <span v-if="$slots.default && !iconOnly" class="app-btn__label">
            <slot />
        </span>

        <!-- Right icon -->
        <span v-if="$slots['icon-right'] && !loading && !iconOnly" class="app-btn__icon" aria-hidden="true">
            <slot name="icon-right" />
        </span>
    </component>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { AppVariant, AppSize } from '@/types';

interface Props {
    variant?:  AppVariant
    size?:     AppSize
    tag?:      string
    loading?:  boolean
    disabled?: boolean
    iconOnly?: boolean
    href?:     string | null
}

const props = withDefaults(defineProps<Props>(), {
    variant:  'primary',
    size:     'md',
    tag:      'button',
    loading:  false,
    disabled: false,
    iconOnly: false,
    href:     null,
});

const rawAttrs = useAttrs();
const attrs = computed(() => ({
    ...rawAttrs,
    ...(props.tag === 'a' || props.href ? { href: props.href } : { type: (rawAttrs.type as string) ?? 'button' }),
}));
const tag = computed<string>(() => props.href ? 'a' : props.tag);
</script>

