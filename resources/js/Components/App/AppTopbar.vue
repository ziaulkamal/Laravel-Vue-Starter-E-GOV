<template>
    <header
        class="topbar"
        style="background-color: var(--color-topbar-bg); border-color: var(--color-topbar-border);"
    >
        <!-- ── MOBILE SEARCH MODE: full-width search replaces topbar ── -->
        <template v-if="isMobile && mobileSearchOpen">
            <div class="topbar__search topbar__search--mobile" :class="{ 'topbar__search--focused': searchFocused }">
                <Search :size="14" class="topbar__search-icon" />
                <input
                    ref="mobileSearchInput"
                    v-model="searchQuery"
                    class="topbar__search-input"
                    placeholder="Search anything…"
                    @focus="searchFocused = true"
                    @blur="searchFocused = false"
                    @keydown.escape="closeMobileSearch"
                />
                <button v-if="searchQuery" class="topbar__search-clear" @click="searchQuery = ''">
                    <X :size="12" />
                </button>
            </div>
            <TopbarBtn aria-label="Close search" @click="closeMobileSearch">
                <X :size="18" stroke-width="1.7" />
            </TopbarBtn>
        </template>

        <!-- ── NORMAL MODE ── -->
        <template v-else>
            <!-- LEFT: toggle + desktop search -->
            <div class="topbar__left">
                <TopbarBtn
                    class="topbar__toggle-btn"
                    :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                    @click="$emit('toggle-sidebar')"
                >
                    <component :is="isMobile ? Menu : PanelLeft" :size="19" stroke-width="1.7" />
                </TopbarBtn>

                <!-- Desktop search bar (hidden on mobile) -->
                <div class="topbar__search topbar__search--desktop" :class="{ 'topbar__search--focused': searchFocused }">
                    <Search :size="14" class="topbar__search-icon" />
                    <input
                        v-model="searchQuery"
                        class="topbar__search-input"
                        placeholder="Search anything…"
                        @focus="searchFocused = true"
                        @blur="searchFocused = false"
                        @keydown.escape="searchQuery = ''; (($event.target as HTMLInputElement).blur())"
                    />
                    <button v-if="searchQuery" class="topbar__search-clear" @click="searchQuery = ''">
                        <X :size="12" />
                    </button>
                    <kbd v-if="!searchFocused && !searchQuery" class="topbar__search-kbd">⌘K</kbd>
                </div>
            </div>

            <!-- RIGHT: actions + user -->
            <div class="topbar__right">
                <!-- Mobile search icon (shown only on mobile) -->
                <TopbarBtn v-if="isMobile" aria-label="Search" @click="openMobileSearch">
                    <Search :size="18" stroke-width="1.7" />
                </TopbarBtn>

                <!-- Theme toggle -->
                <TopbarBtn :aria-label="isDark ? 'Light mode' : 'Dark mode'" @click="$emit('toggle-theme')">
                    <component :is="isDark ? Sun : Moon" :size="18" stroke-width="1.7" />
                </TopbarBtn>

                <!-- Notifications -->
                <div class="topbar__notif-wrap">
                    <TopbarBtn aria-label="Notifications" @click="$emit('open-notifications')">
                        <Bell :size="18" stroke-width="1.7" />
                    </TopbarBtn>
                    <span v-if="notificationCount > 0" class="topbar__notif-badge">
                        {{ notificationCount > 9 ? '9+' : notificationCount }}
                    </span>
                </div>

                <!-- Divider (desktop only) -->
                <div class="topbar__divider topbar__divider--desktop" />

                <!-- User avatar + dropdown -->
                <div class="topbar__user-wrap" ref="userWrapRef">
                    <button class="topbar__user-btn" aria-label="User menu" @click="userMenuOpen = !userMenuOpen">
                        <div class="topbar__avatar">
                            <img v-if="user?.avatar" :src="user.avatar" :alt="user?.name" class="topbar__avatar-img" />
                            <span v-else>{{ userInitials }}</span>
                        </div>
                        <!-- Name + chevron hidden on mobile -->
                        <div class="topbar__user-info topbar__user-info--desktop">
                            <p class="topbar__user-name">{{ user?.name ?? 'Admin User' }}</p>
                            <p class="topbar__user-email">{{ user?.email ?? 'admin@crm.com' }}</p>
                        </div>
                        <ChevronDown
                            :size="13"
                            stroke-width="2.5"
                            class="topbar__user-chevron topbar__user-chevron--desktop"
                            :class="{ 'rotate-180': userMenuOpen }"
                        />
                    </button>

                    <!-- User dropdown -->
                    <Transition name="dropdown">
                        <div v-if="userMenuOpen" class="topbar__user-menu">
                            <div class="topbar__menu-header">
                                <div class="topbar__menu-avatar">
                                    <img v-if="user?.avatar" :src="user.avatar" :alt="user?.name" class="w-full h-full object-cover" />
                                    <span v-else>{{ userInitials }}</span>
                                </div>
                                <div>
                                    <p class="topbar__menu-name">{{ user?.name ?? 'Admin User' }}</p>
                                    <p class="topbar__menu-email">{{ user?.email ?? 'admin@crm.com' }}</p>
                                </div>
                            </div>

                            <div class="topbar__menu-divider" />

                            <div class="topbar__menu-items">
                                <a href="/settings" class="topbar__menu-item">
                                    <UserIcon :size="14" /> Profile
                                </a>
                                <a href="/settings" class="topbar__menu-item">
                                    <Settings :size="14" /> Settings
                                </a>
                                <a href="/blocks" class="topbar__menu-item">
                                    <LayoutGrid :size="14" /> Components
                                </a>
                            </div>

                            <div class="topbar__menu-divider" />

                            <div class="topbar__menu-items">
                                <button class="topbar__menu-item topbar__menu-item--danger" @click="userMenuOpen = false">
                                    <LogOut :size="14" /> Sign out
                                </button>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </template>
    </header>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import {
    PanelLeft, Menu, Sun, Moon, Search, X,
    Bell, ChevronDown, UserIcon, Settings, LogOut, LayoutGrid,
} from '@lucide/vue';
import TopbarBtn from './TopbarBtn.vue';

type TopbarUser = { name?: string; email?: string; avatar?: string } | null;

const props = defineProps({
    sidebarCollapsed:  { type: Boolean, default: false },
    isDark:            { type: Boolean, default: false },
    user:              { type: Object as () => TopbarUser, default: null },
    notificationCount: { type: Number,  default: 0 },
    isMobile:          { type: Boolean, default: false },
});

defineEmits(['toggle-sidebar', 'toggle-theme', 'open-notifications', 'open-user-menu']);

const searchQuery      = ref('');
const searchFocused    = ref(false);
const mobileSearchOpen = ref(false);
const userMenuOpen     = ref(false);
const userWrapRef      = ref<HTMLElement | null>(null);
const mobileSearchInput = ref<HTMLInputElement | null>(null);

const userInitials = computed<string>(() => {
    const name = props.user?.name ?? 'Admin User';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
});

async function openMobileSearch() {
    mobileSearchOpen.value = true;
    await nextTick();
    mobileSearchInput.value?.focus();
}

function closeMobileSearch() {
    mobileSearchOpen.value = false;
    searchQuery.value = '';
}

function onClickOutside(e: MouseEvent) {
    if (userWrapRef.value && !userWrapRef.value.contains(e.target as Node)) {
        userMenuOpen.value = false;
    }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>

