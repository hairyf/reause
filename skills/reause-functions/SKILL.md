---
name: reause-functions
description: Apply reause hooks where appropriate to build concise, maintainable React features.
license: MIT
metadata:
    author: reause
    version: "0.0.1"
compatibility: Requires React 18 (or above)
---

# reause Functions

This skill is a decision-and-implementation guide for reause functions in React projects. It maps requirements to the most suitable reause function, applies the correct usage pattern, and prefers hook-based solutions over bespoke code to keep implementations concise, maintainable, and performant.

## When to Apply

- Apply this skill whenever assisting user development work in React.
- Always check first whether a reause function can implement the requirement.
- Prefer reause hooks over custom code to improve readability, maintainability, and performance.
- Map requirements to the most appropriate reause function and follow the function’s invocation rule.
- Please refer to the `Invocation` field in the below functions table. For example:
  - `AUTO`: Use automatically when applicable.
  - `EXTERNAL`: Use only if the user already installed the required external dependency; otherwise reconsider, and ask to install only if truly needed.
  - `EXPLICIT_ONLY`: Use only when explicitly requested by the user.
    > _NOTE_ User instructions in the prompt or `AGENTS.md` may override a function’s default `Invocation` rule.

## Migrating from VueUse

reause is a 1:1 React port of VueUse, so an upstream composable maps onto a
single reause function with the same options and a React-adapted return shape:

- `ref*` → `useState*` (e.g. `refDebounced` → `useStateDebounced`)
- `on*` → `use*` (e.g. `onClickOutside` → `useClickOutside`)
- `use*RefHistory` → `useState*History`
- read-only value sources take a plain `T`; values reause should write back
  take a React state tuple (`State<T>`, e.g. from `useState<T>()`)

Each reference keeps the upstream name in its `Map from` note, so the VueUse
page can be consulted for behaviour the port preserves.

## Functions

All functions listed below are part of the [reause](https://github.com/hairyf/reause) library, each section categorizes functions based on their functionality.

IMPORTANT: Each function entry includes a short `Description` and a detailed `Reference`. When using any function, always consult the corresponding document in `./references` for Usage details and Type Declarations.

Every entry is a React hook (`useX`) unless its reference says otherwise, and is
exported from the package (`@reause/core`, `@reause/shared`, …) named by its
`Map from` note in the reference.

### State

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createGlobalState`](references/createGlobalState.md) | Keep state in the global scope | AUTO |
| [`createScopedHook`](references/createScopedHook.md) | Create global state that can be injected into components | AUTO |
| [`createSharedHook`](references/createSharedHook.md) | Make a composable function usable with multiple React components | AUTO |
| [`useAsyncFn`](references/useAsyncFn.md) | Returns state and a callback for an `async` function (or any function returning a promise) — React port of react-use's [`useAsyncFn`](https://github.com/streamich/react-use/blob/master/docs/useAsyncFn.md) (upstream mapping files: `source/react-use/src/useAsyncFn.ts` | AUTO |
| [`useAsyncState`](references/useAsyncState.md) | Reactive async state | AUTO |
| [`useControllableState`](references/useControllableState.md) | A hook for combining controlled and uncontrolled state sources | AUTO |
| [`useCounter`](references/useCounter.md) | A basic counter with `inc` / `dec` / `set` / `reset` and optional `min` / `max` bounds | AUTO |
| [`useLastChanged`](references/useLastChanged.md) | Records the timestamp of the last change | AUTO |
| [`useLatest`](references/useLatest.md) | Returns a ref object whose `.current` always holds the latest value of the render that produced it — React port of react-use's [`useLatest`](https://github.com/streamich/react-use/blob/master/docs/useLatest.md) (upstream mapping files: `source/react-use/src/useLatest.ts` | AUTO |
| [`useList`](references/useList.md) | Tracks an array and returns it with a stable set of immutable mutators — React port of react-use's `useList` | AUTO |
| [`useListener`](references/useListener.md) | Bind a callback to a listener registration function returned by a reause hook | AUTO |
| [`useLocalStorage`](references/useLocalStorage.md) | Reactive [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | AUTO |
| [`useMap`](references/useMap.md) | A real `Map` whose mutations re-render — React port of react-hookz's `useMap` | AUTO |
| [`useMethods`](references/useMethods.md) | `useReducer` sugar — turn an object of pure state transitions into a state value plus one callable method per transition | AUTO |
| [`usePreviousDistinct`](references/usePreviousDistinct.md) | Just like `usePrevious` | AUTO |
| [`useQueue`](references/useQueue.md) | State hook that implements a simple FIFO queue — React port of react-use's `useQueue` | AUTO |
| [`useSafeState`](references/useSafeState.md) | A `useState` whose setter is a no-op once the component has unmounted — React port of ahooks' [`useSafeState`](https://ahooks.js.org/hooks/use-safe-state) (`source/ahooks/packages/hooks/src/useSafeState/`; upstream exports it as the **default** export | AUTO |
| [`useSessionStorage`](references/useSessionStorage.md) | Reactive [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | AUTO |
| [`useSet`](references/useSet.md) | A real `Set` whose mutations re-render — React port of react-hookz's `useSet` | AUTO |
| [`useStateDebouncedHistory`](references/useStateDebouncedHistory.md) | Shorthand for `useStateHistory` with debounced filter | AUTO |
| [`useStateHistory`](references/useStateHistory.md) | Track the change history of a state automatically — every change commits a history record — also provides undo and redo functionality | AUTO |
| [`useStateManualHistory`](references/useStateManualHistory.md) | Manually track the change history of a state when the user calls `commit()` | AUTO |
| [`useStateThrottledHistory`](references/useStateThrottledHistory.md) | Shorthand for `useStateHistory` with throttled filter | AUTO |
| [`useStorage`](references/useStorage.md) | Create a controllable state that can be used to access & modify [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | AUTO |
| [`useStorageAsync`](references/useStorageAsync.md) | Reactive Storage with async support | AUTO |

### Elements

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useActiveElement`](references/useActiveElement.md) | Reactive `document.activeElement` | AUTO |
| [`useDocumentVisibility`](references/useDocumentVisibility.md) | Reactively track [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState) | AUTO |
| [`useDraggable`](references/useDraggable.md) | Make elements draggable | AUTO |
| [`useDropZone`](references/useDropZone.md) | Create a zone where files can be dropped | AUTO |
| [`useElementBounding`](references/useElementBounding.md) | Reactive [bounding box](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) of an HTML element | AUTO |
| [`useElementOverflow`](references/useElementOverflow.md) | Reactive element's overflow state | AUTO |
| [`useElementSize`](references/useElementSize.md) | Reactive size of an HTML element | AUTO |
| [`useElementVisibility`](references/useElementVisibility.md) | Tracks the visibility of an element within the viewport | AUTO |
| [`useIntersectionObserver`](references/useIntersectionObserver.md) | Detects changes to a target element's visibility | AUTO |
| [`useMouseInElement`](references/useMouseInElement.md) | Reactive mouse position related to an element | AUTO |
| [`useMutationObserver`](references/useMutationObserver.md) | Watch for changes being made to the DOM tree | AUTO |
| [`useParentElement`](references/useParentElement.md) | Get parent element of the given element | AUTO |
| [`useResizeObserver`](references/useResizeObserver.md) | Reports changes to the dimensions of an Element's content or the border-box | AUTO |
| [`useSplitter`](references/useSplitter.md) | Resizable panel layout with draggable | AUTO |
| [`useWindowFocus`](references/useWindowFocus.md) | Reactive window focus state | AUTO |
| [`useWindowScroll`](references/useWindowScroll.md) | Reactive window scroll | AUTO |
| [`useWindowSize`](references/useWindowSize.md) | Reactive window size | AUTO |

### Browser

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useBluetooth`](references/useBluetooth.md) | Reactive [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) | AUTO |
| [`useBreakpoints`](references/useBreakpoints.md) | Reactive viewport breakpoints | AUTO |
| [`useBroadcastChannel`](references/useBroadcastChannel.md) | Reactive [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) | AUTO |
| [`useBrowserLocation`](references/useBrowserLocation.md) | Reactive browser location | AUTO |
| [`useClipboard`](references/useClipboard.md) | Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | AUTO |
| [`useClipboardItems`](references/useClipboardItems.md) | Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | AUTO |
| [`useColorMode`](references/useColorMode.md) | Reactive color mode (dark / light / customs) with auto data persistence | AUTO |
| [`useCssSupports`](references/useCssSupports.md) | SSR compatible and reactive [`CSS.supports`](https://developer.mozilla.org/docs/Web/API/CSS/supports_static) | AUTO |
| [`useCssVar`](references/useCssVar.md) | Manipulate CSS variables | AUTO |
| [`useDark`](references/useDark.md) | Reactive dark mode with auto data persistence | AUTO |
| [`useEventListener`](references/useEventListener.md) | Use EventListener with ease | AUTO |
| [`useEyeDropper`](references/useEyeDropper.md) | Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API) | AUTO |
| [`useFavicon`](references/useFavicon.md) | Reactive favicon | AUTO |
| [`useFileDialog`](references/useFileDialog.md) | Open file dialog with ease | AUTO |
| [`useFileSystemAccess`](references/useFileSystemAccess.md) | Create and read and write local files with [FileSystemAccessAPI](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) | AUTO |
| [`useFullscreen`](references/useFullscreen.md) | Reactive [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) | AUTO |
| [`useGamepad`](references/useGamepad.md) | Provides reactive bindings for the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) | AUTO |
| [`useHash`](references/useHash.md) | Shorthand for a reactive `window.location.hash` | AUTO |
| [`useImage`](references/useImage.md) | Reactive load an image in the browser | AUTO |
| [`useLiveAnnouncer`](references/useLiveAnnouncer.md) | Accessible way to announce messages to screen reader users (ARIA live regions) | AUTO |
| [`useMask`](references/useMask.md) | Input masking engine | AUTO |
| [`useMediaControls`](references/useMediaControls.md) | Reactive media controls for both `audio` and `video` elements | AUTO |
| [`useMediaQuery`](references/useMediaQuery.md) | Reactive [Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Testing_media_queries) | AUTO |
| [`useMemory`](references/useMemory.md) | Reactive Memory Info | AUTO |
| [`useObjectUrl`](references/useObjectUrl.md) | Reactive URL representing an object | AUTO |
| [`useParams`](references/useParams.md) | Shorthand for a reactive path parameter in `window.location.pathname` | AUTO |
| [`usePerformanceObserver`](references/usePerformanceObserver.md) | Observe performance metrics | AUTO |
| [`usePermission`](references/usePermission.md) | Reactive [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) state | AUTO |
| [`usePreferredColorScheme`](references/usePreferredColorScheme.md) | Reactive [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query | AUTO |
| [`usePreferredContrast`](references/usePreferredContrast.md) | Reactive [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) media query | AUTO |
| [`usePreferredDark`](references/usePreferredDark.md) | Reactive [`prefers-color-scheme: dark`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query | AUTO |
| [`usePreferredLanguages`](references/usePreferredLanguages.md) | Reactive Navigator Languages | AUTO |
| [`usePreferredReducedMotion`](references/usePreferredReducedMotion.md) | Reactive [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) media query | AUTO |
| [`usePreferredReducedTransparency`](references/usePreferredReducedTransparency.md) | Reactive [`prefers-reduced-transparency`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) media query | AUTO |
| [`useQuery`](references/useQuery.md) | Shorthand for a reactive query parameter in `window.location.search` | AUTO |
| [`useScreenOrientation`](references/useScreenOrientation.md) | Reactive [Screen Orientation API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API) | AUTO |
| [`useScreenSafeArea`](references/useScreenSafeArea.md) | Reactive `env(safe-area-inset-*)` | AUTO |
| [`useScriptTag`](references/useScriptTag.md) | Creates a script tag | AUTO |
| [`useShare`](references/useShare.md) | Reactive [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) | AUTO |
| [`useSSRWidth`](references/useSSRWidth.md) | Used to set a global viewport width which will be used when rendering SSR components that rely on the viewport width like `useMediaQuery` or `useBreakpoints` | AUTO |
| [`useStyleTag`](references/useStyleTag.md) | Inject reactive `style` element in head | AUTO |
| [`useTextareaAutosize`](references/useTextareaAutosize.md) | Automatically update the height of a textarea depending on the content | AUTO |
| [`useTextDirection`](references/useTextDirection.md) | Reactive [dir](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) of the element's text | AUTO |
| [`useTitle`](references/useTitle.md) | Reactive document title | AUTO |
| [`useUrlSearchParams`](references/useUrlSearchParams.md) | Reactive [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) | AUTO |
| [`useVibrate`](references/useVibrate.md) | Reactive [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) | AUTO |
| [`useWakeLock`](references/useWakeLock.md) | Reactive [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) | AUTO |
| [`useWebMCP`](references/useWebMCP.md) | Register a [WebMCP](https://github.com/webmachinelearning/webmcp) tool and tie its lifecycle to the current component | AUTO |
| [`useWebNotification`](references/useWebNotification.md) | Reactive [Notification](https://developer.mozilla.org/en-US/docs/Web/API/notification) | AUTO |
| [`useWebSocket`](references/useWebSocket.md) | Reactive [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) client | AUTO |
| [`useWebWorker`](references/useWebWorker.md) | Simple [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) registration and communication | AUTO |
| [`useWebWorkerFn`](references/useWebWorkerFn.md) | Run expensive functions without blocking the UI | AUTO |

### Sensors

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useBattery`](references/useBattery.md) | Reactive [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API) | AUTO |
| [`useClickAway`](references/useClickAway.md) | Fire a handler when a click lands outside one or more target elements — the reause port of ahooks' [`useClickAway`](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useClickAway/index.ts) (`source/ahooks/packages/hooks/src/useClickAway/index.ts`) | AUTO |
| [`useClickOutside`](references/useClickOutside.md) | Listen for clicks outside of an element | AUTO |
| [`useDeviceMotion`](references/useDeviceMotion.md) | Reactive [DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent) | AUTO |
| [`useDeviceOrientation`](references/useDeviceOrientation.md) | Reactive [DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent) | AUTO |
| [`useDevicePixelRatio`](references/useDevicePixelRatio.md) | Reactively track [`window.devicePixelRatio`](https://developer.mozilla.org/docs/Web/API/Window/devicePixelRatio) | AUTO |
| [`useDevicesList`](references/useDevicesList.md) | Reactive [`enumerateDevices`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) listing available input/output devices | AUTO |
| [`useDisplayMedia`](references/useDisplayMedia.md) | Reactive [`mediaDevices.getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) streaming | AUTO |
| [`useElementByPoint`](references/useElementByPoint.md) | Reactive element by point | AUTO |
| [`useElementHover`](references/useElementHover.md) | Reactive element's hover state | AUTO |
| [`useElementRemoval`](references/useElementRemoval.md) | Fires when the element or any element containing it is removed from the DOM | AUTO |
| [`useFocus`](references/useFocus.md) | Reactive utility to track or set the focus state of a DOM element | AUTO |
| [`useFocusReturn`](references/useFocusReturn.md) | Return focus to the element that was active before an overlay opened — React port of `@mantine/hooks`' `useFocusReturn` (upstream mapping file: `source/mantine/packages/@mantine/hooks/src/use-focus-return/use-focus-return.ts` | AUTO |
| [`useFocusWithin`](references/useFocusWithin.md) | Reactive utility to track if an element or one of its descendants has focus | AUTO |
| [`useFps`](references/useFps.md) | Reactive FPS (frames per second) | AUTO |
| [`useGeolocation`](references/useGeolocation.md) | Reactive [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) | AUTO |
| [`useHotkeys`](references/useHotkeys.md) | Keyboard shortcuts written as hotkey strings — `mod+K` means `⌘K` on Apple hardware and `Ctrl+K` elsewhere | AUTO |
| [`useIdle`](references/useIdle.md) | Tracks whether the user is being inactive | AUTO |
| [`useInfiniteScroll`](references/useInfiniteScroll.md) | Infinite scrolling of the element | AUTO |
| [`useKeyModifier`](references/useKeyModifier.md) | Reactive [Modifier State](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState) | AUTO |
| [`useKeyPress`](references/useKeyPress.md) | Listen for a key press by `keyCode` | AUTO |
| [`useKeyStroke`](references/useKeyStroke.md) | Listen for keyboard keystrokes | AUTO |
| [`useLongPress`](references/useLongPress.md) | Listen for a long press on an element | AUTO |
| [`useMagicKeys`](references/useMagicKeys.md) | Reactive keys pressed state | AUTO |
| [`useMouse`](references/useMouse.md) | Reactive mouse position | AUTO |
| [`useMousePressed`](references/useMousePressed.md) | Reactive mouse pressing state | AUTO |
| [`useNavigatorLanguage`](references/useNavigatorLanguage.md) | Reactive [navigator.language](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language) | AUTO |
| [`useNetwork`](references/useNetwork.md) | Reactive [Network status](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API) | AUTO |
| [`useOnline`](references/useOnline.md) | Reactive online state | AUTO |
| [`usePageLeave`](references/usePageLeave.md) | Reactive state to show whether the mouse leaves the page | AUTO |
| [`useParallax`](references/useParallax.md) | Create parallax effect easily | AUTO |
| [`usePointer`](references/usePointer.md) | Reactive pointer state | AUTO |
| [`usePointerLock`](references/usePointerLock.md) | Reactive [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) | AUTO |
| [`usePointerSwipe`](references/usePointerSwipe.md) | Reactive swipe detection based on [PointerEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent) | AUTO |
| [`useScroll`](references/useScroll.md) | Reactive scroll position and state | AUTO |
| [`useScrollLock`](references/useScrollLock.md) | Lock scrolling of the element | AUTO |
| [`useSpeechRecognition`](references/useSpeechRecognition.md) | Reactive [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) | AUTO |
| [`useSpeechSynthesis`](references/useSpeechSynthesis.md) | Reactive [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) | AUTO |
| [`useStartTyping`](references/useStartTyping.md) | Fires when users start typing on non-editable elements | AUTO |
| [`useSwipe`](references/useSwipe.md) | Reactive swipe detection based on [`TouchEvents`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent) | AUTO |
| [`useTextSelection`](references/useTextSelection.md) | Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection) | AUTO |
| [`useUserMedia`](references/useUserMedia.md) | Streaming via [`mediaDevices.getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | AUTO |

### Network

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useEventSource`](references/useEventSource.md) | An [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) or [Server-Sent-Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) instance opens a persistent connection to an HTTP server | AUTO |
| [`useFetch`](references/useFetch.md) | Reactive [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) provides the ability to abort requests | AUTO |

### Animation

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAnimate`](references/useAnimate.md) | Reactive [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | AUTO |
| [`useCollapse`](references/useCollapse.md) | Animate an element's height between `0` and its measured content height — a four-state machine (`entered` / `entering` / `exiting` / `exited`) plus a `getCollapseProps()` bundle you spread on the collapsible element | AUTO |
| [`useInterval`](references/useInterval.md) | Reactive counter that increases on every interval | AUTO |
| [`useIntervalFn`](references/useIntervalFn.md) | Wrapper for `setInterval` with controls | AUTO |
| [`useIntervalRafFn`](references/useIntervalRafFn.md) | Fire a callback repeatedly on animation frames | AUTO |
| [`useNow`](references/useNow.md) | Reactive current Date instance | AUTO |
| [`useRafFn`](references/useRafFn.md) | Call function on every `requestAnimationFrame` | AUTO |
| [`useRafState`](references/useRafState.md) | State updates coalesced into an animation frame — React port of react-use's `useRafState` | AUTO |
| [`useTimeout`](references/useTimeout.md) | A reactive value that becomes `true` after a given time | AUTO |
| [`useTimeoutFn`](references/useTimeoutFn.md) | Wrapper for `setTimeout` with controls | AUTO |
| [`useTimeoutRafFn`](references/useTimeoutRafFn.md) | Fire a callback once on the first animation frame at or after a delay | AUTO |
| [`useTimestamp`](references/useTimestamp.md) | Reactive current timestamp (`Date.now() + offset`) | AUTO |
| [`useTransition`](references/useTransition.md) | Transition between values | AUTO |
| [`useUpdate`](references/useUpdate.md) | A force-update hook — React port of react-use's [`useUpdate`](https://streamich.github.io/react-use/?path=/story/animation-useupdate--docs) | AUTO |

### Component

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createPortalSlot`](references/createPortalSlot.md) | Define and reuse a template inside the component scope | AUTO |
| [`createPromisifiedComponent`](references/createPromisifiedComponent.md) | Template as Promise | AUTO |
| [`unrefElement`](references/unrefElement.md) | Get the DOM element a React ref object currently holds | AUTO |
| [`useMounted`](references/useMounted.md) | Mounted state in ref | AUTO |
| [`useRefsList`](references/useRefsList.md) | Shorthand for binding refs to elements rendered inside a list | AUTO |
| [`useVirtualList`](references/useVirtualList.md) | Create virtual lists with ease | AUTO |

### Watch

| Function | Description | Invocation |
|----------|-------------|------------|
| [`until`](references/until.md) | Promised one-time watch for changes | AUTO |
| [`useWatch`](references/useWatch.md) | Watches a source — a single value or an array of values — and invokes a callback with `(value | AUTO |
| [`useWatchArray`](references/useWatchArray.md) | Watches an array value and reports which items were added and removed since the previous list | AUTO |
| [`useWatchAtMost`](references/useWatchAtMost.md) | Like `useWatch` | AUTO |
| [`useWatchDebounced`](references/useWatchDebounced.md) | Debounced watch | AUTO |
| [`useWatchDeep`](references/useWatchDeep.md) | Shorthand for watching a value with `{ deep: true }` — invokes the callback only when the value differs **deeply** from the previous one | AUTO |
| [`useWatchIgnorable`](references/useWatchIgnorable.md) | Ignorable watch — extended watch that returns `ignoreUpdates(updater)` / `ignorePrevAsyncUpdates()` / `stop` to ignore particular updates to the source | AUTO |
| [`useWatchImmediate`](references/useWatchImmediate.md) | Shorthand for watching value with `{ immediate: true }` | AUTO |
| [`useWatchOnce`](references/useWatchOnce.md) | Shorthand for watching value with `{ once: true }` | AUTO |
| [`useWatchPausable`](references/useWatchPausable.md) | Pausable watch — pause and resume a watched value's updates | AUTO |
| [`useWatchThrottled`](references/useWatchThrottled.md) | Throttled watch | AUTO |
| [`useWatchTriggerable`](references/useWatchTriggerable.md) | Watch that can be triggered manually | AUTO |
| [`useWatchWithFilter`](references/useWatchWithFilter.md) | `watch` with additional EventFilter control | AUTO |
| [`useWhenever`](references/useWhenever.md) | Shorthand for watching value to be truthy | AUTO |

### Reactivity

| Function | Description | Invocation |
|----------|-------------|------------|
| [`syncState`](references/syncState.md) | Two-way state synchronization between two writable `State<T>` sources | AUTO |
| [`syncStates`](references/syncStates.md) | Keep target state(s) in sync with a source value | AUTO |
| [`useAsync`](references/useAsync.md) | Derived value for async functions | AUTO |
| [`useStateAutoReset`](references/useStateAutoReset.md) | A controllable state which will be reset to the default value after some time | AUTO |
| [`useStateDebounced`](references/useStateDebounced.md) | A controllable state which will be debounced | AUTO |
| [`useStateDefault`](references/useStateDefault.md) | Apply default value to a ref | AUTO |
| [`useStateManualReset`](references/useStateManualReset.md) | A state with manual reset functionality | AUTO |
| [`useStateThrottled`](references/useStateThrottled.md) | Throttle changing of a state value | AUTO |
| [`useStateWithControl`](references/useStateWithControl.md) | Fine-grained controls over a state and its re-renders | AUTO |

### Array

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useArrayDifference`](references/useArrayDifference.md) | Reactive get array difference of two arrays | AUTO |
| [`useArrayEvery`](references/useArrayEvery.md) | Reactive `Array.every` | AUTO |
| [`useArrayFilter`](references/useArrayFilter.md) | Reactive `Array.filter` | AUTO |
| [`useArrayFind`](references/useArrayFind.md) | Reactive `Array.find` | AUTO |
| [`useArrayFindIndex`](references/useArrayFindIndex.md) | Reactive `Array.findIndex` | AUTO |
| [`useArrayFindLast`](references/useArrayFindLast.md) | Reactive `Array.findLast` | AUTO |
| [`useArrayIncludes`](references/useArrayIncludes.md) | Reactive `Array.includes` | AUTO |
| [`useArrayJoin`](references/useArrayJoin.md) | Reactive `Array.join` | AUTO |
| [`useArrayMap`](references/useArrayMap.md) | Reactive `Array.map` | AUTO |
| [`useArrayReduce`](references/useArrayReduce.md) | Reactive `Array.reduce` | AUTO |
| [`useArraySome`](references/useArraySome.md) | Reactive `Array.some` | AUTO |
| [`useArrayUnique`](references/useArrayUnique.md) | Reactive unique array | AUTO |
| [`useSorted`](references/useSorted.md) | Reactive sorted array | AUTO |

### Time

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useCountdown`](references/useCountdown.md) | Reactive countdown timer in seconds | AUTO |
| [`useDateFormat`](references/useDateFormat.md) | Get the formatted date according to the string of tokens passed in | AUTO |
| [`useTemporalNow`](references/useTemporalNow.md) | Reactive [Temporal API](https://tc39.es/proposal-temporal/docs/) with timezone conversion and calendar system support | AUTO |
| [`useTimeAgo`](references/useTimeAgo.md) | Reactive time ago | AUTO |
| [`useTimeAgoIntl`](references/useTimeAgoIntl.md) | Reactive time ago with i18n supported | AUTO |

### Utilities

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createEventHook`](references/createEventHook.md) | Utility for creating event hooks | AUTO |
| [`isDefined`](references/isDefined.md) | Non-nullish checking type guard for React ref objects and plain values | AUTO |
| [`makeDestructurable`](references/makeDestructurable.md) | Make isomorphic destructurable for object and array at the same time | AUTO |
| [`useAsyncQueue`](references/useAsyncQueue.md) | Executes each asynchronous task sequentially and passes the current task result to the next task | AUTO |
| [`useBase64`](references/useBase64.md) | Reactive base64 transforming | AUTO |
| [`useCached`](references/useCached.md) | Cache a value with a custom comparator | AUTO |
| [`useCloned`](references/useCloned.md) | Reactive clone of a value | AUTO |
| [`useConfirmDialog`](references/useConfirmDialog.md) | Creates event hooks to support modals and confirmation dialog chains | AUTO |
| [`useConst`](references/useConst.md) | Return a value that is computed **once** | AUTO |
| [`useCycleList`](references/useCycleList.md) | Cycle through a list of items | AUTO |
| [`useDebounceFn`](references/useDebounceFn.md) | Debounce execution of a function | AUTO |
| [`useEventBus`](references/useEventBus.md) | A basic event bus | AUTO |
| [`useId`](references/useId.md) | SSR-safe id with an optional static override — React port of `@mantine/hooks`' `useId` (upstream mapping files: `source/mantine/packages/@mantine/hooks/src/use-id/use-id.ts` | AUTO |
| [`useMemoize`](references/useMemoize.md) | Cache results of functions depending on arguments | AUTO |
| [`useOffsetPagination`](references/useOffsetPagination.md) | Reactive offset pagination | AUTO |
| [`usePrevious`](references/usePrevious.md) | Holds the previous value of a source | AUTO |
| [`useStepper`](references/useStepper.md) | Provides helpers for building a multi-step wizard interface | AUTO |
| [`useSupported`](references/useSupported.md) | SSR compatibility `isSupported` | AUTO |
| [`useThrottleFn`](references/useThrottleFn.md) | Throttle execution of a function | AUTO |
| [`useTimeoutPoll`](references/useTimeoutPoll.md) | Use timeout to poll something — it triggers the callback after the last task is done | AUTO |
| [`useToggle`](references/useToggle.md) | A boolean (or value) toggler with controllable state support | AUTO |
| [`useToNumber`](references/useToNumber.md) | Convert a string or number value to a number | AUTO |
| [`useToString`](references/useToString.md) | Convert a value to its string representation | AUTO |
| [`utils`](references/utils.md) | Framework-agnostic helper functions ported 1:1 from VueUse's internal [`@vueuse/shared`](https://vueuse.org/shared/) utils group (`is.ts` / `general.ts`) — plain TypeScript with no React state | AUTO |

### @Electron

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useIpcRenderer`](references/useIpcRenderer.md) | Provides [ipcRenderer](https://www.electronjs.org/docs/api/ipc-renderer) and all of its APIs | EXTERNAL |
| [`useIpcRendererInvoke`](references/useIpcRendererInvoke.md) | Reactive [ipcRenderer.invoke API](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args) result | EXTERNAL |
| [`useIpcRendererOn`](references/useIpcRendererOn.md) | Use [ipcRenderer.on](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener) with ease and [ipcRenderer.removeListener](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener) automatically on unmounted | EXTERNAL |
| [`useZoomFactor`](references/useZoomFactor.md) | Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom factor | EXTERNAL |
| [`useZoomLevel`](references/useZoomLevel.md) | Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom level | EXTERNAL |

### @Firebase

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAuth`](references/useAuth.md) | Reactive [Firebase Auth](https://firebase.google.com/docs/auth) binding | EXTERNAL |
| [`useFirestore`](references/useFirestore.md) | Reactive [Firestore](https://firebase.google.com/docs/firestore) binding | EXTERNAL |
| [`useRTDB`](references/useRTDB.md) | Reactive [Firebase Realtime Database](https://firebase.google.com/docs/database) binding | EXTERNAL |

### @Integrations

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAsyncValidator`](references/useAsyncValidator.md) | Wrapper for [`async-validator`](https://github.com/yiminghe/async-validator) | EXTERNAL |
| [`useAxios`](references/useAxios.md) | Wrapper for [`axios`](https://github.com/axios/axios) | EXTERNAL |
| [`useChangeCase`](references/useChangeCase.md) | Reactive wrapper for [`change-case`](https://github.com/blakeembrey/change-case) | EXTERNAL |
| [`useCookies`](references/useCookies.md) | Wrapper for [`universal-cookie`](https://www.npmjs.com/package/universal-cookie) | EXTERNAL |
| [`useDrauu`](references/useDrauu.md) | Reactive instance for [drauu](https://github.com/antfu/drauu) | EXTERNAL |
| [`useFocusTrap`](references/useFocusTrap.md) | Reactive wrapper for [`focus-trap`](https://github.com/focus-trap/focus-trap) | EXTERNAL |
| [`useFuse`](references/useFuse.md) | Easily implement fuzzy search using a hook with [Fuse.js](https://github.com/krisk/fuse) | EXTERNAL |
| [`useIDBKeyval`](references/useIDBKeyval.md) | Wrapper for [`idb-keyval`](https://www.npmjs.com/package/idb-keyval) | EXTERNAL |
| [`useJwt`](references/useJwt.md) | Wrapper for [`jwt-decode`](https://github.com/auth0/jwt-decode) | EXTERNAL |
| [`useNProgress`](references/useNProgress.md) | Reactive wrapper for [`nprogress`](https://github.com/rstacruz/nprogress) | EXTERNAL |
| [`useQRCode`](references/useQRCode.md) | Wrapper for [`qrcode`](https://github.com/soldair/node-qrcode) | EXTERNAL |
| [`useSortable`](references/useSortable.md) | Wrapper for [`sortablejs`](https://github.com/SortableJS/Sortable) | EXTERNAL |

### @Math

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createGenericProjection`](references/createGenericProjection.md) | Generic version of `createProjection` | EXTERNAL |
| [`createProjection`](references/createProjection.md) | Reactive numeric projection from one domain to another | EXTERNAL |
| [`logicAnd`](references/logicAnd.md) | `AND` condition for values | EXTERNAL |
| [`logicNot`](references/logicNot.md) | `NOT` condition for values | EXTERNAL |
| [`logicOr`](references/logicOr.md) | `OR` conditions for values | EXTERNAL |
| [`useAbs`](references/useAbs.md) | Reactive `Math.abs` | EXTERNAL |
| [`useAverage`](references/useAverage.md) | Get the average of an array reactively | EXTERNAL |
| [`useCeil`](references/useCeil.md) | Reactive `Math.ceil` | EXTERNAL |
| [`useClamp`](references/useClamp.md) | Reactively clamp a value between two other values | EXTERNAL |
| [`useFloor`](references/useFloor.md) | Reactive `Math.floor` | EXTERNAL |
| [`useMath`](references/useMath.md) | Reactive `Math` methods | EXTERNAL |
| [`useMax`](references/useMax.md) | Reactive `Math.max` | EXTERNAL |
| [`useMin`](references/useMin.md) | Reactive `Math.min` | EXTERNAL |
| [`usePrecision`](references/usePrecision.md) | Reactively set the precision of a number | EXTERNAL |
| [`useProjection`](references/useProjection.md) | Reactive numeric projection from one domain to another | EXTERNAL |
| [`useRound`](references/useRound.md) | Reactive `Math.round` | EXTERNAL |
| [`useSum`](references/useSum.md) | Get the sum of an array reactively | EXTERNAL |
| [`useTrunc`](references/useTrunc.md) | Truncates a number | EXTERNAL |

### @RxJS

| Function | Description | Invocation |
|----------|-------------|------------|
| [`toObserver`](references/toObserver.md) | Sugar function to convert a ref object (`RefObject`) or a setter function into an RxJS [Observer](https://rxjs.dev/guide/observer) — a `useRef` write does not re-render | EXTERNAL |
| [`useExtractedObservable`](references/useExtractedObservable.md) | Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more hooks | EXTERNAL |
| [`useFrom`](references/useFrom.md) | Create an [`Observable`](https://rxjs.dev/guide/observable) from an rxjs `ObservableInput` — passed straight to RxJS's [`from()`](https://rxjs.dev/api/index/function/from) — or from a plain value that re-emits whenever it changes across renders | EXTERNAL |
| [`useObservable`](references/useObservable.md) | Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) | EXTERNAL |
| [`useSubject`](references/useSubject.md) | Bind an RxJS [`Subject`](https://rxjs.dev/guide/subject) to a controllable state and propagate value changes both ways | EXTERNAL |
| [`useSubscription`](references/useSubscription.md) | Use an RxJS [`Subscription`](https://rxjs.dev/guide/subscription) without worrying about unsubscribing from it or creating memory leaks | EXTERNAL |
| [`useWatchExtractedObservable`](references/useWatchExtractedObservable.md) | Watch the values of an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more hooks | EXTERNAL |

### Factory

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createMemo`](references/createMemo.md) | Turn a pure function into a memoising hook — React port of react-use's `createMemo` | AUTO |
| [`createReducer`](references/createReducer.md) | Build a `useReducer`-shaped hook around a Redux-style middleware chain — React port of react-use's `createReducer` | AUTO |

### Lifecycle

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useDeepCompareEffect`](references/useDeepCompareEffect.md) | `useEffect` whose dependency comparison is **deep** — the effect re-runs only when `deps` differ structurally | AUTO |
| [`useEffectOnce`](references/useEffectOnce.md) | Runs an effect once after the component mounts | AUTO |
| [`useIsFirstRender`](references/useIsFirstRender.md) | `true` on the very first render of a component instance and `false` on every render after it — a React port of `@mantine/hooks`' `useIsFirstRender` (upstream mapping file: `source/mantine/packages/@mantine/hooks/src/use-is-first-render/use-is-first-render.ts` | AUTO |
| [`useIsomorphicLayoutEffect`](references/useIsomorphicLayoutEffect.md) | `useLayoutEffect` on the client | AUTO |
| [`useLogger`](references/useLogger.md) | Console-log a component's lifecycle transitions — mount | AUTO |
| [`useMount`](references/useMount.md) | Runs a callback once after the component mounts — React port of react-use's `useMount` | AUTO |
| [`useShallowCompareEffect`](references/useShallowCompareEffect.md) | `useEffect` whose dependency list is compared by one-level (shallow) equality instead of reference identity — a React port of react-use's [`useShallowCompareEffect`](https://raw.githubusercontent.com/streamich/react-use/master/docs/useShallowCompareEffect.md) (docs page fetched; the rendered `https://streamich.github.io/react-use/?path=/story/lifecycle-useshallowcompareeffect--docs` page is unverified) | AUTO |
| [`useTrackedEffect`](references/useTrackedEffect.md) | `useEffect` that also reports **which** dependencies changed — React port of ahooks' [`useTrackedEffect`](https://ahooks.js.org/hooks/use-tracked-effect) (`source/ahooks/packages/hooks/src/useTrackedEffect/`; upstream exports it as the **default** export | AUTO |
| [`useUnmount`](references/useUnmount.md) | Runs a callback when the component unmounts — React port of react-use's [`useUnmount`](https://streamich.github.io/react-use/?path=/story/lifecycle-useunmount--docs) | AUTO |
| [`useUnmountedRef`](references/useUnmountedRef.md) | A ref that reports whether the component has unmounted — React port of ahooks' [`useUnmountedRef`](https://ahooks.js.org/hooks/use-unmounted-ref) (`source/ahooks/packages/hooks/src/useUnmountedRef/`; upstream exports it as the **default** export | AUTO |
| [`useUpdateEffect`](references/useUpdateEffect.md) | `useEffect` that skips the first render — React port of react-use's [`useUpdateEffect`](https://streamich.github.io/react-use/?path=/story/lifecycle-useupdateeffect--docs) | AUTO |

### Side-effects

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useError`](references/useError.md) | Returns a referentially stable error dispatcher whose error is re-thrown from a `useEffect` on the next render | AUTO |
| [`useLockFn`](references/useLockFn.md) | Add a lock to an async function so overlapping calls are dropped rather than run in parallel — React port of ahooks' `useLockFn` | AUTO |


