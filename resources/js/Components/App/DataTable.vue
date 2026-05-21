<template>
    <div class="dt">
        <!-- Toolbar -->
        <div class="dt__toolbar">
            <div class="dt__search-wrap">
                <SearchIcon :size="13" class="dt__search-icon" />
                <input v-model="search" class="dt__search" type="text" :placeholder="searchPlaceholder" />
                <button v-if="search" class="dt__search-clear" @click="search = ''">
                    <XIcon :size="12" />
                </button>
            </div>
            <slot name="toolbar" />
        </div>

        <!-- Bulk action bar -->
        <Transition name="dt-bulk">
            <div v-if="selected.size > 0" class="dt__bulk">
                <span class="dt__bulk-count">{{ selected.size }} selected</span>
                <slot name="bulk-actions" :selected="[...selected]" />
                <button class="dt__bulk-clear" @click="selected.clear()">
                    <XIcon :size="13" />
                    Clear
                </button>
            </div>
        </Transition>

        <!-- Table -->
        <div class="dt__wrap">
            <table class="dt__table">
                <thead>
                    <tr>
                        <th v-if="selectable" class="dt__th dt__th--check">
                            <input
                                type="checkbox"
                                class="dt__check"
                                :checked="allSelected"
                                :indeterminate="someSelected"
                                @change="toggleAll"
                            />
                        </th>
                        <th
                            v-for="col in columns"
                            :key="col.key"
                            class="dt__th"
                            :class="{ 'dt__th--sortable': col.sortable }"
                            :style="col.width ? { width: col.width } : {}"
                            @click="col.sortable && onSort(col.key)"
                        >
                            <div class="dt__th-inner">
                                {{ col.label }}
                                <span v-if="col.sortable" class="dt__sort-icon">
                                    <ChevronUpIcon v-if="sortKey === col.key && sortDir === 'asc'"  :size="12" />
                                    <ChevronDownIcon v-else-if="sortKey === col.key && sortDir === 'desc'" :size="12" />
                                    <ChevronsUpDownIcon v-else :size="12" class="dt__sort-idle" />
                                </span>
                            </div>
                        </th>
                        <th v-if="hasRowActions" class="dt__th dt__th--actions" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="paged.length === 0">
                        <td :colspan="colSpan" class="dt__empty">
                            <slot name="empty">
                                <span style="color: var(--color-text-subtle); font-size: 13px;">No results found.</span>
                            </slot>
                        </td>
                    </tr>
                    <tr
                        v-for="row in paged"
                        :key="rowKey(row)"
                        class="dt__row"
                        :class="{ 'dt__row--selected': selected.has(rowKey(row)) }"
                    >
                        <td v-if="selectable" class="dt__td dt__td--check">
                            <input
                                type="checkbox"
                                class="dt__check"
                                :checked="selected.has(rowKey(row))"
                                @change="toggleRow(rowKey(row))"
                            />
                        </td>
                        <td
                            v-for="col in columns"
                            :key="col.key"
                            class="dt__td"
                            :class="col.class"
                        >
                            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                                {{ row[col.key] }}
                            </slot>
                        </td>
                        <td v-if="hasRowActions" class="dt__td dt__td--actions">
                            <slot name="row-actions" :row="row" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div v-if="filtered.length > 0" class="dt__footer">
            <AppPagination
                v-model="page"
                :total="filtered.length"
                :per-page="perPage"
                @update:per-page="onPerPage"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue';
import { SearchIcon, XIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from '@lucide/vue';
import AppPagination from '@/Components/App/AppPagination.vue';
import type { AppColumn } from '@/types';

type Row = Record<string, unknown>;

interface Props {
    columns?:           AppColumn<Row>[]
    rows?:              Row[]
    rowId?:             string
    selectable?:        boolean
    searchPlaceholder?: string
    searchKeys?:        string[]
    defaultPerPage?:    number
}

const props = withDefaults(defineProps<Props>(), {
    columns:           () => [],
    rows:              () => [],
    rowId:             'id',
    selectable:        false,
    searchPlaceholder: 'Search…',
    searchKeys:        () => [],
    defaultPerPage:    10,
});

const slots = useSlots();

const search  = ref('');
const sortKey = ref('');
const sortDir = ref<'asc' | 'desc'>('asc');
const page    = ref(1);
const perPage = ref(props.defaultPerPage);
const selected = ref(new Set<string | number>());

const hasRowActions = computed(() => !!slots['row-actions']);
const colSpan = computed(() =>
    props.columns.length + (props.selectable ? 1 : 0) + (hasRowActions.value ? 1 : 0)
);

function rowKey(row: Row): string | number {
    return row[props.rowId] as string | number;
}

const filtered = computed(() => {
    let data = [...props.rows];
    if (search.value.trim()) {
        const q = search.value.toLowerCase();
        const keys = props.searchKeys.length ? props.searchKeys : props.columns.map(c => c.key);
        data = data.filter(row => keys.some(k => String(row[k] ?? '').toLowerCase().includes(q)));
    }
    if (sortKey.value) {
        data.sort((a, b) => {
            const av = a[sortKey.value] ?? '';
            const bv = b[sortKey.value] ?? '';
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sortDir.value === 'asc' ? cmp : -cmp;
        });
    }
    return data;
});

const paged = computed(() => {
    const start = (page.value - 1) * perPage.value;
    return filtered.value.slice(start, start + perPage.value);
});

const allSelected  = computed(() => paged.value.length > 0 && paged.value.every(r => selected.value.has(rowKey(r))));
const someSelected = computed(() => paged.value.some(r => selected.value.has(rowKey(r))) && !allSelected.value);

function onSort(key: string) {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortDir.value = 'asc';
    }
    page.value = 1;
}

function toggleAll() {
    if (allSelected.value) {
        paged.value.forEach(r => selected.value.delete(rowKey(r)));
    } else {
        paged.value.forEach(r => selected.value.add(rowKey(r)));
    }
}

function toggleRow(id: string | number) {
    if (selected.value.has(id)) selected.value.delete(id);
    else selected.value.add(id);
}

function onPerPage(n: number) {
    perPage.value = n;
    page.value = 1;
}
</script>

