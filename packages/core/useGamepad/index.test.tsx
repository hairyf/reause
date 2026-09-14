import type { Dispatch, SetStateAction } from 'react'
import { useListener } from '@reause/shared'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { mapGamepadToXbox360Controller, useGamepad } from '../useGamepad'

interface MockGamepad {
  id: string
  index: number
  connected: boolean
  mapping: GamepadMappingType
  timestamp: number
  vibrationActuator: GamepadHapticActuator | null
  hapticActuators: GamepadHapticActuator[]
  axes: number[]
  buttons: Array<{ pressed: boolean, touched: boolean, value: number }>
}

function createGamepad(index: number): MockGamepad {
  return {
    id: `gamepad-${index}`,
    index,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    vibrationActuator: null,
    hapticActuators: [],
    axes: [0, 0, 0, 0],
    buttons: [{ pressed: false, touched: false, value: 0 }],
  }
}

function dispatchGamepadEvent(type: 'gamepadconnected' | 'gamepaddisconnected', gamepad: MockGamepad) {
  const event = new Event(type)
  Object.assign(event, { gamepad })
  window.dispatchEvent(event)
}

describe('mapGamepadToXbox360Controller', () => {
  it('maps a standard gamepad to the Xbox 360 controller layout', () => {
    const buttons = Array.from({ length: 16 }, (_, i) => ({
      pressed: i % 2 === 0,
      touched: false,
      value: i / 10,
    }))
    const gamepad = {
      ...createGamepad(0),
      buttons,
      axes: [0.1, 0.2, 0.3, 0.4],
    } as unknown as Gamepad

    const mapped = mapGamepadToXbox360Controller(gamepad)

    expect(mapped).not.toBeNull()
    expect(mapped!.buttons.a).toBe(buttons[0])
    expect(mapped!.buttons.b).toBe(buttons[1])
    expect(mapped!.buttons.x).toBe(buttons[2])
    expect(mapped!.buttons.y).toBe(buttons[3])
    expect(mapped!.bumper.left).toBe(buttons[4])
    expect(mapped!.bumper.right).toBe(buttons[5])
    expect(mapped!.triggers.left).toBe(buttons[6])
    expect(mapped!.triggers.right).toBe(buttons[7])
    expect(mapped!.stick.left.horizontal).toBe(0.1)
    expect(mapped!.stick.left.vertical).toBe(0.2)
    expect(mapped!.stick.right.horizontal).toBe(0.3)
    expect(mapped!.stick.right.vertical).toBe(0.4)
    expect(mapped!.stick.left.button).toBe(buttons[10])
    expect(mapped!.stick.right.button).toBe(buttons[11])
    expect(mapped!.dpad.up).toBe(buttons[12])
    expect(mapped!.dpad.down).toBe(buttons[13])
    expect(mapped!.dpad.left).toBe(buttons[14])
    expect(mapped!.dpad.right).toBe(buttons[15])
    expect(mapped!.back).toBe(buttons[8])
    expect(mapped!.start).toBe(buttons[9])
  })

  it('returns null when no gamepad is passed', () => {
    expect(mapGamepadToXbox360Controller(undefined)).toBeNull()
  })
})

describe('useGamepad', () => {
  it('keeps updating the remaining gamepad after another one disconnects', async () => {
    const pad0 = createGamepad(0)
    const pad1 = createGamepad(1)
    let connectedPads: MockGamepad[] = [pad0, pad1]
    const navigator = { getGamepads: () => connectedPads } as unknown as Navigator

    const { result } = await renderHook(() => useGamepad({ navigator }))

    dispatchGamepadEvent('gamepadconnected', pad0)
    dispatchGamepadEvent('gamepadconnected', pad1)

    await expect.poll(() => result.current[0].map(g => g.index)).toEqual([0, 1])

    // pad0 disconnects, so pad1 is re-packed to array position 0
    dispatchGamepadEvent('gamepaddisconnected', pad0)
    connectedPads = [pad1]

    await expect.poll(() => result.current[0].map(g => g.index)).toEqual([1])

    // pad1 reports new input on the next frame
    pad1.timestamp = 1000
    pad1.axes = [0.5, 0, 0, 0]
    pad1.buttons = [{ pressed: true, touched: true, value: 1 }]

    await vi.waitFor(() => {
      const survivor = result.current[0].find(g => g.index === 1)!
      expect(survivor.timestamp).toBe(1000)
      expect(survivor.buttons[0].pressed).toBe(true)
    })
  })

  it('skips null slots returned by getGamepads', async () => {
    const pad = createGamepad(1)
    // browsers return a fixed-length array with null in the unused slots
    const connectedPads: Array<MockGamepad | null> = [null, pad]
    const navigator = { getGamepads: () => connectedPads } as unknown as Navigator

    const { result } = await renderHook(() => useGamepad({ navigator }))

    dispatchGamepadEvent('gamepadconnected', pad)

    await expect.poll(() => result.current[0].map(g => g.index)).toEqual([1])

    // new input arrives on the next frame, alongside a null slot
    pad.timestamp = 1000
    pad.buttons = [{ pressed: true, touched: true, value: 1 }]

    await vi.waitFor(() => {
      const updated = result.current[0].find(g => g.index === 1)!
      expect(updated.timestamp).toBe(1000)
      expect(updated.buttons[0].pressed).toBe(true)
    })
  })

  it('onConnected / onDisconnected fire through the useListener protocol', async () => {
    const pad = createGamepad(0)
    const connectedPads: MockGamepad[] = [pad]
    const navigator = { getGamepads: () => connectedPads } as unknown as Navigator

    const connected = vi.fn()
    const disconnected = vi.fn()
    const { unmount } = await renderHook(() => {
      const [, , controls] = useGamepad({ navigator })
      useListener(controls.onConnected, connected)
      useListener(controls.onDisconnected, disconnected)
      return controls
    })

    dispatchGamepadEvent('gamepadconnected', pad)
    expect(connected).toHaveBeenCalledTimes(1)
    expect(connected).toHaveBeenCalledWith(0)

    dispatchGamepadEvent('gamepaddisconnected', pad)
    expect(disconnected).toHaveBeenCalledTimes(1)
    expect(disconnected).toHaveBeenCalledWith(0)

    unmount()

    dispatchGamepadEvent('gamepadconnected', pad)
    dispatchGamepadEvent('gamepaddisconnected', pad)
    expect(connected).toHaveBeenCalledTimes(1)
    expect(disconnected).toHaveBeenCalledTimes(1)
  })

  it('setGamepads updates the returned list', async () => {
    const navigator = { getGamepads: () => [] } as unknown as Navigator
    const { result, act } = await renderHook(() => useGamepad({ navigator }))

    expect(result.current[0]).toEqual([])

    await act(() => {
      result.current[1]([createGamepad(0) as unknown as Gamepad])
    })

    expect(result.current[0].map(g => g.index)).toEqual([0])

    // the setter accepts a functional updater, like React state
    await act(() => {
      result.current[1](prev => [...prev, createGamepad(1) as unknown as Gamepad])
    })

    expect(result.current[0].map(g => g.index)).toEqual([0, 1])
  })

  it('controls.pause / controls.resume toggle the rAF polling loop', async () => {
    const pad = createGamepad(0)
    const connectedPads: MockGamepad[] = [pad]
    const navigator = { getGamepads: () => connectedPads } as unknown as Navigator

    const { result, act } = await renderHook(() => useGamepad({ navigator }))

    // the loop starts paused and is resumed by the first connect event
    expect(result.current[2].isActive).toBe(false)

    dispatchGamepadEvent('gamepadconnected', pad)
    await vi.waitFor(() => expect(result.current[2].isActive).toBe(true))

    await act(() => {
      result.current[2].pause()
    })
    expect(result.current[2].isActive).toBe(false)

    // the snapshot is frozen while paused, even though the browser reports input
    pad.timestamp = 1000
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(result.current[0][0].timestamp).toBe(0)

    await act(() => {
      result.current[2].resume()
    })
    expect(result.current[2].isActive).toBe(true)

    await vi.waitFor(() => expect(result.current[0][0].timestamp).toBe(1000))
  })

  it('returns a React tuple [gamepads, setGamepads, controls]', async () => {
    const navigator = { getGamepads: () => [] } as unknown as Navigator
    const { result } = await renderHook(() => useGamepad({ navigator }))

    expectTypeOf(result.current).toEqualTypeOf<
      readonly [
        Gamepad[],
        Dispatch<SetStateAction<Gamepad[]>>,
        {
          isSupported: boolean
          onConnected: (fn: (index: number) => void) => () => void
          onDisconnected: (fn: (index: number) => void) => () => void
          pause: () => void
          resume: () => void
          isActive: boolean
        },
      ]
    >()
    expectTypeOf(result.current[0]).toEqualTypeOf<Gamepad[]>()
    expectTypeOf(result.current[1]).toEqualTypeOf<Dispatch<SetStateAction<Gamepad[]>>>()
    expectTypeOf(result.current[2].isSupported).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[2].isActive).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[2].pause).toEqualTypeOf<() => void>()

    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current).toHaveLength(3)
    expect(result.current[0]).toEqual([])
    expect(result.current[1]).toBeTypeOf('function')
    expect(result.current[2].isSupported).toBe(true)
    expect(result.current[2].onConnected).toBeTypeOf('function')
    expect(result.current[2].onDisconnected).toBeTypeOf('function')
    expect(result.current[2].pause).toBeTypeOf('function')
    expect(result.current[2].resume).toBeTypeOf('function')
  })
})
