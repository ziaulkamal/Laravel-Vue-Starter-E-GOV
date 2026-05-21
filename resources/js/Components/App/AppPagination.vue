<template>
    <div class="pgn">
        <!-- Per-page selector -->
        <div class="pgn__per">
            <span class="pgn__per-label">Rows</span>
            <select class="pgn__per-select" :value="perPage" @change="onPerPage">
                <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
            </select>
        </div>

        <!-- Info -->
        <span class="pgn__info">
            {{ from }}–{{ to }} of {{ total }}
        </span>

        <!-- Buttons -->
        <div class="pgn__btns">
            <button class="pgn__btn" :disabled="modelValue === 1" @click="emit('update:modelValue', 1)" aria-label="First page">
                <ChevronsLeftIcon :size="14" />
            </button>
            <button class="pgn__btn" :disabled="modelValue === 1" @click="emit('update:modelValue', modelValue - 1)" aria-label="Previous page">
                <ChevronLeftIcon :size="14" />
            </button>

            <button
                v-for="p in pages"
                :key="p"
                class="pgn__btn pgn__btn--page"
                :class="{ 'pgn__btn--active': p === modelValue, 'pgn__btn--ellipsis': p === '…' }"
                :disabled="p === '…'"
                @click="typeof p === 'number' && emit('update:modelValue', p)"
            >
                {{ p }}
            </button>

            <button class="pgn__btn" :disabled="modelValue === lastPage" @click="emit('update:modelValue', modelValue + 1)" aria-label="Next page">
                <ChevronRightIcon :size="14" />
            </button>
            <button class="pgn__btn" :disabled="modelValue === lastPage" @click="emit('update:modelValue', lastPage)" aria-label="Last page">
                <ChevronsRightIcon :size="14" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from '@lucide/vue';

interface Props {
    modelValue?:     number
    total?:          number
    perPage?:        number
    perPageOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:     1,
    total:          0,
    perPage:        10,
    perPageOptions: () => [10, 25, 50, 100],
});

const emit = defineEmits<{
    'update:modelValue': [page: number]
    'update:perPage':    [n: number]
}>();

const lastPage = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)));
const from     = computed(() => Math.min((props.modelValue - 1) * props.perPage + 1, props.total));
const to       = computed(() => Math.min(props.modelValue * props.perPage, props.total));

const pages = computed<(number | string)[]>(() => {
    const last = lastPage.value;
    const cur  = props.modelValue;
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const result: (number | string)[] = [1];
    if (cur > 3)              result.push('…');
    for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) result.push(i);
    if (cur < last - 2)       result.push('…');
    result.push(last);
    return result;
});

function onPerPage(e: Event) {
    emit('update:perPage', Number((e.target as HTMLSelectElement).value));
    emit('update:modelValue', 1);
}
</script>

