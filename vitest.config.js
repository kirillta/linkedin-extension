import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup/chrome-mock.js'],
        coverage: {
            provider: 'v8',
            include: [
                'storage-utils.js',
                'invitation-tracker.js',
                'member-hider.js',
                'role-highlighter.js',
                'company-tracker.js',
                'background.js',
            ],
            thresholds: { lines: 70 },
        },
    },
});
