<template>
    <BaseLayout
        v-if="isAuthenticated"
        :nav-groups="simporaNavGroups"
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
import { router } from '@inertiajs/vue3';
import BaseLayout from '@/Layouts/BaseLayout.vue';
import { simporaNavGroups } from '@/config/nav';
import { useAuth } from '@/Composables/useAuth';

interface Props {
    notificationCount?: number
}

const props = withDefaults(defineProps<Props>(), {
    notificationCount: 0,
});

const { user, isAuthenticated, logout, fetchMe } = useAuth();

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
