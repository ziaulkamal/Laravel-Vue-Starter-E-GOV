<template>
    <span
        v-if="variant === 'circle'"
        class="app-skeleton app-skeleton--shimmer"
        :style="{ width: size, height: size, borderRadius: '50%', display: 'block' }"
    />
    <span
        v-else-if="variant === 'text'"
        class="app-skeleton app-skeleton--text app-skeleton--shimmer"
        :style="{ width, height: height || '1em', borderRadius: '4px', display: 'block' }"
    />
    <span
        v-else
        class="app-skeleton app-skeleton--shimmer"
        :style="{ width, height, borderRadius: radius, display: 'block' }"
    />
</template>

<script setup lang="ts">
defineProps({
    variant: { type: String, default: 'rect' }, // rect | text | circle
    width:   { type: String, default: '100%' },
    height:  { type: String, default: '16px' },
    size:    { type: String, default: '40px' },  // for circle
    radius:  { type: String, default: '6px' },
});
</script>

