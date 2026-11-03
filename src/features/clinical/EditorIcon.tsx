const paths = {
  document: 'M14 3H6a1 1 0 0 0-1 1v16h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h8',
  undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6',
  redo: 'm15 5 5 5-5 5m5-5H10a6 6 0 0 0-6 6',
  left: 'M4 5h16M4 10h10M4 15h16M4 20h10',
  center: 'M4 5h16M7 10h10M4 15h16M7 20h10',
  right: 'M4 5h16M10 10h10M4 15h16M10 20h10',
  justify: 'M4 5h16M4 10h16M4 15h16M4 20h16',
  bullets: 'M9 6h11M9 12h11M9 18h11M4 6h.1M4 12h.1M4 18h.1',
  numbers: 'M10 6h10M10 12h10M10 18h10M3 3h2v5M3 11h3v2l-3 3h3M3 19h3v3H3',
  clear: 'm4 15 9-11 7 6-9 11H7l-3-6Zm5 0 6 5M15 21h6',
  quote: 'M5 6h5v7H5v-2m0 2v4l4-4m5-7h5v7h-5v-2m0 2v4l4-4',
} as const
export function EditorIcon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
