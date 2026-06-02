import { router } from '@inertiajs/vue3';
import { useAuth } from '@/Composables/useAuth';

/**
 * Guard halaman berbasis role/permission (lapisan UX — otorisasi sebenarnya
 * tetap di backend lewat middleware `permission:`/`kontingen`).
 *
 * Panggil SINKRON di awal <script setup> sebuah Page, sebelum fetch apa pun:
 *
 *   import { usePageGuard } from '@/Composables/usePageGuard';
 *   usePageGuard({ permission: 'users.view' });
 *   usePageGuard({ anyRole: ['admin_penilaian'] });
 *
 * Jika tidak berhak → redirect ke /403 (super_admin selalu lolos via useAuth.can).
 * Mengembalikan true bila boleh (memudahkan early-return bila perlu).
 */
export function usePageGuard(opts: {
    /** Boleh akses bila punya permission ini. */
    permission?: string;
    /** Boleh akses bila punya salah satu permission ini. */
    anyPermission?: string[];
    /** Boleh akses bila punya salah satu role ini. */
    anyRole?: string[];
    /** Ke mana diarahkan saat ditolak (default /403). */
    redirectTo?: string;
} = {}): boolean {
    const { isAuthenticated, can, canAny, hasAnyRole } = useAuth();

    // Belum login → biarkan guard auth (SimporaLayout) yang menangani.
    if (!isAuthenticated.value) return false;

    let allowed = true;
    if (opts.permission)      allowed = can(opts.permission);
    if (allowed && opts.anyPermission) allowed = canAny(opts.anyPermission);
    if (allowed && opts.anyRole)       allowed = hasAnyRole(opts.anyRole);

    if (!allowed) {
        router.visit(opts.redirectTo ?? '/403');
        return false;
    }
    return true;
}
