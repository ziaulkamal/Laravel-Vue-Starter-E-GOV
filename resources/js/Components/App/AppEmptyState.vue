<template>
    <div class="app-empty" :class="`app-empty--${size}`">
        <div v-if="$slots.icon || icon" class="app-empty__icon-wrap">
            <slot name="icon">
                <component :is="icon" :size="iconSizeMap[size]" />
            </slot>
        </div>
        <p class="app-empty__title">{{ title }}</p>
        <p v-if="description" class="app-empty__desc">{{ description }}</p>
        <div v-if="$slots.default" class="app-empty__cta">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
type EmptySize = 'sm' | 'md' | 'lg'

interface Props {
    title?:       string
    description?: string
    icon?:        unknown
    size?:        EmptySize
}

withDefaults(defineProps<Props>(), {
    title:       'Nothing here yet',
    description: '',
    icon:        null,
    size:        'md',
});

const iconSizeMap: Record<EmptySize, number> = { sm: 28, md: 40, lg: 56 };
</script>

