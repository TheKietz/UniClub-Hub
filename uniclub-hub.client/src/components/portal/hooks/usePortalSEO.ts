import { useEffect } from 'react'

interface SEOProps {
  title: string
  description?: string
  image?: string
  url?: string
  keywords?: string
}

function setMeta(nameOrProp: string, content: string, isProp = false) {
  const attr = isProp ? 'property' : 'name'
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${nameOrProp}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, nameOrProp)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function usePortalSEO({ title, description, image, url, keywords }: SEOProps) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    if (description) {
      setMeta('description', description)
      setMeta('og:description', description, true)
      setMeta('twitter:description', description)
    }
    if (keywords) setMeta('keywords', keywords)

    setMeta('og:title', title, true)
    setMeta('og:type', 'website', true)
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)

    if (image) {
      setMeta('og:image', image, true)
      setMeta('twitter:image', image)
    }
    if (url) {
      setMeta('og:url', url, true)
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?? (() => {
          const el = document.createElement('link')
          el.setAttribute('rel', 'canonical')
          document.head.appendChild(el)
          return el
        })()
      canonical.setAttribute('href', url)
    }

    return () => {
      document.title = prevTitle
    }
  }, [title, description, image, url, keywords])
}
