<template>
    <SimporaLayout title="Detail Data Pribadi">
        <div class="page-wrap">
            <AppBreadcrumb :items="[
                { label: 'Data Pribadi', href: '/persons' },
                { label: person?.nama_lengkap ?? 'Detail' }
            ]" />

            <div class="page-header">
                <h1 class="page-title">Detail Data Pribadi</h1>
                <div v-if="person" class="header-actions">
                    <AppButton v-if="can('persons.update')" variant="secondary" size="sm" @click="$inertia.visit(`/persons/${encodeId(person.id)}/edit`)">
                        <Pencil :size="14" /> Edit
                    </AppButton>
                    <AppButton v-if="can('persons.delete')" variant="danger" size="sm" @click="confirmDelete = true">
                        <Trash2 :size="14" /> Hapus
                    </AppButton>
                </div>
            </div>

            <!-- Loading -->
            <AppCard v-if="loading">
                <div class="sk-hero">
                    <span class="sk-avatar" />
                    <div class="sk-lines">
                        <span class="sk-bar" style="width:200px; height:20px" />
                        <span class="sk-bar" style="width:160px" />
                        <span class="sk-bar" style="width:240px" />
                    </div>
                </div>
            </AppCard>

            <!-- Error -->
            <AppCard v-else-if="error">
                <div class="state-msg state-msg--error">
                    <p>{{ error }}</p>
                    <AppButton size="sm" variant="secondary" @click="fetchPerson">Coba lagi</AppButton>
                </div>
            </AppCard>

            <!-- Profile -->
            <template v-else-if="person">
                <AppCard padding="none">
                    <!-- Hero -->
                    <div class="hero">
                        <AppAvatar :user="{ name: person.nama_lengkap }" size="xl" />
                        <div class="hero__main">
                            <h2 class="hero__name">{{ person.nama_lengkap }}</h2>
                            <div class="hero__nik">
                                <CreditCard :size="13" />
                                <span class="nik-mono">{{ person.nik }}</span>
                            </div>
                            <div class="hero__chips">
                                <AppBadge :color="person.jenis_kelamin === 'male' ? 'info' : 'danger'" size="sm">
                                    {{ person.jenis_kelamin === 'male' ? 'Laki-laki' : 'Perempuan' }}
                                </AppBadge>
                                <AppBadge color="default" size="sm">{{ person.agama }}</AppBadge>
                            </div>
                        </div>
                    </div>

                    <!-- Info grid -->
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-item__icon"><Calendar :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">Tempat, Tanggal Lahir</span>
                                <span class="info-item__value info-item__value--cap">{{ person.tempat_lahir }}, {{ formatDate(person.tanggal_lahir) }}</span>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-item__icon"><MapPin :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">Provinsi</span>
                                <span class="info-item__value">{{ wilayah.provinsi || '—' }}</span>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-item__icon"><MapPin :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">Kabupaten / Kota</span>
                                <span class="info-item__value">{{ wilayah.kabupaten || '—' }}</span>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-item__icon"><MapPin :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">Kecamatan</span>
                                <span class="info-item__value">{{ wilayah.kecamatan || '—' }}</span>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-item__icon"><MapPin :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">Desa / Kelurahan</span>
                                <span class="info-item__value">{{ wilayah.desa || '—' }}</span>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-item__icon"><Phone :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">No. HP</span>
                                <span class="info-item__value">{{ person.no_hp || '—' }}</span>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-item__icon"><Mail :size="15" /></div>
                            <div class="info-item__body">
                                <span class="info-item__label">Email</span>
                                <span class="info-item__value">{{ person.email || '—' }}</span>
                            </div>
                        </div>
                    </div>
                </AppCard>

                <!-- Peserta -->
                <AppCard>
                    <template #header><span class="section-title">Terdaftar sebagai Peserta</span></template>
                    <table v-if="participations.length" class="dt-table">
                        <thead>
                            <tr>
                                <th class="dt-th">Kontingen</th>
                                <th class="dt-th">Role</th>
                                <th class="dt-th">Cabor</th>
                                <th class="dt-th">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="p in participations" :key="p.id" class="dt-row">
                                <td class="dt-td">{{ p.kontingen }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="roleColor(p.role)" size="sm">{{ roleLabel(p.role) }}</AppBadge>
                                </td>
                                <td class="dt-td">{{ p.cabor }}</td>
                                <td class="dt-td">
                                    <AppBadge :color="p.is_active ? 'success' : 'default'" size="sm">
                                        {{ p.is_active ? 'Aktif' : 'Tidak Aktif' }}
                                    </AppBadge>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <AppEmptyState v-else title="Belum terdaftar sebagai peserta" size="sm" />
                </AppCard>
            </template>
        </div>

        <!-- Delete Confirm Modal -->
        <AppModal v-model="confirmDelete" title="Hapus Data Pribadi" size="sm">
            <p style="font-size:13.5px; color:var(--color-text-muted)">
                Apakah Anda yakin ingin menghapus data <strong>{{ person?.nama_lengkap }}</strong>?
                Tindakan ini tidak dapat dibatalkan.
            </p>
            <template #footer>
                <AppButton variant="secondary" @click="confirmDelete = false">Batal</AppButton>
                <AppButton variant="danger" :loading="deleting" @click="doDelete">Hapus</AppButton>
            </template>
        </AppModal>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import { Pencil, Trash2, CreditCard, Calendar, MapPin, Phone, Mail } from '@lucide/vue';
import api           from '@/lib/axios';
import { useToast }  from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import { useAuth }    from '@/Composables/useAuth';
import { usePageGuard } from '@/Composables/usePageGuard';
import { encodeId, decodeId } from '@/lib/hashid';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppBadge      from '@/Components/App/AppBadge.vue';
import AppAvatar     from '@/Components/App/AppAvatar.vue';
import AppModal      from '@/Components/App/AppModal.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';
import AppEmptyState from '@/Components/App/AppEmptyState.vue';

interface Props { id: string | number }
const props = defineProps<Props>();
const toast = useToast();
const { notFound } = useNotFound();
usePageGuard({ permission: 'persons.view' });
const { can } = useAuth();

// ID di URL ter-obfuscate → decode ke id numerik asli untuk fetch
const realId = decodeId(props.id);

interface Wilayah { kode: string; nama: string }
interface Person {
    id: number; nik: string; nama_lengkap: string;
    jenis_kelamin: 'male' | 'female'; agama: string;
    tempat_lahir: string; tanggal_lahir: string;
    wilayah_kode: string | null; wilayah: Wilayah | null;
    alamat_detail: string | null;
    no_hp: string | null; email: string | null;
}
interface Participation {
    id: number; kontingen: string; role: string; cabor: string; is_active: boolean;
}

const person         = ref<Person | null>(null);
const participations = ref<Participation[]>([]);
const wilayah        = reactive({ provinsi: '', kabupaten: '', kecamatan: '', desa: '' });
const loading        = ref(true);
const error          = ref('');
const confirmDelete  = ref(false);
const deleting       = ref(false);

// ── Fetch person by id ─────────────────────────────────────────
async function fetchPerson() {
    // ID tidak valid (hash rusak) → langsung not-found
    if (Number.isNaN(realId)) { notFound(); return; }

    loading.value = true;
    error.value   = '';
    try {
        const res = await api.get(`/api/v1/persons/${realId}`);
        person.value = res.data?.data ?? null;
        if (person.value) {
            fetchParticipations(person.value.nik);
            fetchWilayahDetail(person.value.wilayah_kode);
        } else {
            notFound();
        }
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        error.value = e?.response?.data?.message ?? 'Gagal memuat data person';
    } finally {
        loading.value = false;
    }
}

// ── Pecah wilayah jadi provinsi/kabupaten/kecamatan/desa ───────
async function fetchWilayahDetail(kode: string | null) {
    wilayah.provinsi = wilayah.kabupaten = wilayah.kecamatan = wilayah.desa = '';
    if (!kode) return;
    try {
        const res = await api.get(`/api/v1/wilayah/${kode}`);
        const breadcrumb: Array<{ nama: string; level: number }> = res.data?.data?.breadcrumb ?? [];
        for (const w of breadcrumb) {
            if      (w.level === 1) wilayah.provinsi  = w.nama;
            else if (w.level === 2) wilayah.kabupaten = w.nama;
            else if (w.level === 3) wilayah.kecamatan = w.nama;
            else if (w.level === 4) wilayah.desa      = w.nama;
        }
    } catch {
        /* abaikan — biarkan kosong */
    }
}

// ── Fetch participations (cari peserta berdasarkan NIK) ─────────
async function fetchParticipations(nik: string) {
    try {
        const res = await api.get('/api/v1/participants', { params: { search: nik, per_page: 50 } });
        const raw  = res.data?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        participations.value = list.filter(Boolean).map((p: any) => ({
            id:        p.id,
            kontingen: p.contingent?.name ?? '—',
            role:      p.role,
            cabor:     p.sport?.name ?? '—',
            is_active: !!p.is_active,
        }));
    } catch {
        participations.value = [];
    }
}

async function doDelete() {
    if (!person.value) return;
    deleting.value = true;
    try {
        await api.delete(`/api/v1/persons/${person.value.id}`);
        toast.success('Data person berhasil dihapus');
        router.visit('/persons');
    } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Gagal menghapus data');
        deleting.value = false;
        confirmDelete.value = false;
    }
}

onMounted(fetchPerson);

function formatDate(d: string) {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
function roleColor(role: string) {
    const map: Record<string, 'success' | 'info' | 'warning' | 'primary'> = {
        athlete: 'success', coach: 'info', official: 'warning', manager: 'primary',
    };
    return map[role] ?? 'default' as 'success';
}
function roleLabel(role: string) {
    const map: Record<string, string> = {
        athlete: 'Atlet', coach: 'Pelatih', official: 'Official', manager: 'Manajer',
    };
    return map[role] ?? role;
}
</script>

<style scoped>
.page-wrap     { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header   { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title    { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.header-actions{ display: flex; gap: 8px; }
.section-title { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }

/* Hero header */
.hero {
    display: flex; gap: 18px; align-items: center;
    padding: 22px 24px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 70%);
    border-bottom: 1px solid var(--color-border);
}
.hero__main  { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.hero__name  { font-size: 19px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; line-height: 1.2; text-transform: capitalize; }
.hero__nik   { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-text-muted); }
.nik-mono    { font-family: var(--font-mono); letter-spacing: 0.03em; }
.hero__chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }

/* Info grid */
.info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 2px 0;
    padding: 8px 12px 12px;
}
@media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }

.info-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 12px;
}
.info-item--full { grid-column: 1 / -1; }
.info-item__icon {
    width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-accent-subtle); color: var(--color-accent);
}
.info-item__body  { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.info-item__label { font-size: 11px; font-weight: 600; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; }
.info-item__value { font-size: 13.5px; color: var(--color-text-primary); font-weight: 500; line-height: 1.45; }
.info-item__value--cap { text-transform: capitalize; }
.info-item__code  { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-subtle); margin-left: 4px; }
.info-item__empty { color: var(--color-text-subtle); }

.dt-table { width: 100%; border-collapse: collapse; }
.dt-th    { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-subtle); border-bottom: 1.5px solid var(--color-border); text-align: left; }
.dt-row   { border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-td    { padding: 11px 14px; font-size: 13px; color: var(--color-text-primary); vertical-align: middle; }

.state-msg { padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-msg--error p { color: var(--color-danger); font-size: 13px; margin: 0; }

/* Skeleton */
.sk-hero   { display: flex; gap: 18px; align-items: center; }
.sk-lines  { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-avatar { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; background: var(--color-bg-subtle); animation: sk 1.2s ease-in-out infinite; }
.sk-bar    { display: block; height: 14px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
@keyframes sk    { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
