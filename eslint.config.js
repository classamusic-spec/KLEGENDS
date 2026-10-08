// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// The domain and engine layers hold game rules. They must stay framework-free
// so they can move to the backend (server-authoritative rewards) unchanged.
const FRAMEWORK_IMPORTS = [
  { name: 'react', message: 'Domain/engine code must stay framework-free.' },
  { name: 'react-native', message: 'Domain/engine code must stay framework-free.' },
];
const FRAMEWORK_PATTERNS = [
  { group: ['expo', 'expo-*', '@expo/*', '@shopify/*', 'react-native-*'], message: 'Domain/engine code must stay framework-free.' },
  { group: ['@/ui/*', '@/graphics/*', '@/features/*', '@/state/*', '@/feedback/*', '@/app/*'], message: 'Domain/engine code cannot depend on presentation layers.' },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'public/*', 'e2e-results/*', 'playwright-report/*', '.expo/*'],
  },
  {
    files: ['src/domain/**/*.ts', 'src/engine/**/*.ts', 'src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: FRAMEWORK_IMPORTS, patterns: FRAMEWORK_PATTERNS }],
    },
  },
]);
