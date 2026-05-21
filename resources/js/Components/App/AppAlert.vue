<template>
    <Transition name="alert">
        <div v-if="visible" class="app-alert" :class="`app-alert--${type}`" role="alert">
            <span class="app-alert__icon" aria-hidden="true">
                <svg v-if="type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else-if="type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <svg v-else-if="type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
            <div class="app-alert__content">
                <p v-if="title" class="app-alert__title">{{ title }}</p>
                <p class="app-alert__desc"><slot>{{ description }}</slot></p>
            </div>
            <button v-if="dismissible" type="button" class="app-alert__close" aria-label="Dismiss" @click="visible = false; $emit('dismiss')">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { AppAlertType } from '@/types';

interface Props {
    type?:        AppAlertType
    title?:       string
    description?: string
    dismissible?: boolean
}

withDefaults(defineProps<Props>(), {
    type:        'info',
    title:       '',
    description: '',
    dismissible: false,
});
defineEmits<{ dismiss: [] }>();

const visible = ref<boolean>(true);
</script>

