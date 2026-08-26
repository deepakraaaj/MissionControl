import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
  plugins: [react()],
  // The existing .env.local uses server-style names. Expose only the selected
  // Mistral credentials to the current client-side assistant integration.
  define: {
    'import.meta.env.VITE_MISTRAL_API_KEY': JSON.stringify(env.MISTRAL_API_KEY ?? ''),
    'import.meta.env.VITE_MISTRAL_MODEL': JSON.stringify(env.MISTRAL_MODEL ?? 'mistral-small-latest'),
    'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY ?? ''),
    'import.meta.env.VITE_GROQ_MODEL': JSON.stringify(env.GROQ_MODEL ?? 'openai/gpt-oss-120b'),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
    'import.meta.env.VITE_GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'),
  },
  clearScreen: false,
  server: {
    host: host || '0.0.0.0',
    port: 1420,
    strictPort: true,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: [
        '**/.cargo/**',
        '**/.rustup/**',
        '**/src-tauri/target/**',
        '**/src-tauri/gen/**',
        '**/dist/**',
      ],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    // Route views are code-split via React.lazy; this splits the vendors they
    // pull so a heavy library is never bundled with unrelated app code.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        hud: fileURLToPath(new URL('./hud.html', import.meta.url)),
        quickAdd: fileURLToPath(new URL('./quick-add.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@xyflow')) return 'vendor-flow';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-editor';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'vendor-motion';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
  };
});
