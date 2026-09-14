import { useCallback, useEffect, useState } from 'react'

const topVarName = '--vueuse-safe-area-top'
const rightVarName = '--vueuse-safe-area-right'
const bottomVarName = '--vueuse-safe-area-bottom'
const leftVarName = '--vueuse-safe-area-left'

type VarName
  = | '--vueuse-safe-area-top'
    | '--vueuse-safe-area-right'
    | '--vueuse-safe-area-bottom'
    | '--vueuse-safe-area-left'

export interface UseScreenSafeAreaReturn {
  top: string
  right: string
  bottom: string
  left: string
  update: () => void
}

/**
 * Map from @vueuse/core `useScreenSafeArea`
 * (`source/vueuse/packages/core/useScreenSafeArea/`).
 *
 * @example
 * const { top, right, bottom, left, update } = useScreenSafeArea()
 */
export function useScreenSafeArea(): UseScreenSafeAreaReturn {
  const [safeArea, setSafeArea] = useState({ top: '', right: '', bottom: '', left: '' })

  const update = useCallback(() => {
    if (typeof document === 'undefined')
      return

    setSafeArea({
      top: getValue(topVarName),
      right: getValue(rightVarName),
      bottom: getValue(bottomVarName),
      left: getValue(leftVarName),
    })
  }, [])

  useEffect(() => {
    const style = document.documentElement.style
    style.setProperty(topVarName, 'env(safe-area-inset-top, 0px)')
    style.setProperty(rightVarName, 'env(safe-area-inset-right, 0px)')
    style.setProperty(bottomVarName, 'env(safe-area-inset-bottom, 0px)')
    style.setProperty(leftVarName, 'env(safe-area-inset-left, 0px)')

    update()

    let timer: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(update, 200)
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [update])

  return {
    ...safeArea,
    update,
  }
}

function getValue(position: VarName) {
  return getComputedStyle(document.documentElement).getPropertyValue(position)
}
