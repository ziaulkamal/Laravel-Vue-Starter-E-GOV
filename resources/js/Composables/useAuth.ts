import { reactive, computed, readonly } from 'vue';
import { router } from '@inertiajs/vue3';
import api from '@/lib/axios';

/**
 * Auth berbasis Bearer Token (Laravel Sanctum) dari backend SIMPORA.
 * Token disimpan di localStorage agar "sesi" login bertahan antar reload.
 * Header Authorization dipasang otomatis di interceptor `@/lib/axios`.
 *
 * Endpoint (lihat GUIDE_API.md §6):
 *  - POST /api/v1/auth/login   → { token, token_type, user }
 *  - POST /api/v1/auth/logout  (butuh token)
 *  - GET  /api/v1/auth/me      (butuh token)
 */

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    is_active?: boolean;
    kontingen_id?: number | null;
    roles?: string[];
    permissions?: string[];
}

const TOKEN_KEY = 'simpora_token';
const USER_KEY  = 'simpora_user';

function readToken(): string | null {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function readUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) as AuthUser : null;
    } catch { return null; }
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    loading: boolean;
}

const state = reactive<AuthState>({
    token: readToken(),
    user:  readUser(),
    loading: false,
});

/** Ambil token aktif (dipakai interceptor axios). */
export function getToken(): string | null {
    return state.token;
}

function persist(token: string | null, user: AuthUser | null): void {
    state.token = token;
    state.user  = user;
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);

        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_KEY);
    } catch { /* abaikan storage error */ }
}

/** Bersihkan sesi lokal tanpa memanggil API (dipakai saat 401). */
export function clearSession(): void {
    persist(null, null);
}

async function login(email: string, password: string): Promise<AuthUser> {
    state.loading = true;
    try {
        const res = await api.post('/api/v1/auth/login', { email, password });
        const data = res.data?.data ?? {};
        const token: string | undefined = data.token;
        const user: AuthUser | undefined = data.user;
        if (!token) throw new Error('Token tidak diterima dari server.');
        persist(token, user ?? null);
        return user as AuthUser;
    } finally {
        state.loading = false;
    }
}

async function logout(): Promise<void> {
    // Best effort — hapus token di server, abaikan kalau gagal.
    try {
        if (state.token) await api.post('/api/v1/auth/logout');
    } catch { /* abaikan */ }
    clearSession();
    router.visit('/login');
}

/** Sinkronkan info user dari server (validasi token sekaligus). */
async function fetchMe(): Promise<AuthUser | null> {
    if (!state.token) return null;
    const res = await api.get('/api/v1/auth/me');
    const user = (res.data?.data ?? null) as AuthUser | null;
    if (user) persist(state.token, user);
    return user;
}

export function useAuth() {
    return {
        token: computed(() => state.token),
        user:  computed(() => state.user),
        loading: computed(() => state.loading),
        isAuthenticated: computed(() => !!state.token),
        isSuperAdmin: computed(() => !!state.user?.roles?.includes('super_admin')),
        /** Daftar role & permission user aktif (reaktif). */
        roles: computed(() => state.user?.roles ?? []),
        permissions: computed(() => state.user?.permissions ?? []),
        /** kontingen_id user (untuk scoping admin_kontingen di FE). */
        kontingenId: computed(() => state.user?.kontingen_id ?? null),
        hasRole: (role: string) => !!state.user?.roles?.includes(role),
        /** true jika user punya salah satu dari role yang diminta. */
        hasAnyRole: (roles: string[]) =>
            !!state.user?.roles?.some((r) => roles.includes(r)),
        /**
         * Cek izin. super_admin selalu lolos (cermin guard backend
         * CheckPermission yang mem-bypass super_admin).
         */
        can: (permission: string) =>
            !!state.user?.roles?.includes('super_admin') ||
            !!state.user?.permissions?.includes(permission),
        /** true jika user punya salah satu dari permission yang diminta. */
        canAny: (permissions: string[]) =>
            !!state.user?.roles?.includes('super_admin') ||
            !!state.user?.permissions?.some((p) => permissions.includes(p)),
        login,
        logout,
        fetchMe,
        clearSession,
        state: readonly(state),
    };
}
