import { createCn } from 'cn/config'

/**
 * Class merger aware of this project's custom theme values. Without this, a custom font size
 * such as `text-display` is mistaken for a text colour and silently dropped when combined
 * with e.g. `text-navy-900`. Keep in sync with the `--text-*` sizes in src/index.css.
 */
export const cn = createCn({
  extend: { classGroups: { 'font-size': [{ text: ['display', 'title', 'stat'] }] } },
})
