<template>
    <div
        class="app-card"
        :class="[`app-card--${padding}`, { 'app-card--hoverable': hoverable, 'app-card--flat': flat }]"
    >
        <div v-if="$slots.header || title" class="app-card__header">
            <slot name="header">
                <div class="app-card__header-content">
                    <p class="app-card__title">{{ title }}</p>
                    <p v-if="subtitle" class="app-card__subtitle">{{ subtitle }}</p>
                </div>
                <div v-if="$slots.actions" class="app-card__actions">
                    <slot name="actions" />
                </div>
            </slot>
        </div>

        <div class="app-card__body">
            <slot />
        </div>

        <div v-if="$slots.footer" class="app-card__footer">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface Props {
    title?:     string
    subtitle?:  string
    padding?:   CardPadding
    hoverable?: boolean
    flat?:      boolean
}

withDefaults(defineProps<Props>(), {
    title:     '',
    subtitle:  '',
    padding:   'md',
    hoverable: false,
    flat:      false,
});
</script>

