<template>
    <Head title="403 — Akses Ditolak" />
    <div class="err">
        <div class="err__bg" aria-hidden="true">
            <div class="err__blob err__blob--1" />
            <div class="err__blob err__blob--2" />
        </div>

        <div class="err__card">
            <div class="err__code">403</div>
            <h1 class="err__title">Akses Ditolak</h1>
            <p class="err__desc">
                Anda tidak memiliki izin untuk membuka halaman ini. Hubungi
                Panitia Besar / Super Admin bila menurut Anda ini keliru.
            </p>
            <div class="err__actions">
                <Link href="/dashboard" class="err__btn err__btn--primary">
                    <HomeIcon :size="15" />
                    Ke Dashboard
                </Link>
                <button class="err__btn err__btn--ghost" @click="history.back()">
                    <ArrowLeftIcon :size="15" />
                    Kembali
                </button>
            </div>
        </div>

        <svg class="err__grid" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <pattern id="grid403" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
                </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#grid403)" />
        </svg>
    </div>
</template>

<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { HomeIcon, ArrowLeftIcon } from '@lucide/vue';
</script>

<style scoped>
.err {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); position: relative; overflow: hidden;
    font-family: var(--font-sans);
}
.err__bg { position: absolute; inset: 0; pointer-events: none; }
.err__blob {
    position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.12;
}
.err__blob--1 {
    width: 400px; height: 400px; background: #d97706;
    top: -100px; right: -100px;
}
.err__blob--2 {
    width: 300px; height: 300px; background: #dc2626;
    bottom: -80px; left: -80px;
}
.err__grid {
    position: absolute; inset: 0; width: 100%; height: 100%;
    color: var(--color-border); pointer-events: none;
}
.err__card {
    position: relative; z-index: 1; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 48px 32px;
}
.err__code {
    font-size: 120px; font-weight: 900; line-height: 1;
    font-family: var(--font-heading); letter-spacing: -0.04em;
    background: linear-gradient(135deg, #d97706 0%, #dc2626 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}
.err__title {
    font-size: 24px; font-weight: 800; color: var(--color-text-primary);
    font-family: var(--font-heading); margin: 0;
}
.err__desc {
    font-size: 15px; color: var(--color-text-muted); max-width: 380px;
    line-height: 1.6; margin: 0;
}
.err__actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.err__btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 22px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
    font-family: var(--font-sans); cursor: pointer; transition: all 150ms ease;
    text-decoration: none; border: none;
}
.err__btn--primary { background: #d97706; color: #fff; }
.err__btn--primary:hover { background: #b45309; }
.err__btn--ghost {
    background: transparent; color: var(--color-text-muted);
    border: 1.5px solid var(--color-border);
}
.err__btn--ghost:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); background: var(--color-surface); }
</style>
