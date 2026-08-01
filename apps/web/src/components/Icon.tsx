import type { SVGProps } from 'react'

export type IconName = 'grid' | 'folder' | 'review' | 'search' | 'audit' | 'upload' | 'file' | 'arrow' | 'chevron' | 'menu' | 'close' | 'logout' | 'check' | 'alert' | 'link'

const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  folder: <path d="M3 7.5h7l2-2h9v14H3z"/>,
  review: <><path d="M4 4h12v16H4z"/><path d="m14 15 2 2 4-5M7 8h6M7 12h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  audit: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/></>,
  upload: <><path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/></>,
  file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  arrow: <path d="m5 12 14 0m-5-5 5 5-5 5"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  alert: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v5m0 3v.1"/></>,
  link: <><path d="m10 14 4-4"/><path d="M8 17H6a4 4 0 0 1 0-8h3M16 7h2a4 4 0 0 1 0 8h-3"/></>,
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>
}
