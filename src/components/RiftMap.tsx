/** Stylised top-down Summoner's Rift (blue base bottom-left, red base top-right). */
export default function RiftMap() {
  return (
    <svg viewBox="0 0 100 100" className="map-bg" aria-hidden>
      <defs>
        <radialGradient id="g-land" cx="50%" cy="50%" r="75%">
          <stop offset="0" stopColor="#1c3b2c" /><stop offset="1" stopColor="#0c1f17" />
        </radialGradient>
        <linearGradient id="g-river" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b6f93" /><stop offset=".5" stopColor="#2a95b5" /><stop offset="1" stopColor="#1b6f93" />
        </linearGradient>
        <radialGradient id="g-blue"><stop offset="0" stopColor="#4aa3ff" stopOpacity=".95" /><stop offset="1" stopColor="#4aa3ff" stopOpacity="0" /></radialGradient>
        <radialGradient id="g-red"><stop offset="0" stopColor="#ff5a5a" stopOpacity=".95" /><stop offset="1" stopColor="#ff5a5a" stopOpacity="0" /></radialGradient>
        <pattern id="p-grass" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".35" fill="#2a5a40" opacity=".5" /><circle cx="3" cy="3" r=".3" fill="#2a5a40" opacity=".4" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#g-land)" />
      <rect width="100" height="100" fill="url(#p-grass)" />
      {/* river (top-left to bottom-right) */}
      <path d="M-4 6 L6 -4 L104 94 L94 104 Z" fill="url(#g-river)" opacity=".85" />
      <path d="M-4 6 L6 -4 L104 94 L94 104 Z" fill="none" stroke="#7fd6ee" strokeOpacity=".35" strokeWidth=".4" />
      {/* jungle blobs */}
      <g fill="#14301f" stroke="#2f6b49" strokeOpacity=".4" strokeWidth=".3">
        <path d="M18 58 q8 -10 18 -2 q8 10 -2 18 q-14 6 -16 -16z" />
        <path d="M55 82 q10 -8 18 0 q6 8 -4 12 q-14 2 -14 -12z" />
        <path d="M82 40 q-8 10 -18 2 q-8 -10 2 -18 q14 -6 16 16z" />
        <path d="M45 18 q-10 8 -18 0 q-6 -8 4 -12 q14 -2 14 12z" />
      </g>
      {/* lanes */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#0a1410" strokeWidth="8.4"><path d="M10 90 L10 10 L90 10" /><path d="M10 90 L90 10" /><path d="M10 90 L90 90 L90 10" /></g>
        <g stroke="#8b7a4f" strokeWidth="7" opacity=".9"><path d="M10 90 L10 10 L90 10" /><path d="M10 90 L90 10" /><path d="M10 90 L90 90 L90 10" /></g>
        <g stroke="#c8aa6e" strokeWidth=".5" strokeDasharray="1.2 2.2" opacity=".7"><path d="M10 90 L10 10 L90 10" /><path d="M10 90 L90 10" /><path d="M10 90 L90 90 L90 10" /></g>
      </g>
      {/* baron + dragon pits */}
      <circle cx="30" cy="30" r="5.6" fill="#2a1747" stroke="#a572ff" strokeWidth=".5" />
      <circle cx="70" cy="70" r="5.6" fill="#3a2410" stroke="#ffb454" strokeWidth=".5" />
      <text x="30" y="30.9" fontSize="1.9" fill="#d7bfff" textAnchor="middle" fontWeight="700">BARON</text>
      <text x="70" y="70.9" fontSize="1.9" fill="#ffd9a3" textAnchor="middle" fontWeight="700">DRAGON</text>
      {/* bases */}
      <circle cx="10" cy="90" r="16" fill="url(#g-blue)" />
      <circle cx="90" cy="10" r="16" fill="url(#g-red)" />
      <circle cx="10" cy="90" r="5" fill="#1d4f9a" stroke="#8cc4ff" strokeWidth=".6" />
      <circle cx="90" cy="10" r="5" fill="#9a2a2a" stroke="#ff9c9c" strokeWidth=".6" />
      {/* towers */}
      <g fill="#c8aa6e" stroke="#0a1410" strokeWidth=".3">
        {[[10, 72], [10, 52], [28, 10], [48, 10], [28, 72], [72, 90], [52, 90], [90, 28], [90, 48], [72, 28], [38, 62], [62, 38]].map(([x, y], i) => (
          <rect key={i} x={x - 1.2} y={y - 1.2} width="2.4" height="2.4" rx=".5" />
        ))}
      </g>
    </svg>
  )
}
