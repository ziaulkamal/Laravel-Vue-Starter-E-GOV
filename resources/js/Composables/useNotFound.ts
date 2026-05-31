import { reactive, readonly } from 'vue';
import { router } from '@inertiajs/vue3';
import api from '@/lib/axios';

interface NotFoundState {
    active: boolean;
    message: string;
}

const state = reactive<NotFoundState>({
    active:  false,
    message: 'Yang Anda cari tidak ditemukan',
});

let redirectTimer: ReturnType<typeof setTimeout>;

/**
 * Picu kondisi "tidak ditemukan":
 *  1. Tampilkan overlay blur + pesan
 *  2. Rekam user/ip/route ke backend (channel log "notfound")
 *  3. Redirect ke dashboard setelah jeda singkat
 */
function trigger(options: { message?: string; redirectTo?: string; delay?: number } = {}): void {
    state.active  = true;
    state.message = options.message ?? 'Yang Anda cari tidak ditemukan';

    // Rekam ke backend — best effort, jangan ganggu UX kalau gagal
    void api.post('/api/v1/logs/not-found', {
        path:     typeof window !== 'undefined' ? window.location.pathname + window.location.search : '-',
        method:   'GET',
        referrer: typeof document !== 'undefined' ? document.referrer : '-',
    }).catch(() => { /* abaikan */ });

    // Redirect ke dashboard setelah blur sesaat
    clearTimeout(redirectTimer);
    redirectTimer = setTimeout(() => {
        router.visit(options.redirectTo ?? '/dashboard');
        // Sembunyikan overlay setelah navigasi
        setTimeout(() => { state.active = false; }, 400);
    }, options.delay ?? 1800);
}

export function useNotFound() {
    return {
        state: readonly(state),
        notFound: trigger,
    };
}
