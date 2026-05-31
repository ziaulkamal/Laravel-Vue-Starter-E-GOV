<template>
    <Teleport to="body">
        <Transition name="nf-fade">
            <div v-if="state.active" class="nf-overlay">
                <div class="nf-card">
                    <div class="nf-icon">
                        <SearchX :size="36" />
                    </div>
                    <h2 class="nf-title">{{ state.message }}</h2>
                    <p class="nf-sub">Mengalihkan ke dashboard...</p>
                    <div class="nf-progress"><span class="nf-progress__bar" /></div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { SearchX } from '@lucide/vue';
import { useNotFound } from '@/Composables/useNotFound';

const { state } = useNotFound();
</script>

<style scoped>
.nf-overlay {
    position: fixed; inset: 0; z-index: 9998;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--color-bg) 55%, transparent);
    backdrop-filter: blur(10px) saturate(120%);
    -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.nf-card {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 36px 44px; text-align: center;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.22);
    max-width: 360px;
}

.nf-icon {
    width: 72px; height: 72px; border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    margin-bottom: 4px;
}

.nf-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.01em; line-height: 1.35; }
.nf-sub   { font-size: 12.5px; color: var(--color-text-muted); }

.nf-progress {
    width: 100%; height: 3px; border-radius: 99px;
    background: var(--color-bg-subtle); overflow: hidden; margin-top: 8px;
}
.nf-progress__bar {
    display: block; height: 100%; width: 100%;
    background: linear-gradient(90deg, var(--color-accent), var(--color-accent-to));
    transform-origin: left;
    animation: nf-load 1.8s linear forwards;
}
@keyframes nf-load { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.nf-fade-enter-active { transition: opacity 200ms ease; }
.nf-fade-leave-active { transition: opacity 300ms ease; }
.nf-fade-enter-from, .nf-fade-leave-to { opacity: 0; }
</style>
