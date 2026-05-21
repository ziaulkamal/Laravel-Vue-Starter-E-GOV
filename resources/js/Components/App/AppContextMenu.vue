<template>
    <div ref="wrapRef" class="app-ctx-wrap" @contextmenu.prevent="onRightClick">
        <slot />
        <Teleport to="body">
            <Transition name="ctx">
                <div
                    v-if="isOpen"
                    class="app-ctx-panel"
                    :style="{ top: `${pos.y}px`, left: `${pos.x}px` }"
                    role="menu"
                    @keydown.esc="close"
                >
                    <template v-for="(item, i) in items" :key="i">
                        <div v-if="item.divider" class="app-ctx-divider" role="separator" />
                        <button
                            v-else
                            type="button"
                            class="app-ctx-item"
                            :class="{ 'app-ctx-item--danger': item.danger, 'app-ctx-item--disabled': item.disabled }"
                            role="menuitem"
                            :disabled="item.disabled"
                            @click="onItemClick(item)"
                        >
                            <span v-if="item.icon" class="app-ctx-item__icon">
                                <component :is="item.icon" :size="13" />
                            </span>
                            {{ item.label }}
                            <span v-if="item.shortcut" class="app-ctx-item__shortcut">{{ item.shortcut }}</span>
                        </button>
                    </template>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

type ContextMenuItem = {
    label?: string;
    icon?: unknown;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    divider?: boolean;
    onClick?: () => void;
};

const props = defineProps({
    items: { type: Array as () => ContextMenuItem[], default: () => [] },
});
const emit = defineEmits(['select']);

const isOpen  = ref<boolean>(false);
const pos     = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const wrapRef = ref<HTMLElement | null>(null);

async function onRightClick(e: MouseEvent): Promise<void> {
    isOpen.value = false;
    await nextTick();
    pos.value    = { x: e.clientX, y: e.clientY };
    isOpen.value = true;
}

function close(): void { isOpen.value = false; }

function onItemClick(item: ContextMenuItem): void {
    if (item.disabled) return;
    item.onClick?.();
    emit('select', item);
    close();
}

function onOutside(e: MouseEvent): void {
    if (!(e.target as Element).closest('.app-ctx-panel')) close();
}

onMounted(() => {
    document.addEventListener('click', onOutside);
    document.addEventListener('contextmenu', (e: MouseEvent) => {
        if (!wrapRef.value?.contains(e.target as Node)) close();
    });
});
onUnmounted(() => document.removeEventListener('click', onOutside));
</script>

