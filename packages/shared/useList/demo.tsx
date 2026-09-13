import { useList } from '@reause/shared'

export default function UseListDemo() {
  const [list, { set, push, updateAt, insertAt, upsert, sort, filter, removeAt, clear, reset }] = useList<number>([1, 2, 3, 4, 5])

  return (
    <div>
      <p>
        List:
        {' '}
        {JSON.stringify(list)}
      </p>
      <button onClick={() => set([1, 2, 3])}>Set to [1, 2, 3]</button>
      <button onClick={() => push(list.length + 1)}>Push next</button>
      <button onClick={() => updateAt(0, 0)}>Update index 0</button>
      <button onClick={() => insertAt(2, -1)}>Insert -1 at index 2</button>
      <button onClick={() => upsert(item => item === 3, 30)}>Upsert 3 → 30</button>
      <button onClick={() => sort((a, b) => b - a)}>Sort descending</button>
      <button onClick={() => filter(item => item % 2 === 1)}>Keep odd values</button>
      <button onClick={() => removeAt(1)}>Remove index 1</button>
      <button onClick={() => clear()}>Clear</button>
      <button onClick={() => reset()}>Reset</button>
    </div>
  )
}
