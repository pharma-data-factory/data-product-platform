const factory = require('@backstage/cli/config/eslint-factory')(__dirname);

module.exports = {
  ...factory,
  overrides: [
    ...(factory.overrides ?? []),
    {
      files: ['src/**/*.test.ts'],
      rules: {
        // `expectRefusedByDatabase` asserts on the caller's behalf (NXD-016).
        'jest/expect-expect': [
          'warn',
          { assertFunctionNames: ['expect', 'expectRefusedByDatabase'] },
        ],
      },
    },
  ],
};
