import { useMemoizedFn } from '@reause/shared'
import { memo, useCallback, useRef, useState } from 'react'

/** The memoised child both variants feed; it counts its own renders so the difference is visible. */
const ExpensiveTree = memo(({ label, onShow }: { label: string, onShow: () => void }) => {
  const rendersRef = useRef(0)
  rendersRef.current += 1

  return (
    <p>
      {`${label} child renders: ${rendersRef.current}`}
      {' '}
      <button type="button" onClick={onShow}>show count</button>
    </p>
  )
})

/**
 * Mirrors ahooks' `source/ahooks/packages/hooks/src/useMemoizedFn/demo/demo2.tsx`
 * — the same `count` state driven into two memoised children, one taking a
 * `useCallback` function and one taking a memoized one — and makes each child's
 * render count visible, which is the difference upstream's demo is about.
 *
 * Click "Add Count": the `useCallback` child re-renders on every click, because
 * its `onShow` identity follows `count`; the `useMemoizedFn` child renders once
 * and stays at one, even though its callback still reports the newest `count`
 * when its button is clicked.
 */
export default function UseMemoizedFnDemo() {
  const [count, setCount] = useState(0)
  const [shown, setShown] = useState('')

  const callbackFn = useCallback(() => setShown(`useCallback saw count ${count}`), [count])
  const memoizedFn = useMemoizedFn(() => setShown(`useMemoizedFn saw count ${count}`))

  return (
    <div>
      <p>{`count: ${count}`}</p>
      <button type="button" onClick={() => setCount(c => c + 1)}>Add Count</button>
      <p>{`last called: ${shown || '—'}`}</p>
      <ExpensiveTree label="useCallback" onShow={callbackFn} />
      <ExpensiveTree label="useMemoizedFn" onShow={memoizedFn} />
    </div>
  )
}
