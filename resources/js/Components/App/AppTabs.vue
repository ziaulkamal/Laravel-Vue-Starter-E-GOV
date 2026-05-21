<template>
    <div class="app-tabs" :class="`app-tabs--${variant}`">
        <!-- Tab list -->
        <div class="app-tabs__list" role="tablist">
            <button
                v-for="tab in tabs"
                :key="tab.value"
                type="button"
                class="app-tabs__tab"
                :class="{ 'app-tabs__tab--active': modelValue === tab.value, 'app-tabs__tab--disabled': tab.disabled }"
                role="tab"
                :aria-selected="modelValue === tab.value"
                :disabled="tab.disabled"
                @click="select(tab)"
            >
                <span v-if="tab.icon" class="app-tabs__tab-icon">
                    <component :is="tab.icon" :size="14" />
                </span>
                {{ tab.label }}
                <span v-if="tab.badge" class="app-tabs__badge">{{ tab.badge }}</span>
            </button>
        </div>

        <!-- Tab panels -->
        <div class="app-tabs__panels">
            <template v-for="tab in tabs" :key="tab.value">
                <div
                    v-if="!lazy || modelValue === tab.value"
                    v-show="modelValue === tab.value"
                    class="app-tabs__panel"
                    role="tabpanel"
                >
                    <slot :name="tab.value" />
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { AppTab } from '@/types';

type TabsVariant = 'underline' | 'pill'

interface Props {
    modelValue?: string
    tabs?:       AppTab[]
    variant?:    TabsVariant
    lazy?:       boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    tabs:       () => [],
    variant:    'underline',
    lazy:       false,
});
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

function select(tab: Tab): void {
    if (!tab.disabled) emit('update:modelValue', tab.value);
}
</script>

