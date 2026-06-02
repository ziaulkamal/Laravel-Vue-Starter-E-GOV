<template>
    <span class="smascot" :style="boxStyle">
        <img
            v-if="src && !failed"
            :src="src"
            :alt="name ?? code ?? 'Maskot cabor'"
            class="smascot__img"
            loading="lazy"
            @error="failed = true"
        />
        <span v-else class="smascot__fallback" :style="fontStyle">{{ code ?? '?' }}</span>
    </span>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { maskotUrl } from '@/config/maskot';

interface Props {
    /** Nama file maskot (kolom `sports.icon`), mis. "sepak-bola.png" */
    icon?: string | null;
    /** Kode cabor utk fallback bila maskot tak ada */
    code?: string | null;
    name?: string | null;
    size?: number | string;
    radius?: number | string;
}
const props = withDefaults(defineProps<Props>(), { icon: null, code: null, name: null, size: 52, radius: 14 });

const failed = ref(false);
const src = computed(() => maskotUrl(props.icon));

const len = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
const boxStyle = computed(() => ({ width: len(props.size), height: len(props.size), borderRadius: len(props.radius) }));
const fontStyle = computed(() => ({ fontSize: typeof props.size === 'number' ? `${Math.round(props.size * 0.27)}px` : '0.62em' }));

watch(src, () => { failed.value = false; });
</script>

<style scoped>
.smascot           { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; background: var(--color-accent-subtle); }
.smascot__img      { width: 100%; height: 100%; object-fit: contain; padding: 8%; }
.smascot__fallback { font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; text-align: center; }
</style>
