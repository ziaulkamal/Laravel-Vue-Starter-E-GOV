<template>
    <nav class="app-breadcrumb" aria-label="Breadcrumb">
        <ol class="app-breadcrumb__list">
            <li v-for="(crumb, i) in crumbs" :key="i" class="app-breadcrumb__item">
                <!-- Separator -->
                <span v-if="i > 0" class="app-breadcrumb__sep" aria-hidden="true">
                    <slot name="separator">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </slot>
                </span>

                <!-- Last item (current page) -->
                <span v-if="i === crumbs.length - 1" class="app-breadcrumb__current" aria-current="page">
                    {{ crumb.label }}
                </span>

                <!-- Inertia link -->
                <Link v-else-if="crumb.href" :href="crumb.href" class="app-breadcrumb__link">
                    {{ crumb.label }}
                </Link>

                <!-- Plain span -->
                <span v-else class="app-breadcrumb__link app-breadcrumb__link--plain">{{ crumb.label }}</span>
            </li>
        </ol>
    </nav>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';

type Crumb = { label: string; href?: string };

defineProps({
    crumbs: { type: Array as () => Crumb[], default: () => [] }, // [{ label, href? }]
});
</script>

