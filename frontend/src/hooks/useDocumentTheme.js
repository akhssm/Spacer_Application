import { useEffect } from 'react'

/** The two brands of the app. Each layout applies one (see src/styles/index.css). */
export const THEMES = {
  spacer: { className: 'dark theme-spacer', favicon: '/favicon.svg', themeColor: '#101010' },
  iraTowers: { className: '', favicon: '/favicon-ira-towers.svg', themeColor: '#053950' },
}

function setHeadLink(rel, href) {
  const link = document.head.querySelector(`link[rel="${rel}"]`)
  if (link) link.href = href
}

function setHeadMeta(name, content) {
  const meta = document.head.querySelector(`meta[name="${name}"]`)
  if (meta) meta.content = content
}

/**
 * Applies a brand theme to the whole document while a layout is mounted: theme classes on <html>
 * (so dialogs and sheets, which render into <body>, get the same tokens), the favicon and the
 * browser's theme colour.
 */
export function useDocumentTheme({ className, favicon, themeColor }) {
  useEffect(() => {
    const root = document.documentElement
    const classes = className.split(' ').filter(Boolean)
    root.classList.add(...classes)
    setHeadLink('icon', favicon)
    setHeadMeta('theme-color', themeColor)
    return () => root.classList.remove(...classes)
  }, [className, favicon, themeColor])
}
