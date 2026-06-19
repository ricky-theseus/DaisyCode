import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PermissionSystem, mergePermissions } from '../src/permissions.js';
import type { ToolContext, AgentPermissions } from '../src/types.js';

function ctx(permissions: AgentPermissions): ToolContext {
  return { agent: 'test', permissions, sessionId: 's1' };
}

describe('PermissionSystem', () => {
  it('allow returns allowed: true', () => {
    const ps = new PermissionSystem();
    const result = ps.check('read', {}, ctx({ read: 'allow' }));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.level, 'allow');
  });

  it('deny returns allowed: false with reason', () => {
    const ps = new PermissionSystem();
    const result = ps.check('bash', {}, ctx({ bash: 'deny' }));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.level, 'deny');
    assert.ok(result.reason?.includes('denied'));
  });

  it('ask returns allowed: false with confirmation reason', () => {
    const ps = new PermissionSystem();
    const result = ps.check('edit', {}, ctx({ edit: 'ask' }));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.level, 'ask');
    assert.ok(result.reason?.includes('confirmation'));
  });

  it('restricted returns allowed: false with restricted reason', () => {
    const ps = new PermissionSystem();
    const result = ps.check('bash', {}, ctx({ bash: 'restricted' }));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.level, 'restricted');
    assert.ok(result.reason?.includes('restricted'));
  });

  it('defaults to ask for unknown tool', () => {
    const ps = new PermissionSystem();
    const result = ps.check('unknown_tool', {}, ctx({}));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.level, 'ask');
  });
});

describe('mergePermissions', () => {
  it('returns parent when no child', () => {
    const parent: AgentPermissions = { read: 'allow', bash: 'deny' };
    assert.deepStrictEqual(mergePermissions(parent, undefined), parent);
  });

  it('child keys override parent with stricter level', () => {
    const parent: AgentPermissions = { read: 'allow', bash: 'ask' };
    const child: AgentPermissions = { read: 'deny', bash: 'allow' };
    const merged = mergePermissions(parent, child);
    assert.strictEqual(merged.read, 'deny');   // deny > allow
    assert.strictEqual(merged.bash, 'ask');    // ask > allow
  });

  it('child keys not in parent are added', () => {
    const parent: AgentPermissions = { read: 'allow' };
    const child: AgentPermissions = { edit: 'deny' };
    const merged = mergePermissions(parent, child);
    assert.strictEqual(merged.read, 'allow');
    assert.strictEqual(merged.edit, 'deny');
  });

  it('stricter ordering: deny > restricted > ask > allow', () => {
    const parent: AgentPermissions = { a: 'allow', r: 'restricted', d: 'deny' };
    const child: AgentPermissions = { a: 'deny', r: 'allow', d: 'ask' };
    const merged = mergePermissions(parent, child);
    assert.strictEqual(merged.a, 'deny');      // deny > allow
    assert.strictEqual(merged.r, 'restricted'); // restricted > allow
    assert.strictEqual(merged.d, 'deny');       // deny > ask
  });
});
