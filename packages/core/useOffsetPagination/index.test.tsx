import type { Dispatch, SetStateAction } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useOffsetPagination } from '../useOffsetPagination'

describe('useOffsetPagination', () => {
  it('should be defined', () => {
    expect(useOffsetPagination).toBeDefined()
  })

  it('returns plain values (mirrors upstream refs)', async () => {
    const { result } = await renderHook(() => useOffsetPagination({ total: 40, page: 1, pageSize: 10 }))

    expect(typeof result.current.currentPage).toBe('number')
    expect(typeof result.current.currentPageSize).toBe('number')
    expect(typeof result.current.pageCount).toBe('number')
    expect(typeof result.current.isFirstPage).toBe('boolean')
    expect(typeof result.current.isLastPage).toBe('boolean')
    expect(typeof result.current.prev).toBe('function')
    expect(typeof result.current.next).toBe('function')
  })

  it('returns an object with a paired setter for every writable value', async () => {
    const { result } = await renderHook(() => useOffsetPagination({ total: 40, page: 1, pageSize: 10 }))

    expect(Object.keys(result.current).sort()).toEqual([
      'currentPage',
      'currentPageSize',
      'isFirstPage',
      'isLastPage',
      'next',
      'pageCount',
      'prev',
      'setCurrentPage',
      'setCurrentPageSize',
    ])
    expect(typeof result.current.setCurrentPage).toBe('function')
    expect(typeof result.current.setCurrentPageSize).toBe('function')
  })

  describe('when page is 1', () => {
    it('returns the initial page number when prev() or next() haven\'t been called', async () => {
      const { result } = await renderHook(() => useOffsetPagination({ total: 40, page: 1, pageSize: 10 }))

      expect(result.current.currentPage).toBe(1)
    })

    it('increments after calling next() when there are still pages left', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, page: 1, pageSize: 10 }))

      await act(() => {
        result.current.next()
      })
      expect(result.current.currentPage).toBe(2)

      await act(() => {
        result.current.next()
      })
      expect(result.current.currentPage).toBe(3)
    })

    it('doesn\'t decrement after calling prev() when still on the first page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, page: 1, pageSize: 10 }))

      await act(() => {
        result.current.prev()
      })
      expect(result.current.currentPage).toBe(1)
    })

    it('doesn\'t increment past the last page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, page: 1, pageSize: 10 }))

      await act(() => {
        result.current.next()
      })
      await act(() => {
        result.current.next()
      })
      await act(() => {
        result.current.next()
      }) // this puts us on the last page
      await act(() => {
        result.current.next()
      })
      expect(result.current.currentPage).toBe(4)
    })
  })

  describe('when page is something other than 1', () => {
    it('returns the page number when prev() or next() haven\'t been called', async () => {
      const { result } = await renderHook(() => useOffsetPagination({ total: 40, page: 3, pageSize: 10 }))

      expect(result.current.currentPage).toBe(3)
    })
  })

  describe('when total is 0', () => {
    it('returns a currentPage of 1', async () => {
      const { result } = await renderHook(() => useOffsetPagination({ total: 0 }))

      expect(result.current.currentPage).toBe(1)
    })
  })

  describe('when the page is outside of the range of possible pages', () => {
    it('returns the maximum page number possible', async () => {
      let page = 0
      const { result, act, rerender } = await renderHook(() => useOffsetPagination({ total: 40, page: () => page, pageSize: 10 }))

      expect(result.current.currentPage).toBe(1)

      page = 123456 // outside maximum range
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(4)
    })

    it('clamps the lower end of the range to 1', async () => {
      let page = 1
      const { result, act, rerender } = await renderHook(() => useOffsetPagination({ total: 40, page: () => page, pageSize: 10 }))

      page = 0
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(1)

      page = -1234
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(1)
    })
  })

  describe('when the page is a getter', () => {
    it('returns the correct currentPage', async () => {
      let page = 2
      const { result, act, rerender } = await renderHook(() => useOffsetPagination({ total: 40, page: () => page, pageSize: 10 }))

      expect(result.current.currentPage).toBe(2)

      page = 3
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(3)

      page = 1
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(1)

      page = -1
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(1)
    })

    it('clamps out of range numbers to the first and last pages', async () => {
      let page = 0
      const { result, act, rerender } = await renderHook(() => useOffsetPagination({ total: 40, page: () => page, pageSize: 10 }))

      page = -1
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(1)

      page = Number.POSITIVE_INFINITY
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(4)
    })
  })

  describe('when the page is a state tuple', () => {
    it('adopts external tuple updates and writes the clamped page back', async () => {
      const source: [number, Dispatch<SetStateAction<number>>] = [2, (value) => {
        source[0] = typeof value === 'function' ? value(source[0]) : value
      }]
      const { result, act, rerender } = await renderHook(() => useOffsetPagination({ total: 40, page: source, pageSize: 10 }))

      expect(result.current.currentPage).toBe(2)

      // external mutation is adopted on re-render
      source[0] = 3
      await act(async () => {
        rerender()
      })
      expect(result.current.currentPage).toBe(3)

      // internal navigation writes the clamped value back through the tuple
      await act(async () => {
        result.current.next()
      })
      expect(source[0]).toBe(4)
      expect(result.current.currentPage).toBe(4)
    })
  })

  describe('currentPageSize', () => {
    describe('when pageSize is given as a value', () => {
      it('returns the given initial page size', async () => {
        const { result } = await renderHook(() => useOffsetPagination({ total: 45, page: 1, pageSize: 14 }))

        expect(result.current.currentPageSize).toBe(14)
      })

      it('does not change currentPageSize when navigating through to the last page', async () => {
        const { result, act } = await renderHook(() => useOffsetPagination({ total: 45, page: 1, pageSize: 14 }))

        await act(() => {
          result.current.next()
        })
        expect(result.current.currentPageSize).toBe(14)
        await act(() => {
          result.current.next()
        })
        expect(result.current.currentPageSize).toBe(14)
        await act(() => {
          result.current.next()
        })
        expect(result.current.currentPageSize).toBe(14)
        await act(() => {
          result.current.next()
        })
        expect(result.current.currentPageSize).toBe(14)
      })
    })

    describe('when pageSize changes through setCurrentPageSize', () => {
      it('changes when setCurrentPageSize is called', async () => {
        const { result, act } = await renderHook(() => useOffsetPagination({ pageSize: 11 }))

        expect(result.current.currentPageSize).toBe(11)

        await act(async () => {
          result.current.setCurrentPageSize(23)
        })
        expect(result.current.currentPageSize).toBe(23)
      })
    })

    describe('when pageSize is not given', () => {
      it('defaults to 10', async () => {
        const { result } = await renderHook(() => useOffsetPagination({ total: 45, page: 1 }))

        expect(result.current.currentPageSize).toBe(10)
      })
    })
  })

  describe('isFirstPage', () => {
    it('returns true when on the first page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, pageSize: 10 }))

      expect(result.current.isFirstPage).toBe(true)
      await act(() => {
        result.current.prev()
      })
      expect(result.current.isFirstPage).toBe(true)
    })

    it('returns false when not the first page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, pageSize: 10 }))

      await act(() => {
        result.current.next()
      })
      expect(result.current.isFirstPage).toBe(false)
      await act(() => {
        result.current.next()
      })
      expect(result.current.isFirstPage).toBe(false)
      await act(() => {
        result.current.next()
      })
      expect(result.current.isFirstPage).toBe(false)
    })
  })

  describe('isLastPage', () => {
    it('returns true when on the last page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, pageSize: 20 }))

      await act(() => {
        result.current.next()
      })
      expect(result.current.isLastPage).toBe(true)
      await act(() => {
        result.current.next()
      })
      expect(result.current.isLastPage).toBe(true)
    })

    it('returns false when not the last page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, pageSize: 20 }))

      expect(result.current.isLastPage).toBe(false)
      await act(() => {
        result.current.prev()
      })
      expect(result.current.isLastPage).toBe(false)
    })
  })

  describe('onPageChange', () => {
    it('is called when the page changes', async () => {
      const onPageChange = vi.fn()
      let page = 1
      const { act, rerender } = await renderHook(() => useOffsetPagination({ total: 50, page: () => page, onPageChange }))

      expect(onPageChange).toBeCalledTimes(0)

      page = 2
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledTimes(1)

      page = 1
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledTimes(2)

      page = 9999 // out of range, so we go to the last page
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledTimes(3)

      page = 9998 // still out of range, so we stay on the last page
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledTimes(3) // does not change
    })

    it('is called with the correct UseOffsetPaginationCallbackReturn values', async () => {
      const onPageChange = vi.fn()
      let page = 1
      const { act, rerender } = await renderHook(() => useOffsetPagination({ total: 35, page: () => page, onPageChange }))

      page = 2
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledWith({
        currentPage: 2,
        currentPageSize: 10,
        isFirstPage: false,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 4,
        prev: expect.any(Function),
      })

      page = 3
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledWith({
        currentPage: 3,
        currentPageSize: 10,
        isFirstPage: false,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 4,
        prev: expect.any(Function),
      })

      page = 4
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledWith({
        currentPage: 4,
        currentPageSize: 10,
        isFirstPage: false,
        isLastPage: true,
        next: expect.any(Function),
        pageCount: 4,
        prev: expect.any(Function),
      })

      page = 1
      await act(async () => {
        rerender()
      })
      expect(onPageChange).toBeCalledWith({
        currentPage: 1,
        currentPageSize: 10,
        isFirstPage: true,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 4,
        prev: expect.any(Function),
      })
    })
  })

  describe('onPageSizeChange', () => {
    it('is called when the page size changes', async () => {
      const onPageSizeChange = vi.fn()
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 50, pageSize: 5, onPageSizeChange }))

      expect(onPageSizeChange).toBeCalledTimes(0)

      await act(async () => {
        result.current.setCurrentPageSize(2)
      })
      expect(onPageSizeChange).toBeCalledTimes(1)

      await act(async () => {
        result.current.setCurrentPageSize(7)
      })
      expect(onPageSizeChange).toBeCalledTimes(2)
    })

    it('is called with the correct UseOffsetPaginationCallbackReturn values', async () => {
      const onPageSizeChange = vi.fn()
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, pageSize: 5, onPageSizeChange }))

      await act(async () => {
        result.current.setCurrentPageSize(3)
      })
      expect(onPageSizeChange).toBeCalledWith({
        currentPage: 1,
        currentPageSize: 3,
        isFirstPage: true,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 12,
        prev: expect.any(Function),
      })

      await act(async () => {
        result.current.setCurrentPageSize(30)
      })
      expect(onPageSizeChange).toBeCalledWith({
        currentPage: 1,
        currentPageSize: 30,
        isFirstPage: true,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 2,
        prev: expect.any(Function),
      })
    })
  })

  describe('onPageCountChange', () => {
    it('is called when the page count changes', async () => {
      const onPageCountChange = vi.fn()
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 50, pageSize: 5, onPageCountChange }))

      expect(onPageCountChange).toBeCalledTimes(0)

      await act(async () => {
        result.current.setCurrentPageSize(2)
      })
      expect(onPageCountChange).toBeCalledTimes(1)

      await act(async () => {
        result.current.setCurrentPageSize(7)
      })
      expect(onPageCountChange).toBeCalledTimes(2)
    })

    it('is called with the correct UseOffsetPaginationCallbackReturn values', async () => {
      const onPageCountChange = vi.fn()
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, pageSize: 5, onPageCountChange }))

      await act(async () => {
        result.current.setCurrentPageSize(3)
      })
      expect(onPageCountChange).toBeCalledWith({
        currentPage: 1,
        currentPageSize: 3,
        isFirstPage: true,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 12,
        prev: expect.any(Function),
      })

      await act(async () => {
        result.current.setCurrentPageSize(30)
      })
      expect(onPageCountChange).toBeCalledWith({
        currentPage: 1,
        currentPageSize: 30,
        isFirstPage: true,
        isLastPage: false,
        next: expect.any(Function),
        pageCount: 2,
        prev: expect.any(Function),
      })
    })
  })

  describe('setCurrentPage / setCurrentPageSize (React additions)', () => {
    it('setCurrentPage jumps to a page and clamps to the page range', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, pageSize: 10 }))

      await act(() => {
        result.current.setCurrentPage(3)
      })
      expect(result.current.currentPage).toBe(3)
      expect(result.current.isFirstPage).toBe(false)

      await act(() => {
        result.current.setCurrentPage(9999)
      })
      expect(result.current.currentPage).toBe(4)
      expect(result.current.isLastPage).toBe(true)

      await act(() => {
        result.current.setCurrentPage(-10)
      })
      expect(result.current.currentPage).toBe(1)
      expect(result.current.isFirstPage).toBe(true)
    })

    it('setCurrentPage accepts an updater function', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, pageSize: 10 }))

      await act(() => {
        result.current.setCurrentPage(current => current + 1)
      })
      expect(result.current.currentPage).toBe(2)
    })

    it('setCurrentPage writes the clamped page back through a reactive page', async () => {
      const source: [number, Dispatch<SetStateAction<number>>] = [1, (value) => {
        source[0] = typeof value === 'function' ? value(source[0]) : value
      }]
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, page: source, pageSize: 10 }))

      await act(() => {
        result.current.setCurrentPage(3)
      })
      expect(result.current.currentPage).toBe(3)
      expect(source[0]).toBe(3)

      await act(() => {
        result.current.setCurrentPage(9999)
      })
      expect(result.current.currentPage).toBe(4)
      expect(source[0]).toBe(4)

      await act(() => {
        result.current.setCurrentPage(-10)
      })
      expect(result.current.currentPage).toBe(1)
      expect(source[0]).toBe(1)
    })

    it('setCurrentPage works when total is omitted', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ pageSize: 10 }))

      expect(result.current.pageCount).toBe(Number.POSITIVE_INFINITY)

      await act(() => {
        result.current.setCurrentPage(3)
      })
      expect(result.current.currentPage).toBe(3)
      expect(result.current.isFirstPage).toBe(false)
    })

    it('setCurrentPageSize accepts an updater function', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 40, pageSize: 10 }))

      await act(() => {
        result.current.setCurrentPageSize(size => size + 5)
      })
      expect(result.current.currentPageSize).toBe(15)
      expect(result.current.pageCount).toBe(3)
    })

    it('setCurrentPageSize updates the page size, page count and page', async () => {
      const { result, act } = await renderHook(() => useOffsetPagination({ total: 35, page: 3, pageSize: 10 }))

      await act(() => {
        result.current.setCurrentPageSize(20)
      })
      expect(result.current.currentPageSize).toBe(20)
      expect(result.current.pageCount).toBe(2)
      // page 3 is out of range now — clamped down to the last page
      expect(result.current.currentPage).toBe(2)
      expect(result.current.isLastPage).toBe(true)

      await act(() => {
        result.current.setCurrentPageSize(0)
      })
      expect(result.current.currentPageSize).toBe(1)
    })
  })
})
