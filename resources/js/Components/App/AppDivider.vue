<template>
    <div
        v-if="vertical"
        class="app-divider app-divider--vertical"
        :style="{ height, borderLeftColor: color || undefined }"
        role="separator"
        aria-orientation="vertical"
    />
    <div
        v-else
        class="app-divider app-divider--horizontal"
        :class="{ 'app-divider--has-label': $slots.default }"
        :style="{ borderTopColor: color || undefined }"
        role="separator"
        aria-orientation="horizontal"
    >
        <span v-if="$slots.default" class="app-divider__label">
            <slot />
        </span>
    </div>
</template>

<script setup lang="ts">
defineProps({
    vertical: { type: Boolean, default: false },
    height:   { type: String,  default: '100%' },
    color:    { type: String,  default: '' },
});
</script>

