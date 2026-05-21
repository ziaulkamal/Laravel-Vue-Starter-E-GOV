<template>
    <Teleport to="body">
        <Transition name="drawer-backdrop">
            <div v-if="modelValue" class="app-drawer-backdrop" @click="onBackdropClick" />
        </Transition>
        <Transition :name="`drawer-${side}`">
            <div
                v-if="modelValue"
                ref="drawerRef"
                class="app-drawer"
                :class="[`app-drawer--${side}`, `app-drawer--${size}`]"
                role="dialog"
                :aria-modal="true"
                :aria-label="title || 'Drawer'"
                tabindex="-1"
                @keydown.esc="onEsc"
            >
                <div v-if="title || $slots.header || !hideClose" class="app-drawer__header">
                    <slot name="header">
                        <span class="app-drawer__title">{{ title }}</span>
                    </slot>
                    <button v-if="!hideClose" type="button" class="app-drawer__close" aria-label="Close" @click="close">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="app-drawer__body">
                    <slot />
                </div>
                <div v-if="$slots.footer" class="app-drawer__footer">
                    <slot name="footer" />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';

type DrawerSide = 'left' | 'right'
type DrawerSize = 'sm' | 'md' | 'lg' | 'full'

interface Props {
    modelValue?:      boolean
    title?:           string
    side?:            DrawerSide
    size?:            DrawerSize
    hideClose?:       boolean
    closeOnBackdrop?: boolean
    closeOnEsc?:      boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:      false,
    title:           '',
    side:            'right',
    size:            'md',
    hideClose:       false,
    closeOnBackdrop: true,
    closeOnEsc:      true,
});
const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    close: []
}>();
const drawerRef = ref<HTMLElement | null>(null);

function close(): void {
    emit('update:modelValue', false);
    emit('close');
}
function onBackdropClick(): void { if (props.closeOnBackdrop) close(); }
function onEsc(): void           { if (props.closeOnEsc) close(); }

function handleKeydown(e: KeyboardEvent): void { if (e.key === 'Escape' && props.closeOnEsc) close(); }

watch(() => props.modelValue, async (val) => {
    if (val) {
        document.body.style.overflow = 'hidden';
        await nextTick();
        drawerRef.value?.focus();
        document.addEventListener('keydown', handleKeydown);
    } else {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeydown);
    }
});

onUnmounted(() => {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeydown);
});
</script>

