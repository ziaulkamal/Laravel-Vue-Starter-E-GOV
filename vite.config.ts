import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
    // Baca .env (prefix '' = semua var, termasuk VITE_PORT / VITE_HOST).
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.ts'],
                refresh: true,
            }),
            tailwindcss(),
            vue({
                template: {
                    transformAssetUrls: {
                        base: null,
                        includeAbsolute: false,
                    },
                },
            }),
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
            },
        },
        server: {
            // Port & host dev server dari .env (fallback ke default Vite).
            host: env.VITE_HOST || 'localhost',
            port: env.VITE_PORT ? Number(env.VITE_PORT) : 5173,
            // strictPort: pakai port yang ditentukan, jangan auto-naik bila bentrok.
            strictPort: true,
            watch: {
                ignored: ['**/storage/framework/views/**'],
            },
        },
    };
});
