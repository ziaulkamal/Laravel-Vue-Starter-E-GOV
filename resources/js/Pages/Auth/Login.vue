<template>
    <AuthLayout title="Masuk ke SIMPORA" subtitle="Sistem Informasi PORA Aceh Jaya 2026">
        <AppAlert v-if="errorMsg" type="error" :description="errorMsg" class="mb-2" />

        <form class="auth-form" @submit.prevent="submit">
            <div class="auth-form__field">
                <label class="auth-form__label">Email</label>
                <AppInput
                    v-model="form.email"
                    type="email"
                    placeholder="email@simpora.dev"
                    :error="errors.email"
                    size="md"
                />
            </div>

            <div class="auth-form__field">
                <div class="auth-form__label-row">
                    <label class="auth-form__label">Password</label>
                </div>
                <AppInput
                    v-model="form.password"
                    type="password"
                    placeholder="••••••••"
                    :error="errors.password"
                    size="md"
                />
            </div>

            <AppButton
                type="submit"
                variant="primary"
                size="lg"
                :loading="loading"
                style="width:100%"
            >
                Masuk
            </AppButton>
        </form>

        <template #footer>
            <span style="color: var(--color-text-muted); font-size: 12px; text-align:center; display:block">
                v1.0 · PORA XV Aceh Jaya 2026
            </span>
        </template>
    </AuthLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AuthLayout from '@/Layouts/AuthLayout.vue';
import AppInput   from '@/Components/App/AppInput.vue';
import AppButton  from '@/Components/App/AppButton.vue';
import AppAlert   from '@/Components/App/AppAlert.vue';
import { useAuth } from '@/Composables/useAuth';
import { useToast } from '@/Composables/useToast';

const { login, isAuthenticated } = useAuth();
const toast = useToast();

const form     = reactive({ email: '', password: '' });
const errors   = reactive({ email: '', password: '' });
const loading  = ref(false);
const errorMsg = ref('');

// Kalau sudah login, langsung ke dashboard.
onMounted(() => {
    if (isAuthenticated.value) router.visit('/dashboard');
});

async function submit() {
    errors.email    = '';
    errors.password = '';
    errorMsg.value  = '';

    if (!form.email)    { errors.email    = 'Email wajib diisi.';    return; }
    if (!form.password) { errors.password = 'Password wajib diisi.'; return; }

    loading.value = true;
    try {
        const user = await login(form.email, form.password);
        toast.success(`Selamat datang, ${user.name}`);
        router.visit('/dashboard');
    } catch (e: any) {
        const status = e?.response?.status;
        const resErrors = e?.response?.data?.errors;
        if (status === 422 && resErrors) {
            // Map error validasi ke field.
            errors.email    = resErrors.email?.[0] ?? '';
            errors.password = resErrors.password?.[0] ?? '';
        } else {
            errorMsg.value = e?.response?.data?.message
                ?? 'Tidak dapat masuk. Periksa email dan password Anda.';
        }
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.auth-form { display: flex; flex-direction: column; gap: 18px; }
.auth-form__field { display: flex; flex-direction: column; gap: 6px; }
.auth-form__label { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.auth-form__label-row { display: flex; align-items: center; justify-content: space-between; }
</style>
