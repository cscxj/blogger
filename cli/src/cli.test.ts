import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

type CliResult = {
  code: number | null
  stdout: string
  stderr: string
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function json(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(payload))
}

function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    child.on('close', (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
  })
}

test('login persists API URL and AccessKey for later commands', async () => {
  const configRoot = mkdtempSync(join(tmpdir(), 'blogger-cli-e2e-'))
  const configPath = join(configRoot, 'config.json')
  const requests: Array<{ method?: string; url?: string; authorization?: string; body?: string }> = []
  const server = createServer(async (request, response) => {
    const body = await readBody(request)
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body,
    })

    if (request.method === 'POST' && request.url === '/api/auth/login') {
      json(response, 200, {
        access_token: 'jwt_test',
        user: { id: 'user-1', email: 'writer@example.com' },
      })
      return
    }

    if (request.method === 'POST' && request.url === '/api/access-keys') {
      assert.equal(request.headers.authorization, 'Bearer jwt_test')
      json(response, 200, { access_key: 'blog_sk_created' })
      return
    }

    if (request.method === 'GET' && request.url === '/api/users/me') {
      assert.equal(request.headers.authorization, 'Bearer blog_sk_created')
      json(response, 200, { id: 'user-1', email: 'writer@example.com' })
      return
    }

    json(response, 404, { detail: 'not found' })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert(address && typeof address === 'object')
  const apiUrl = `http://127.0.0.1:${address.port}`

  try {
    const env = {
      BLOGGER_CONFIG_PATH: configPath,
      BLOGGER_API_URL: '',
      BLOGGER_ACCESS_KEY: '',
    }
    const login = await runCli(['--api-url', apiUrl, 'login', '--email', 'writer@example.com', '--password', 'secret'], env)
    assert.equal(login.code, 0, login.stderr)

    assert.deepEqual(JSON.parse(readFileSync(configPath, 'utf8')), {
      apiUrl,
      accessKey: 'blog_sk_created',
    })

    const whoami = await runCli(['whoami'], env)
    assert.equal(whoami.code, 0, whoami.stderr)
    assert.deepEqual(JSON.parse(whoami.stdout), {
      id: 'user-1',
      email: 'writer@example.com',
    })

    assert.deepEqual(
      requests.map((request) => [request.method, request.url, request.authorization]),
      [
        ['POST', '/api/auth/login', undefined],
        ['POST', '/api/access-keys', 'Bearer jwt_test'],
        ['GET', '/api/users/me', 'Bearer blog_sk_created'],
      ],
    )
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    rmSync(configRoot, { force: true, recursive: true })
  }
})
