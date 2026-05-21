<template>
    <span class="app-badge" :class="[`app-badge--${color}`, `app-badge--${size}`, { 'app-badge--dot': dot, 'app-badge--pill': pill }]">
        <span v-if="dot" class="app-badge__dot" />
        <span v-if="$slots.icon && !dot" class="app-badge__icon"><slot name="icon" /></span>
        <slot v-if="!dot" />
        <button v-if="removable && !dot" class="app-badge__remove" type="button" aria-label="Remove" @click.stop="$emit('remove')">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        </button>
    </span>
</template>

<script setup lang="ts">
import type { AppColor, AppSize } from '@/types';

interface Props {
    color?:     AppColor
    size?:      AppSize
    dot?:       boolean
    pill?:      boolean
    removable?: boolean
}

withDefaults(defineProps<Props>(), {
    color:     'default',
    size:      'md',
    dot:       false,
    pill:      true,
    removable: false,
});
defineEmits<{ remove: [] }>();
</script>

