/**
 * Couronne dorée stylisée, type illustration plate.
 * 5 pointes terminées par des billes, bandeau inférieur, joyau central
 * en losange rouge. Lisible jusqu'à environ 16×16 px.
 */
export default function RoyalCrown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Couronne royale"
    >
      {/* Bandeau inférieur — légèrement plus foncé pour le volume */}
      <path
        d="M 3 17 L 21 17 L 21 21 L 3 21 Z"
        fill="#E8AA1C"
        stroke="#8B6214"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Ligne horizontale décorative sur le bandeau */}
      <line x1="3" y1="19" x2="21" y2="19" stroke="#B8861A" strokeWidth="0.6" />

      {/* Corps de la couronne — 5 pointes triangulaires se rejoignant */}
      <path
        d="
          M 3 17
          L 4 8
          L 8 14
          L 12 5
          L 16 14
          L 20 8
          L 21 17
          Z
        "
        fill="#FFC93C"
        stroke="#8B6214"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 5 billes au bout de chaque pointe */}
      <circle cx="4" cy="8" r="1.5" fill="#FFD86A" stroke="#8B6214" strokeWidth="0.7" />
      <circle cx="8" cy="5.5" r="1.5" fill="#FFD86A" stroke="#8B6214" strokeWidth="0.7" />
      <circle cx="12" cy="3" r="1.5" fill="#FFD86A" stroke="#8B6214" strokeWidth="0.7" />
      <circle cx="16" cy="5.5" r="1.5" fill="#FFD86A" stroke="#8B6214" strokeWidth="0.7" />
      <circle cx="20" cy="8" r="1.5" fill="#FFD86A" stroke="#8B6214" strokeWidth="0.7" />

      {/* Joyau central — losange rouge */}
      <path
        d="M 12 10 L 13.4 12.5 L 12 15.2 L 10.6 12.5 Z"
        fill="#D62F4E"
        stroke="#7A1C2F"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
