import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'url'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import unusedImportsPlugin from 'eslint-plugin-unused-imports'

// Use FlatCompat to extend legacy shareable configs like next/core-web-vitals
const compat = new FlatCompat({ baseDirectory: fileURLToPath(new URL('.', import.meta.url)) })

export default [
  // Avoid linting generated files
  { ignores: ['.next/**', 'node_modules/**', 'dist/**'] },

  // Keep Next.js recommended config
  ...compat.extends('next/core-web-vitals'),

  // register typescript-eslint plugin and unused-imports plugin
  { plugins: { '@typescript-eslint': tsPlugin, 'unused-imports': unusedImportsPlugin } },

  // Allow console in scripts and server routes (these are dev/CLI or server-side)
  {
    files: ['scripts/**', 'app/api/**'],
    rules: {
      'no-console': 'off'
    }
  },

  // Project specific rules (none for now, but place to add overrides)
  {
    rules: {
      // Relax a few strict TypeScript rules to keep lint actionable in this codebase
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': ['warn', { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'import/no-anonymous-default-export': 'off',
      'no-console': 'warn'
    },
  },
]
