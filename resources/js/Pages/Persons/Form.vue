<template>
    <SimporaLayout>
        <div class="page-wrap">
            <AppBreadcrumb :items="[
                { label: 'Data Pribadi', href: '/persons' },
                { label: isEdit ? 'Edit Person' : 'Tambah Person' }
            ]" />

            <div class="page-header">
                <h1 class="page-title">{{ isEdit ? 'Edit Data Pribadi' : 'Tambah Data Pribadi' }}</h1>
            </div>

            <form @submit.prevent="submit">
                <div class="form-sections">
                    <!-- Identitas -->
                    <AppCard>
                        <template #header><span class="section-title">Identitas</span></template>
                        <div class="form-grid">
                            <!-- NIK + lookup indicator -->
                            <div class="form-field">
                                <label class="field-label">NIK <span class="required">*</span></label>
                                <div class="nik-wrap">
                                    <input
                                        v-model="form.nik"
                                        class="nik-input"
                                        :class="{
                                            'nik-input--loading': nikStatus === 'loading',
                                            'nik-input--found':   nikStatus === 'found',
                                            'nik-input--notfound':nikStatus === 'notfound',
                                            'nik-input--error':   nikStatus === 'error',
                                        }"
                                        maxlength="16"
                                        inputmode="numeric"
                                        placeholder="16 digit NIK"
                                        required
                                        @input="onNikInput"
                                    />
                                    <!-- Status icon di kanan -->
                                    <span v-if="nikStatus === 'loading'" class="nik-icon nik-icon--spin">
                                        <Loader2 :size="16" />
                                    </span>
                                    <span v-else-if="nikStatus === 'found'" class="nik-icon nik-icon--found">
                                        <CheckCircle2 :size="16" />
                                    </span>
                                    <span v-else-if="nikStatus === 'notfound'" class="nik-icon nik-icon--warn">
                                        <AlertCircle :size="16" />
                                    </span>
                                    <span v-else-if="nikStatus === 'error'" class="nik-icon nik-icon--error">
                                        <XCircle :size="16" />
                                    </span>
                                </div>
                                <!-- Feedback line: error submit diprioritaskan -->
                                <Transition name="nik-msg">
                                    <span v-if="errors.nik" class="nik-msg nik-msg--error">
                                        {{ errors.nik }}
                                    </span>
                                    <span v-else-if="nikMsg" :class="['nik-msg', `nik-msg--${nikStatus}`]">
                                        {{ nikMsg }}
                                    </span>
                                </Transition>
                            </div>

                            <!-- Nama — placeholder berubah setelah NIK ditemukan -->
                            <AppInput
                                v-model="form.nama_lengkap"
                                label="Nama Lengkap"
                                :placeholder="namaPlaceholder"
                                :error="errors.nama_lengkap"
                                required
                            />
                            <div class="form-field">
                                <label class="field-label">Jenis Kelamin <span class="required">*</span></label>
                                <div class="radio-row">
                                    <AppRadio v-model="form.jenis_kelamin" value="male"   label="Laki-laki" />
                                    <AppRadio v-model="form.jenis_kelamin" value="female" label="Perempuan" />
                                </div>
                            </div>
                            <AppSelectSearch
                                v-model="form.agama"
                                label="Agama"
                                :options="agamaOptions"
                                placeholder="Pilih agama..."
                                search-placeholder="Cari agama..."
                                :error="errors.agama"
                            />
                            <AppInput v-model="form.tempat_lahir" label="Tempat Lahir" placeholder="Kota/kabupaten lahir" :error="errors.tempat_lahir" />
                            <AppDatePicker v-model="form.tanggal_lahir" label="Tanggal Lahir" :error="errors.tanggal_lahir" />
                        </div>
                    </AppCard>

                    <!-- Wilayah & Kontak -->
                    <AppCard>
                        <template #header>
                            <div class="section-head">
                                <span class="section-title">Wilayah & Kontak</span>
                                <!-- Status auto-fill wilayah -->
                                <Transition name="addr-fade">
                                    <span v-if="addrStatus !== 'idle'" :class="['addr-chip', `addr-chip--${addrStatus}`]">
                                        <Loader2  v-if="addrStatus === 'loading'"  :size="13" class="addr-spin" />
                                        <Sparkles v-else-if="addrStatus === 'found'" :size="13" />
                                        <AlertCircle v-else-if="addrStatus === 'notfound'" :size="13" />
                                        <XCircle  v-else :size="13" />
                                        {{ addrMsg }}
                                    </span>
                                </Transition>
                            </div>
                        </template>
                        <div class="form-grid">

                            <!-- Provinsi -->
                            <AppSelectSearch
                                v-model="form.provinsi"
                                label="Provinsi"
                                :options="provinsiOptions"
                                :loading="loadingProvinsi"
                                placeholder="Pilih provinsi..."
                                search-placeholder="Cari provinsi..."
                                @change="onProvinsiChange"
                            />

                            <!-- Kabupaten/Kota -->
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

                            <!-- Kecamatan -->
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

                            <!-- Desa/Kelurahan -->
                            <AppSelectSearch
                                v-model="form.desa"
                                label="Desa / Kelurahan"
                                :options="desaOptions"
                                :loading="loadingDesa"
                                :disabled="!form.kecamatan"
                                :placeholder="form.kecamatan ? 'Pilih desa/kelurahan...' : 'Pilih kecamatan dulu'"
                                :error="errorWilayah"
                                search-placeholder="Cari desa/kelurahan..."
                            />

                            <div class="form-field form-field--full">
                                <AppTextarea
                                    v-model="form.alamat_detail"
                                    label="Alamat Detail"
                                    placeholder="Nama jalan, nomor rumah, RT/RW..."
                                    :rows="3"
                                />
                            </div>

                            <AppInput v-model="form.no_hp" label="No. HP" placeholder="08xxxxxxxxxx" :error="errors.no_hp" />
                            <AppInput v-model="form.email" label="Email" type="email" placeholder="email@contoh.com" :error="errors.email" />
                        </div>
                    </AppCard>

                    <!-- Foto -->
                    <AppCard>
                        <template #header><span class="section-title">Foto</span></template>
                        <FileDropzone
                            v-model="form.foto"
                            accept="image/jpeg,image/png"
                            :max-size="7"
                            label="Upload Foto"
                            hint="JPG atau PNG, maks 7MB"
                        />
                    </AppCard>
                </div>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="$inertia.visit('/persons')">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan Data</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { router } from '@inertiajs/vue3';
import { decodeId } from '@/lib/hashid';
import { useNotFound } from '@/Composables/useNotFound';
import api   from '@/lib/axios';
import { useToast } from '@/Composables/useToast';
import { Loader2, CheckCircle2, AlertCircle, XCircle, Sparkles } from '@lucide/vue';
import SimporaLayout  from '@/Layouts/SimporaLayout.vue';
import AppCard        from '@/Components/App/AppCard.vue';
import AppButton      from '@/Components/App/AppButton.vue';
import AppInput       from '@/Components/App/AppInput.vue';
import AppSelectSearch from '@/Components/App/AppSelectSearch.vue';
import AppTextarea    from '@/Components/App/AppTextarea.vue';
import AppRadio       from '@/Components/App/AppRadio.vue';
import AppDatePicker  from '@/Components/App/AppDatePicker.vue';
import AppBreadcrumb  from '@/Components/App/AppBreadcrumb.vue';
import FileDropzone   from '@/Components/App/FileDropzone.vue';

interface Props { id?: string | number }
const props = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const realId  = computed(() => (props.id != null ? decodeId(props.id) : null)); // decode hash URL → id asli
const loading = ref(false);
const toast   = useToast();
const { notFound } = useNotFound();

const form = reactive({
    nik: '', nama_lengkap: '', jenis_kelamin: 'male', agama: '',
    tempat_lahir: '', tanggal_lahir: '',
    provinsi: '', kabupaten: '', kecamatan: '', desa: '',
    alamat_detail: '', no_hp: '', email: '',
    foto: null as File | null,
});

// ── NIK Lookup ────────────────────────────────────────────────
type NikStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'error'

const NIK_URL = `${import.meta.env.VITE_NIK_API_URL ?? 'http://157.119.56.3:17001'}/Person`
const nikStatus    = ref<NikStatus>('idle')
const nikMsg       = ref('')
const nikFoundName = ref('')   // nama dari API — hanya sebagai placeholder

// Placeholder berubah mengikuti hasil lookup, BUKAN value
const namaPlaceholder = computed(() => {
    if (nikStatus.value === 'loading')         return 'Mencari data...'
    if (nikStatus.value === 'found' && nikFoundName.value) return nikFoundName.value
    return 'Nama sesuai KTP'
})

let nikTimer: ReturnType<typeof setTimeout>

async function onNikInput() {
    const nik = form.nik.replace(/\D/g, '')   // hanya digit
    form.nik  = nik

    clearTimeout(nikTimer)
    const wasFound = nikStatus.value === 'found'   // sebelumnya sudah lengkap?

    nikStatus.value    = 'idle'
    nikMsg.value       = ''
    nikFoundName.value = ''   // reset placeholder nama

    // Belum 16 digit
    if (nik.length < 16) {
        // Jika tadinya NIK valid & data sudah terisi otomatis → kosongkan semua
        if (wasFound) resetDependentFields()
        if (nik.length > 0) nikMsg.value = `${nik.length}/16 digit`
        return
    }

    // Debounce 500ms setelah digit ke-16
    nikTimer = setTimeout(() => lookupNik(nik), 500)
}

// Kosongkan semua field yang terisi (kecuali NIK itu sendiri)
function resetDependentFields() {
    form.nama_lengkap  = ''
    form.jenis_kelamin = 'male'
    form.agama         = ''
    form.tempat_lahir  = ''
    form.tanggal_lahir = ''
    form.provinsi      = ''
    form.kabupaten     = ''
    form.kecamatan     = ''
    form.desa          = ''
    form.alamat_detail = ''
    form.no_hp         = ''
    form.email         = ''
    form.foto          = null

    // Reset daftar opsi wilayah turunan
    kabupatenOptions.value = []
    kecamatanOptions.value = []
    desaOptions.value      = []

    // Reset status auto-fill
    addrStatus.value = 'idle'
    addrMsg.value    = ''
    lastAddrKey      = ''
}

async function lookupNik(nik: string) {
    nikStatus.value = 'loading'
    nikMsg.value    = 'Memverifikasi NIK...'

    try {
        // Langsung ke ApiServe — CORS sudah diizinkan
        const res = await axios.get<{ id: string; name: string }[]>(
            NIK_URL, { params: { nik }, timeout: 10000 }
        )

        const list = Array.isArray(res.data) ? res.data : []

        if (list.length === 0 || !list[0].name || list[0].name === '***') {
            nikStatus.value = 'notfound'
            nikMsg.value    = 'NIK tidak terdaftar'
            return
        }

        nikFoundName.value = list[0].name   // simpan sebagai placeholder saja
        nikStatus.value    = 'found'
        nikMsg.value       = `Ditemukan: ${list[0].name}`

    } catch (err: any) {
        nikStatus.value = 'error'
        nikMsg.value    = 'Verifikasi NIK gagal, isi manual'
    }
}

// ── Wilayah state ──────────────────────────────────────────────
interface WilayahOption { value: string; label: string }

const provinsiOptions  = ref<WilayahOption[]>([]);
const kabupatenOptions = ref<WilayahOption[]>([]);
const kecamatanOptions = ref<WilayahOption[]>([]);
const desaOptions      = ref<WilayahOption[]>([]);

const loadingProvinsi  = ref(false);
const loadingKabupaten = ref(false);
const loadingKecamatan = ref(false);
const loadingDesa      = ref(false);
const errorWilayah     = ref('');

// ── Normalise respons API → { value, label }[] ─────────────────
// API mengembalikan: { success, data: [{ kode, nama }] }
function toOptions(res: any): WilayahOption[] {
    const list: any[] = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(list)
        ? list.map(item => ({ value: String(item.kode), label: item.nama }))
        : [];
}

// ── Provinsi — fetch saat komponen mount ───────────────────────
onMounted(async () => {
    await fetchProvinsi();
    if (isEdit.value) await fetchExisting();
});

// ── Edit mode: muat data lama ke form ──────────────────────────
async function fetchExisting() {
    if (realId.value == null || Number.isNaN(realId.value)) { notFound(); return; }
    try {
        const res = await api.get(`/api/v1/persons/${realId.value}`);
        const p = res.data?.data;
        if (!p) { notFound(); return; }

        form.nik           = p.nik ?? '';
        form.nama_lengkap  = p.nama_lengkap ?? '';
        form.jenis_kelamin = p.jenis_kelamin ?? 'male';
        form.agama         = p.agama ?? '';
        form.tempat_lahir  = p.tempat_lahir ?? '';
        form.tanggal_lahir = (p.tanggal_lahir ?? '').slice(0, 10);   // buang bagian waktu
        form.alamat_detail = p.alamat_detail ?? '';
        form.no_hp         = p.no_hp ?? '';
        form.email         = p.email ?? '';

        await populateWilayah(p.wilayah_kode ?? '');
    } catch (e: any) {
        if (e?.response?.status === 404) { notFound(); return; }
        toast.error('Gagal memuat data untuk diedit');
    }
}

// Pecah kode wilayah jadi 4 level. Mendukung format bertitik
// ("11.12.04.2013") maupun tanpa titik ("1112042013").
function deriveWilayahLevels(kode: string) {
    if (kode.includes('.')) {
        const parts = kode.split('.');
        return {
            prov: parts[0] ?? '',
            kab:  parts.length >= 2 ? parts.slice(0, 2).join('.') : '',
            kec:  parts.length >= 3 ? parts.slice(0, 3).join('.') : '',
            desa: parts.length >= 4 ? kode : '',
        };
    }
    return {
        prov: kode.slice(0, 2),
        kab:  kode.length >= 4  ? kode.slice(0, 4) : '',
        kec:  kode.length >= 6  ? kode.slice(0, 6) : '',
        desa: kode.length >= 10 ? kode             : '',
    };
}

// Bangun ulang cascade wilayah dari satu kode
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

async function fetchProvinsi() {
    loadingProvinsi.value = true;
    try {
        const res = await api.get('/api/v1/wilayah/provinsi');
        provinsiList.value = toOptions(res);
    } catch {
        /* biarkan list kosong jika API belum tersedia */
    } finally {
        loadingProvinsi.value = false;
    }
}

// ── Alias agar reactive state bisa dipakai di provinsiOptions ──
const provinsiList = provinsiOptions;   // same ref

// ── Cascade: Kabupaten ─────────────────────────────────────────
async function onProvinsiChange(value: string) {
    form.kabupaten  = '';
    form.kecamatan  = '';
    form.desa       = '';
    kabupatenOptions.value = [];
    kecamatanOptions.value = [];
    desaOptions.value      = [];
    errorWilayah.value     = '';

    if (!value) return;

    loadingKabupaten.value = true;
    try {
        const res = await api.get(`/api/v1/wilayah/kabupaten/${value}`);
        kabupatenOptions.value = toOptions(res);
    } catch {
        kabupatenOptions.value = [];
    } finally {
        loadingKabupaten.value = false;
    }
}

// ── Cascade: Kecamatan ─────────────────────────────────────────
async function onKabupatenChange(value: string) {
    form.kecamatan  = '';
    form.desa       = '';
    kecamatanOptions.value = [];
    desaOptions.value      = [];
    errorWilayah.value     = '';

    if (!value) return;

    loadingKecamatan.value = true;
    try {
        const res = await api.get(`/api/v1/wilayah/kecamatan/${value}`);
        kecamatanOptions.value = toOptions(res);
    } catch {
        kecamatanOptions.value = [];
    } finally {
        loadingKecamatan.value = false;
    }
}

// ── Cascade: Desa ──────────────────────────────────────────────
async function onKecamatanChange(value: string) {
    form.desa      = '';
    desaOptions.value  = [];
    errorWilayah.value = '';

    if (!value) return;

    loadingDesa.value = true;
    try {
        const res = await api.get(`/api/v1/wilayah/desa/${value}`);
        desaOptions.value = toOptions(res);
    } catch {
        desaOptions.value  = [];
        errorWilayah.value = 'Gagal memuat desa. Coba lagi.';
    } finally {
        loadingDesa.value = false;
    }
}

// ════════════════════════════════════════════════════════════════
//  Auto-fill Wilayah dari SatuSehat (method=v1: name+birthdate+NIK)
//  Trigger otomatis saat nama, tanggal lahir, & NIK valid sudah terisi.
// ════════════════════════════════════════════════════════════════
type AddrStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'error'
const addrStatus = ref<AddrStatus>('idle')
const addrMsg    = ref('')

let addrTimer: ReturnType<typeof setTimeout>
let lastAddrKey = ''

// Buang semua non-digit agar kode SatuSehat (mis. "11.71.05.1001")
// cocok dengan kode wilayah API (mis. "1171051001")
function normalizeCode(s: unknown): string {
    return String(s ?? '').replace(/\D/g, '')
}

function matchOption(options: WilayahOption[], code: string): WilayahOption | undefined {
    const target = normalizeCode(code)
    if (!target) return undefined
    return options.find(o => normalizeCode(o.value) === target)
}

function scheduleAddressFetch() {
    clearTimeout(addrTimer)
    // Hanya jalan jika NIK sudah tervalidasi & data minimal lengkap
    if (nikStatus.value !== 'found') return
    if (!form.nama_lengkap.trim() || !form.tanggal_lahir || form.nik.length !== 16) return
    addrTimer = setTimeout(fetchAddress, 800)
}

// Pantau field penentu + status NIK — debounce agar tidak spam saat mengetik
watch(
    () => [form.nama_lengkap, form.tanggal_lahir, form.jenis_kelamin, nikStatus.value] as const,
    scheduleAddressFetch
)

async function fetchAddress() {
    const key = `${form.nama_lengkap.trim()}|${form.tanggal_lahir}|${form.nik}`
    if (key === lastAddrKey) return   // sudah pernah diisi untuk kombinasi ini

    addrStatus.value = 'loading'
    addrMsg.value    = 'Mengambil data wilayah...'

    try {
        // method=v1 → name + birthdate + NIK
        const res = await axios.get(NIK_URL, {
            params: {
                method:    'v1',
                name:      form.nama_lengkap.trim(),
                birthdate: form.tanggal_lahir,
                nik:       form.nik,
            },
            timeout: 12000,
        })

        const body = res.data as {
            found?: boolean
            data?: Array<{
                province?: string; city?: string; district?: string;
                village?: string; line?: string
            }>
        }
        const rec = body?.data?.[0]

        if (!body?.found || !rec || !rec.province) {
            addrStatus.value = 'notfound'
            addrMsg.value    = 'Data wilayah tidak tersedia, isi manual'
            return
        }

        lastAddrKey = key
        const filled = await fillWilayah(rec)

        // Sisipkan alamat jalan jika tersedia & field masih kosong
        if (rec.line && !form.alamat_detail.trim()) {
            form.alamat_detail = rec.line
        }

        addrStatus.value = filled.complete ? 'found' : 'notfound'
        addrMsg.value    = filled.complete
            ? 'Wilayah terisi otomatis'
            : `Sebagian wilayah terisi (sampai ${filled.level})`

    } catch {
        addrStatus.value = 'error'
        addrMsg.value    = 'Gagal mengambil data wilayah'
    }
}

// Isi cascade provinsi → kabupaten → kecamatan → desa secara berurutan.
// Mengembalikan sejauh mana pengisian berhasil.
async function fillWilayah(rec: { province?: string; city?: string; district?: string; village?: string }) {
    // ── Provinsi ──
    const prov = matchOption(provinsiOptions.value, rec.province ?? '')
    if (!prov) return { complete: false, level: 'provinsi' }
    form.provinsi = prov.value
    form.kabupaten = ''; form.kecamatan = ''; form.desa = ''

    // ── Kabupaten ──
    loadingKabupaten.value = true
    try {
        kabupatenOptions.value = toOptions(await api.get(`/api/v1/wilayah/kabupaten/${form.provinsi}`))
    } finally { loadingKabupaten.value = false }

    const city = matchOption(kabupatenOptions.value, rec.city ?? '')
    if (!city) return { complete: false, level: 'provinsi' }
    form.kabupaten = city.value

    // ── Kecamatan ──
    loadingKecamatan.value = true
    try {
        kecamatanOptions.value = toOptions(await api.get(`/api/v1/wilayah/kecamatan/${form.kabupaten}`))
    } finally { loadingKecamatan.value = false }

    const dist = matchOption(kecamatanOptions.value, rec.district ?? '')
    if (!dist) return { complete: false, level: 'kabupaten' }
    form.kecamatan = dist.value

    // ── Desa ──
    loadingDesa.value = true
    try {
        desaOptions.value = toOptions(await api.get(`/api/v1/wilayah/desa/${form.kecamatan}`))
    } finally { loadingDesa.value = false }

    const vil = matchOption(desaOptions.value, rec.village ?? '')
    if (!vil) return { complete: false, level: 'kecamatan' }
    form.desa = vil.value

    return { complete: true, level: 'desa' }
}

// ── Agama — opsi statis ────────────────────────────────────────
const agamaOptions: WilayahOption[] = [
    { value: 'Islam',    label: 'Islam' },
    { value: 'Kristen',  label: 'Kristen Protestan' },
    { value: 'Katolik',  label: 'Katolik' },
    { value: 'Hindu',    label: 'Hindu' },
    { value: 'Buddha',   label: 'Buddha' },
    { value: 'Konghucu', label: 'Konghucu' },
];

// ════════════════════════════════════════════════════════════════
//  Simpan Data — POST /api/v1/persons (sesuai GUIDE_API.md §9)
// ════════════════════════════════════════════════════════════════
const errors = reactive<Record<string, string>>({});

function clearErrors() {
    Object.keys(errors).forEach(k => delete errors[k]);
}

async function submit() {
    clearErrors();

    // Validasi client-side ringan untuk field wajib
    const required: Record<string, string> = {
        nik:           form.nik,
        nama_lengkap:  form.nama_lengkap,
        tempat_lahir:  form.tempat_lahir,
        tanggal_lahir: form.tanggal_lahir,
        jenis_kelamin: form.jenis_kelamin,
        agama:         form.agama,
    };
    const missing = Object.entries(required).filter(([, v]) => !v?.toString().trim());
    if (missing.length) {
        missing.forEach(([k]) => { errors[k] = 'Wajib diisi'; });
        toast.error('Lengkapi field yang wajib diisi');
        return;
    }
    if (form.nik.length !== 16) {
        errors.nik = 'NIK harus 16 digit';
        toast.error('NIK harus 16 digit');
        return;
    }

    // wilayah_kode = level paling spesifik yang dipilih
    const wilayahKode = form.desa || form.kecamatan || form.kabupaten || form.provinsi || null;

    const payload = {
        nik:           form.nik,
        nama_lengkap:  form.nama_lengkap.trim(),
        tempat_lahir:  form.tempat_lahir.trim(),
        tanggal_lahir: form.tanggal_lahir,
        jenis_kelamin: form.jenis_kelamin,
        agama:         form.agama,
        wilayah_kode:  wilayahKode,
        alamat_detail: form.alamat_detail.trim() || null,
        no_hp:         form.no_hp.trim() || null,
        email:         form.email.trim() || null,
    };

    loading.value = true;
    try {
        const url = isEdit.value
            ? `/api/v1/persons/${realId.value}`
            : '/api/v1/persons';
        const method = isEdit.value ? 'put' : 'post';

        const res = await api.request({ url, method, data: payload });

        toast.success(res.data?.message ?? (isEdit.value ? 'Data berhasil diperbarui' : 'Data person berhasil dibuat'));
        router.visit('/persons');

    } catch (err: any) {
        const status = err?.response?.status;
        const body   = err?.response?.data;

        if (status === 422 && body?.errors) {
            // Map error per-field dari Laravel
            Object.entries(body.errors).forEach(([field, msgs]) => {
                errors[field] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
            });
            toast.error(body.message ?? 'Data yang dikirim tidak valid');
        } else if (status === 409) {
            errors.nik = 'NIK sudah terdaftar';
            toast.error(body?.message ?? 'NIK sudah terdaftar');
        } else {
            toast.error(body?.message ?? 'Gagal menyimpan data. Coba lagi.');
        }
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.page-wrap    { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 860px; }
.page-header  { }
.page-title   { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.section-title{ font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; flex-wrap: wrap; }

/* Chip status auto-fill wilayah */
.addr-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 600; padding: 4px 10px;
    border-radius: 99px; white-space: nowrap;
}
.addr-chip--loading  { background: var(--color-bg-subtle); color: var(--color-text-muted); }
.addr-chip--found    { background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); }
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
.form-field       { display: flex; flex-direction: column; gap: 6px; }
.form-field--full { grid-column: 1 / -1; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); }
.required    { color: var(--color-danger); }
.radio-row   { display: flex; gap: 20px; }
.form-actions{ display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

/* ── NIK field ── */
.nik-wrap {
    position: relative;
    display: flex; align-items: center;
}
.nik-input {
    width: 100%; min-height: 38px;
    border: 1.5px solid var(--color-border); border-radius: 8px;
    padding: 0 38px 0 12px;
    font-size: 13.5px; font-family: var(--font-mono);
    color: var(--color-text-primary); background: var(--color-surface);
    outline: none; transition: border-color 150ms, box-shadow 150ms;
    letter-spacing: 0.04em;
}
.nik-input::placeholder { font-family: var(--font-sans); letter-spacing: normal; color: var(--color-text-subtle); }
.nik-input:focus                  { border-color: var(--color-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent); }
.nik-input--loading               { border-color: var(--color-border-strong); }
.nik-input--found                 { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
.nik-input--notfound, .nik-input--error { border-color: #f59e0b; }

.nik-icon {
    position: absolute; right: 10px;
    display: flex; align-items: center; pointer-events: none;
}
.nik-icon--spin  { color: var(--color-text-subtle); animation: nik-spin 0.7s linear infinite; }
.nik-icon--found { color: #10b981; }
.nik-icon--warn  { color: #f59e0b; }
.nik-icon--error { color: #ef4444; }
@keyframes nik-spin { to { transform: rotate(360deg); } }

.nik-msg {
    font-size: 11.5px; margin-top: 4px; font-weight: 500;
    display: block;
}
.nik-msg--loading  { color: var(--color-text-muted); }
.nik-msg--found    { color: #059669; }
.nik-msg--notfound { color: #d97706; }
.nik-msg--error    { color: #dc2626; }
.nik-msg--idle     { color: var(--color-text-subtle); }

.nik-msg-enter-active { transition: all 200ms ease; }
.nik-msg-leave-active { transition: all 150ms ease; }
.nik-msg-enter-from, .nik-msg-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
