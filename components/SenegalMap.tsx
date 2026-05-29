'use client'

/**
 * Carte stylisée du Sénégal dans la DA du site (parchment + or).
 * Met en évidence la région d'un royaume (Cayor, Baol ou Fouta-Toro)
 * et place les principales villes / capitales associées.
 *
 * Note : les contours sont volontairement simplifiés (vibe historique
 * et archives, pas précision géographique). Le but est de situer.
 */

interface SenegalMapProps {
  highlight: 'cayor' | 'baol' | 'fouta-toro'
}

// Polygones approximatifs des trois royaumes
const REGION_PATHS: Record<SenegalMapProps['highlight'], string> = {
  // Bande nord, le long du fleuve Sénégal
  'fouta-toro':
    'M 30,55 L 110,45 L 200,42 L 290,50 L 360,75 L 355,105 L 270,98 L 180,95 L 95,100 L 30,98 Z',
  // Bande côtière nord-ouest, de Saint-Louis à Cap-Vert (Dakar)
  cayor:
    'M 32,100 L 92,105 L 100,170 L 95,210 L 60,215 L 30,195 L 20,160 L 22,125 Z',
  // Centre-ouest, autour de Diourbel
  baol:
    'M 100,115 L 195,118 L 210,165 L 200,215 L 110,212 L 100,170 Z',
}

const REGION_LABELS: Record<SenegalMapProps['highlight'], { x: number; y: number; text: string }> = {
  'fouta-toro': { x: 180, y: 78, text: 'FOUTA-TORO' },
  cayor: { x: 60, y: 155, text: 'CAYOR' },
  baol: { x: 155, y: 170, text: 'BAOL' },
}

// Villes / capitales par région (avec un point + libellé)
const CITIES: Record<SenegalMapProps['highlight'], { x: number; y: number; name: string; capital?: boolean }[]> = {
  cayor: [
    { x: 30, y: 102, name: 'Saint-Louis' },
    { x: 75, y: 145, name: 'Mboul', capital: true },
    { x: 60, y: 175, name: 'Thiès' },
    { x: 35, y: 200, name: 'Dakar' },
  ],
  baol: [
    { x: 130, y: 155, name: 'Lambaye', capital: true },
    { x: 150, y: 175, name: 'Diourbel' },
    { x: 175, y: 195, name: 'Diakhao' },
  ],
  'fouta-toro': [
    { x: 70, y: 70, name: 'Podor' },
    { x: 175, y: 65, name: 'Matam' },
    { x: 295, y: 72, name: 'Bakel' },
  ],
}

export default function SenegalMap({ highlight }: SenegalMapProps) {
  const region = REGION_PATHS[highlight]
  const label = REGION_LABELS[highlight]
  const cities = CITIES[highlight]

  return (
    <div className="w-full">
      <svg
        id="kingdom-map-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 290"
        className="w-full h-auto block"
        role="img"
        aria-label={`Carte du Sénégal mettant en évidence la région du ${label.text}`}
      >
        {/* Fond océan atlantique */}
        <defs>
          <pattern id="oceanDots" patternUnits="userSpaceOnUse" width="6" height="6">
            <circle cx="1" cy="1" r="0.5" fill="#B8A07A" opacity="0.35" />
          </pattern>
          <pattern id="regionStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#F5E9C4" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C4922A" strokeWidth="1.2" opacity="0.55" />
          </pattern>
          <filter id="parchmentGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        <rect width="400" height="290" fill="url(#oceanDots)" />

        {/* Pays voisins (silhouettes pâles, juste pour le contexte) */}
        {/* Mauritanie au nord */}
        <path
          d="M 0,0 L 400,0 L 400,40 L 320,42 L 200,32 L 100,38 L 25,52 L 0,55 Z"
          fill="#F2EAD8"
          stroke="#D4C4A8"
          strokeWidth="1"
        />
        <text x="200" y="22" textAnchor="middle" className="text-[10px]" fill="#9E7B5A" fontWeight="600" letterSpacing="2">
          MAURITANIE
        </text>

        {/* Mali à l'est */}
        <path
          d="M 360,40 L 400,38 L 400,260 L 320,260 L 310,235 L 345,210 L 358,170 L 370,125 L 370,85 Z"
          fill="#F2EAD8"
          stroke="#D4C4A8"
          strokeWidth="1"
        />
        <text x="385" y="155" textAnchor="middle" className="text-[10px]" fill="#9E7B5A" fontWeight="600" letterSpacing="2" transform="rotate(90 385 155)">
          MALI
        </text>

        {/* Guinées au sud */}
        <path
          d="M 80,280 L 400,265 L 400,290 L 80,290 Z"
          fill="#F2EAD8"
          stroke="#D4C4A8"
          strokeWidth="1"
        />
        <text x="220" y="285" textAnchor="middle" className="text-[9px]" fill="#9E7B5A" fontWeight="600" letterSpacing="1.5">
          GUINÉE & GUINÉE-BISSAU
        </text>

        {/* Silhouette du Sénégal */}
        <path
          d="M 25,52 L 100,38 L 200,32 L 320,42 L 360,55 L 370,85 L 370,125 L 358,170 L 345,210 L 320,245 L 280,265 L 180,275 L 100,275 L 60,265 L 35,245 L 18,210 L 12,170 L 14,120 L 22,80 Z"
          fill="#F9F6EF"
          stroke="#705840"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Enclave Gambie (bande étroite ouest-est) */}
        <path
          d="M 18,225 L 22,212 L 250,212 L 250,232 L 22,232 Z"
          fill="#F2EAD8"
          stroke="#9E7B5A"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
        <text x="135" y="226" textAnchor="middle" className="text-[8px]" fill="#9E7B5A" fontWeight="600" letterSpacing="1">
          GAMBIE
        </text>

        {/* Fleuve Sénégal (frontière nord, trait pointillé doré) */}
        <path
          d="M 25,52 L 100,42 L 200,38 L 320,48 L 360,60"
          fill="none"
          stroke="#C4922A"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Région du royaume mis en évidence */}
        <path
          d={region}
          fill="url(#regionStripes)"
          stroke="#8B6214"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Étiquette de la région */}
        <text
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="700"
          fontSize="13"
          fill="#8B6214"
          letterSpacing="2.5"
        >
          {label.text}
        </text>

        {/* Villes / capitales de la région */}
        {cities.map((c) => (
          <g key={c.name}>
            <circle
              cx={c.x}
              cy={c.y}
              r={c.capital ? 4 : 2.6}
              fill={c.capital ? '#C4922A' : '#705840'}
              stroke="#1A0F00"
              strokeWidth={c.capital ? 1.4 : 0.8}
            />
            {c.capital && (
              <circle cx={c.x} cy={c.y} r={7} fill="none" stroke="#C4922A" strokeWidth="1" opacity="0.6" />
            )}
            <text
              x={c.x + 6}
              y={c.y + 3}
              fontFamily="Georgia, serif"
              fontWeight={c.capital ? 700 : 600}
              fontSize={c.capital ? '10' : '9'}
              fill="#1A0F00"
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* Rose des vents discrète */}
        <g transform="translate(355, 250)" opacity="0.7">
          <circle r="14" fill="#F9F6EF" stroke="#705840" strokeWidth="1" />
          <path d="M 0,-12 L 3,0 L 0,12 L -3,0 Z" fill="#705840" />
          <path d="M -12,0 L 0,-3 L 12,0 L 0,3 Z" fill="#9E7B5A" />
          <text x="0" y="-16" textAnchor="middle" fontSize="8" fill="#705840" fontWeight="700">N</text>
        </g>

        {/* Légende compacte en bas */}
        <g transform="translate(15, 268)">
          <rect width="11" height="8" fill="url(#regionStripes)" stroke="#8B6214" strokeWidth="1" />
          <text x="16" y="7" fontSize="8" fill="#705840" fontWeight="600">Territoire du royaume</text>
          <circle cx="135" cy="4" r="3" fill="#C4922A" stroke="#1A0F00" strokeWidth="1" />
          <text x="142" y="7" fontSize="8" fill="#705840" fontWeight="600">Capitale</text>
        </g>
      </svg>
    </div>
  )
}
