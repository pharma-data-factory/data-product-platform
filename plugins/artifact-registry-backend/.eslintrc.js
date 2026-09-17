const factory = require('@backstage/cli/config/eslint-factory')(__dirname);

module.exports = {
  ...factory,
  overrides: [
    ...(factory.overrides ?? []),
    {
      files: ['src/**/*.test.ts'],
      rules: {
        // `expectRefusedByDatabase` asserts on the caller's behalf; without
        // this, every test that delegates to it reads as assertion-free. See
        // NXD-016 for why the assertion had to move into a helper.
        'jest/expect-expect': [
          'warn',
          { assertFunctionNames: ['expect', 'expectRefusedByDatabase'] },
        ],
      },
    },
  ],
};
