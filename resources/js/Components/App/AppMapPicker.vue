<template>
    <div class="map-picker">
        <div ref="mapEl" class="map-picker__canvas" :style="{ height }" />
        <div class="map-picker__hint">
            <MapPin :size="13" />
            <span>Seret pin atau klik pada peta untuk menentukan titik lokasi venue.</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { MapPin } from '@lucide/vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix ikon marker default (path rusak saat di-bundle Vite)
L.Marker.prototype.options.icon = L.icon({
    iconUrl:       markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl:     markerShadow,
    iconSize:      [25, 41],
    iconAnchor:    [12, 41],
    popupAnchor:   [1, -34],
    shadowSize:    [41, 41],
});

interface Coords { lat: number | null; lng: number | null }

const props = withDefaults(defineProps<{
    modelValue?: Coords
    height?:     string
    center?:     [number, number]   // fallback bila modelValue kosong
    zoom?:       number
}>(), {
    height: '320px',
    center: () => [4.6276, 95.5828],   // Calang, Aceh Jaya (tuan rumah PORA XV)
    zoom:   12,
});

const emit = defineEmits<{ 'update:modelValue': [value: Coords] }>();

const mapEl = ref<HTMLElement | null>(null);
let map:    L.Map | null = null;
let marker: L.Marker | null = null;

function hasCoords(c?: Coords): c is { lat: number; lng: number } {
    return !!c && typeof c.lat === 'number' && typeof c.lng === 'number'
        && !Number.isNaN(c.lat) && !Number.isNaN(c.lng);
}

function placeMarker(lat: number, lng: number, pan = false) {
    if (!map) return;
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
            const ll = marker!.getLatLng();
            emit('update:modelValue', { lat: round(ll.lat), lng: round(ll.lng) });
        });
    }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 15));
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

onMounted(() => {
    if (!mapEl.value) return;
    const start = hasCoords(props.modelValue)
        ? [props.modelValue.lat, props.modelValue.lng] as [number, number]
        : props.center;

    map = L.map(mapEl.value).setView(start, hasCoords(props.modelValue) ? 15 : props.zoom);
    // Ganti bendera 🇺🇦 bawaan Leaflet → 🇮🇩 pada credit
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a> 🇮🇩');

    // Base layer: Peta (OSM) & Satelit (Esri World Imagery)
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
    });
    const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        // maxNativeZoom: Esri tak punya citra >18 di banyak area → upscale tile, bukan tampilkan placeholder
        { attribution: 'Tiles &copy; Esri', maxZoom: 19, maxNativeZoom: 18 },
    );
    // Overlay mode "hybrid": nama tempat/batas + garis jalan (transportation)
    const places = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, maxNativeZoom: 16, pane: 'overlayPane' },
    );
    const roads = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, maxNativeZoom: 18, pane: 'overlayPane' },
    );
    const hybrid = L.layerGroup([satellite, roads, places]);

    streets.addTo(map);
    L.control.layers(
        { 'Peta': streets, 'Satelit': satellite, 'Hybrid': hybrid },
        {},
        { position: 'topright' },
    ).addTo(map);

    if (hasCoords(props.modelValue)) placeMarker(props.modelValue.lat, props.modelValue.lng);

    map.on('click', (e: L.LeafletMouseEvent) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
        emit('update:modelValue', { lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
    });

    // Leaflet sering perlu invalidateSize bila kontainer awalnya tersembunyi
    setTimeout(() => map?.invalidateSize(), 200);
});

// Geser & zoom peta secara programatik (mis. setelah memilih wilayah)
function flyTo(lat: number, lng: number, zoom = 15) {
    if (!map || Number.isNaN(lat) || Number.isNaN(lng)) return;
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
}
defineExpose({ flyTo });

// Sinkron dari luar (mis. user mengetik lat/lng manual)
watch(() => props.modelValue, (c) => {
    if (!map || !hasCoords(c)) return;
    const cur = marker?.getLatLng();
    if (cur && round(cur.lat) === c.lat && round(cur.lng) === c.lng) return;
    placeMarker(c.lat, c.lng, true);
}, { deep: true });

onBeforeUnmount(() => { map?.remove(); map = null; marker = null; });
</script>

<style scoped>
.map-picker__canvas {
    width: 100%;
    border: 1.5px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
    z-index: 0;
}
.map-picker__hint {
    display: flex; align-items: center; gap: 6px;
    margin-top: 8px;
    font-size: 11.5px; color: var(--color-text-muted);
}
</style>
