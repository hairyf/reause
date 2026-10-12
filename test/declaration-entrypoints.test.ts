import { join } from 'node:path'
import { globSync } from 'tinyglobby'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('includes every co-located hook as a declaration build root', () => {
  const root = join(import.meta.dirname, '..')
  const config = ts.getParsedCommandLineOfConfigFile(
    join(root, 'tsconfig.types.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      },
    },
  )!

  expect(config.errors).toEqual([])
  const entries = globSync('packages/*/*/index.tsx', { cwd: root, absolute: true })
  expect(entries.length).toBeGreaterThan(0)
  const rootNames = new Set(config.fileNames.map(name => name.replace(/\\/g, '/')))
  expect(entries.filter(entry => !rootNames.has(entry.replace(/\\/g, '/')))).toEqual([])
})
