import { useId } from '@reause/core'

export default function UseIdDemo() {
  const id = useId()
  const staticId = useId('my-static-id')

  return (
    <div>
      <p>
        Generated id:
        {' '}
        <code>{id}</code>
      </p>
      <p>
        <label htmlFor={id}>Label bound to the generated id</label>
        {' '}
        <input id={id} placeholder="generated" />
      </p>
      <p>
        Static override:
        {' '}
        <code>{staticId}</code>
      </p>
      <p>
        <label htmlFor={staticId}>Label bound to the static id</label>
        {' '}
        <input id={staticId} placeholder="static" />
      </p>
      <p>
        The generated id starts as
        {' '}
        <code>mantine-&lt;react-id&gt;</code>
        {' '}
        so server and client markup agree, then becomes random after mount. The
        static override never changes.
      </p>
    </div>
  )
}
