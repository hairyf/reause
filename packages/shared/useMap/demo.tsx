import { useMap } from '@reause/shared'

export default function UseMapDemo() {
  const map = useMap<string, number>([['react', 1]])

  return (
    <div>
      <p>
        Entries:
        {' '}
        {[...map].map(([key, value]) => `${key}: ${value}`).join(', ') || '(empty)'}
      </p>
      <p>
        Size:
        {' '}
        {map.size}
      </p>
      <p>
        Get
        {' '}
        <code>hooks</code>
        :
        {' '}
        {String(map.get('hooks'))}
      </p>
      <button onClick={() => map.set('hooks', map.size + 1)}>Set &quot;hooks&quot;</button>
      <button onClick={() => map.delete('react')}>Delete &quot;react&quot;</button>
      <button onClick={() => map.clear()}>Clear</button>
    </div>
  )
}
