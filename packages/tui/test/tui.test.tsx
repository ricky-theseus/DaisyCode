import { describe, it } from 'node:test'
import assert from 'node:assert'

// Basic smoke test — verify the module structure is sound
describe('daisycode-tui', () => {
  it('should export App component', async () => {
    const mod = await import('../src/App.js')
    assert.ok(mod.default, 'App component should be exported')
  })

  it('should have theme constants', async () => {
    const { theme } = await import('../src/theme.js')
    assert.equal(theme.bg, '#0a0014')
    assert.equal(theme.primary, '#00ffcc')
    assert.equal(theme.secondary, '#b347ea')
    assert.equal(theme.accent, '#ff00aa')
  })

  it('should have keybind definitions', async () => {
    const { globalKeybinds, inputKeybinds } = await import('../src/keybind.js')
    assert.ok(globalKeybinds.length > 0)
    assert.ok(inputKeybinds.length > 0)
  })

  it('should create IPC bridge', async () => {
    const { createIpcBridge } = await import('../src/use-ipc.js')
    const bridge = createIpcBridge(
      () => {},
      () => {},
    )
    assert.ok(bridge)
    assert.equal(typeof bridge.start, 'function')
    assert.equal(typeof bridge.send, 'function')
    assert.equal(typeof bridge.stop, 'function')
  })
})
