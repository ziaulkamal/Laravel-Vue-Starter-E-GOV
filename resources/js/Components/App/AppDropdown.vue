<template>
    <div ref="wrapRef" class="app-dd-wrap">
        <div class="app-dd-trigger" @click="toggle">
            <slot name="trigger" />
        </div>

        <Transition name="dropdown">
            <div
                v-if="isOpen"
                class="app-dd-panel"
                :class="`app-dd-panel--${align}`"
                role="menu"
                @keydown.esc="close"
                @keydown.up.prevent="focusItem(-1)"
                @keydown.down.prevent="focusItem(1)"
            >
                <template v-for="(item, i) in items" :key="i">
                    <div v-if="item.divider" class="app-dd-divider" role="separator" />
                    <button
                        v-else
                        type="button"
                        class="app-dd-item"
                        :class="{ 'app-dd-item--danger': item.danger, 'app-dd-item--disabled': item.disabled }"
                        role="menuitem"
                        :disabled="item.disabled"
                        @click="onItemClick(item)"
                    >
                        <span v-if="item.icon" class="app-dd-item__icon">
                            <component :is="item.icon" :size="14" />
                        </span>
                        {{ item.label }}
                        <span v-if="item.suffix" class="app-dd-item__suffix">{{ item.suffix }}</span>
                    </button>
                </template>
                <slot />
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

type DropdownItem = {
    label?: string;
    icon?: unknown;
    suffix?: string;
    danger?: boolean;
    disabled?: boolean;
    divider?: boolean;
    onClick?: () => void;
};

const props = defineProps({
    items: { type: Array as () => DropdownItem[], default: () => [] },
    align: { type: String, default: 'left' }, // left|right
});
const emit = defineEmits(['select']);

const isOpen  = ref<boolean>(false);
const wrapRef = ref<HTMLElement | null>(null);

function toggle(): void { isOpen.value = !isOpen.value; }
function close(): void  { isOpen.value = false; }

function onItemClick(item: DropdownItem): void {
    if (item.disabled) return;
    item.onClick?.();
    emit('select', item);
    close();
}

function focusItem(dir: number): void {
    const items = wrapRef.value?.querySelectorAll<HTMLElement>('.app-dd-item:not(:disabled)') ?? [];
    const curr  = document.activeElement;
    const idx   = Array.from(items).indexOf(curr as HTMLElement);
    const next  = (idx + dir + items.length) % items.length;
    items[next]?.focus();
}

function onOutside(e: MouseEvent): void {
    if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) close();
}

onMounted(() => document.addEventListener('click', onOutside));
onUnmounted(() => document.removeEventListener('click', onOutside));
</script>

