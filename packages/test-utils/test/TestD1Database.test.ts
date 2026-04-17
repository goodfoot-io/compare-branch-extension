import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestD1Database } from '../src/TestD1Database.js';

/**
 * Tests for the TestD1Database shim.
 *
 * Uses a minimal inline schema file so the tests are self-contained — no dependency on a
 * real package schema. The fixture schema is written to a temp file via a `beforeEach`.
 *
 * @summary TestD1Database constructor, prepare/bind/run/first/all, batch atomicity, FK
 * enforcement, and boolean→integer conversion
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const FIXTURE_SCHEMA = `
CREATE TABLE items (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  flag  INTEGER NOT NULL DEFAULT 0,
  owner_id TEXT REFERENCES items(id) ON DELETE RESTRICT
);
`;

let tmpDir: string;
let schemaFile: string;

beforeEach(() => {
  tmpDir = resolve(tmpdir(), `test-d1-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
  schemaFile = resolve(tmpDir, 'schema.sql');
  writeFileSync(schemaFile, FIXTURE_SCHEMA, 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('TestD1Database constructor', () => {
  it('requires schemaFiles — object is mandatory', () => {
    // TypeScript enforces this at compile time; this test confirms the runtime instantiation
    // works when the required option is provided.
    const db = new TestD1Database({ schemaFiles: [schemaFile] });
    db.close();
  });

  it('concatenates multiple schema files in order', () => {
    const schema2 = resolve(tmpDir, 'schema2.sql');
    writeFileSync(schema2, 'CREATE TABLE extra (id TEXT PRIMARY KEY);', 'utf-8');

    const db = new TestD1Database({ schemaFiles: [schemaFile, schema2] });
    const raw = db.getRawDb();
    const tables = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{
      name: string;
    }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain('items');
    expect(names).toContain('extra');
    db.close();
  });
});

describe('TestD1Database prepare/bind/run/first/all', () => {
  let db: TestD1Database;

  beforeEach(() => {
    db = new TestD1Database({ schemaFiles: [schemaFile] });
  });

  afterEach(() => {
    db.close();
  });

  it('run() inserts a row and returns success', async () => {
    const result = await db.getDb().prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('1', 'hello').run();
    expect(result.success).toBe(true);
  });

  it('first() retrieves a single row', async () => {
    await db.getDb().prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('2', 'world').run();
    const row = await db
      .getDb()
      .prepare('SELECT * FROM items WHERE id = ?')
      .bind('2')
      .first<{ id: string; label: string }>();
    expect(row).not.toBeNull();
    expect(row?.label).toBe('world');
  });

  it('first() returns null when no row matches', async () => {
    const row = await db.getDb().prepare('SELECT * FROM items WHERE id = ?').bind('nonexistent').first();
    expect(row).toBeNull();
  });

  it('all() returns all matching rows', async () => {
    await db.getDb().prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('a', 'alpha').run();
    await db.getDb().prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('b', 'beta').run();
    const result = await db.getDb().prepare('SELECT * FROM items ORDER BY id').all<{ id: string }>();
    expect(result.results).toHaveLength(2);
    expect(result.results?.[0]?.id).toBe('a');
    expect(result.results?.[1]?.id).toBe('b');
  });

  it('bind() converts boolean true to integer 1', async () => {
    await db.getDb().prepare('INSERT INTO items (id, label, flag) VALUES (?, ?, ?)').bind('3', 'flagged', true).run();
    const row = await db.getDb().prepare('SELECT flag FROM items WHERE id = ?').bind('3').first<{ flag: number }>();
    expect(row?.flag).toBe(1);
  });

  it('bind() converts boolean false to integer 0', async () => {
    await db
      .getDb()
      .prepare('INSERT INTO items (id, label, flag) VALUES (?, ?, ?)')
      .bind('4', 'unflagged', false)
      .run();
    const row = await db.getDb().prepare('SELECT flag FROM items WHERE id = ?').bind('4').first<{ flag: number }>();
    expect(row?.flag).toBe(0);
  });
});

describe('TestD1Database batch()', () => {
  let db: TestD1Database;

  beforeEach(() => {
    db = new TestD1Database({ schemaFiles: [schemaFile] });
  });

  afterEach(() => {
    db.close();
  });

  it('executes multiple statements atomically', async () => {
    const d1 = db.getDb();
    const s1 = d1.prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('x1', 'one');
    const s2 = d1.prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('x2', 'two');
    const results = await d1.batch([s1, s2]);
    expect(results).toHaveLength(2);
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.success).toBe(true);

    const all = await d1.prepare('SELECT id FROM items ORDER BY id').all<{ id: string }>();
    expect(all.results?.map((r) => r.id)).toEqual(['x1', 'x2']);
  });

  it('rolls back all statements if one fails', async () => {
    const d1 = db.getDb();
    const s1 = d1.prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('y1', 'good');
    // Duplicate PK — will fail
    const s2 = d1.prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('y1', 'duplicate');

    await expect(d1.batch([s1, s2])).rejects.toThrow();

    const row = await d1.prepare('SELECT id FROM items WHERE id = ?').bind('y1').first();
    expect(row).toBeNull();
  });
});

describe('TestD1Database FK ON DELETE RESTRICT', () => {
  let db: TestD1Database;

  beforeEach(() => {
    db = new TestD1Database({ schemaFiles: [schemaFile] });
  });

  afterEach(() => {
    db.close();
  });

  it('blocks deletion of a parent row when a child references it', async () => {
    const d1 = db.getDb();
    await d1.prepare('INSERT INTO items (id, label) VALUES (?, ?)').bind('parent', 'p').run();
    await d1.prepare('INSERT INTO items (id, label, owner_id) VALUES (?, ?, ?)').bind('child', 'c', 'parent').run();

    await expect(d1.prepare('DELETE FROM items WHERE id = ?').bind('parent').run()).rejects.toThrow();

    const row = await d1.prepare('SELECT id FROM items WHERE id = ?').bind('parent').first();
    expect(row).not.toBeNull();
  });
});
