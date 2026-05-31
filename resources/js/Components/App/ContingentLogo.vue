<template>
    <span class="clogo" :style="boxStyle">
        <img
            v-if="src && !failed"
            :src="src"
            :alt="label"
            class="clogo__img"
            loading="lazy"
            @error="failed = true"
        />
        <span v-else class="clogo__fallback" :style="fontStyle">{{ initials }}</span>
    </span>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Contingent { name?: string; short_name?: string; wilayah_kode?: string | null }
interface Props {
    contingent?: Contingent | null;
    /** Override langsung bila tak punya objek contingent */
    wilayahKode?: string | null;
    shortName?: string | null;
    name?: string | null;
    /** px (number) atau CSS length (string) */
    size?: number | string;
    radius?: number | string;
}
const props = withDefaults(defineProps<Props>(), {
    contingent: null, wilayahKode: null, shortName: null, name: null, size: 40, radius: 12,
});

const failed = ref(false);

const kode = computed(() => props.wilayahKode ?? props.contingent?.wilayah_kode ?? '');
// Logo dinamai kode kabupaten/kota = 2 segmen awal wilayah_kode (prov.kab), mis. "11.14".
const kabCode = computed(() => {
    const parts = String(kode.value ?? '').split('.').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : '';
});
const src = computed(() => (kabCode.value ? `/images/${kabCode.value}.png` : ''));

const label = computed(() =>
    props.shortName ?? props.contingent?.short_name ?? props.name ?? props.contingent?.name ?? '?'
);
const initials = computed(() => String(label.value).slice(0, 5).toUpperCase());

const len = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
const boxStyle = computed(() => ({ width: len(props.size), height: len(props.size), borderRadius: len(props.radius) }));
const fontStyle = computed(() => ({ fontSize: typeof props.size === 'number' ? `${Math.round(props.size * 0.3)}px` : '0.62em' }));

// Reset status error bila kontingen/kode berubah (mis. navigasi antar match).
watch(src, () => { failed.value = false; });
</script>

<style scoped>
.clogo            { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; background: var(--color-accent-subtle); }
.clogo__img       { width: 100%; height: 100%; object-fit: contain; padding: 12%; }
.clogo__fallback  { font-size: 0.62em; font-weight: 800; color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; text-align: center; }
</style>
