<template>
    <Teleport to="body">
        <div class="app-toast-region" aria-live="polite" aria-label="Notifications">
            <TransitionGroup name="toast" tag="div" class="app-toast-stack">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    class="app-toast"
                    :class="`app-toast--${toast.type}`"
                    role="alert"
                >
                    <span class="app-toast__icon" aria-hidden="true">
                        <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <svg v-else-if="toast.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <svg v-else-if="toast.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </span>
                    <div class="app-toast__body">
                        <p v-if="toast.title" class="app-toast__title">{{ toast.title }}</p>
                        <p class="app-toast__message">{{ toast.message }}</p>
                        <button v-if="toast.action" type="button" class="app-toast__action" @click="toast.action.onClick(); dismiss(toast.id)">
                            {{ toast.action.label }}
                        </button>
                    </div>
                    <button type="button" class="app-toast__close" aria-label="Dismiss" @click="dismiss(toast.id)">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/Composables/useToast';

const { toasts, dismiss } = useToast();
</script>

