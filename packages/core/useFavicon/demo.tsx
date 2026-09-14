import { useFavicon } from '@reause/core'

export default function UseFaviconDemo() {
  const [, setIcon] = useFavicon('reause.svg', {
    baseUrl: '/',
    rel: 'icon',
  })

  return (
    <div>
      <div>
        Change favicon to
      </div>
      <button onClick={() => setIcon('vueuse.svg')}>
        Vueuse
      </button>
      <button onClick={() => setIcon('reause.svg')}>
        Reause
      </button>
    </div>
  )
}
