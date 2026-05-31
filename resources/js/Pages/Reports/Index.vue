<template>
    <SimporaLayout>
        <div class="page-wrap">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Laporan & Ekspor</h1>
                    <p class="page-subtitle">Ekspor data PORA XV dalam format PDF dan Excel</p>
                </div>
            </div>

            <div class="reports-grid">
                <AppCard v-for="report in reports" :key="report.id" class="report-card">
                    <div class="report-icon">{{ report.icon }}</div>
                    <div class="report-name">{{ report.name }}</div>
                    <div class="report-desc">{{ report.description }}</div>
                    <div class="report-actions">
                        <AppButton v-if="report.hasPdf" variant="secondary" size="sm" :loading="downloading === `${report.id}-pdf`" @click="download(report.id, 'pdf')">
                            📄 PDF
                        </AppButton>
                        <AppButton v-if="report.hasExcel" variant="secondary" size="sm" :loading="downloading === `${report.id}-excel`" @click="download(report.id, 'excel')">
                            📊 Excel
                        </AppButton>
                    </div>
                </AppCard>
            </div>
        </div>
    </SimporaLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SimporaLayout from '@/Layouts/SimporaLayout.vue';
import AppCard   from '@/Components/App/AppCard.vue';
import AppButton from '@/Components/App/AppButton.vue';

const downloading = ref('');

const reports = [
    { id: 'klasemen',   icon: '📊', name: 'Klasemen Akhir',          description: 'Rekap medali semua kontingen',          hasPdf: true,  hasExcel: true  },
    { id: 'peserta',    icon: '👥', name: 'Peserta per Kontingen',    description: 'Daftar peserta beserta data lengkap',    hasPdf: false, hasExcel: true  },
    { id: 'medali',     icon: '🏅', name: 'Rekap Medali per Cabor',   description: 'Distribusi medali per cabang olahraga', hasPdf: true,  hasExcel: true  },
    { id: 'jadwal',     icon: '📅', name: 'Jadwal Pertandingan',       description: 'Semua jadwal pertandingan PORA XV',     hasPdf: true,  hasExcel: false },
    { id: 'dokumen',    icon: '📋', name: 'Status Dokumen',           description: 'Status verifikasi dokumen per peserta', hasPdf: false, hasExcel: true  },
    { id: 'penginapan', icon: '🏨', name: 'Alokasi Penginapan',       description: 'Daftar alokasi kamar per kontingen',    hasPdf: true,  hasExcel: true  },
];

function download(id: string, format: string) {
    downloading.value = `${id}-${format}`;
    setTimeout(() => { downloading.value = ''; }, 1500);
}
</script>

<style scoped>
.page-wrap   { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 3px; }
.reports-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 600px) { .reports-grid { grid-template-columns: 1fr; } }
.report-card    { display: flex; flex-direction: column; gap: 8px; padding: 20px; }
.report-icon    { font-size: 28px; }
.report-name    { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.report-desc    { font-size: 12.5px; color: var(--color-text-muted); flex: 1; }
.report-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
</style>
