<template>
    <teleport to="body">
        <transition name="notif-fade">
            <div v-if="modelValue" class="notif-overlay" @click.self="close">
                <aside class="notif-panel" role="dialog" aria-label="Notifikasi">
                    <header class="notif-head">
                        <h3 class="notif-head__title">Notifikasi</h3>
                        <div class="notif-head__actions">
                            <button v-if="hasUnread" type="button" class="notif-link" @click="markAll">Tandai semua dibaca</button>
                            <button type="button" class="notif-close" aria-label="Tutup" @click="close"><X :size="18" /></button>
                        </div>
                    </header>

                    <div class="notif-body">
                        <div v-if="loading" class="notif-loading">
                            <div v-for="i in 5" :key="i" class="notif-sk">
                                <span class="sk-bar" /><span class="sk-bar sm" />
                            </div>
                        </div>

                        <div v-else-if="!items.length" class="notif-empty">
                            <BellOff :size="30" />
                            <p>Belum ada notifikasi</p>
                        </div>

                        <ul v-else class="notif-list">
                            <li
                                v-for="n in items" :key="n.id"
                                :class="['notif-item', { unread: !n.read_at }]"
                                @click="openItem(n)"
                            >
                                <span class="notif-icon">{{ iconFor(n.data?.type) }}</span>
                                <div class="notif-content">
                                    <div class="notif-title">{{ n.data?.title ?? 'Notifikasi' }}</div>
                                    <div class="notif-msg">{{ n.data?.message }}</div>
                                    <div class="notif-time">{{ relTime(n.created_at) }}</div>
                                </div>
                                <span v-if="!n.read_at" class="notif-dot" />
                            </li>
                        </ul>
                    </div>
                </aside>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import { X, BellOff } from '@lucide/vue';
import api from '@/lib/axios';
import { encodeId } from '@/lib/hashid';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; changed: [] }>();

const items = ref<any[]>([]);
const loading = ref(false);
const hasUnread = computed(() => items.value.some((n) => !n.read_at));

watch(() => props.modelValue, (open) => { if (open) fetchList(); });

async function fetchList() {
    loading.value = true;
    try {
        const res = await api.get('/api/v1/notifications', { params: { per_page: 30 } });
        const raw = res.data?.data;
        items.value = (Array.isArray(raw) ? raw : raw?.data ?? []).filter(Boolean);
    } catch {
        items.value = [];
    } finally {
        loading.value = false;
    }
}

function close() { emit('update:modelValue', false); }

async function openItem(n: any) {
    if (!n.read_at) {
        try { await api.post(`/api/v1/notifications/${n.id}/read`); n.read_at = new Date().toISOString(); emit('changed'); } catch { /* abaikan */ }
    }
    const mid = n.data?.match_id;
    close();
    if (mid) router.visit(`/matches/${encodeId(mid)}`);
}

async function markAll() {
    try {
        await api.post('/api/v1/notifications/read-all');
        const now = new Date().toISOString();
        items.value.forEach((n) => { if (!n.read_at) n.read_at = now; });
        emit('changed');
    } catch { /* abaikan */ }
}

function iconFor(type?: string) {
    return type === 'match_reminder' ? '⏰' : type === 'match_status' ? '🔔' : '📣';
}

// created_at = timestamp nyata (UTC) → konversi lokal benar.
function relTime(dt?: string) {
    if (!dt) return '';
    const t = new Date(dt).getTime();
    if (isNaN(t)) return '';
    const diff = Math.round((Date.now() - t) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>

<style scoped>
.notif-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.35); display: flex; justify-content: flex-end; }
.notif-panel { width: min(400px, 92vw); height: 100%; background: var(--color-surface, var(--color-bg-card)); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(0,0,0,0.18); }
.notif-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--color-border); }
.notif-head__title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.notif-head__actions { display: flex; align-items: center; gap: 10px; }
.notif-link { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--color-accent); }
.notif-link:hover { text-decoration: underline; }
.notif-close { background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; padding: 4px; border-radius: 6px; }
.notif-close:hover { background: var(--color-bg-subtle); color: var(--color-text-primary); }
.notif-body { flex: 1; overflow-y: auto; }
.notif-list { list-style: none; margin: 0; padding: 0; }
.notif-item { display: flex; gap: 12px; align-items: flex-start; padding: 13px 18px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background .12s; position: relative; }
.notif-item:hover { background: var(--color-bg-subtle); }
.notif-item.unread { background: var(--color-accent-subtle); }
.notif-item.unread:hover { background: color-mix(in srgb, var(--color-accent) 14%, transparent); }
.notif-icon { font-size: 18px; line-height: 1.3; flex-shrink: 0; }
.notif-content { flex: 1; min-width: 0; }
.notif-title { font-size: 13.5px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 2px; }
.notif-msg { font-size: 12.5px; color: var(--color-text-muted); line-height: 1.45; }
.notif-time { font-size: 11px; color: var(--color-text-subtle); margin-top: 5px; }
.notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); flex-shrink: 0; margin-top: 5px; }
.notif-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 24px; text-align: center; color: var(--color-text-subtle); }
.notif-empty p { font-size: 13px; margin: 0; }
.notif-loading { padding: 8px 0; }
.notif-sk { padding: 13px 18px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--color-border); }
.sk-bar { display: block; height: 12px; border-radius: 5px; background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border) 50%, var(--color-bg-subtle) 75%); background-size: 200% 100%; animation: sk-sh 1.2s ease-in-out infinite; }
.sk-bar.sm { width: 60%; }
@keyframes sk-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.notif-fade-enter-active, .notif-fade-leave-active { transition: opacity .18s ease; }
.notif-fade-enter-from, .notif-fade-leave-to { opacity: 0; }
</style>
