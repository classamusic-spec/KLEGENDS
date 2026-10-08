/* eslint-env jest */
// Global Jest setup. Logic tests (domain, engine, services) run in plain
// Node-like conditions; native modules are replaced with their official mocks.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
