import {
    LayoutDashboard,
    User, Users, Shield,
    Trophy, Layers,
    Building2, Calendar,
    UserCheck, BarChart2,
    Hotel, CreditCard,
    Download, Activity, UserCog,
    FileCheck,
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
}

export interface NavGroup {
    label?: string
    subtitle?: string
    color?: string
    items: NavItem[]
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
            { label: 'Data Pribadi', icon: User,   href: '/persons' },
            { label: 'Kontingen',   icon: Shield,  href: '/contingents' },
        ],
    },
    {
        label: 'Peserta',
        color: '#0f6b40',
        items: [
            { label: 'Semua Peserta',      icon: Users,     href: '/participants' },
            { label: 'Verifikasi Dokumen', icon: FileCheck, href: '/documents/review' },
        ],
    },
    {
        label: 'Cabang Olahraga',
        color: '#b78c2b',
        items: [
            { label: 'Cabor',     icon: Trophy, href: '/sports' },
            { label: 'Sub-Cabor', icon: Layers, href: '/sport-categories' },
        ],
    },
    {
        label: 'Venue',
        color: '#0284c7',
        items: [
            { label: 'Venue', icon: Building2, href: '/venues' },
        ],
    },
    {
        label: 'Pertandingan',
        color: '#d97706',
        items: [
            { label: 'Jadwal Pertandingan', icon: Calendar,  href: '/matches' },
            { label: 'Juri',               icon: UserCheck, href: '/judge-scopes' },
            { label: 'Klasemen',           icon: BarChart2, href: '/leaderboard' },
        ],
    },
    {
        label: 'Penginapan',
        color: '#0f6b40',
        items: [
            { label: 'Penginapan', icon: Hotel, href: '/lodgings' },
        ],
    },
    {
        label: 'Kartu Identitas',
        color: '#0f6b40',
        items: [
            { label: 'Template Kartu', icon: CreditCard, href: '/card-templates' },
        ],
    },
    {
        label: 'Sistem',
        color: '#64748b',
        items: [
            { label: 'Laporan',   icon: Download,  href: '/reports' },
            { label: 'Audit Log', icon: Activity,  href: '/audit-logs' },
            { label: 'Users',     icon: UserCog,   href: '/users' },
        ],
    },
];
