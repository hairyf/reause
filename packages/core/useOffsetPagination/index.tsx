import type { State } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import { clamp, noop, toValue, writeState } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Whether a `State<T>` source is reactive — getters, `[value, setter]` tuples and `{ value,
 * onChange }` pairs can all change without the caller passing a new plain value. A plain value is
 * static for the lifetime of the hook unless the caller re-renders with a new one; a React ref is
 * **not** a state source (it is a DOM handle, read with `unrefElement` in DOM hooks), so a `{
 * current }` object is treated as an ordinary plain value.
 */
function isReactiveState<T>(source: State<T> | undefined | null): boolean {
  if (source === null || source === undefined)
    return false
  if (typeof source === 'function')
    return true
  if (Array.isArray(source) && source.length === 2 && typeof source[1] === 'function')
    return true
  return typeof source === 'object'
    && !Array.isArray(source)
    && 'value' in source
    // mirrors `toValue`: a DOM-like `{ value }` (an input element) is a plain
    // value, not a `{ value, onChange }` state pair
    && !('addEventListener' in source)
}

export interface UseOffsetPaginationOptions {
  /**
   * Total number of items. A read-only value source — pass a plain number.
   */
  total?: number

  /**
   * The number of items to display per page. A read-only value source — pass a plain number. Only
   * the initial value is adopted; navigate with `setCurrentPageSize`.
   * @default 10
   */
  pageSize?: number

  /**
   * The current page number. Controllable — the hook writes it back, so it accepts a React
   * `State<number>`: a plain number, a getter, a `[value, setter]` state tuple or a `{ value,
   * onChange }` pair — resolved with `toValue`. A React ref is not a state source and is not
   * accepted.
   * @default 1
   */
  page?: State<number>

  /**
   * Callback when the `page` change.
   */
  onPageChange?: (returnValue: UseOffsetPaginationCallbackReturn) => unknown

  /**
   * Callback when the `pageSize` change.
   */
  onPageSizeChange?: (returnValue: UseOffsetPaginationCallbackReturn) => unknown

  /**
   * Callback when the `pageCount` change.
   */
  onPageCountChange?: (returnValue: UseOffsetPaginationCallbackReturn) => unknown
}

export interface UseOffsetPaginationReturn {
  /** Current page number, clamped to `[1, pageCount]`. */
  readonly currentPage: number
  /** Current number of items displayed per page, clamped to `>= 1`. */
  readonly currentPageSize: number
  /** Total number of pages. */
  readonly pageCount: number
  /** Whether the current page is the first one. */
  readonly isFirstPage: boolean
  /** Whether the current page is the last one. */
  readonly isLastPage: boolean
  /** Go to the previous page (no-op on the first page). */
  readonly prev: () => void
  /** Go to the next page (no-op on the last page). */
  readonly next: () => void
  /**
   * Set the current page directly, clamped to `[1, pageCount]` — the setter half of the writable
   * `currentPage`. React addition — upstream assigns `currentPage.value = n` on a Vue ref.
   */
  readonly setCurrentPage: Dispatch<SetStateAction<number>>
  /**
   * Set the current page size directly, clamped to `>= 1` — the setter half of the writable
   * `currentPageSize`. React addition — upstream assigns `currentPageSize.value = n` on a Vue ref.
   */
  readonly setCurrentPageSize: Dispatch<SetStateAction<number>>
}

/**
 * Snapshot passed to the `onPageChange` / `onPageSizeChange` / `onPageCountChange` callbacks — the
 * upstream members only, without the setters.
 */
export type UseOffsetPaginationCallbackReturn = Omit<UseOffsetPaginationReturn, 'setCurrentPage' | 'setCurrentPageSize'>

export type UseOffsetPaginationInfinityPageReturn = Omit<UseOffsetPaginationReturn, 'isLastPage'>

/**
 * Map from @vueuse/core `useOffsetPagination`
 * (`source/vueuse/packages/core/useOffsetPagination/`).
 *
 * @example
 * const {
 *   currentPage,
 *   setCurrentPage,
 *   currentPageSize,
 *   setCurrentPageSize,
 *   pageCount,
 *   isFirstPage,
 *   isLastPage,
 *   prev,
 *   next,
 * } = useOffsetPagination({
 *   total: 40,
 *   page: 1,
 *   pageSize: 10,
 *   onPageChange: ({ currentPage, currentPageSize }) => fetchData(currentPage, currentPageSize),
 * })
 */
export function useOffsetPagination(options: Omit<UseOffsetPaginationOptions, 'total'>): UseOffsetPaginationInfinityPageReturn
export function useOffsetPagination(options: UseOffsetPaginationOptions): UseOffsetPaginationReturn
export function useOffsetPagination(options: UseOffsetPaginationOptions): UseOffsetPaginationReturn {
  const {
    total = Number.POSITIVE_INFINITY,
    pageSize = 10,
    page = 1,
    onPageChange = noop,
    onPageSizeChange = noop,
    onPageCountChange = noop,
  } = options

  // latest-value refs so stable callbacks and effects always read current options
  const pageRef = useRef(page)
  pageRef.current = page
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange
  const onPageSizeChangeRef = useRef(onPageSizeChange)
  onPageSizeChangeRef.current = onPageSizeChange
  const onPageCountChangeRef = useRef(onPageCountChange)
  onPageCountChangeRef.current = onPageCountChange

  const isPageReactive = isReactiveState(page)
  const isPageReactiveRef = useRef(isPageReactive)
  isPageReactiveRef.current = isPageReactive

  // upstream: currentPageSize = useClamp(pageSize, 1, Infinity) — `pageSize`
  // is a read-only value source, so only the initial value is adopted
  const [currentPageSize, setCurrentPageSize] = useState(() => Math.max(1, pageSize))

  // upstream: pageCount = computed(...)
  const pageCount = Math.max(1, Math.ceil(total / currentPageSize))
  const pageCountRef = useRef(pageCount)
  pageCountRef.current = pageCount

  // upstream: currentPage = useClamp(page, 1, pageCount)
  const [currentPage, setCurrentPage] = useState(() => clamp(toValue(pageRef.current), 1, pageCount))

  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === pageCount

  // --- controls (React additions — upstream writes the Vue refs directly) ---
  const setCurrentPageControl = useCallback((value: SetStateAction<number>) => {
    setCurrentPage((current) => {
      const next = typeof value === 'function' ? value(current) : value
      const clamped = clamp(next, 1, pageCountRef.current)
      return current === clamped ? current : clamped
    })
  }, [])

  const setCurrentPageSizeControl = useCallback((value: SetStateAction<number>) => {
    setCurrentPageSize((current) => {
      const next = typeof value === 'function' ? value(current) : value
      const clamped = Math.max(1, next)
      return current === clamped ? current : clamped
    })
  }, [])

  const prev = useCallback(() => {
    setCurrentPage(current => Math.max(1, current - 1))
  }, [])

  const next = useCallback(() => {
    setCurrentPage(current => Math.min(pageCountRef.current, current + 1))
  }, [])

  // snapshot handed to the change callbacks — mirrors upstream's
  // `reactive(returnValue)` (upstream members only, no setters)
  const returnValue: UseOffsetPaginationCallbackReturn = {
    currentPage,
    currentPageSize,
    pageCount,
    isFirstPage,
    isLastPage,
    prev,
    next,
  }
  const returnValueRef = useRef(returnValue)
  returnValueRef.current = returnValue

  // --- controllable `page` two-way sync (upstream: syncRef(page/currentPage, 'both')) ---
  // A single reconciliation runs after every render: a source value we did not
  // write ourselves is adopted, otherwise an internal change is written back.
  // Two independent effects (adopt + write-back) would ping-pong, because the
  // adoption effect always runs before the write-back effect in the same
  // commit and each would see the other's stale value.
  const lastSyncedPageRef = useRef<number>(currentPage)
  useEffect(() => {
    if (!isPageReactiveRef.current)
      return

    const rawSource = toValue(pageRef.current)
    const sourceValue = clamp(rawSource, 1, pageCountRef.current)
    if (sourceValue !== lastSyncedPageRef.current) {
      // external mutation → adopt it and normalize the source
      lastSyncedPageRef.current = sourceValue
      setCurrentPage(sourceValue)
      writeState(pageRef.current, sourceValue)
      return
    }
    if (currentPage !== lastSyncedPageRef.current) {
      // internal change → write it back through the source
      lastSyncedPageRef.current = currentPage
      writeState(pageRef.current, currentPage)
      return
    }
    if (rawSource !== currentPage) {
      // an out-of-range source value is normalized to the clamped page
      writeState(pageRef.current, currentPage)
    }
  })

  // clamp currentPage down when pageCount shrinks (upstream useClamp bound)
  useEffect(() => {
    setCurrentPage(current => Math.min(current, pageCountRef.current))
  }, [pageCount])

  // --- change callbacks (upstream: watch(...)) — skip the initial value ---
  const prevCurrentPageRef = useRef(currentPage)
  useEffect(() => {
    const prev = prevCurrentPageRef.current
    prevCurrentPageRef.current = currentPage
    if (prev !== currentPage)
      onPageChangeRef.current(returnValueRef.current)
  }, [currentPage])

  const prevCurrentPageSizeRef = useRef(currentPageSize)
  useEffect(() => {
    const prev = prevCurrentPageSizeRef.current
    prevCurrentPageSizeRef.current = currentPageSize
    if (prev !== currentPageSize)
      onPageSizeChangeRef.current(returnValueRef.current)
  }, [currentPageSize])

  const prevPageCountRef = useRef(pageCount)
  useEffect(() => {
    const prev = prevPageCountRef.current
    prevPageCountRef.current = pageCount
    if (prev !== pageCount)
      onPageCountChangeRef.current(returnValueRef.current)
  }, [pageCount])

  return {
    currentPage,
    setCurrentPage: setCurrentPageControl,
    currentPageSize,
    setCurrentPageSize: setCurrentPageSizeControl,
    pageCount,
    isFirstPage,
    isLastPage,
    prev,
    next,
  }
}
