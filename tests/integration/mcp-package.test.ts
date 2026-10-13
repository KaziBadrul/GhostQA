import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { archiveFiles, packageFiles } from '../../src/server/mcp/generator';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import type { Conversion } from '../../src/server/mcp/contracts';
const executeFile = promisify(execFile);

describe('downloaded MCP package', () => {
  it('extracts, discovers tools, reads reviewed notes, and calls Orders using real stdio', async () => {
    const fixture = await startOrderFixture(true);
    const directory = await mkdtemp(join(tmpdir(), 'ghostqa-mcp-'));
    const client = new Client({ name: 'acceptance-test', version: '1.0.0' });
    try {
      const model = await parseOpenApi(
        await readFile('examples/orders.openapi.json', 'utf8'),
      );
      const input: Conversion = {
        source: 'supplied separately',
        name: 'Orders',
        baseUrl: fixture.url,
        operationIds: ['POST /api/orders', 'GET /api/orders/{orderId}'],
        auth: { type: 'none' },
        originalNotes: 'Read an order after creating it.',
        importantNotes: [
          {
            title: 'Order IDs',
            detail: 'Use the returned order ID for subsequent calls.',
          },
        ],
        notesApproved: true,
      };
      const files = await packageFiles(model, input);
      expect(Object.keys(files)).toEqual(
        expect.arrayContaining([
          'server.mjs',
          'runtime.mjs',
          'manifest.json',
          'README.md',
          'client.mjs',
          '.env.example',
          'mcp-config.json',
        ]),
      );
      await writeFile(
        join(directory, 'api-mcp-server.tar.gz'),
        archiveFiles(files),
      );
      await executeFile('tar', [
        '-xzf',
        join(directory, 'api-mcp-server.tar.gz'),
        '-C',
        directory,
      ]);
      expect(await readFile(join(directory, 'README.md'), 'utf8')).toContain(
        'Read an order after creating it.',
      );
      // SDK dependencies are already installed by this repository; artifact imports are otherwise standalone.
      await symlink(resolve('node_modules'), join(directory, 'node_modules'));
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [join(directory, 'server.mjs')],
        }),
      );
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(2);
      const create = tools.find(
        (tool) => tool.description === 'POST /api/orders',
      )!;
      const get = tools.find(
        (tool) => tool.description === 'GET /api/orders/{orderId}',
      )!;
      expect(create.annotations?.destructiveHint).toBe(true);
      const result = await client.callTool({
        name: create.name,
        arguments: {},
      });
      expect(result.isError).not.toBe(true);
      const content = result.content as { text: string }[];
      const order = JSON.parse(content[0]!.text) as { body: { id: string } };
      const read = await client.callTool({
        name: get.name,
        arguments: { path: { orderId: order.body.id } },
      });
      expect(read.isError).not.toBe(true);
      expect(JSON.stringify(read)).toContain('CREATED');
      const invalid = await client.callTool({
        name: get.name,
        arguments: { path: { orderId: 'not-a-uuid' } },
      });
      expect(invalid.isError).toBe(true);
      const resource = await client.readResource({ uri: 'notes://important' });
      expect(JSON.stringify(resource)).toContain('Use the returned order ID');
      const example = await executeFile(process.execPath, [
        join(directory, 'client.mjs'),
        get.name,
        JSON.stringify({ path: { orderId: order.body.id } }),
      ]);
      expect(example.stdout).toContain('CREATED');
      expect(example.stdout).toContain('notes://important');
    } finally {
      await client.close();
      await fixture.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 20000);
});
