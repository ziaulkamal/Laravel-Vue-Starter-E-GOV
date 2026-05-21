<template>
    <label class="app-radio" :class="{ 'app-radio--disabled': disabled }">
        <div class="app-radio__circle" :class="{ 'app-radio__circle--checked': isChecked }">
            <input
                v-bind="$attrs"
                class="app-radio__input"
                type="radio"
                :checked="isChecked"
                :disabled="disabled"
                :value="value"
                :name="name"
                @change="onChange"
            />
            <span v-if="isChecked" class="app-radio__dot" />
        </div>
        <span v-if="$slots.default || label" class="app-radio__label">
            <slot>{{ label }}</slot>
            <span v-if="description" class="app-radio__desc">{{ description }}</span>
        </span>
    </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    modelValue:  { default: null },
    value:       { default: true },
    label:       { type: String,  default: '' },
    description: { type: String,  default: '' },
    name:        { type: String,  default: '' },
    disabled:    { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
defineOptions({ inheritAttrs: false });

const isChecked = computed<boolean>(() => props.modelValue === props.value);

function onChange(): void {
    emit('update:modelValue', props.value);
}
</script>

