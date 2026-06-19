import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { z } from 'zod'

const ConfigSchema = z.object({
  apiUrl: z.string().url().default('http://localhost:8000'),
  accessKey: z.string().optional(),
})

export type CliConfig = z.infer<typeof ConfigSchema>

export const configPath = join(homedir(), '.blogger', 'config.json')

export function loadConfig(): CliConfig {
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'))
    return ConfigSchema.parse(raw)
  } catch {
    return ConfigSchema.parse({})
  }
}

export function saveConfig(config: CliConfig): CliConfig {
  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, `${JSON.stringify(ConfigSchema.parse(config), null, 2)}\n`, 'utf8')
  return config
}

export function resolveConfig(overrides: { apiUrl?: string; accessKey?: string }): CliConfig {
  const fileConfig = loadConfig()
  return ConfigSchema.parse({
    apiUrl: overrides.apiUrl || process.env.BLOGGER_API_URL || fileConfig.apiUrl,
    accessKey: overrides.accessKey || process.env.BLOGGER_ACCESS_KEY || fileConfig.accessKey,
  })
}
