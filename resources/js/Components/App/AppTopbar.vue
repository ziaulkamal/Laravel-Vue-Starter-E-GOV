<template>
    <header
        class="sticky top-0 z-10 flex items-center h-14 shrink-0 border-b"
        style="background-color: var(--color-topbar-bg); border-color: var(--color-topbar-border);"
    >
        <!-- ── LEFT: Sidebar toggle + shortcuts ── -->
        <div class="flex items-center h-full">
            <!-- Toggle sidebar — always first, separated by border -->
            <div class="flex items-center px-3 h-full border-r" style="border-color: var(--color-topbar-border);">
                <TopbarBtn
                    :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                    @click="$emit('toggle-sidebar')"
                >
                    <!-- Mobile: hamburger. Desktop/tablet: panel toggle -->
                    <component
                        :is="isMobile ? Menu : PanelLeft"
                        :size="19"
                        stroke-width="1.7"
                    />
                </TopbarBtn>
            </div>

            <!-- Shortcut icons (hidden on mobile) -->
            <div class="hidden sm:flex items-center gap-0.5 px-3">
                <TopbarBtn
                    v-for="s in shortcuts"
                    :key="s.label"
                    :aria-label="s.label"
                    @click="s.onClick ? s.onClick() : undefined"
                >
                    <component :is="s.icon" :size="19" stroke-width="1.7" />
                </TopbarBtn>
            </div>
        </div>

        <!-- ── SPACER ── -->
        <div class="flex-1" />

        <!-- ── RIGHT: actions ── -->
        <div class="flex items-center gap-0.5 px-3">

            <!-- Font size (hidden on mobile) -->
            <TopbarBtn aria-label="Font size" class="hidden md:inline-flex">
                <span
                    class="text-sm font-bold leading-none"
                    style="color: var(--color-text-muted); font-family: var(--font-heading); letter-spacing: -0.03em;"
                >
                    Aa
                </span>
            </TopbarBtn>

            <!-- Fullscreen (hidden on mobile) -->
            <TopbarBtn aria-label="Toggle fullscreen" class="hidden md:inline-flex" @click="toggleFullscreen">
                <component :is="isFullscreen ? Minimize : Maximize" :size="19" stroke-width="1.7" />
            </TopbarBtn>

            <!-- Theme toggle -->
            <TopbarBtn
                :aria-label="isDark ? 'Light mode' : 'Dark mode'"
                @click="$emit('toggle-theme')"
            >
                <component :is="isDark ? Sun : Moon" :size="19" stroke-width="1.7" />
            </TopbarBtn>

            <!-- Search -->
            <TopbarBtn aria-label="Search" @click="$emit('open-search')">
                <Search :size="19" stroke-width="1.7" />
            </TopbarBtn>

            <!-- Bookmark (hidden on mobile) -->
            <TopbarBtn aria-label="Bookmarks" class="hidden sm:inline-flex">
                <Bookmark :size="19" stroke-width="1.7" />
            </TopbarBtn>

            <!-- Notifications -->
            <div class="relative">
                <TopbarBtn aria-label="Notifications" @click="$emit('open-notifications')">
                    <Bell :size="19" stroke-width="1.7" />
                </TopbarBtn>
                <span
                    v-if="notificationCount > 0"
                    class="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white px-1 pointer-events-none"
                    style="background: linear-gradient(135deg,#ef4444,#f97316);"
                >
                    {{ notificationCount > 9 ? '9+' : notificationCount }}
                </span>
            </div>

            <!-- Divider -->
            <div class="w-px h-5 mx-1.5" style="background-color: var(--color-border);" />

            <!-- User avatar -->
            <button
                class="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors hover:bg-[--color-bg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                aria-label="User menu"
                @click="$emit('open-user-menu')"
            >
                <div
                    class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0"
                    style="background: linear-gradient(135deg,#6366f1,#8b5cf6);"
                >
                    <img
                        v-if="user?.avatar"
                        :src="user.avatar"
                        :alt="user?.name"
                        class="w-full h-full object-cover"
                    />
                    <span v-else>{{ userInitials }}</span>
                </div>
                <ChevronDown :size="13" stroke-width="2.5" class="hidden sm:block" style="color: var(--color-text-subtle);" />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
    PanelLeft, Menu, Sun, Moon, Search, Bookmark,
    Bell, ChevronDown, Maximize, Minimize,
} from '@lucide/vue';
import TopbarBtn from './TopbarBtn.vue';

type TopbarUser = { name?: string; avatar?: string } | null;
type TopbarShortcut = { label: string; icon: unknown; onClick?: () => void };

const props = defineProps({
    sidebarCollapsed:  { type: Boolean, default: false },
    isDark:            { type: Boolean, default: false },
    user:              { type: Object as () => TopbarUser, default: null },
    shortcuts:         { type: Array as () => TopbarShortcut[], default: () => [] },
    notificationCount: { type: Number,  default: 0 },
    isMobile:          { type: Boolean, default: false },
    isTablet:          { type: Boolean, default: false },
});

defineEmits([
    'toggle-sidebar', 'toggle-theme',
    'open-search', 'open-notifications', 'open-user-menu',
]);

const isFullscreen = ref<boolean>(false);

const userInitials = computed<string>(() => {
    const name = props.user?.name ?? 'A';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
});

function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => { isFullscreen.value = true; });
    } else {
        document.exitFullscreen().then(() => { isFullscreen.value = false; });
    }
}
</script>
