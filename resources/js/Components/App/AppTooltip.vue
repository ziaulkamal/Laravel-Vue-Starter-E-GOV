<template>
    <div class="app-tooltip-wrap" @mouseenter="show" @mouseleave="hide" @focusin="show" @focusout="hide">
        <slot />
        <Transition name="tooltip">
            <div
                v-if="visible && (content || $slots.content)"
                class="app-tooltip"
                :class="`app-tooltip--${position}`"
                role="tooltip"
            >
                <slot name="content">{{ content }}</slot>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
    content:  { type: String,  default: '' },
    position: { type: String,  default: 'top' }, // top|bottom|left|right
    delay:    { type: Number,  default: 0 },
    disabled: { type: Boolean, default: false },
});

const visible = ref<boolean>(false);
let timer: ReturnType<typeof setTimeout> | null = null;

function show(): void {
    if (props.disabled) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => { visible.value = true; }, props.delay);
}
function hide(): void {
    if (timer !== null) clearTimeout(timer);
    visible.value = false;
}
</script>

