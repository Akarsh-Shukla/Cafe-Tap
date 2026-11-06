const P = {
  menu: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2', offers: 'M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01',
  wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01', review: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  feedback: 'M4 5h16v11H9l-5 4V5z', edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4', arrow: 'M5 12h14M13 6l6 6-6 6', check: 'M5 12.5l4.5 4.5L19 7', x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7', plus: 'M12 5v14M5 12h14', left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', home: 'M4 11l8-7 8 7v9H4z',
  whatsapp: 'M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z',
}
export const Ico = ({ n, s = 24, w = 1.7 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={P[n]} /></svg>
