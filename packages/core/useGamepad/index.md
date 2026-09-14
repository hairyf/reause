---
category: Browser
---

# useGamepad

Provides reactive bindings for the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API).

## Usage

> Due to how the Gamepad API works, you must interact with the page using the gamepad before it will be detected.

```tsx
import { useGamepad } from '@reause/core'

const [gamepads, setGamepads, { isSupported }] = useGamepad()
const gamepad = gamepads.find(g => g.mapping === 'standard')
```

### Gamepad Updates

Currently the Gamepad API does not have event support to update the state of the gamepad. To update the gamepad state, `requestAnimationFrame` is used to poll for gamepad changes. You can control this polling by using the `pause` and `resume` functions provided by `useGamepad`

```tsx
import { useGamepad } from '@reause/core'

const [gamepads, , { pause, resume }] = useGamepad()

pause()

// gamepads object will not update

resume()

// gamepads object will update on user input
```

### Gamepad Connect & Disconnect Events

The `onConnected` and `onDisconnected` events will trigger when a gamepad is connected or disconnected.

```tsx
import { useGamepad } from '@reause/core'

const [gamepads, , { onConnected, onDisconnected }] = useGamepad()

onConnected((index) => {
  console.log(`${gamepads[index].id} connected`)
})

onDisconnected((index) => {
  console.log(`${index} disconnected`)
})
```

### Vibration

> The Gamepad Haptics API is sparse, so check the [compatibility table](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator#browser_compatibility) before using.

```tsx
import { useGamepad } from '@reause/core'

const [gamepads] = useGamepad()
const gamepad = gamepads[0]!

const supportsVibration = gamepad.hapticActuators.length > 0
function vibrate() {
  if (supportsVibration) {
    const actuator = gamepad.hapticActuators[0]
    actuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: 1000,
      weakMagnitude: 1,
      strongMagnitude: 1,
    })
  }
}
```

### Mappings

To make the Gamepad API easier to use, we provide mappings to map a controller to a controllers button layout.

#### Xbox360 Controller

```tsx
import { mapGamepadToXbox360Controller } from '@reause/core'

const [gamepads] = useGamepad()
const gamepad = gamepads[0]
const controller = mapGamepadToXbox360Controller(gamepad)

// controller is null until a gamepad is connected
console.log(controller?.buttons.a.pressed)
console.log(controller?.buttons.b.pressed)
console.log(controller?.buttons.x.pressed)
console.log(controller?.buttons.y.pressed)
```

Currently there are only mappings for the Xbox 360 controller. If you have controller you want to add mappings for, feel free to open a PR for more controller mappings!
