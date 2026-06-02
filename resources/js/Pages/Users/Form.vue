<template>
    <SimporaLayout :title="isEdit ? 'Edit User' : 'Tambah User'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Users', href: '/users' }, { label: isEdit ? 'Edit User' : 'Tambah User' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit User' : 'Tambah User' }}</h1>

            <form @submit.prevent="submit">
                <AppCard>
                    <div class="form-grid">
                        <!-- Nama & Email -->
                        <AppInput v-model="form.name"  label="Nama Lengkap" placeholder="Nama pengguna" required />
                        <AppInput v-model="form.email" label="Email" type="email" placeholder="email@simpora.dev" required />

                        <!-- Password -->
                        <AppInput
                            v-if="!isEdit"
                            v-model="form.password"
                            label="Password"
                            type="password"
                            placeholder="Min. 8 karakter"
                        />
                        <AppInput
                            v-if="isEdit"
                            v-model="form.new_password"
                            label="Reset Password (opsional)"
                            type="password"
                            placeholder="Kosongkan jika tidak ingin mengubah"
                        />

                        <!-- Role -->
                        <div class="form-field form-field--full">
                            <label class="field-label">Role <span class="required">*</span></label>
                            <div class="role-grid">
                                <label
                                    v-for="role in roles"
                                    :key="role.value"
                                    class="role-check"
                                    :class="{ 'role-check--active': form.roles.includes(role.value) }"
                                >
                                    <input
                                        type="checkbox"
                                        :value="role.value"
                                        v-model="form.roles"
                                        class="role-check__input"
                                    />
                                    <div class="role-check__body">
                                        <span class="role-check__name">{{ role.label }}</span>
                                        <span class="role-check__desc">{{ role.desc }}</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Kontingen — muncul saat role admin_kontingen dipilih -->
                        <Transition name="fade-slide">
                            <div v-if="showKontingenField" class="form-field">
                                <AppSelectSearch
                                    v-model="form.kontingen_id"
                                    label="Kontingen"
                                    :options="kontingenOptions"
                                    :loading="loadingKontingen"
                                    placeholder="Pilih kontingen..."
                                    search-placeholder="Cari nama kontingen..."
                                    required
                                    :error="errorKontingen"
                                />
                            </div>
                        </Transition>

                        <!-- Person -->
                        <div class="form-field">
                            <AppSelectSearch
                                v-model="form.person_id"
                                label="Data Pribadi (Person)"
                                :options="personOptions"
                                :loading="loadingPerson"
                                placeholder="Pilih person..."
                                search-placeholder="Cari nama atau NIK..."
                                :error="errorPerson"
                            />
                        </div>

                        <!-- Status Aktif -->
                        <div class="form-field">
                            <label class="field-label">Status Aktif</label>
                            <AppToggle v-model="form.is_active" label="Aktif" />
                        </div>
                    </div>
                </AppCard>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="$inertia.visit('/users')">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan User</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { router }      from '@inertiajs/vue3';
import api             from '@/lib/axios';
import { decodeId }    from '@/lib/hashid';
import { useToast }    from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout   from '@/Layouts/SimporaLayout.vue';
import AppCard         from '@/Components/App/AppCard.vue';
import AppButton       from '@/Components/App/AppButton.vue';
import AppInput        from '@/Components/App/AppInput.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';
import AppToggle       from '@/Components/App/AppToggle.vue';
import AppBreadcrumb   from '@/Components/App/AppBreadcrumb.vue';

interface Props { id?: string | number }
const props = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const loading = ref(false);
const toast   = useToast();
usePageGuard({ anyPermission: ['users.create', 'users.update'] });
const { notFound } = useNotFound();
const realId  = isEdit.value ? decodeId(props.id as string | number) : NaN;

const form = reactive({
    name: '', email: '', password: '', new_password: '',
    roles: [] as string[], kontingen_id: '', person_id: '', is_active: true,
});

// ── Role definitions ───────────────────────────────────────────
const roles = [
    { value: 'super_admin',     label: 'Super Admin',     desc: 'Akses penuh ke seluruh sistem' },
    { value: 'panitia_besar',   label: 'Panitia Besar',   desc: 'Verifikasi dokumen & manajemen' },
    { value: 'admin_kontingen', label: 'Admin Kontingen',  desc: 'Kelola peserta kontingen' },
    { value: 'admin_penilaian', label: 'Admin Penilaian',  desc: 'Input hasil pertandingan' },
    { value: 'admin_venue',     label: 'Admin Venue',      desc: 'Kelola venue & jadwal' },
    { value: 'viewer',          label: 'Viewer',           desc: 'Hanya lihat data' },
];

const showKontingenField = computed(() => form.roles.includes('admin_kontingen'));

// ── Kontingen ─────────────────────────────────────────────────
interface Option { value: string; label: string }
const kontingenOptions = ref<Option[]>([]);
const loadingKontingen = ref(false);
const errorKontingen   = ref('');

async function fetchKontingen() {
    if (kontingenOptions.value.length > 0) return; // sudah di-fetch sebelumnya
    loadingKontingen.value = true;
    errorKontingen.value   = '';
    try {
        const res  = await api.get('/api/v1/contingents', { params: { per_page: 100 } });
        const list: any[] = res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
        kontingenOptions.value = list.map((c: any) => ({
            value: String(c.id),
            label: c.name + (c.short_name ? ` (${c.short_name})` : ''),
        }));
    } catch {
        errorKontingen.value = 'Gagal memuat data kontingen. Coba refresh halaman.';
    } finally {
        loadingKontingen.value = false;
    }
}

// Fetch begitu role admin_kontingen dicentang
watch(showKontingenField, (show) => { if (show) fetchKontingen(); });

// ── Person ────────────────────────────────────────────────────
const personOptions  = ref<Option[]>([]);
const loadingPerson  = ref(false);
const errorPerson    = ref('');

async function fetchPersons() {
    loadingPerson.value = true;
    errorPerson.value   = '';
    try {
        const res  = await api.get('/api/v1/persons', { params: { per_page: 200 } });
        const list: any[] = res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
        personOptions.value = list.map((p: any) => ({
            value: String(p.id),
            label: `${p.nama_lengkap}  —  ${p.nik ?? ''}`,
        }));
    } catch {
        errorPerson.value = 'Gagal memuat data person. Coba refresh halaman.';
    } finally {
        loadingPerson.value = false;
    }
}

// ── Load existing user saat edit ──────────────────────────────
async function fetchUser() {
    if (Number.isNaN(realId)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/users/${realId}`);
        const u = res.data?.data;
        if (!u) { notFound(); return; }
        form.name         = u.name ?? '';
        form.email        = u.email ?? '';
        form.roles        = Array.isArray(u.roles) ? [...u.roles] : [];
        form.kontingen_id = u.kontingen_id != null ? String(u.kontingen_id) : '';
        form.person_id    = u.person_id != null ? String(u.person_id) : '';
        form.is_active    = !!u.is_active;
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error(e?.response?.data?.message ?? 'Gagal memuat data user');
    }
}

// ── Init ──────────────────────────────────────────────────────
onMounted(() => {
    fetchPersons();
    if (isEdit.value) fetchUser();
});

async function submit() {
    loading.value = true;
    errorKontingen.value = '';
    errorPerson.value    = '';

    const payload: Record<string, any> = {
        name:         form.name,
        email:        form.email,
        roles:        form.roles,
        person_id:    form.person_id || null,
        kontingen_id: showKontingenField.value ? (form.kontingen_id || null) : null,
        is_active:    form.is_active,
    };
    if (!isEdit.value) payload.password = form.password;
    else if (form.new_password) payload.new_password = form.new_password;

    try {
        if (isEdit.value) await api.put(`/api/v1/users/${realId}`, payload);
        else              await api.post('/api/v1/users', payload);
        toast.success(isEdit.value ? 'User berhasil diperbarui' : 'User berhasil dibuat');
        router.visit('/users');
    } catch (e: any) {
        if (e?.response?.status === 422) {
            const errs = e.response.data?.errors ?? {};
            if (errs.kontingen_id) errorKontingen.value = errs.kontingen_id[0];
            if (errs.person_id)    errorPerson.value    = errs.person_id[0];
            const first = Object.values(errs)[0] as string[] | undefined;
            toast.error(first?.[0] ?? 'Data tidak valid');
        } else {
            toast.error(e?.response?.data?.message ?? 'Gagal menyimpan user');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 900px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }

.form-grid       { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }

.form-field      { display: flex; flex-direction: column; gap: 6px; }
.form-field--full{ grid-column: 1 / -1; }

.field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.required    { color: var(--color-danger); }

/* ── Role grid ── */
.role-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
@media (max-width: 700px) { .role-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .role-grid { grid-template-columns: 1fr; } }

.role-check {
    position: relative;
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px;
    border: 1.5px solid var(--color-border);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 150ms, background 150ms, box-shadow 150ms;
    user-select: none;
}
.role-check:hover {
    border-color: var(--color-border-strong);
    background: var(--color-bg-subtle);
}
.role-check--active {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.role-check__input {
    margin-top: 2px;
    flex-shrink: 0;
    width: 15px; height: 15px;
    accent-color: var(--color-accent);
    cursor: pointer;
}

.role-check__body { display: flex; flex-direction: column; gap: 2px; }
.role-check__name {
    font-size: 13px; font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.2;
}
.role-check--active .role-check__name { color: var(--color-accent); }
.role-check__desc { font-size: 11.5px; color: var(--color-text-muted); line-height: 1.4; }

/* ── Fade slide transition (kontingen field) ── */
.fade-slide-enter-active { transition: all 220ms ease; }
.fade-slide-leave-active { transition: all 160ms ease; }
.fade-slide-enter-from,
.fade-slide-leave-to     { opacity: 0; transform: translateY(-8px); }

.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
