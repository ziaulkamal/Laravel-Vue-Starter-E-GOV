<template>
    <Teleport to="body">
        <Transition name="modal-backdrop">
            <div v-if="modelValue" class="app-modal-backdrop" @click.self="onBackdropClick" />
        </Transition>
        <Transition name="modal">
            <div v-if="modelValue" class="app-modal-wrap" role="dialog" :aria-modal="true" :aria-label="title || 'Dialog'" @keydown.esc="onEsc">
                <div ref="panelRef" class="app-modal" :class="`app-modal--${size}`" tabindex="-1">
                    <!-- Header -->
                    <div v-if="title || $slots.header || !hideClose" class="app-modal__header">
                        <slot name="header">
                            <span class="app-modal__title">{{ title }}</span>
                        </slot>
                        <button v-if="!hideClose" type="button" class="app-modal__close" aria-label="Close" @click="close">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="app-modal__body">
                        <slot />
                    </div>

                    <!-- Footer -->
                    <div v-if="$slots.footer" class="app-modal__footer">
                        <slot name="footer" />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface Props {
    modelValue?:      boolean
    title?:           string
    size?:            ModalSize
    hideClose?:       boolean
    closeOnBackdrop?: boolean
    closeOnEsc?:      boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:      false,
    title:           '',
    size:            'md',
    hideClose:       false,
    closeOnBackdrop: true,
    closeOnEsc:      true,
});
const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    close: []
}>();

const panelRef = ref<HTMLElement | null>(null);

function close(): void {
    emit('update:modelValue', false);
    emit('close');
}

function onBackdropClick(): void {
    if (props.closeOnBackdrop) close();
}
function onEsc(): void {
    if (props.closeOnEsc) close();
}

watch(() => props.modelValue, async (val) => {
    if (val) {
        document.body.style.overflow = 'hidden';
        await nextTick();
        panelRef.value?.focus();
        document.addEventListener('keydown', handleKeydown);
    } else {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeydown);
    }
});

function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && props.closeOnEsc) close();
}

onUnmounted(() => {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeydown);
});
</script>

