<template>
    <div class="app-ta-wrap" :class="{ 'app-ta-wrap--error': !!error }">
        <label v-if="label" :for="taId" class="app-ta__label">
            {{ label }}
            <span v-if="required" style="color:var(--color-danger)"> *</span>
        </label>

        <div class="app-ta__row" :class="{ 'app-ta__row--focused': isFocused }">
            <textarea
                :id="taId"
                ref="taRef"
                v-bind="$attrs"
                class="app-ta__native"
                :value="modelValue"
                :placeholder="placeholder"
                :rows="rows"
                :disabled="disabled"
                :maxlength="maxlength || undefined"
                :aria-invalid="!!error"
                :style="{ resize: autoResize ? 'none' : 'vertical', height: computedHeight }"
                @input="onInput"
                @focus="isFocused = true"
                @blur="isFocused = false"
            />
        </div>

        <div class="app-ta__footer">
            <p v-if="error" class="app-ta__msg app-ta__msg--error" role="alert">{{ error }}</p>
            <p v-else-if="hint" class="app-ta__msg app-ta__msg--hint">{{ hint }}</p>
            <span v-else />
            <span v-if="maxlength" class="app-ta__count" :class="{ 'app-ta__count--over': charCount >= maxlength }">
                {{ charCount }}/{{ maxlength }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

interface Props {
    modelValue?:  string
    label?:       string
    placeholder?: string
    rows?:        number
    maxlength?:   number | null
    error?:       string | null
    hint?:        string
    disabled?:    boolean
    required?:    boolean
    autoResize?:  boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue:  '',
    label:       '',
    placeholder: '',
    rows:        4,
    maxlength:   null,
    error:       '',
    hint:        '',
    disabled:    false,
    required:    false,
    autoResize:  true,
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
defineOptions({ inheritAttrs: false });

let _id = 0;
const taId          = `app-ta-${++_id}`;
const taRef         = ref<HTMLTextAreaElement | null>(null);
const isFocused     = ref(false);
const naturalHeight = ref('auto');

const charCount      = computed<number>(() => (props.modelValue ?? '').length);
const computedHeight = computed<string | undefined>(() => props.autoResize ? naturalHeight.value : undefined);

async function onInput(e: Event): Promise<void> {
    emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
    if (props.autoResize) {
        naturalHeight.value = 'auto';
        await nextTick();
        naturalHeight.value = taRef.value ? taRef.value.scrollHeight + 'px' : 'auto';
    }
}
</script>

