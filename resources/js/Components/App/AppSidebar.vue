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
        :class="[
            'fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-out select-none',
            collapsed && !isMobile ? 'w-[72px]' : 'w-[272px]',
            isMobile
                ? mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                : 'translate-x-0',
        ]"
        :style="sidebarStyle"
    >

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
        <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2" :class="showLabels ? 'px-3' : 'px-2'">

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
                            :item="item"
                            :show-labels="showLabels"
                            :collapsed="collapsed && !isMobile"
                            :open-keys="openKeys"
                            :depth="0"
                            :accent-color="section.color ?? accentColor"
                            :text-primary="textPrimary"
                            :text-muted="textMuted"
                            @toggle="handleToggle"
                            @expand-sidebar="onExpandSidebar"
                        />
                    </template>
                </div>

            </template>
        </nav>

        <!-- ── User footer ── -->
        <div class="shrink-0 py-2" :class="showLabels ? 'px-3' : 'px-2'">
            <div class="border-t pb-1 mb-1" :style="{ borderColor: borderColor }" />

            <!-- Expanded footer -->
            <Transition name="slide-label">
                <div v-if="showLabels" class="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer hover:bg-white/40 transition-colors">
                    <UserAvatar :user="user" size="sm" border-bg="#f0f1f8" />
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold truncate leading-tight" :style="{ color: textPrimary }">
                            {{ user?.name ?? 'Admin User' }}
                        </p>
                        <p class="text-xs truncate" :style="{ color: textMuted }">
                            {{ user?.email ?? 'admin@crm.com' }}
                        </p>
                    </div>
                    <button
                        class="p-1 rounded-lg hover:bg-black/10 transition-colors"
                        title="Collapse sidebar"
                        @click.stop="$emit('update:collapsed', true)"
                    >
                        <ChevronLeft :size="14" :style="{ color: textMuted }" />
                    </button>
                </div>
            </Transition>

            <!-- Collapsed footer: just avatar -->
            <div
                v-if="!showLabels"
                class="flex justify-center py-1 cursor-pointer"
                @click="$emit('update:collapsed', false)"
            >
                <div class="relative group">
                    <UserAvatar :user="user" size="sm" border-bg="#f0f1f8" />
                    <span class="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-indigo-400 transition-all" />
                </div>
            </div>
        </div>

    </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronLeft } from '@lucide/vue';
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
    appName:     { type: String,  default: 'CRM Studio' },
    appSubtitle: { type: String,  default: 'Laravel + Vue' },
});

defineEmits(['update:collapsed', 'update:mobileOpen']);

const openKeys = ref<Set<string>>(new Set());

function handleToggle(key: string): void {
    const s = new Set(openKeys.value);
    s.has(key) ? s.delete(key) : s.add(key);
    openKeys.value = s;
}

// When a dropdown is clicked in collapsed mode → auto-expand
function onExpandSidebar(): void {
    if (props.collapsed && !props.isMobile) {
        // parent must handle this
    }
}

const showLabels = computed<boolean>(() => !props.collapsed || props.isMobile);

// ── Design tokens ──
const sidebarBg   = '#f0f1f8';
const borderColor = 'rgba(99,102,241,0.12)';
const textPrimary = '#1e1b4b';
const textMuted   = '#6b7280';
const accentColor = '#6366f1';

const sidebarStyle = computed(() => ({
    backgroundColor: sidebarBg,
    borderRight: `1px solid ${borderColor}`,
}));

const iconGroupStyle: Record<string, string> = {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};
</script>

<style scoped>
.sidebar-logo {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(99,102,241,0.35);
    flex-shrink: 0;
}

.sidebar-icon-group {
    /* defined inline for reactivity */
}

/* Transitions */
.overlay-enter-active, .overlay-leave-active { transition: opacity 220ms ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.slide-label-enter-active, .slide-label-leave-active {
    transition: opacity 150ms ease, max-width 260ms cubic-bezier(.4,0,.2,1);
    overflow: hidden;
    max-width: 220px;
}
.slide-label-enter-from, .slide-label-leave-to { opacity: 0; max-width: 0; }
</style>
