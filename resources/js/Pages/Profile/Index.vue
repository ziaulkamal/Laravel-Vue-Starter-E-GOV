<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <h1 class="page-title">Profil Saya</h1>
            </div>

            <!-- Profile Card -->
            <AppCard>
                <div class="profile-hero">
                    <AppAvatar :user="{ name: user.name }" size="xl" />
                    <div>
                        <div class="profile-name">{{ user.name }}</div>
                        <div class="profile-email">{{ user.email }}</div>
                        <div class="profile-roles">
                            <AppBadge v-for="r in user.roles" :key="r" :color="roleColor(r)" size="sm">{{ roleLabel(r) }}</AppBadge>
                        </div>
                        <div v-if="user.kontingen" class="profile-kontingen">
                            🏅 Kontingen: {{ user.kontingen }}
                        </div>
                    </div>
                </div>
            </AppCard>

            <!-- Tabs -->
            <AppTabs v-model="activeTab" variant="underline" :tabs="tabs">
                <template #edit>
                    <form @submit.prevent="saveProfile" class="tab-form">
                        <AppInput v-model="editForm.name"  label="Nama Lengkap" />
                        <AppInput v-model="editForm.email" label="Email" type="email" />
                        <div class="form-actions">
                            <AppButton variant="primary" type="submit" :loading="savingProfile">Simpan Profil</AppButton>
                        </div>
                    </form>
                </template>

                <template #password>
                    <form @submit.prevent="changePassword" class="tab-form">
                        <AppInput v-model="passForm.current" label="Password Lama" type="password" placeholder="••••••••" />
                        <AppInput v-model="passForm.new"     label="Password Baru" type="password" placeholder="Min. 8 karakter" />
                        <AppInput v-model="passForm.confirm" label="Konfirmasi Password Baru" type="password" placeholder="Ulangi password baru" />
                        <div class="form-actions">
                            <AppButton variant="primary" type="submit" :loading="savingPass">Ganti Password</AppButton>
                        </div>
                    </form>
                </template>
            </AppTabs>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppTabs       from '@/Components/App/AppTabs.vue';

const activeTab = ref('edit');
const tabs = [{ key: 'edit', label: 'Edit Profil' }, { key: 'password', label: 'Ganti Password' }];

const user = {
    name: 'Admin SIMPORA', email: 'admin@simpora.dev',
    roles: ['super_admin'], kontingen: null as string | null,
};

const editForm    = reactive({ name: user.name, email: user.email });
const passForm    = reactive({ current: '', new: '', confirm: '' });
const savingProfile = ref(false);
const savingPass    = ref(false);

const rolesMap = [
    { value: 'super_admin',     label: 'Super Admin',     color: 'primary' },
    { value: 'panitia_besar',   label: 'Panitia Besar',   color: 'info' },
    { value: 'admin_kontingen', label: 'Admin Kontingen',  color: 'success' },
    { value: 'admin_penilaian', label: 'Admin Penilaian',  color: 'warning' },
    { value: 'admin_venue',     label: 'Admin Venue',      color: 'info' },
    { value: 'viewer',          label: 'Viewer',           color: 'default' },
];

function roleColor(r: string) {
    return (rolesMap.find(x => x.value === r)?.color ?? 'default') as 'primary' | 'info' | 'success' | 'warning' | 'default';
}
function roleLabel(r: string) {
    return rolesMap.find(x => x.value === r)?.label ?? r;
}
function saveProfile() {
    savingProfile.value = true;
    setTimeout(() => { savingProfile.value = false; }, 1000);
}
function changePassword() {
    savingPass.value = true;
    setTimeout(() => { savingPass.value = false; }, 1000);
}
</script>

<style scoped>
.page-wrap     { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 700px; }
.page-header   { }
.page-title    { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.profile-hero  { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
.profile-name  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
.profile-email { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.profile-roles { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.profile-kontingen { font-size: 13px; color: var(--color-text-muted); margin-top: 6px; }
.tab-form      { display: flex; flex-direction: column; gap: 16px; max-width: 480px; padding-top: 4px; }
.form-actions  { display: flex; }
</style>
