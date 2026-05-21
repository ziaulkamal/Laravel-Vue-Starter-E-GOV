<template>
    <svg
        class="app-spinner"
        :class="`app-spinner--${size}`"
        :style="{ color: colorValue }"
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Loading"
        role="status"
    >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="10" opacity="0.25"/>
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="10" class="app-spinner__arc"/>
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AppSize } from '@/types';

type SpinnerColor = 'primary' | 'white' | 'muted' | 'success' | 'danger' | 'warning' | (string & {})

interface Props {
    size?:  AppSize
    color?: SpinnerColor
}

const props = withDefaults(defineProps<Props>(), {
    size:  'md',
    color: 'primary',
});

const colorMap: Record<string, string> = {
    primary: 'var(--color-accent)',
    white:   '#ffffff',
    muted:   'var(--color-text-muted)',
    success: 'var(--color-success)',
    danger:  'var(--color-danger)',
    warning: 'var(--color-warning)',
};

const colorValue = computed<string>(() => colorMap[props.color] || props.color);
</script>

