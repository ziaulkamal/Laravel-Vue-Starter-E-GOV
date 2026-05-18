<template>
    <AuthLayout title="Create your account" subtitle="Start your 14-day free trial — no credit card required">
        <form class="auth-form" @submit.prevent="submit">
            <div class="auth-form__row-2">
                <div class="auth-form__field">
                    <label class="auth-form__label">First name</label>
                    <AppInput v-model="form.firstName" placeholder="First" :error="errors.firstName" />
                </div>
                <div class="auth-form__field">
                    <label class="auth-form__label">Last name</label>
                    <AppInput v-model="form.lastName" placeholder="Last" />
                </div>
            </div>

            <div class="auth-form__field">
                <label class="auth-form__label">Work email</label>
                <AppInput v-model="form.email" type="email" placeholder="you@company.com" :error="errors.email" />
            </div>

            <div class="auth-form__field">
                <label class="auth-form__label">Password</label>
                <AppInput v-model="form.password" type="password" placeholder="Min. 8 characters" :error="errors.password" />
                <div class="auth-form__strength">
                    <div
                        v-for="i in 4"
                        :key="i"
                        class="auth-form__strength-bar"
                        :class="`auth-form__strength-bar--${strengthLevel >= i ? strengthColor : 'empty'}`"
                    />
                    <span class="auth-form__strength-label">{{ strengthLabel }}</span>
                </div>
            </div>

            <div class="auth-form__field">
                <AppCheckbox
                    v-model="form.terms"
                    label="I agree to the Terms of Service and Privacy Policy"
                />
            </div>

            <AppButton type="submit" variant="primary" size="lg" :loading="loading" style="width:100%">
                Create Account
            </AppButton>
        </form>

        <template #footer>
            <span style="color: var(--color-text-muted); font-size: 13px;">
                Already have an account?
                <a href="/login" style="color: #6366f1; font-weight: 600;">Sign in</a>
            </span>
        </template>
    </AuthLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import AuthLayout  from '@/Layouts/AuthLayout.vue';
import AppInput    from '@/Components/App/AppInput.vue';
import AppButton   from '@/Components/App/AppButton.vue';
import AppCheckbox from '@/Components/App/AppCheckbox.vue';

const form   = reactive({ firstName: '', lastName: '', email: '', password: '', terms: false });
const errors = reactive({ firstName: '', email: '', password: '' });
const loading = ref(false);

const strengthLevel = computed(() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
});
const strengthColor = computed(() => ['empty','danger','warning','success','success'][strengthLevel.value]);
const strengthLabel = computed(() => ['','Weak','Fair','Good','Strong'][strengthLevel.value] ?? '');

function submit() {
    errors.firstName = form.firstName ? '' : 'Required.';
    errors.email     = form.email     ? '' : 'Email is required.';
    errors.password  = form.password.length >= 8 ? '' : 'Min. 8 characters.';
    if (errors.firstName || errors.email || errors.password) return;
    loading.value = true;
    setTimeout(() => { loading.value = false; }, 1500);
}
</script>

<style scoped>
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.auth-form__row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.auth-form__field { display: flex; flex-direction: column; gap: 6px; }
.auth-form__label { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }

.auth-form__strength { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.auth-form__strength-bar {
    flex: 1; height: 4px; border-radius: 99px; background: var(--color-border);
    transition: background 200ms ease;
}
.auth-form__strength-bar--danger  { background: #ef4444; }
.auth-form__strength-bar--warning { background: #f59e0b; }
.auth-form__strength-bar--success { background: #10b981; }
.auth-form__strength-label { font-size: 11px; font-weight: 600; color: var(--color-text-subtle); white-space: nowrap; }
</style>
