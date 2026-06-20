import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const configRoot = mkdtempSync(join(tmpdir(), 'blogger-cli-config-'))
process.env.BLOGGER_CONFIG_PATH = join(configRoot, 'config.json')

const { clearCredential, configPath, loadConfig, resolveConfig, saveConfig } = await import('./config.js')

test.after(() => {
  delete process.env.BLOGGER_API_URL
  delete process.env.BLOGGER_ACCESS_KEY
  delete process.env.BLOGGER_CONFIG_PATH
  rmSync(configRoot, { force: true, recursive: true })
})

test('uses BLOGGER_CONFIG_PATH for persisted CLI config', () => {
  assert.equal(configPath, join(configRoot, 'config.json'))
})

test('defaults to the hosted Blogger API before local config is saved', () => {
  assert.deepEqual(loadConfig(), {
    apiUrl: 'https://blogger-api-5qjldqffdq-uc.a.run.app',
  })
})

test('saves and resolves persisted API URL and credential', () => {
  saveConfig({
    apiUrl: 'https://blogger.example.com',
    accessKey: 'blog_sk_saved',
  })

  assert.deepEqual(loadConfig(), {
    apiUrl: 'https://blogger.example.com',
    accessKey: 'blog_sk_saved',
  })
  assert.deepEqual(resolveConfig({}), {
    apiUrl: 'https://blogger.example.com',
    accessKey: 'blog_sk_saved',
  })
})

test('keeps command line and environment overrides ahead of file config', () => {
  process.env.BLOGGER_API_URL = 'https://env.example.com'
  process.env.BLOGGER_ACCESS_KEY = 'blog_sk_env'

  assert.deepEqual(resolveConfig({ apiUrl: 'https://cli.example.com', accessKey: 'blog_sk_cli' }), {
    apiUrl: 'https://cli.example.com',
    accessKey: 'blog_sk_cli',
  })
  assert.deepEqual(resolveConfig({}), {
    apiUrl: 'https://env.example.com',
    accessKey: 'blog_sk_env',
  })

  delete process.env.BLOGGER_API_URL
  delete process.env.BLOGGER_ACCESS_KEY
})

test('clears saved credential while keeping API URL for logout', () => {
  saveConfig({
    apiUrl: 'https://blogger.example.com',
    accessKey: 'blog_sk_saved',
  })

  assert.deepEqual(clearCredential(), {
    apiUrl: 'https://blogger.example.com',
  })
  assert.deepEqual(loadConfig(), {
    apiUrl: 'https://blogger.example.com',
  })
})
