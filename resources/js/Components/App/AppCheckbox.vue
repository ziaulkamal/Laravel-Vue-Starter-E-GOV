<template>
    <label class="app-cb" :class="{ 'app-cb--disabled': disabled }">
        <div class="app-cb__box" :class="{ 'app-cb__box--checked': isChecked, 'app-cb__box--indeterminate': indeterminate }">
            <input
                v-bind="$attrs"
                class="app-cb__input"
                type="checkbox"
                :checked="isChecked"
                :disabled="disabled"
                :value="value"
                :aria-checked="indeterminate ? 'mixed' : isChecked"
                @change="onChange"
            />
            <!-- Check icon -->
            <svg v-if="!indeterminate && isChecked" width="11" height="11" viewBox="0 0 12 12" fill="none">
                <polyline points="1.5,6 5,9.5 10.5,2.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <!-- Indeterminate dash -->
            <span v-if="indeterminate" class="app-cb__dash" />
        </div>
        <span v-if="$slots.default || label" class="app-cb__label">
            <slot>{{ label }}</slot>
            <span v-if="description" class="app-cb__desc">{{ description }}</span>
        </span>
    </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    modelValue?:    boolean | unknown[]
    value?:         unknown
    label?:         string
    description?:   string
    indeterminate?: boolean
    disabled?:      boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:    false,
    value:         true,
    label:         '',
    description:   '',
    indeterminate: false,
    disabled:      false,
});

const emit = defineEmits<{ 'update:modelValue': [value: boolean | unknown[]] }>();
defineOptions({ inheritAttrs: false });

const isChecked = computed<boolean>(() => {
    if (Array.isArray(props.modelValue)) return props.modelValue.includes(props.value);
    return Boolean(props.modelValue);
});

function onChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (Array.isArray(props.modelValue)) {
        const arr = [...props.modelValue];
        target.checked ? arr.push(props.value) : arr.splice(arr.indexOf(props.value), 1);
        emit('update:modelValue', arr);
    } else {
        emit('update:modelValue', target.checked);
    }
}
</script>

