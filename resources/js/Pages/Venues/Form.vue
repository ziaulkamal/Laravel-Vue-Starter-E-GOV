<template>
    <SimporaLayout :title="isEdit ? 'Edit Venue' : 'Tambah Venue'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[
                { label: 'Venue', href: '/venues' },
                { label: isEdit ? 'Edit Venue' : 'Tambah Venue' }
            ]" />

            <div class="page-header">
                <h1 class="page-title">{{ isEdit ? 'Edit Venue' : 'Tambah Venue' }}</h1>
            </div>

            <form @submit.prevent="submit">
                <div class="form-sections">
                    <!-- Informasi Venue -->
                    <AppCard>
                        <template #header><span class="section-title">Informasi Venue</span></template>
                        <div class="form-grid">
                            <div class="form-field--full">
                                <AppInput
                                    v-model="form.name"
                                    label="Nama Venue"
                                    placeholder="Contoh: Stadion Calang"
                                    required
                                    :error="errors.name"
                                />
                            </div>
                            <AppInput
                                v-model="form.capacity"
                                label="Kapasitas"
                                type="number"
                                inputmode="numeric"
                                placeholder="Jumlah penonton"
                                :error="errors.capacity"
                            />
                            <div class="form-field">
                                <label class="field-label">Status</label>
                                <AppToggle v-model="form.is_active" label="Aktif" />
                            </div>
                            <div class="form-field form-field--full">
                                <AppTextarea
                                    v-model="form.address"
                                    label="Alamat"
                                    placeholder="Nama jalan, nomor, RT/RW, kelurahan..."
                                    :rows="2"
                                    :error="errors.address"
                                />
                            </div>
                        </div>
                    </AppCard>

                    <!-- Wilayah -->
                    <AppCard>
                        <template #header><span class="section-title">Wilayah</span></template>
                        <div class="form-grid">
                            <AppSelectSearch
                                v-model="form.provinsi"
                                label="Provinsi"
                                :options="provinsiOptions"
                                :loading="loadingProvinsi"
                                placeholder="Pilih provinsi..."
                                search-placeholder="Cari provinsi..."
                                @change="onProvinsiChange"
                            />
                            <AppSelectSearch
                                v-model="form.kabupaten"
                                label="Kabupaten / Kota"
                                :options="kabupatenOptions"
                                :loading="loadingKabupaten"
                                :disabled="!form.provinsi"
                                :placeholder="form.provinsi ? 'Pilih kabupaten/kota...' : 'Pilih provinsi dulu'"
                                search-placeholder="Cari kabupaten/kota..."
                                @change="onKabupatenChange"
                            />
                            <AppSelectSearch
                                v-model="form.kecamatan"
                                label="Kecamatan"
                                :options="kecamatanOptions"
                                :loading="loadingKecamatan"
                                :disabled="!form.kabupaten"
                                :placeholder="form.kabupaten ? 'Pilih kecamatan...' : 'Pilih kabupaten dulu'"
                                search-placeholder="Cari kecamatan..."
                                @change="onKecamatanChange"
                            />
                            <AppSelectSearch
                                v-model="form.desa"
                                label="Desa / Kelurahan"
                                :options="desaOptions"
                                :loading="loadingDesa"
                                :disabled="!form.kecamatan"
                                :placeholder="form.kecamatan ? 'Pilih desa/kelurahan...' : 'Pilih kecamatan dulu'"
                                search-placeholder="Cari desa/kelurahan..."
                                @change="scheduleGeocode"
                            />
                        </div>
                    </AppCard>

                    <!-- Titik Lokasi -->
                    <AppCard>
                        <template #header>
                            <div class="section-head">
                                <span class="section-title">Titik Lokasi (Peta)</span>
                                <Transition name="addr-fade">
                                    <span v-if="geoStatus !== 'idle'" :class="['addr-chip', `addr-chip--${geoStatus}`]">
                                        <Loader2  v-if="geoStatus === 'loading'" :size="13" class="addr-spin" />
                                        <Sparkles v-else-if="geoStatus === 'found'" :size="13" />
                                        <AlertCircle v-else-if="geoStatus === 'partial' || geoStatus === 'notfound'" :size="13" />
                                        <XCircle  v-else :size="13" />
                                        {{ geoMsg }}
                                    </span>
                                </Transition>
                            </div>
                        </template>
                        <AppMapPicker ref="mapRef" v-model="coords" height="340px" />
                        <div class="form-grid mt-3">
                            <AppInput
                                v-model="form.latitude"
                                label="Latitude"
                                placeholder="-90 s/d 90"
                                hint="Otomatis terisi dari peta, bisa diubah manual"
                                :error="errors.latitude"
                            />
                            <AppInput
                                v-model="form.longitude"
                                label="Longitude"
                                placeholder="-180 s/d 180"
                                :error="errors.longitude"
                            />
                        </div>
                    </AppCard>
                </div>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="goBack">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan Venue</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { router }      from '@inertiajs/vue3';
import axios           from 'axios';
import { Loader2, Sparkles, AlertCircle, XCircle } from '@lucide/vue';
import api             from '@/lib/axios';
import { encodeId, decodeId } from '@/lib/hashid';
import { useToast }    from '@/Composables/useToast';
import { useNotFound } from '@/Composables/useNotFound';
import SimporaLayout   from '@/Layouts/SimporaLayout.vue';
import AppCard         from '@/Components/App/AppCard.vue';
import AppButton       from '@/Components/App/AppButton.vue';
import AppInput        from '@/Components/App/AppInput.vue';
import AppTextarea     from '@/Components/App/AppTextarea.vue';
import AppToggle       from '@/Components/App/AppToggle.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';
import AppBreadcrumb   from '@/Components/App/AppBreadcrumb.vue';
import AppMapPicker    from '@/Components/App/AppMapPicker.vue';

interface Props { id?: string | number }
const props  = defineProps<Props>();
const isEdit = computed(() => !!props.id);
const realId = computed(() => (props.id != null ? decodeId(props.id) : null));
const loading = ref(false);
const toast   = useToast();
const { notFound } = useNotFound();

const form = reactive({
    name: '', address: '', capacity: '' as string | number,
    latitude: '' as string | number, longitude: '' as string | number,
    is_active: true,
    provinsi: '', kabupaten: '', kecamatan: '', desa: '',
});
const errors = reactive<Record<string, string>>({});
const mapRef = ref<InstanceType<typeof AppMapPicker> | null>(null);

// ── Jembatan peta ↔ field lat/lng ─────────────────────────────
const coords = computed({
    get() {
        const lat = parseFloat(String(form.latitude));
        const lng = parseFloat(String(form.longitude));
        return { lat: Number.isNaN(lat) ? null : lat, lng: Number.isNaN(lng) ? null : lng };
    },
    set(c: { lat: number | null; lng: number | null }) {
        form.latitude  = c.lat ?? '';
        form.longitude = c.lng ?? '';
    },
});

// ── Wilayah cascade (mirip Persons/Form) ──────────────────────
interface WilayahOption { value: string; label: string }
const provinsiOptions  = ref<WilayahOption[]>([]);
const kabupatenOptions = ref<WilayahOption[]>([]);
const kecamatanOptions = ref<WilayahOption[]>([]);
const desaOptions      = ref<WilayahOption[]>([]);
const loadingProvinsi  = ref(false);
const loadingKabupaten = ref(false);
const loadingKecamatan = ref(false);
const loadingDesa      = ref(false);

function toOptions(res: any): WilayahOption[] {
    const list: any[] = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(list) ? list.map(i => ({ value: String(i.kode), label: i.nama })) : [];
}

async function fetchProvinsi() {
    loadingProvinsi.value = true;
    try { provinsiOptions.value = toOptions(await api.get('/api/v1/wilayah/provinsi')); }
    catch { /* biarkan kosong */ }
    finally { loadingProvinsi.value = false; }
}

function deriveWilayahLevels(kode: string) {
    if (kode.includes('.')) {
        const p = kode.split('.');
        return {
            prov: p[0] ?? '',
            kab:  p.length >= 2 ? p.slice(0, 2).join('.') : '',
            kec:  p.length >= 3 ? p.slice(0, 3).join('.') : '',
            desa: p.length >= 4 ? kode : '',
        };
    }
    return {
        prov: kode.slice(0, 2),
        kab:  kode.length >= 4  ? kode.slice(0, 4) : '',
        kec:  kode.length >= 6  ? kode.slice(0, 6) : '',
        desa: kode.length >= 10 ? kode : '',
    };
}

async function populateWilayah(kode: string) {
    if (!kode) return;
    const { prov, kab, kec, desa } = deriveWilayahLevels(kode);
    form.provinsi = prov;
    if (kab) {
        kabupatenOptions.value = toOptions(await api.get(`/api/v1/wilayah/kabupaten/${prov}`));
        form.kabupaten = kab;
    }
    if (kec) {
        kecamatanOptions.value = toOptions(await api.get(`/api/v1/wilayah/kecamatan/${kab}`));
        form.kecamatan = kec;
    }
    if (desa) {
        desaOptions.value = toOptions(await api.get(`/api/v1/wilayah/desa/${kec}`));
        form.desa = desa;
    }
}

async function onProvinsiChange(value: string) {
    form.kabupaten = ''; form.kecamatan = ''; form.desa = '';
    kabupatenOptions.value = []; kecamatanOptions.value = []; desaOptions.value = [];
    if (!value) return;
    loadingKabupaten.value = true;
    try { kabupatenOptions.value = toOptions(await api.get(`/api/v1/wilayah/kabupaten/${value}`)); }
    catch { kabupatenOptions.value = []; }
    finally { loadingKabupaten.value = false; }
    scheduleGeocode();
}
async function onKabupatenChange(value: string) {
    form.kecamatan = ''; form.desa = '';
    kecamatanOptions.value = []; desaOptions.value = [];
    if (!value) return;
    loadingKecamatan.value = true;
    try { kecamatanOptions.value = toOptions(await api.get(`/api/v1/wilayah/kecamatan/${value}`)); }
    catch { kecamatanOptions.value = []; }
    finally { loadingKecamatan.value = false; }
    scheduleGeocode();
}
async function onKecamatanChange(value: string) {
    form.desa = ''; desaOptions.value = [];
    if (!value) return;
    loadingDesa.value = true;
    try { desaOptions.value = toOptions(await api.get(`/api/v1/wilayah/desa/${value}`)); }
    catch { desaOptions.value = []; }
    finally { loadingDesa.value = false; }
    scheduleGeocode();
}

// ── Geocode wilayah → geser & zoom peta ───────────────────────
// Pakai Nominatim (OpenStreetMap), titik makin spesifik → zoom makin dekat.
const labelOf = (opts: WilayahOption[], val: string) => opts.find(o => o.value === val)?.label ?? '';

let geoTimer: ReturnType<typeof setTimeout>;
function scheduleGeocode() { clearTimeout(geoTimer); geoTimer = setTimeout(geocodeWilayah, 500); }

async function geocodeWilayah() {
    const parts: string[] = [];
    let zoom = 11;
    if (form.provinsi)  { parts.unshift(labelOf(provinsiOptions.value,  form.provinsi));  zoom = 9;  }
    if (form.kabupaten) { parts.unshift(labelOf(kabupatenOptions.value, form.kabupaten)); zoom = 12; }
    if (form.kecamatan) { parts.unshift(labelOf(kecamatanOptions.value, form.kecamatan)); zoom = 14; }
    if (form.desa)      { parts.unshift(labelOf(desaOptions.value,      form.desa));      zoom = 15; }
    const query = parts.filter(Boolean).join(', ');
    if (!query) return;
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: `${query}, Indonesia`, format: 'json', limit: 1, countrycodes: 'id' },
            timeout: 10000,
        });
        const hit = Array.isArray(res.data) ? res.data[0] : null;
        if (hit) mapRef.value?.flyTo(parseFloat(hit.lat), parseFloat(hit.lon), zoom);
    } catch { /* gagal geocode — abaikan, peta tetap di posisi terakhir */ }
}

// ── Reverse geocode: pin di peta → isi cascade wilayah ────────
type GeoStatus = 'idle' | 'loading' | 'found' | 'partial' | 'notfound' | 'error';
const geoStatus = ref<GeoStatus>('idle');
const geoMsg    = ref('');
let reverseReady = false;   // jangan reverse saat load awal (edit mode pakai wilayah_kode tersimpan)
let lastRevKey   = '';
let revTimer: ReturnType<typeof setTimeout>;

// Normalisasi nama wilayah agar bisa dicocokkan (buang prefix administratif)
function normName(s: unknown): string {
    return String(s ?? '')
        .toLowerCase()
        .replace(/\b(kabupaten|kota|kab|kecamatan|kec|desa|kelurahan|kel|administrasi|daerah|khusus|ibukota)\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Cari opsi yang namanya cocok dgn salah satu kandidat (exact dulu, lalu contains)
function matchName(options: WilayahOption[], candidates: unknown[]): WilayahOption | undefined {
    const cands = candidates.map(normName).filter(Boolean);
    if (!cands.length) return undefined;
    for (const c of cands) {
        const exact = options.find(o => normName(o.label) === c);
        if (exact) return exact;
    }
    for (const c of cands) {
        const part = options.find(o => { const n = normName(o.label); return n && (n.includes(c) || c.includes(n)); });
        if (part) return part;
    }
    return undefined;
}

function scheduleReverse() {
    clearTimeout(revTimer);
    if (!reverseReady) return;
    const lat = parseFloat(String(form.latitude));
    const lng = parseFloat(String(form.longitude));
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    revTimer = setTimeout(() => reverseFill(lat, lng), 600);
}

async function reverseFill(lat: number, lng: number) {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (key === lastRevKey) return;
    geoStatus.value = 'loading';
    geoMsg.value    = 'Mendeteksi wilayah dari titik peta...';
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat, lon: lng, format: 'jsonv2', addressdetails: 1, zoom: 18, 'accept-language': 'id' },
            timeout: 12000,
        });
        const a = res.data?.address;
        if (!a) { geoStatus.value = 'notfound'; geoMsg.value = 'Wilayah tidak terdeteksi'; return; }
        lastRevKey = key;

        // Provinsi
        const prov = matchName(provinsiOptions.value, [a.state, a.region]);
        if (!prov) { geoStatus.value = 'partial'; geoMsg.value = 'Provinsi tidak cocok, isi manual'; return; }
        form.provinsi  = prov.value;
        form.kabupaten = ''; form.kecamatan = ''; form.desa = '';
        kabupatenOptions.value = []; kecamatanOptions.value = []; desaOptions.value = [];

        // Kabupaten/Kota
        loadingKabupaten.value = true;
        try { kabupatenOptions.value = toOptions(await api.get(`/api/v1/wilayah/kabupaten/${prov.value}`)); }
        finally { loadingKabupaten.value = false; }
        const kab = matchName(kabupatenOptions.value, [a.county, a.city, a.city_district, a.municipality]);
        if (!kab) { geoStatus.value = 'partial'; geoMsg.value = `Terisi sampai provinsi (${prov.label})`; return; }
        form.kabupaten = kab.value;

        // Kecamatan
        loadingKecamatan.value = true;
        try { kecamatanOptions.value = toOptions(await api.get(`/api/v1/wilayah/kecamatan/${kab.value}`)); }
        finally { loadingKecamatan.value = false; }
        const kec = matchName(kecamatanOptions.value, [a.municipality, a.city_district, a.subdistrict, a.district, a.town, a.suburb]);
        if (!kec) { geoStatus.value = 'partial'; geoMsg.value = `Terisi sampai kabupaten (${kab.label})`; return; }
        form.kecamatan = kec.value;

        // Desa/Kelurahan
        loadingDesa.value = true;
        try { desaOptions.value = toOptions(await api.get(`/api/v1/wilayah/desa/${kec.value}`)); }
        finally { loadingDesa.value = false; }
        const desa = matchName(desaOptions.value, [a.village, a.suburb, a.hamlet, a.neighbourhood, a.quarter, a.residential]);
        if (!desa) { geoStatus.value = 'partial'; geoMsg.value = `Terisi sampai kecamatan (${kec.label})`; return; }
        form.desa = desa.value;

        geoStatus.value = 'found';
        geoMsg.value    = 'Wilayah terisi otomatis dari peta';
    } catch {
        geoStatus.value = 'error';
        geoMsg.value    = 'Gagal mendeteksi wilayah dari peta';
    }
}

// Pin/lat-lng berubah → coba isi wilayah otomatis
watch(() => [form.latitude, form.longitude], scheduleReverse);

// ── Edit: muat data lama ───────────────────────────────────────
async function fetchExisting() {
    if (realId.value == null || Number.isNaN(realId.value)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/venues/${realId.value}`);
        const v = res.data?.data;
        if (!v) { notFound(); return; }
        form.name      = v.name ?? '';
        form.address   = v.address ?? '';
        form.capacity  = v.capacity ?? '';
        form.latitude  = v.latitude ?? '';
        form.longitude = v.longitude ?? '';
        form.is_active = !!v.is_active;
        await populateWilayah(v.wilayah_kode ?? '');
        if (form.latitude !== '' && form.longitude !== '') {
            // Jangan timpa wilayah dari kode tersimpan dgn reverse geocode titik yang sama
            lastRevKey = `${parseFloat(String(form.latitude)).toFixed(5)},${parseFloat(String(form.longitude)).toFixed(5)}`;
        } else {
            scheduleGeocode();   // belum ada koordinat → arahkan peta ke wilayahnya
        }
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error('Gagal memuat data venue');
    }
}

onMounted(async () => {
    await fetchProvinsi();
    if (isEdit.value) await fetchExisting();
    reverseReady = true;   // aktifkan reverse-geocode hanya setelah load awal selesai
});

function goBack() {
    if (isEdit.value && realId.value != null && !Number.isNaN(realId.value))
        router.visit(`/venues/${encodeId(realId.value)}`);
    else router.visit('/venues');
}

function clearErrors() { Object.keys(errors).forEach(k => delete errors[k]); }

async function submit() {
    clearErrors();
    if (!form.name.trim()) {
        errors.name = 'Wajib diisi';
        toast.error('Nama venue wajib diisi');
        return;
    }

    const wilayahKode = form.desa || form.kecamatan || form.kabupaten || form.provinsi || null;

    const payload = {
        name:         form.name.trim(),
        address:      String(form.address).trim() || null,
        wilayah_kode: wilayahKode,
        capacity:     form.capacity === '' ? null : Number(form.capacity),
        latitude:     form.latitude  === '' ? null : Number(form.latitude),
        longitude:    form.longitude === '' ? null : Number(form.longitude),
        is_active:    form.is_active,
    };

    loading.value = true;
    try {
        if (isEdit.value) await api.put(`/api/v1/venues/${realId.value}`, payload);
        else              await api.post('/api/v1/venues', payload);
        toast.success(isEdit.value ? 'Venue berhasil diperbarui' : 'Venue berhasil dibuat');
        router.visit('/venues');
    } catch (e: any) {
        const status = e?.response?.status;
        const body   = e?.response?.data;
        if (status === 422 && body?.errors) {
            Object.entries(body.errors).forEach(([f, msgs]) => {
                errors[f] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
            });
            toast.error(body.message ?? 'Data tidak valid');
        } else {
            toast.error(body?.message ?? 'Gagal menyimpan venue');
        }
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap    { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
.page-title   { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.section-title{ font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; flex-wrap: wrap; }
.addr-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 600; padding: 4px 10px;
    border-radius: 99px; white-space: nowrap;
}
.addr-chip--loading  { background: var(--color-bg-subtle); color: var(--color-text-muted); }
.addr-chip--found    { background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); }
.addr-chip--partial,
.addr-chip--notfound { background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning); }
.addr-chip--error    { background: color-mix(in srgb, var(--color-danger) 12%, transparent);  color: var(--color-danger); }
.addr-spin { animation: addr-spin 0.7s linear infinite; }
@keyframes addr-spin { to { transform: rotate(360deg); } }
.addr-fade-enter-active { transition: all 220ms ease; }
.addr-fade-leave-active { transition: all 150ms ease; }
.addr-fade-enter-from, .addr-fade-leave-to { opacity: 0; transform: translateY(-4px); }
.form-sections{ display: flex; flex-direction: column; gap: 16px; }
.form-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.form-field        { display: flex; flex-direction: column; gap: 6px; }
.form-field--full  { grid-column: 1 / -1; }
.field-label  { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.mt-3         { margin-top: 16px; }
</style>
