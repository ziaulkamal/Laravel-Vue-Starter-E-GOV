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

<style scoped>
/* ── Base nav item ── */
.nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    text-decoration: none;
    border-radius: 10px;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: background-color 130ms ease, box-shadow 130ms ease, color 130ms ease;
    white-space: nowrap;
}

/* Root depth (0) */
.nav-item--root {
    padding: 8px 10px;
    color: #475569;
}
/* Child depth (1) */
.nav-item--child {
    padding: 6px 10px 6px 36px;
    font-size: 0.8rem;
    color: #64748b;
    border-radius: 8px;
}
/* Grandchild depth (2) */
.nav-item--grandchild {
    padding: 5px 10px 5px 52px;
    font-size: 0.775rem;
    color: #64748b;
    border-radius: 7px;
}

/* States */
.nav-item--default:hover,
.nav-item--open:hover {
    background-color: rgba(99,102,241,0.09);
    color: var(--color-text-primary);
}

.nav-item--open {
    color: var(--color-text-primary);
    background-color: rgba(99,102,241,0.07);
}

/* Icon-only (collapsed root) */
.nav-item--icon-only {
    width: 38px;
    height: 40px;
    padding: 0;
    border-radius: 12px;
    justify-content: center;
    gap: 0;
    margin: 0 auto;
}

/* Icons */
.nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    transition: color 130ms ease;
}

.nav-icon--collapsed {
    width: 22px;
    height: 22px;
}

/* Badge */
.nav-badge {
    flex-shrink: 0;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    line-height: 1.4;
    letter-spacing: 0.02em;
}

/* ── Accordion transition ── */
.accordion-enter-active,
.accordion-leave-active {
    transition: max-height 280ms cubic-bezier(.4,0,.2,1), opacity 220ms ease;
    max-height: 500px;
    overflow: hidden;
}
.accordion-enter-from,
.accordion-leave-to {
    max-height: 0;
    opacity: 0;
}

/* ── Label slide transition ── */
.slide-label-enter-active,
.slide-label-leave-active {
    transition: opacity 140ms ease, max-width 250ms cubic-bezier(.4,0,.2,1);
    overflow: hidden;
    max-width: 200px;
}
.slide-label-enter-from,
.slide-label-leave-to { opacity: 0; max-width: 0; }

/* ── Flyout popout panel ── */
.nav-flyout {
    position: fixed;
    z-index: 200;
    min-width: 190px;
    padding: 6px;
    background: #ffffff;
    border: 1.5px solid rgba(99,102,241,0.15);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
}
.nav-flyout--dark {
    background: #1e293b;
    border-color: rgba(99,102,241,0.25);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
}

.nav-flyout__title {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    padding: 4px 10px 6px;
}

.nav-flyout__group-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    padding: 6px 10px 2px;
}

.nav-flyout__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    text-decoration: none;
    background: transparent;
    transition: background 120ms ease, color 120ms ease;
}
.nav-flyout--dark .nav-flyout__item { color: #cbd5e1; }

.nav-flyout__item:hover {
    background: rgba(99,102,241,0.09);
    color: #6366f1;
}
.nav-flyout--dark .nav-flyout__item:hover {
    background: rgba(99,102,241,0.18);
    color: #a5b4fc;
}

.nav-flyout__item--active {
    background: rgba(99,102,241,0.1);
    color: #6366f1;
    font-weight: 600;
}
.nav-flyout--dark .nav-flyout__item--active {
    background: rgba(99,102,241,0.22);
    color: #a5b4fc;
}

.nav-flyout__item--nested { padding-left: 22px; font-size: 12.5px; }

.nav-flyout__group-toggle {
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
}

.nav-flyout__chevron {
    color: #94a3b8;
    flex-shrink: 0;
    transition: transform 200ms ease;
}
.nav-flyout__chevron--open { transform: rotate(90deg); }

/* Accordion inside flyout */
.flyout-accordion-enter-active,
.flyout-accordion-leave-active {
    transition: max-height 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease;
    max-height: 300px;
    overflow: hidden;
}
.flyout-accordion-enter-from,
.flyout-accordion-leave-to { max-height: 0; opacity: 0; }

/* Flyout animation */
.flyout-enter-active { transition: opacity 130ms ease, transform 130ms ease; }
.flyout-leave-active { transition: opacity 90ms ease, transform 90ms ease; }
.flyout-enter-from, .flyout-leave-to { opacity: 0; transform: translateX(-6px) scale(0.97); }
</style>
