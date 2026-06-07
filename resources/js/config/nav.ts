import {
    LayoutDashboard,
    User, Users, Shield,
    Trophy, Layers,
    Building2, Calendar,
    UserCheck, BarChart2,
    Hotel, CreditCard,
    Download, Activity, UserCog,
    FileCheck, DatabaseZap, ClipboardList, ArrowLeftRight, Gavel,
    Network, FileEdit,
} from '@lucide/vue';

export interface NavItem {
    label: string
    icon?: unknown
    href?: string
    badge?: string | number
    badgeColor?: string
    subtitle?: string
    active?: boolean
    children?: NavItem[]
    /** Tampil bila user punya permission ini (super_admin selalu lolos). */
    permission?: string
    /** Tampil bila user punya salah satu permission ini. */
    anyPermission?: string[]
    /** Tampil bila user punya salah satu role ini. */
    roles?: string[]
}

export interface NavGroup {
    label?: string
    subtitle?: string
    color?: string
    items: NavItem[]
    /** Hanya tampil untuk super admin (mis. tools dev). */
    superAdminOnly?: boolean
}

export const simporaNavGroups: NavGroup[] = [
    {
        label: '',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        ],
    },
    {
        label: 'Master Data',
        color: '#0f6b40',
        items: [
            { label: 'Data Pribadi', icon: User,   href: '/persons',     permission: 'persons.view' },
            { label: 'Kontingen',   icon: Shield,  href: '/contingents', permission: 'contingents.view' },
        ],
    },
    {
        label: 'Peserta',
        color: '#0f6b40',
        items: [
            { label: 'Semua Peserta',      icon: Users,         href: '/participants',     roles: ['super_admin', 'panitia_besar', 'admin_kontingen'] },
            { label: 'Verifikasi Dokumen', icon: FileCheck,     href: '/documents/review', permission: 'documents.verify' },
            { label: 'Peminjaman Atlet',   icon: ArrowLeftRight, href: '/borrow-requests', roles: ['super_admin', 'panitia_besar', 'admin_kontingen'] },
            { label: 'Jenis Berkas',       icon: ClipboardList,  href: '/document-types',  roles: ['super_admin', 'panitia_besar'] },
        ],
    },
    {
        label: 'Cabang Olahraga',
        color: '#b78c2b',
        items: [
            { label: 'Cabor',     icon: Trophy, href: '/sports',           permission: 'sports.view' },
            { label: 'Sub-Cabor', icon: Layers, href: '/sport-categories', permission: 'sports.view' },
        ],
    },
    {
        label: 'Venue',
        color: '#0284c7',
        items: [
            { label: 'Venue', icon: Building2, href: '/venues', roles: ['super_admin', 'panitia_besar', 'admin_venue'] },
        ],
    },
    {
        label: 'Pertandingan',
        color: '#d97706',
        items: [
            { label: 'Jadwal Pertandingan', icon: Calendar,  href: '/matches',      permission: 'matches.view' },
            { label: 'Grup Pertandingan',   icon: Network,   href: '/tournament-groups', roles: ['super_admin', 'panitia_besar'] },
            { label: 'Tugas Penilaian',     icon: Gavel,     href: '/judges/my-assignments', roles: ['super_admin', 'panitia_besar', 'admin_penilaian'] },
            { label: 'Perubahan Hasil',     icon: FileEdit,  href: '/result-change-requests', roles: ['super_admin', 'panitia_besar', 'admin_penilaian'] },
            { label: 'Juri',               icon: UserCheck, href: '/judge-scopes',  roles: ['super_admin', 'panitia_besar'] },
            { label: 'Klasemen',           icon: BarChart2, href: '/leaderboard',   permission: 'results.view' },
        ],
    },
    {
        label: 'Penginapan',
        color: '#0f6b40',
        items: [
            { label: 'Penginapan', icon: Hotel, href: '/lodgings', roles: ['super_admin', 'panitia_besar'] },
        ],
    },
    {
        label: 'Kartu Identitas',
        color: '#0f6b40',
        items: [
            { label: 'Template Kartu', icon: CreditCard, href: '/card-templates', roles: ['super_admin', 'panitia_besar'] },
        ],
    },
    {
        label: 'Sistem',
        color: '#64748b',
        items: [
            { label: 'Laporan',   icon: Download,  href: '/reports',    permission: 'reports.view' },
            { label: 'Audit Log', icon: Activity,  href: '/audit-logs', permission: 'audit.view' },
            { label: 'Users',     icon: UserCog,   href: '/users',      permission: 'users.view' },
        ],
    },
    {
        label: 'Dev / Tools',
        color: '#64748b',
        superAdminOnly: true,
        items: [
            { label: 'Generator Data', icon: DatabaseZap, href: '/dev/seeder', subtitle: 'Data simulasi' },
        ],
    },
];
