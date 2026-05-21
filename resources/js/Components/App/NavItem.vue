<template>
    <!-- ── SINGLE item ── -->
    <template v-if="!hasChildren">
        <component
            :is="item.href ? 'a' : 'button'"
            :href="item.href ?? undefined"
            class="nav-item"
            :class="[
                itemDepthClass,
                isActive ? 'nav-item--active' : 'nav-item--default',
                collapsed && depth === 0 ? 'nav-item--icon-only' : '',
            ]"
            :style="isActive && depth === 0 ? activeItemStyle : ''"
            :title="collapsed && depth === 0 ? item.label : ''"
            @click="item.onClick ? item.onClick() : undefined"
        >
            <!-- Icon (root only) -->
            <span
                v-if="depth === 0"
                class="nav-icon"
                :class="collapsed && depth === 0 ? 'nav-icon--collapsed' : ''"
                :style="isActive && depth === 0 ? 'color: #fff;' : iconColorStyle"
            >
                <component :is="item.icon" :size="iconSize" :stroke-width="1.8" />
            </span>

            <!-- Label -->
            <Transition name="slide-label">
                <span v-if="showLabels" class="flex-1 min-w-0 truncate text-left">
                    {{ item.label }}
                    <span v-if="item.subtitle" class="block text-[11px] mt-0.5 font-normal" :style="{ color: isActive ? 'rgba(255,255,255,0.75)' : '#9ca3af' }">
                        {{ item.subtitle }}
                    </span>
                </span>
            </Transition>

            <!-- Badge -->
            <Transition name="slide-label">
                <span
                    v-if="showLabels && item.badge"
                    class="nav-badge"
                    :style="{ backgroundColor: item.badgeColor ?? accentColor }"
                >
                    {{ item.badge }}
                </span>
            </Transition>
        </component>
    </template>

    <!-- ── DROPDOWN item (has children) ── -->
    <template v-else>
        <!-- Dropdown trigger -->
        <button
            ref="dropdownTriggerRef"
            class="nav-item"
            :class="[
                itemDepthClass,
                isOpen || hasActiveChild ? 'nav-item--open' : 'nav-item--default',
                collapsed && depth === 0 ? 'nav-item--icon-only' : '',
            ]"
            :title="collapsed && depth === 0 ? item.label : ''"
            :style="hasActiveChild && depth === 0 && !showLabels ? activeItemStyle : ''"
            @mouseenter="collapsed && depth === 0 ? openFlyout($event) : undefined"
            @mouseleave="collapsed && depth === 0 ? scheduleFlyoutClose() : undefined"
            @click="onDropdownClick"
        >
            <!-- Icon (root only) -->
            <span
                v-if="depth === 0"
                class="nav-icon"
                :class="collapsed && depth === 0 ? 'nav-icon--collapsed' : ''"
                :style="(hasActiveChild && depth === 0 && !showLabels) ? 'color: #fff' : iconColorStyle"
            >
                <component :is="item.icon" :size="iconSize" :stroke-width="1.8" />
            </span>

            <!-- Label -->
            <Transition name="slide-label">
                <span v-if="showLabels" class="flex-1 min-w-0 truncate text-left">{{ item.label }}</span>
            </Transition>

            <!-- Badge -->
            <Transition name="slide-label">
                <span v-if="showLabels && item.badge" class="nav-badge" :style="{ backgroundColor: item.badgeColor ?? accentColor }">
                    {{ item.badge }}
                </span>
            </Transition>

            <!-- Chevron arrow -->
            <Transition name="slide-label">
                <ChevronRight
                    v-if="showLabels"
                    :size="14"
                    stroke-width="2.5"
                    class="shrink-0 transition-transform duration-200"
                    :class="isOpen ? 'rotate-90' : ''"
                    style="color: #9ca3af;"
                />
            </Transition>
        </button>

        <!-- Children (accordion) -->
        <Transition name="accordion">
            <div v-if="isOpen && showLabels" class="overflow-hidden">
                <div class="py-0.5 space-y-0.5">
                    <NavItem
                        v-for="child in item.children"
                        :key="child.label"
                        :item="child"
                        :show-labels="showLabels"
                        :collapsed="collapsed"
                        :open-keys="openKeys"
                        :depth="depth + 1"
                        :accent-color="accentColor"
                        :text-primary="textPrimary"
                        :text-muted="textMuted"
                        :current-path="currentPath"
                        @toggle="$emit('toggle', $event)"
                        @expand-sidebar="$emit('expand-sidebar')"
                    />
                </div>
            </div>
        </Transition>

        <!-- Flyout popout (collapsed mode only) -->
        <Teleport to="body">
            <Transition name="flyout">
                <div
                    v-if="flyoutOpen && collapsed && depth === 0"
                    class="nav-flyout"
                    :class="{ 'nav-flyout--dark': isDark }"
                    :style="flyoutStyle"
                    @mouseenter="cancelFlyoutClose"
                    @mouseleave="scheduleFlyoutClose"
                >
                    <p class="nav-flyout__title">{{ item.label }}</p>
                    <template v-for="child in item.children" :key="child.label">
                        <!-- Direct link -->
                        <a
                            v-if="child.href"
                            :href="child.href"
                            class="nav-flyout__item"
                            :class="{ 'nav-flyout__item--active': isChildActive(child.href) }"
                        >
                            <component v-if="child.icon" :is="child.icon" :size="14" stroke-width="1.8" />
                            <span>{{ child.label }}</span>
                        </a>
                        <!-- Nested group (accordion) -->
                        <div v-else>
                            <button
                                class="nav-flyout__item nav-flyout__group-toggle"
                                @click.stop="toggleFlyoutGroup(child.label)"
                            >
                                <component v-if="child.icon" :is="child.icon" :size="14" stroke-width="1.8" />
                                <span class="flex-1 text-left">{{ child.label }}</span>
                                <ChevronRight
                                    :size="12"
                                    stroke-width="2.5"
                                    class="nav-flyout__chevron"
                                    :class="{ 'nav-flyout__chevron--open': flyoutOpenGroups.includes(child.label) }"
                                />
                            </button>
                            <Transition name="flyout-accordion">
                                <div v-if="flyoutOpenGroups.includes(child.label)" class="overflow-hidden">
                                    <a
                                        v-for="gc in child.children"
                                        :key="gc.label"
                                        :href="gc.href ?? '#'"
                                        class="nav-flyout__item nav-flyout__item--nested"
                                        :class="{ 'nav-flyout__item--active': isChildActive(gc.href) }"
                                    >
                                        <span>{{ gc.label }}</span>
                                    </a>
                                </div>
                            </Transition>
                        </div>
                    </template>
                </div>
            </Transition>
        </Teleport>
    </template>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue';
import { ChevronRight } from '@lucide/vue';
import { useTheme } from '@/Composables/useTheme';

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

const props = defineProps({
    item:        { type: Object as () => NavItem, required: true },
    showLabels:  { type: Boolean, default: true },
    collapsed:   { type: Boolean, default: false },
    openKeys:    { type: Object as () => Set<string>, required: true },
    depth:       { type: Number,  default: 0 },
    accentColor: { type: String,  default: '#6366f1' },
    textPrimary: { type: String,  default: '#1e1b4b' },
    textMuted:   { type: String,  default: '#6b7280' },
    currentPath: { type: String,  default: '' },
});

const emit = defineEmits(['toggle', 'expand-sidebar']);

const { isDark } = useTheme();

// ── Flyout (collapsed dropdown popout) ──
const flyoutOpen         = ref(false);
const flyoutPos          = ref({ top: 0, left: 0 });
const dropdownTriggerRef = ref<HTMLElement | null>(null);
const flyoutOpenGroups   = ref<string[]>([]); // accordion state inside flyout
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const flyoutStyle = computed(() => ({
    top:  flyoutPos.value.top  + 'px',
    left: flyoutPos.value.left + 8 + 'px',
}));

function initFlyoutGroups() {
    // Auto-open groups that contain the active page
    flyoutOpenGroups.value = (props.item.children ?? [])
        .filter(c => c.children?.some(gc => isChildActive(gc.href)))
        .map(c => c.label);
}

function toggleFlyoutGroup(label: string) {
    const i = flyoutOpenGroups.value.indexOf(label);
    i >= 0 ? flyoutOpenGroups.value.splice(i, 1) : flyoutOpenGroups.value.push(label);
}

function openFlyout(e?: MouseEvent) {
    cancelFlyoutClose();
    const el = e ? (e.currentTarget as HTMLElement) : dropdownTriggerRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    flyoutPos.value = { top: rect.top, left: rect.right };
    initFlyoutGroups();
    flyoutOpen.value = true;
}

function scheduleFlyoutClose() {
    closeTimer = setTimeout(() => { flyoutOpen.value = false; }, 150);
}

function cancelFlyoutClose() {
    if (closeTimer !== null) { clearTimeout(closeTimer); closeTimer = null; }
}

function isChildActive(href?: string): boolean {
    if (!href) return false;
    return props.currentPath === href || (href !== '/' && props.currentPath.startsWith(href));
}

onUnmounted(() => { if (closeTimer !== null) clearTimeout(closeTimer); });

// Unique key for this dropdown item
const itemKey = computed<string>(() => `${props.depth}-${props.item.label}`);

// Active state computed from URL (overrides static prop)
const isActive = computed<boolean>(() => {
    if (!props.currentPath || !props.item.href) return !!props.item.active;
    const path = props.item.href;
    return props.currentPath === path || (path !== '/' && props.currentPath.startsWith(path));
});

const hasChildren = computed<boolean>(() => Array.isArray(props.item.children) && props.item.children!.length > 0);

const isOpen = computed<boolean>(() => props.openKeys.has(itemKey.value));

const hasActiveChild = computed<boolean>(() => {
    if (!hasChildren.value) return false;
    return checkActiveChild(props.item.children!);
});

function checkActiveChild(children: NavItem[]): boolean {
    for (const child of children) {
        if (child.active) return true;
        if (child.children && checkActiveChild(child.children)) return true;
    }
    return false;
}

function onDropdownClick(): void {
    if (props.collapsed && props.depth === 0 && hasChildren.value) {
        flyoutOpen.value ? (flyoutOpen.value = false) : openFlyout();
        return;
    }
    emit('toggle', itemKey.value);
}

// Sizing by depth
const iconSize = computed<number>(() => props.depth === 0 ? 18 : 16);

const itemDepthClass = computed<string>(() => {
    if (props.depth === 0) return 'nav-item--root';
    if (props.depth === 1) return 'nav-item--child';
    return 'nav-item--grandchild';
});

const activeItemStyle = computed(() => ({
    background: `linear-gradient(180deg, ${lighten(props.accentColor)} 0%, ${props.accentColor} 100%)`,
    color: '#ffffff',
    boxShadow: `0 2px 8px ${props.accentColor}55`,
}));

const iconColorStyle = computed(() => ({
    color: isActive.value || (hasActiveChild.value && !props.showLabels)
        ? props.accentColor
        : '#94a3b8',
}));

function lighten(hex: string): string {
    // Simple color shift for gradient end
    const map: Record<string, string> = {
        '#6366f1': '#8b5cf6',
        '#10b981': '#34d399',
        '#f59e0b': '#fbbf24',
        '#ef4444': '#f87171',
        '#3b82f6': '#60a5fa',
        '#ec4899': '#f472b6',
    };
    return map[hex] ?? hex + 'cc';
}
</script>

