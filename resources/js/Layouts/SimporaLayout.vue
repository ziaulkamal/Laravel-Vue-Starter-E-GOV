<template>
    <Head v-if="title" :title="title" />
    <BaseLayout
        v-if="isAuthenticated"
        :nav-groups="navGroups"
        :user="authUser"
        app-name="SIMPORA 2026"
        app-subtitle="PORA XV Aceh Jaya"
        :notification-count="notificationCount"
        @logout="onLogout"
    >
        <slot />
    </BaseLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Head, router } from '@inertiajs/vue3';
import BaseLayout from '@/Layouts/BaseLayout.vue';
import { simporaNavGroups } from '@/config/nav';
import { useAuth } from '@/Composables/useAuth';

interface Props {
    notificationCount?: number
    title?: string
}

const props = withDefaults(defineProps<Props>(), {
    notificationCount: 0,
    title: '',
});

const { user, isAuthenticated, isSuperAdmin, logout, fetchMe } = useAuth();

// Sembunyikan grup khusus super-admin (mis. Dev/Tools) dari user biasa.
const navGroups = computed(() =>
    simporaNavGroups.filter((g) => !g.superAdminOnly || isSuperAdmin.value),
);

// Guard SINKRON (di setup, sebelum render) supaya halaman terproteksi
// tidak sempat ber-"blink" muncul sebelum redirect. Token dibaca dari
// localStorage secara sinkron saat modul useAuth di-load, jadi nilai
// isAuthenticated sudah valid di sini. Template pakai v-if="isAuthenticated"
// agar konten tidak pernah dirender saat belum login.
if (!isAuthenticated.value) {
    router.visit('/login');
}

onMounted(() => {
    if (!isAuthenticated.value) return;
    // Validasi token & sinkronkan info user di latar belakang.
    // Interceptor 401 di axios menangani token yang sudah tidak valid.
    void fetchMe().catch(() => { /* 401 sudah ditangani interceptor */ });
});

const authUser = computed(() => {
    const u = user.value;
    if (!u) return null;
    return { name: u.name, email: u.email, avatar: undefined };
});

function onLogout() {
    void logout();
}
</script>
