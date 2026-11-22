module.exports = {
  root: true,
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'mobile/.expo/',
    'mobile/node_modules/',
  ],
  env: { es2021: true, node: true, browser: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2021, sourceType: 'module', project: false },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  overrides: [
    // Fixed synchronous dependencies of the packaged Electron entrypoints.
    {
      files: ['desktop/main.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^electron$', '^path$', '^fs$', '^url$', '^\\./db$'] }],
      },
    },
    {
      files: ['desktop/db.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^path$', '^os$', '^better-sqlite3$'] }],
      },
    },
    {
      files: ['desktop/preload.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^electron$'] }],
      },
    },
    // Expo/Metro expects this synchronous CommonJS config at its existing path.
    {
      files: ['metro.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^path$', '^fs$'] }],
      },
    },
    // This CommonJS helper is copied into dist and used by both active routers.
    {
      files: ['server/modules/encryption.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^bcryptjs$'] }],
      },
    },
    // The copied legacy pool synchronously exports one Shared Pool instance.
    {
      files: ['server/modules/pool.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^pg$'] }],
      },
    },
    // Source-only legacy routers retain synchronous CommonJS router exports.
    {
      files: ['server/routes/template.router.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^express$', '^\\.\\./modules/pool$'] }],
      },
    },
    {
      files: ['server/routes/visits.router.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^express$', '^\\.\\./modules/authentication-middleware$', '^\\.\\./modules/pool$'] }],
      },
    },
    // Source-only legacy user router and strategy retain synchronous registration.
    {
      files: ['server/routes/user.router.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^express$', '^\\.\\./modules/authentication-middleware$', '^\\.\\./modules/encryption$', '^\\.\\./modules/pool$', '^\\.\\./strategies/user\\.strategy$'] }],
      },
    },
    {
      files: ['server/strategies/user.strategy.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^passport$', '^passport-local$', '^\\.\\./modules/encryption$', '^\\.\\./modules/pool$'] }],
      },
    },
    // Retain the resolved legacy session imports; the missing built warnings import stays flagged.
    {
      files: ['server/modules/session-middleware.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^express-session$', '^connect-pg-simple$', '^\\./pool\\.js$'] }],
      },
    },
    // The admin seed handler deliberately keeps these two builtins synchronous and lazy.
    {
      files: ['server/routes/admin.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': ['error', { allow: ['^fs$', '^path$'] }],
      },
    },
    {
      files: ['server/**/*.ts'],
      env: { node: true },
    },
    {
      files: ['mobile/**/*.tsx', 'mobile/**/*.ts'],
      env: { browser: true, node: false },
    },
  ],
};
