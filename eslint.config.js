import antfu from '@antfu/eslint-config'

/**
 * ESLint flat config mirroring VueUse's `eslint.config.js`
 * (https://github.com/vueuse/vueuse/blob/main/eslint.config.js) via
 * `@antfu/eslint-config`. Differences:
 * - the repo migrated from npm to pnpm workspaces (`pnpm-workspace.yaml`):
 *   the pnpm plugin is auto-enabled, and its recommended workspace settings
 *   are overridden below to match the actual lockfile policy.
 * - `patches/` ignore → `source/` (upstream submodule) and `playgrounds/`.
 * - self-import guard is scoped to package `src` files (a source file must
 *   not import its own package by name — use relative imports), while
 *   co-located demos/tests/docs import the public package name on purpose.
 * - `@reause/shared` is the reference-chain single source (VueUse-style:
 *   shared utilities live in shared, other packages import from it — see
 *   MONITORING-HANDOFF §2C), so it is exempt from the self-import guard;
 *   every other `@reause/*` alias stays restricted.
 */
export default antfu(
  {
    formatters: true,
    ignores: [
      'MONITORING-HANDOFF.md',
      'PR-MERGE-WORKFLOW.md',
      'source/**',
      'playgrounds/**',
      // generated agent skill output (repo root + the package's staging copy).
      // `packages/skills` itself stays linted, unlike VueUse's broader
      // `**/skills/**` (their build script is unlinted upstream).
      'skills/**',
      'packages/skills/skills/**',
      '**/types',
      '**/cache',
      '**/dist',
      'coverage/**',
      'docs/**',
      '.issues/**',
      '**/*.svg',
    ],
  },
  {
    rules: {
      'spaced-comment': ['error', 'always', { exceptions: ['#__PURE__', '///'] }],
    },
  },
  {
    files: ['packages/*/src/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['@reause/*', '!@reause/shared'],
      }],
    },
  },
  {
    files: ['pnpm-workspace.yaml'],
    rules: {
      // The pnpm plugin's recommended `trustPolicy: 'no-downgrade'` rejects
      // lockfile entries that predate the policy (vite@5.4.21, semver@6.3.1,
      // @trickfilm400/rollup-plugin-off-main-thread@3.0.0-pre1) with
      // ERR_PNPM_TRUST_DOWNGRADE. Enforce the settings the workspace file
      // actually carries instead.
      'pnpm/yaml-enforce-settings': ['error', {
        settings: {
          shellEmulator: true,
          minimumReleaseAgeExcludePrune: true,
          trustPolicy: 'strict',
        },
      }],
    },
  },
)
