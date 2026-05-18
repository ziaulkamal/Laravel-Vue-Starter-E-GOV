<template>
    <BaseLayout :nav-groups="navGroups">
        <div class="p-6">
            <!-- Page header -->
            <div class="mb-6">
                <h1 class="text-2xl font-bold" style="color: var(--color-text-primary); font-family: var(--font-heading);">
                    Dashboard
                </h1>
                <p class="mt-1 text-sm" style="color: var(--color-text-muted);">
                    Selamat datang di CRM Studio — Batch 01 selesai ✓
                </p>
            </div>

            <!-- Status cards — placeholder Batch 01 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div
                    v-for="card in statusCards"
                    :key="card.label"
                    class="rounded-xl border p-5"
                    style="background-color: var(--color-surface); border-color: var(--color-border);"
                >
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-text-muted);">
                            {{ card.label }}
                        </span>
                        <div
                            class="w-8 h-8 rounded-lg flex items-center justify-center"
                            :style="{ backgroundColor: card.color + '18' }"
                        >
                            <component :is="card.icon" :size="16" :style="{ color: card.color }" />
                        </div>
                    </div>
                    <div class="text-2xl font-bold" style="color: var(--color-text-primary); font-family: var(--font-heading);">
                        {{ card.value }}
                    </div>
                    <div class="mt-1 text-xs" style="color: var(--color-text-muted);">
                        {{ card.description }}
                    </div>
                </div>
            </div>

            <!-- Batch status -->
            <div
                class="rounded-xl border p-6"
                style="background-color: var(--color-surface); border-color: var(--color-border);"
            >
                <h2 class="text-base font-semibold mb-4" style="color: var(--color-text-primary);">
                    Build Progress
                </h2>
                <div class="space-y-3">
                    <div
                        v-for="batch in batches"
                        :key="batch.name"
                        class="flex items-center gap-4"
                    >
                        <div
                            class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                            :style="batch.done
                                ? 'background-color: var(--color-success); color: #fff;'
                                : 'background-color: var(--color-border); color: var(--color-text-muted);'"
                        >
                            {{ batch.done ? '✓' : batch.num }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium" style="color: var(--color-text-primary);">
                                {{ batch.name }}
                            </div>
                            <div class="text-xs" style="color: var(--color-text-muted);">
                                {{ batch.desc }}
                            </div>
                        </div>
                        <span
                            class="text-xs font-medium px-2 py-0.5 rounded-full"
                            :style="batch.done
                                ? 'background-color: var(--color-success-light); color: var(--color-success);'
                                : 'background-color: var(--color-border); color: var(--color-text-muted);'"
                        >
                            {{ batch.done ? 'Done' : 'Pending' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </BaseLayout>
</template>

<script setup lang="ts">
import BaseLayout from '@/Layouts/BaseLayout.vue';
import {
    Users, Kanban, Mail, MessageSquare, LayoutDashboard, Settings,
    BarChart3, ShoppingCart, Package, FileText, BookOpen,
} from '@lucide/vue';

interface NavItem {
    label: string;
    icon?: unknown;
    href?: string;
    badge?: string | number;
    badgeColor?: string;
    subtitle?: string;
    active?: boolean;
    children?: NavItem[];
}

interface NavGroup {
    label?: string;
    subtitle?: string;
    color?: string;
    items: NavItem[];
}

interface StatusCard {
    label: string;
    value: string;
    description: string;
    icon: unknown;
    color: string;
}

interface BatchItem {
    num: string;
    name: string;
    desc: string;
    done: boolean;
}

const statusCards: StatusCard[] = [
    { label: 'Contacts', value: '248',  description: '+12 this week', icon: Users,        color: '#6366f1' },
    { label: 'Deals',    value: '34',   description: '+5 this week',  icon: Kanban,        color: '#10b981' },
    { label: 'Emails',   value: '1.2k', description: '+89 today',     icon: Mail,          color: '#f59e0b' },
    { label: 'Messages', value: '56',   description: '3 unread',      icon: MessageSquare, color: '#ec4899' },
];

const batches: BatchItem[] = [
    { num: '1', name: 'Batch 01 — Design System & Foundation', desc: 'Tailwind tokens, fonts, layouts, dark mode, composables', done: true },
    { num: '2', name: 'Batch 02 — Core UI Components', desc: '23 komponen atom & molecule', done: false },
    { num: '3', name: 'Batch 03 — Navigation Shell & Dashboard', desc: 'Sidebar, Topbar, 6 dashboard widget', done: false },
    { num: '4', name: 'Batch 04 — Complex Feature Components', desc: 'DataTable, Kanban, Mail, Chat, Wizard', done: false },
    { num: '5', name: 'Batch 05 — Sample Pages & QA', desc: '11 sample page, audit responsive/dark/a11y', done: false },
];

// Demo: single + dropdown + multi-dropdown
const navGroups: NavGroup[] = [
    {
        label: '',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, href: '/', active: true },
            { label: 'Analytics', icon: BarChart3,       href: '/analytics', active: false },
        ],
    },
    {
        label: 'Applications',
        subtitle: 'Custom made application designs',
        color: '#6366f1',
        items: [
            { label: 'Contacts',  icon: Users,         href: '/contacts', active: false },
            { label: 'Inbox',     icon: Mail,          href: '/mail',     active: false, badge: '3', badgeColor: '#ef4444' },
            { label: 'Chat',      icon: MessageSquare, href: '/chat',     active: false, subtitle: '3 unread messages' },
            {
                label: 'E-Commerce',
                icon: ShoppingCart,
                badge: 'NEW',
                badgeColor: '#6366f1',
                children: [
                    { label: 'Products', icon: Package, href: '/products', active: false },
                    { label: 'Orders',   icon: Kanban,  href: '/orders',   active: false },
                ],
            },
            {
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
        ],
    },
    {
        label: 'System',
        color: '#64748b',
        items: [
            { label: 'Settings',     icon: Settings,       href: '/settings', active: false },
            { label: 'UI Showcase',  icon: LayoutDashboard, href: '/ui',      active: false, badge: 'DEV', badgeColor: '#8b5cf6' },
        ],
    },
];
</script>
