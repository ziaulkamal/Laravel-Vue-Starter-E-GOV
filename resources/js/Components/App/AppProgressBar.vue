<template>
    <div class="app-progress" :class="`app-progress--${size}`">
        <div v-if="label || showValue" class="app-progress__header">
            <span v-if="label" class="app-progress__label">{{ label }}</span>
            <span v-if="showValue" class="app-progress__value">{{ Math.round(value) }}%</span>
        </div>
        <div class="app-progress__track" :class="{ 'app-progress__track--striped': striped }">
            <div
                v-if="indeterminate"
                class="app-progress__bar app-progress__bar--indeterminate"
                :style="{ background: colorValue }"
            />
            <div
                v-else
                class="app-progress__bar"
                :style="{ width: `${clampedValue}%`, background: colorValue, transition: animate ? 'width 400ms ease' : 'none' }"
                role="progressbar"
                :aria-valuenow="clampedValue"
                aria-valuemin="0"
                aria-valuemax="100"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    value:         { type: Number,  default: 0 },
    color:         { type: String,  default: 'primary' },
    size:          { type: String,  default: 'md' },      // xs|sm|md|lg
    label:         { type: String,  default: '' },
    showValue:     { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    striped:       { type: Boolean, default: false },
    animate:       { type: Boolean, default: true },
});

const colorMap: Record<string, string> = {
    primary: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-to))',
    success: 'linear-gradient(90deg, var(--color-success), #047857)',
    warning: 'linear-gradient(90deg, var(--color-warning), #f97316)',
    danger:  'linear-gradient(90deg, var(--color-danger),  #f97316)',
    info:    'linear-gradient(90deg, var(--color-info),    var(--color-accent))',
};

const colorValue   = computed<string>(() => colorMap[props.color] || props.color);
const clampedValue = computed<number>(() => Math.min(100, Math.max(0, props.value)));
</script>

