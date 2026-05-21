<template>
    <label class="app-toggle" :class="[`app-toggle--${size}`, { 'app-toggle--disabled': disabled, 'app-toggle--label-left': labelPosition === 'left' }]">
        <span v-if="(label || $slots.default) && labelPosition === 'left'" class="app-toggle__label">
            <slot>{{ label }}</slot>
            <span v-if="description" class="app-toggle__desc">{{ description }}</span>
        </span>

        <div class="app-toggle__track" :class="{ 'app-toggle__track--on': modelValue }">
            <input
                v-bind="$attrs"
                class="app-toggle__input"
                type="checkbox"
                :checked="modelValue"
                :disabled="disabled"
                @change="$emit('update:modelValue', $event.target.checked)"
            />
            <span class="app-toggle__thumb" />
        </div>

        <span v-if="(label || $slots.default) && labelPosition !== 'left'" class="app-toggle__label">
            <slot>{{ label }}</slot>
            <span v-if="description" class="app-toggle__desc">{{ description }}</span>
        </span>
    </label>
</template>

<script setup lang="ts">
import type { AppSize } from '@/types';

type LabelPosition = 'left' | 'right'

interface Props {
    modelValue?:    boolean
    label?:         string
    description?:   string
    labelPosition?: LabelPosition
    size?:          AppSize
    disabled?:      boolean
}

withDefaults(defineProps<Props>(), {
    modelValue:    false,
    label:         '',
    description:   '',
    labelPosition: 'right',
    size:          'md',
    disabled:      false,
});

defineEmits<{ 'update:modelValue': [value: boolean] }>();
defineOptions({ inheritAttrs: false });
</script>

