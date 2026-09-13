import { useSet } from '@reause/shared'

export default function UseSetDemo() {
  const set = useSet<string>(['react'])

  return (
    <div>
      <p>
        Items:
        {' '}
        {[...set].join(', ') || '(empty)'}
      </p>
      <p>
        Size:
        {' '}
        {set.size}
      </p>
      <p>
        Has
        {' '}
        <code>hooks</code>
        :
        {' '}
        {String(set.has('hooks'))}
      </p>
      <button onClick={() => set.add('hooks')}>Add &quot;hooks&quot;</button>
      <button onClick={() => set.delete('react')}>Delete &quot;react&quot;</button>
      <button onClick={() => set.clear()}>Clear</button>
    </div>
  )
}
