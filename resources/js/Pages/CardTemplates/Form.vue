<template>
    <SimporaLayout :title="isEdit ? 'Edit Template Kartu' : 'Buat Template Kartu'">
        <div class="page-wrap">
            <AppBreadcrumb :items="[{ label: 'Template Kartu', href: '/card-templates' }, { label: isEdit ? 'Edit Template' : 'Buat Template' }]" />
            <h1 class="page-title">{{ isEdit ? 'Edit Template Kartu' : 'Buat Template Kartu' }}</h1>

            <form @submit.prevent="submit">
                <div class="form-sections">
                    <AppCard>
                        <div class="form-grid-3">
                            <AppInput  v-model="form.name"        label="Nama Template"  placeholder="Kartu Atlet PORA XV" required />
                            <AppSelect v-model="form.type"        label="Tipe"           :options="typeOptions" required @change="updateParams" />
                            <AppTextarea v-model="form.description" label="Deskripsi"   :rows="2" />
                        </div>
                    </AppCard>

                    <div class="editor-grid">
                        <!-- HTML Editor -->
                        <AppCard class="editor-col">
                            <template #header><span class="section-title">Editor HTML</span></template>
                            <textarea
                                v-model="form.html_content"
                                class="html-editor"
                                placeholder="<div class='kartu'>...</div>"
                                spellcheck="false"
                            />
                        </AppCard>

                        <!-- Parameters -->
                        <AppCard class="params-col">
                            <template #header><span class="section-title">Parameter Tersedia</span></template>
                            <div class="params-list">
                                <button
                                    v-for="param in availableParams"
                                    :key="param"
                                    type="button"
                                    class="param-btn"
                                    @click="insertParam(param)"
                                >
                                    {{ paramLabel(param) }}
                                </button>
                            </div>
                            <p class="params-hint">Klik untuk insert ke kursor editor</p>
                        </AppCard>
                    </div>
                </div>

                <div class="form-actions">
                    <AppButton variant="secondary" type="button" @click="$inertia.visit('/card-templates')">Batal</AppButton>
                    <AppButton variant="primary" type="submit" :loading="loading">Simpan Template</AppButton>
                </div>
            </form>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { usePageGuard } from '@/Composables/usePageGuard';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard       from '@/Components/App/AppCard.vue';
import AppButton     from '@/Components/App/AppButton.vue';
import AppInput      from '@/Components/App/AppInput.vue';
import AppSelect     from '@/Components/App/AppSelect.vue';
import AppTextarea   from '@/Components/App/AppTextarea.vue';
import AppBreadcrumb from '@/Components/App/AppBreadcrumb.vue';

interface Props { id?: string | number }
usePageGuard({ anyRole: ['super_admin', 'panitia_besar'] });
const props  = defineProps<Props>();
const isEdit  = computed(() => !!props.id);
const loading = ref(false);

const form = reactive({ name: '', type: 'athlete_card', description: '', html_content: '' });

const typeOptions = [
    { value: 'athlete_card', label: 'Kartu Atlet' },
    { value: 'coach_card',   label: 'Kartu Pelatih' },
    { value: 'guest_card',   label: 'Kartu Tamu' },
];

const paramsByType: Record<string, string[]> = {
    athlete_card: ['nama_lengkap', 'nik_samar', 'kontingen', 'cabor', 'foto_url', 'qr_code'],
    coach_card:   ['nama_lengkap', 'nik_samar', 'kontingen', 'jabatan', 'foto_url', 'qr_code'],
    guest_card:   ['nama_lengkap', 'kontingen', 'foto_url', 'qr_code'],
};

const availableParams = computed(() => paramsByType[form.type] ?? []);

function updateParams() { /* params update via computed */ }

function paramLabel(param: string) { return '{{' + param + '}}'; }

function insertParam(param: string) {
    form.html_content += '{{' + param + '}}';
}

function submit() {
    loading.value = true;
    setTimeout(() => { loading.value = false; }, 1200);
}
</script>

<style scoped>
.page-wrap     { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-title    { font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.form-sections { display: flex; flex-direction: column; gap: 16px; }
.section-title { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.form-grid-3   { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
@media (max-width: 768px) { .form-grid-3 { grid-template-columns: 1fr; } }

.editor-grid  { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
@media (max-width: 900px) { .editor-grid { grid-template-columns: 1fr; } }
.editor-col   { }
.params-col   { }

.html-editor  { width: 100%; min-height: 320px; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 12px; font-family: var(--font-mono); font-size: 12.5px; color: var(--color-text-primary); background: var(--color-bg-subtle); outline: none; resize: vertical; line-height: 1.6; }
.html-editor:focus { border-color: var(--color-accent); }

.params-list  { display: flex; flex-direction: column; gap: 6px; }
.param-btn    { text-align: left; border: 1.5px solid var(--color-border); border-radius: 6px; padding: 7px 10px; font-family: var(--font-mono); font-size: 12px; color: var(--color-accent); background: var(--color-accent-subtle); cursor: pointer; transition: all 120ms ease; }
.param-btn:hover { background: var(--color-accent); color: white; }
.params-hint  { font-size: 11px; color: var(--color-text-subtle); margin-top: 10px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
