<template>
    <div ref="wrapRef" class="app-popover-wrap">
        <div
            class="app-popover-trigger"
            @click="trigger === 'click' ? toggle() : undefined"
            @mouseenter="trigger === 'hover' ? open() : undefined"
            @mouseleave="trigger === 'hover' ? close() : undefined"
        >
            <slot name="trigger" />
        </div>

        <Transition name="popover">
            <div
                v-if="isOpen"
                class="app-popover"
                :class="`app-popover--${position}`"
                role="dialog"
            >
                <div v-if="arrow" class="app-popover__arrow" :class="`app-popover__arrow--${position}`" />
                <slot />
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
    position: { type: String,  default: 'bottom' }, // top|bottom|left|right
    trigger:  { type: String,  default: 'click' },  // click|hover
    arrow:    { type: Boolean, default: true },
});

const isOpen  = ref<boolean>(false);
const wrapRef = ref<HTMLElement | null>(null);

function toggle(): void { isOpen.value = !isOpen.value; }
function open(): void   { isOpen.value = true; }
function close(): void  { isOpen.value = false; }

function onOutside(e: MouseEvent): void {
    if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) close();
}

onMounted(() => document.addEventListener('click', onOutside));
onUnmounted(() => document.removeEventListener('click', onOutside));
</script>

