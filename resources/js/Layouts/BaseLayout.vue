<template>
    <div class="flex h-full min-h-screen" :class="{ dark: isDark }">

        <!-- Sidebar -->
        <AppSidebar
            v-model:collapsed="sidebarCollapsed"
            v-model:mobile-open="sidebarMobileOpen"
            :nav-groups="resolvedNavGroups"
            :user="user"
            :is-mobile="isMobile"
            :app-name="appName"
            :app-subtitle="appSubtitle"
            @update:collapsed="onCollapsedChange"
        />

        <!-- Main area — inline style agar dynamic width tidak bergantung pada Tailwind JIT -->
        <div
            class="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-out"
            :style="mainStyle"
        >
            <!-- Topbar -->
            <AppTopbar
                :sidebar-collapsed="sidebarCollapsed"
                :is-dark="isDark"
                :user="user"
                :shortcuts="resolvedShortcuts"
                :notification-count="notificationCount"
                :is-mobile="isMobile"
                :is-tablet="isTablet"
                @toggle-sidebar="toggleSidebar"
                @toggle-theme="toggleTheme"
                @open-search="$emit('open-search')"
                @open-notifications="$emit('open-notifications')"
                @open-user-menu="$emit('open-user-menu')"
            />

            <!-- Page content -->
            <main class="flex-1 overflow-auto">
                <slot />
            </main>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useTheme } from '@/Composables/useTheme';
import AppSidebar from '@/Components/App/AppSidebar.vue';
import AppTopbar  from '@/Components/App/AppTopbar.vue';
import {
    LayoutDashboard, Users, Kanban, Mail, MessageSquare,
    Settings, BarChart3, CalendarDays, Star,
    Package, ShoppingCart, FileText, BookOpen,
} from '@lucide/vue';

interface NavItem {
    label: string;
    icon?: unknown;
    href?: string;
    badge?: string | number;
    badgeColor?: string;
    subtitle?: string;
    active?: boolean;
    onClick?: () => void;
    children?: NavItem[];
}

interface NavGroup {
    label?: string;
    subtitle?: string;
    color?: string;
    items: NavItem[];
}

type LayoutUser = { name?: string; email?: string; avatar?: string } | null;
type TopbarShortcut = { label: string; icon: unknown; onClick?: () => void };

// ── Props ──────────────────────────────────────────────────────
const props = defineProps({
    navGroups:         { type: Array as () => NavGroup[] | null, default: null },
    user:              { type: Object as () => LayoutUser,       default: null },
    appName:           { type: String, default: 'CRM Studio' },
    appSubtitle:       { type: String, default: 'Laravel + Vue' },
    notificationCount: { type: Number, default: 0 },
    topbarShortcuts:   { type: Array as () => TopbarShortcut[] | null, default: null },
});

defineEmits(['open-search', 'open-notifications', 'open-user-menu']);

// ── Theme ──────────────────────────────────────────────────────
const { isDark, toggleTheme } = useTheme();

// ── Responsive breakpoints ─────────────────────────────────────
// mobile  < 768px  → drawer overlay
// tablet  768–1023 → always collapsed (icon-only), no drawer
// desktop ≥ 1024px → user-controlled collapse
const windowWidth       = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
const isMobile          = computed<boolean>(() => windowWidth.value < 768);
const isTablet          = computed<boolean>(() => windowWidth.value >= 768 && windowWidth.value < 1024);

// Sidebar state
const sidebarCollapsed  = ref<boolean>(false);   // desktop: user controlled
const sidebarMobileOpen = ref<boolean>(false);   // mobile: drawer

// Auto-collapse on tablet
watch(isTablet, (tablet) => { if (tablet) sidebarCollapsed.value = true; }, { immediate: true });
watch(isMobile, (mobile) => { if (mobile) { sidebarCollapsed.value = false; sidebarMobileOpen.value = false; } });

function toggleSidebar(): void {
    if (isMobile.value) {
        sidebarMobileOpen.value = !sidebarMobileOpen.value;
    } else {
        sidebarCollapsed.value = !sidebarCollapsed.value;
    }
}

function onCollapsedChange(val: boolean): void {
    sidebarCollapsed.value = val;
}

// Main content left padding — inline style agar tidak bergantung Tailwind JIT dynamic class
const mainStyle = computed(() => {
    if (isMobile.value) {
        // Mobile: sidebar jadi overlay, content tidak perlu padding
        return { backgroundColor: 'var(--color-bg)' };
    }
    const pl = sidebarCollapsed.value ? '72px' : '272px';
    return { paddingLeft: pl, backgroundColor: 'var(--color-bg)' };
});

function handleResize(): void {
    windowWidth.value = window.innerWidth;
}

onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => window.removeEventListener('resize', handleResize));

// ── Nav & shortcuts ────────────────────────────────────────────
const resolvedNavGroups = computed<NavGroup[]>(() => props.navGroups ?? defaultNavGroups);
const resolvedShortcuts = computed<TopbarShortcut[]>(() => props.topbarShortcuts ?? defaultShortcuts);

const defaultShortcuts: TopbarShortcut[] = [
    { label: 'Calendar',  icon: CalendarDays },
    { label: 'Mail',      icon: Mail },
    { label: 'Contacts',  icon: Users },
    { label: 'Favorites', icon: Star },
];

const defaultNavGroups: NavGroup[] = [
    {
        label: '',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, href: '/', active: false },
            { label: 'Reports',   icon: BarChart3,       href: '/reports', active: false },
        ],
    },
    {
        label: 'Applications',
        subtitle: 'Custom made application designs',
        color: '#6366f1',
        items: [
            {
                label: 'Contacts',
                icon: Users,
                href: '/contacts',
                active: false,
            },
            {
                label: 'Kanban',
                icon: Kanban,
                href: '/kanban',
                active: false,
                badge: 'NEW',
                badgeColor: '#6366f1',
            },
            {
                // Dropdown example
                label: 'E-Commerce',
                icon: ShoppingCart,
                children: [
                    { label: 'Products', icon: Package, href: '/products', active: false },
                    { label: 'Orders',   icon: Kanban,  href: '/orders',   active: false },
                ],
            },
            {
                // Multi-dropdown example
                label: 'Pages',
                icon: FileText,
                children: [
                    {
                        label: 'Blog',
                        icon: BookOpen,
                        children: [
                            { label: 'All Posts', href: '/blog',        active: false },
                            { label: 'Create',    href: '/blog/create', active: false },
                        ],
                    },
                    { label: 'Landing', icon: FileText, href: '/landing', active: false },
                ],
            },
            {
                label: 'Inbox',
                icon: Mail,
                href: '/mail',
                active: false,
                badge: '3',
                badgeColor: '#ef4444',
            },
            {
                label: 'Chat',
                icon: MessageSquare,
                href: '/chat',
                active: false,
                subtitle: '3 unread messages',
            },
        ],
    },
    {
        label: 'System',
        color: '#64748b',
        items: [
            { label: 'Settings', icon: Settings, href: '/settings', active: false },
        ],
    },
];
</script>
