<template>
    <!-- ── Mobile Overlay ── -->
    <Transition name="overlay">
        <div
            v-if="mobileOpen && isMobile"
            class="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm"
            @click="$emit('update:mobileOpen', false)"
        />
    </Transition>

    <!-- ── Sidebar ── -->
    <aside
        ref="sidebarEl"
        :class="[
            'app-sidebar flex flex-col transition-all duration-300 ease-out select-none',
            isMobile
                ? (mobileOpen ? 'app-sidebar--mobile-open' : 'app-sidebar--mobile-closed')
                : '',
        ]"
        :style="[sidebarStyle, { width: (collapsed && !isMobile ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED) + 'px' }]"
    >
        <!-- Sliding hover indicator -->
        <div class="nav-sliding-indicator" :style="indicatorStyle" />

        <!-- Aurora overlay (dark mode only) -->
        <div v-if="isDark" class="sidebar-aurora" aria-hidden="true">
            <div class="sidebar-aurora__blob sidebar-aurora__blob--1" />
            <div class="sidebar-aurora__blob sidebar-aurora__blob--2" />
            <div class="sidebar-aurora__blob sidebar-aurora__blob--3" />
        </div>

        <!-- ── Logo / Brand ── -->
        <div class="flex items-center h-16 shrink-0 px-3 gap-3">
            <div class="sidebar-logo shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L18 6.5V13.5L10 18L2 13.5V6.5L10 2Z" fill="white" fill-opacity="0.95"/>
                    <circle cx="10" cy="10" r="3" fill="white" fill-opacity="0.5"/>
                </svg>
            </div>
            <Transition name="slide-label">
                <div v-if="showLabels" class="flex-1 min-w-0">
                    <div class="text-sm font-bold truncate" :style="{ color: textPrimary }">{{ appName }}</div>
                    <div class="text-xs truncate" :style="{ color: textMuted }">{{ appSubtitle }}</div>
                </div>
            </Transition>
        </div>

        <!-- ── Nav ── -->
        <nav
            ref="navEl"
            class="flex-1 overflow-y-auto overflow-x-hidden py-2"
            :class="showLabels ? 'px-3' : 'px-2'"
            @mouseover="onNavMouseover"
            @mouseleave="onNavMouseleave"
        >

            <template v-for="(section, si) in navGroups" :key="si">

                <!-- Separator between sections in collapsed mode -->
                <div v-if="!showLabels && si > 0" class="my-2" />

                <!-- Section card wrapper (collapsed) or plain (expanded) -->
                <div
                    :class="[
                        !showLabels ? 'sidebar-icon-group' : '',
                        'space-y-0.5',
                    ]"
                    :style="!showLabels ? iconGroupStyle : ''"
                >
                    <!-- Section heading (expanded only) -->
                    <Transition name="slide-label">
                        <div v-if="showLabels && section.label" class="px-2 pt-4 pb-1">
                            <!-- Label: uppercase bold kecil -->
                            <p
                                class="text-[10.5px] font-extrabold uppercase tracking-[0.1em] truncate leading-tight"
                                :style="{ color: section.color ?? accentColor }"
                            >
                                {{ section.label }}
                            </p>
                            <!-- Subtitle: sangat kecil & muted -->
                            <p
                                v-if="section.subtitle"
                                class="text-[10px] mt-0.5 truncate leading-tight"
                                :style="{ color: '#9ca3af' }"
                            >
                                {{ section.subtitle }}
                            </p>
                        </div>
                    </Transition>

                    <!-- Items -->
                    <template v-for="item in section.items" :key="item.label">
                        <NavItem
                            :item="{ ...item, active: isItemActive(item) }"
                            :show-labels="showLabels"
                            :collapsed="collapsed && !isMobile"
                            :open-keys="openKeys"
                            :depth="0"
                            :accent-color="section.color ?? accentColor"
                            :text-primary="textPrimary"
                            :text-muted="textMuted"
                            :current-path="currentPath"
                            @toggle="handleToggle"
                            @expand-sidebar="onExpandSidebar"
                        />
                    </template>
                </div>

            </template>
        </nav>

        <!-- ── User footer — fixed di bawah sidebar ── -->
        <div class="sidebar-user-footer" :class="showLabels ? 'px-3' : 'px-2'">
            <div class="sidebar-user-divider" :style="{ borderColor: borderColor }" />

            <!-- Expanded -->
            <Transition name="slide-label">
                <div
                    v-if="showLabels"
                    class="sidebar-user-row"
                    @mouseenter="($event.currentTarget as HTMLElement).style.background = isDark ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'rgba(255,255,255,0.5)'"
                    @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                >
                    <UserAvatar :user="user" size="sm" :border-bg="isDark ? '#1e293b' : '#f0f1f8'" />
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold truncate leading-tight" :style="{ color: textPrimary }">
                            {{ user?.name ?? 'Admin User' }}
                        </p>
                        <p class="text-xs truncate" :style="{ color: textMuted }">
                            {{ user?.email ?? 'admin@crm.com' }}
                        </p>
                    </div>
                    <button class="p-1 rounded-lg transition-colors" title="Collapse sidebar" @click.stop="$emit('update:collapsed', true)">
                        <ChevronLeft :size="14" :style="{ color: textMuted }" />
                    </button>
                </div>
            </Transition>

            <!-- Collapsed: avatar only -->
            <div
                v-if="!showLabels"
                class="flex justify-center py-2 cursor-pointer"
                @click="$emit('update:collapsed', false)"
            >
                <div class="relative group">
                    <UserAvatar :user="user" size="sm" :border-bg="isDark ? '#1e293b' : '#f0f1f8'" />
                    <span class="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-[var(--color-accent)] transition-all" />
                </div>
            </div>
        </div>

    </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { ChevronLeft } from '@lucide/vue';
import { SIDEBAR_W_EXPANDED, SIDEBAR_W_COLLAPSED } from '@/config/layout';
import NavItem    from './NavItem.vue';
import UserAvatar from './UserAvatar.vue';

interface NavItemType {
    label: string;
    icon?: unknown;
    href?: string;
    badge?: string | number;
    badgeColor?: string;
    subtitle?: string;
    active?: boolean;
    onClick?: () => void;
    children?: NavItemType[];
}

interface NavGroup {
    label?: string;
    subtitle?: string;
    color?: string;
    items: NavItemType[];
}

type SidebarUser = { name?: string; email?: string; avatar?: string } | null;

const props = defineProps({
    navGroups:   { type: Array as () => NavGroup[], required: true },
    user:        { type: Object as () => SidebarUser, default: null },
    collapsed:   { type: Boolean, default: false },
    mobileOpen:  { type: Boolean, default: false },
    isMobile:    { type: Boolean, default: false },
    isDark:      { type: Boolean, default: false },
    appName:     { type: String,  default: 'E-Gov CRM' },
    appSubtitle: { type: String,  default: 'Laravel + Tailwinds + Vue' },
});

defineEmits(['update:collapsed', 'update:mobileOpen']);

const page        = usePage();
const openKeys    = ref<Set<string>>(new Set());

// ── Active state based on current URL ──
const currentPath = computed(() => {
    const url = page.url as string;
    return url.split('?')[0]; // strip query string
});

function isItemActive(item: NavItemType): boolean {
    if (!item.href) return false;
    return currentPath.value === item.href ||
           (item.href !== '/' && currentPath.value.startsWith(item.href));
}

function hasActiveDescendant(items: NavItemType[]): boolean {
    return items.some(i => isItemActive(i) || (i.children ? hasActiveDescendant(i.children) : false));
}

// ── Auto-open dropdown that contains the active page ──
function syncOpenKeys(): void {
    const next = new Set<string>();
    props.navGroups.forEach(group => {
        group.items.forEach((item) => {
            if (item.children && hasActiveDescendant(item.children)) {
                next.add(`0-${item.label}`);
                // also open nested
                item.children.forEach(child => {
                    if (child.children && hasActiveDescendant(child.children)) {
                        next.add(`1-${child.label}`);
                    }
                });
            }
        });
    });
    openKeys.value = next;
}

watch(currentPath, syncOpenKeys, { immediate: true });

function handleToggle(key: string): void {
    const s = new Set(openKeys.value);
    s.has(key) ? s.delete(key) : s.add(key);
    openKeys.value = s;
}

function onExpandSidebar(): void {}

const showLabels = computed<boolean>(() => !props.collapsed || props.isMobile);

// ── Sliding hover indicator ──
const sidebarEl  = ref<HTMLElement | null>(null);
const navEl      = ref<HTMLElement | null>(null);
const indTop     = ref(0);
const indLeft    = ref(0);
const indWidth   = ref(0);
const indHeight  = ref(0);
const indVisible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const indicatorStyle = computed(() => ({
    position:   'absolute' as const,
    zIndex:     '0',
    top:        indTop.value    + 'px',
    left:       indLeft.value   + 'px',
    width:      indWidth.value  + 'px',
    height:     indHeight.value + 'px',
    opacity:    indVisible.value ? '1' : '0',
    background: props.isDark ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'color-mix(in srgb, var(--color-accent) 9%, transparent)',
}));

function placeAt(itemEl: HTMLElement) {
    if (!sidebarEl.value) return;
    const sb = sidebarEl.value.getBoundingClientRect();
    const it = itemEl.getBoundingClientRect();
    indTop.value    = it.top    - sb.top;
    indLeft.value   = it.left   - sb.left;
    indWidth.value  = it.width;
    indHeight.value = it.height;
    indVisible.value = true;
}

function onNavMouseover(e: MouseEvent) {
    if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; }
    const target = (e.target as HTMLElement).closest('.nav-item--root') as HTMLElement | null;
    if (!target || target.classList.contains('nav-item--active')) {
        indVisible.value = false;
        return;
    }
    placeAt(target);
}

function onNavMouseleave() {
    const activeEl = navEl.value?.querySelector('.nav-item--active') as HTMLElement | null;
    if (activeEl && indVisible.value) {
        placeAt(activeEl);
        hideTimer = setTimeout(() => { indVisible.value = false; hideTimer = null; }, 210);
    } else {
        indVisible.value = false;
    }
}

onMounted(async () => {
    await nextTick();
    const activeEl = navEl.value?.querySelector('.nav-item--active') as HTMLElement | null;
    if (activeEl) { placeAt(activeEl); indVisible.value = false; }
});

onUnmounted(() => { if (hideTimer !== null) clearTimeout(hideTimer); });

// ── Design tokens (reactive on isDark) ──
const accentColor = 'var(--color-accent)';

const sidebarBg   = computed(() => props.isDark ? '#0d1117'        : '#f0f1f8');
const borderColor = computed(() => props.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.12)');
const textPrimary = computed(() => props.isDark ? '#e2e8f0'        : '#1e1b4b');
const textMuted   = computed(() => props.isDark ? '#64748b'        : '#6b7280');

const sidebarStyle = computed(() => ({
    backgroundColor: sidebarBg.value,
    borderRight: `1px solid ${borderColor.value}`,
    // position & height diatur via CSS class .app-sidebar
    // overflow: hidden clips aurora blobs di luar bounds sidebar.
    // Scrollbar nav tetap terlihat karena ada di DALAM bounding box sidebar.
    overflow: 'hidden',
}));

const iconGroupStyle = computed<Record<string, string>>(() => ({
    backgroundColor: props.isDark ? 'rgba(30,41,59,0.6)' : '#ffffff',
    borderRadius: '14px',
    padding: '6px',
    boxShadow: props.isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
}));
</script>
