import React, { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IcenRecord {
  year: number;
  month: number;
  value: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ICEN classification thresholds (ENFEN 2024)
const CATEGORIES = [
  // El Niño (positive) — left side
  { label: 'Extraordinaria', min: 3.5, max: Infinity, color: '#cc0000', side: 'nino' },
  { label: 'Fuerte', min: 2.1, max: 3.5, color: '#ff2060', side: 'nino' },
  { label: 'Moderada', min: 1.3, max: 2.1, color: '#ff6080', side: 'nino' },
  { label: 'Débil', min: 0.5, max: 1.3, color: '#ffaabb', side: 'nino' },
  { label: 'Neutro', min: -0.7, max: 0.5, color: '#aaaaaa', side: 'neutro' },
  // La Niña (negative) — right side
  { label: 'Débil', min: -1.1, max: -0.7, color: '#aaddff', side: 'nina' },
  { label: 'Moderada', min: -1.3, max: -1.1, color: '#2255ff', side: 'nina' },
  { label: 'Fuerte', min: -Infinity, max: -1.3, color: '#0011cc', side: 'nina' },
];

// ─── Data Parsing ─────────────────────────────────────────────────────────────
function parseIcenData(raw: string): IcenRecord[] {
  return raw
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('%'))
    .map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) return null;
      return { year: +parts[0], month: +parts[1], value: +parts[2] };
    })
    .filter((r): r is IcenRecord => r !== null && !isNaN(r.value));
}

function getCategory(value: number) {
  for (const cat of CATEGORIES) {
    if (value >= cat.min && value < cat.max) return cat;
  }
  return CATEGORIES[4]; // neutro
}

// ─── SVG Gauge ────────────────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function ringSlice(cx: number, cy: number, r1: number, r2: number, startDeg: number, endDeg: number): string {
  const s1 = polarToCartesian(cx, cy, r1, startDeg);
  const e1 = polarToCartesian(cx, cy, r1, endDeg);
  const s2 = polarToCartesian(cx, cy, r2, startDeg);
  const e2 = polarToCartesian(cx, cy, r2, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${r2} ${r2} 0 ${large} 0 ${s2.x} ${s2.y}`,
    'Z',
  ].join(' ');
}

// Gauge spans from 180° (left) through 270° (top) to 360° (right) — upper semicircle.
// In SVG: 0°=right, 90°=down, 180°=left, 270°=UP.
// Value +4 → 180° (El Niño, left), Value -4 → 360° (La Niña, right), 0 → 270° (top).
function valueToAngle(value: number): number {
  const clamped = Math.max(-4, Math.min(4, value));
  return 360 - ((clamped + 4) / 8) * 180;
}

interface GaugeProps {
  latest: IcenRecord | null;
  loading: boolean;
}

const IcenGauge: React.FC<GaugeProps> = ({ latest, loading }) => {
  const CX = 260, CY = 220, R_OUTER = 190, R_INNER = 125;

  // Gauge segments definition: [startVal, endVal, color, ninoLabel, ninaLabel]
  // We map value range [-4, 4] to angles [0°, 180°]
  const segments: Array<{ vMin: number; vMax: number; color: string }> = [
    { vMin: 3.5, vMax: 4.0, color: '#cc0000' }, // El Niño Extraordinaria
    { vMin: 2.1, vMax: 3.5, color: '#ff2060' }, // El Niño Fuerte
    { vMin: 1.3, vMax: 2.1, color: '#ff6080' }, // El Niño Moderada
    { vMin: 0.5, vMax: 1.3, color: '#ffaabb' }, // El Niño Débil
    { vMin: -0.7, vMax: 0.5, color: '#888888' }, // Neutro
    { vMin: -1.1, vMax: -0.7, color: '#aaddff' }, // La Niña Débil
    { vMin: -1.3, vMax: -1.1, color: '#2255ff' }, // La Niña Moderada
    { vMin: -4.0, vMax: -1.3, color: '#0011cc' }, // La Niña Fuerte
  ];

  const needleAngle = latest ? valueToAngle(latest.value) : 270; // 270° = top
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = R_INNER - 10;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY + needleLen * Math.sin(needleRad);

  const label = latest ? getCategory(latest.value) : null;
  const monthLabel = latest
    ? `${MONTH_NAMES[latest.month - 1]} ${latest.year}`
    : '…';
  const valueLabel = latest
    ? `${latest.value >= 0 ? '+' : ''}${latest.value.toFixed(2)}°C`
    : '';

  const labelRadius = R_OUTER + 32;

  const segLabels = [
    { vMid: 3.75, text: 'Extraordinaria' },
    { vMid: 2.8, text: 'Fuerte' },
    { vMid: 1.7, text: 'Moderada' },
    { vMid: 0.9, text: 'Débil' },
    { vMid: -0.1, text: 'Neutro' },
    { vMid: -0.9, text: 'Débil' },
    { vMid: -1.2, text: 'Moderada' },
    { vMid: -2.65, text: 'Fuerte' },
  ];

  return (
    <div className="c-icen-gauge-wrap">
      <svg
        viewBox="-80 -60 680 360"
        className="c-icen-gauge-svg"
        aria-label="Gauge semicircular ICEN"
      >
        {/* Background ring segments */}
        {segments.map((seg, i) => {
          const aStart = valueToAngle(seg.vMax);
          const aEnd = valueToAngle(seg.vMin);
          return (
            <path
              key={i}
              d={ringSlice(CX, CY, R_INNER, R_OUTER, aStart, aEnd)}
              fill={seg.color}
              opacity={0.85}
              stroke="rgba(3,3,5,0.6)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Outer arc border — clockwise from 180° to 360° (upper arc) */}
        <path
          d={`M ${CX - R_OUTER} ${CY} A ${R_OUTER} ${R_OUTER} 0 1 1 ${CX + R_OUTER} ${CY}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />

        {/* Segment labels */}
        {segLabels.map((lbl, i) => {
          const a = valueToAngle(lbl.vMid);
          const p = polarToCartesian(CX, CY, labelRadius, a);
          // a is in 180–360 range; label anchoring by horizontal position
          const isLeft = a < 220;   // left side of arc
          const isRight = a > 320;  // right side of arc
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor={isLeft ? 'end' : isRight ? 'start' : 'middle'}
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="11"
              fontFamily="Space Grotesk, sans-serif"
            >
              {lbl.text}
            </text>
          );
        })}

        {/* Needle */}
        {!loading && latest && (
          <>
            <line
              x1={CX} y1={CY}
              x2={nx} y2={ny}
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r="8" fill="white" />
          </>
        )}

        {/* Center value label — below the flat base */}
        {!loading && latest && (
          <>
            <text
              x={CX} y={CY + 40}
              textAnchor="middle"
              fill="white"
              fontSize="20"
              fontWeight="700"
              fontFamily="Space Grotesk, sans-serif"
            >
              {valueLabel}
            </text>
            <text
              x={CX} y={CY + 62}
              textAnchor="middle"
              fill="rgba(255,255,255,0.6)"
              fontSize="12"
              fontFamily="Space Grotesk, sans-serif"
            >
              {monthLabel}
            </text>
          </>
        )}

        {/* Footer labels — flush with the flat ends */}
        <text x={CX - R_OUTER - 10} y={CY + 5} textAnchor="end" fill="#ff2060" fontSize="13" fontWeight="700" fontFamily="Space Grotesk, sans-serif">El Niño</text>
        <text x={CX + R_OUTER + 10} y={CY + 5} textAnchor="start" fill="#2255ff" fontSize="13" fontWeight="700" fontFamily="Space Grotesk, sans-serif">La Niña</text>

        {/* Loading state */}
        {loading && (
          <text x={CX} y={CY} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="Space Grotesk, sans-serif">
            Cargando…
          </text>
        )}
      </svg>

      {/* Category badge */}
      {!loading && label && (
        <div className="c-icen-badge" style={{ borderColor: label.color, color: label.color }}>
          <span className="c-icen-badge__side">
            {label.side === 'nino' ? 'El Niño' : label.side === 'nina' ? 'La Niña' : 'Neutro'}
          </span>
          <span className="c-icen-badge__level">{label.label}</span>
        </div>
      )}
    </div>
  );
};


// ─── Main Section ─────────────────────────────────────────────────────────────
export default function IcenSection() {
  const [data, setData] = useState<IcenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const PROXY = 'https://felicidad.com.pe/testdeafinidad/datos?url=';
    const TARGET = encodeURIComponent('http://met.igp.gob.pe/datos/ICEN.txt');

    fetch(`${PROXY}${TARGET}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.text();
      })
      .then(txt => {
        const records = parseIcenData(txt);
        if (records.length === 0) throw new Error('Sin datos');
        setData(records);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo cargar el ICEN. Verifica tu conexión.');
        setLoading(false);
      });
  }, []);

  const latest = data.length ? data[data.length - 1] : null;

  // Three-month label
  const threeMonthLabel = (() => {
    if (!latest || data.length < 3) return '';
    const months = data.slice(-3).map(r => MONTH_NAMES[r.month - 1]);
    return months.join('-');
  })();

  return (
    <section id="icen" className="o-section o-section--bordered-surface">
      <div className="o-container">
        <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
          <span className="c-section-header__subtitle">Monitoreo ENFEN · IGP</span>
          <h2 className="c-section-header__title">
            Índice Costero El Niño&nbsp;<span className="u-text-orange">(ICEN)</span>
          </h2>
          <p className="c-section-header__desc">
            Media corrida de 3 meses de las anomalías de TSM (ERSSTv5) en la región Niño 1+2.
            Climatologías calculadas cada 5 años (última: 1991–2020).
            Fuente: <a href="http://met.igp.gob.pe/datos/lista_eventos_ICEN.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent-cyan)' }}>IGP / ENFEN</a>.
          </p>
        </header>

        <div className="c-icen-layout js-reveal" style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
          {/* Gauge */}
          <div className="c-icen-gauge-col">
            <h3 className="c-icen-gauge-title">
              Índice ICEN — El Niño Costero
            </h3>
            {threeMonthLabel && latest && (
              <p className="c-icen-gauge-subtitle">
                {threeMonthLabel}: <strong style={{ color: latest.value >= 0.4 ? '#ff6080' : latest.value <= -0.4 ? '#2255ff' : '#aaa' }}>
                  {latest.value >= 0 ? '+' : ''}{latest.value.toFixed(2)}°C
                </strong>
              </p>
            )}
            {error ? (
              <p className="c-icen-error">{error}</p>
            ) : (
              <IcenGauge latest={latest} loading={loading} />
            )}
          </div>

          {/* Right panel: historical sparkline + legend */}
          <div className="c-icen-info-col">
            <div className="c-icen-legend">
              <h4 className="c-icen-legend__title">Clasificación ENFEN 2024</h4>
              <div className="c-icen-legend__grid">
                <div className="c-icen-legend__group">
                  <span className="c-icen-legend__heading" style={{ color: '#ff6080' }}>El Niño</span>
                  {[
                    { label: 'Extraordinaria', color: '#cc0000', range: '> +3.5' },
                    { label: 'Fuerte', color: '#ff2060', range: '+2.1 a +3.5' },
                    { label: 'Moderada', color: '#ff6080', range: '+1.3 a +2.1' },
                    { label: 'Débil', color: '#ffaabb', range: '+0.5 a +1.3' },
                  ].map(item => (
                    <div key={item.label} className="c-icen-legend__item">
                      <span className="c-icen-legend__swatch" style={{ background: item.color }} />
                      <span className="c-icen-legend__label">{item.label}</span>
                      <span className="c-icen-legend__range">{item.range}</span>
                    </div>
                  ))}
                </div>

                <div className="c-icen-legend__group">
                  <span className="c-icen-legend__heading" style={{ color: '#aaaaaa' }}>Neutro</span>
                  <div className="c-icen-legend__item">
                    <span className="c-icen-legend__swatch" style={{ background: '#888888' }} />
                    <span className="c-icen-legend__label">Neutro</span>
                    <span className="c-icen-legend__range">-0.7 a +0.5</span>
                  </div>
                </div>

                <div className="c-icen-legend__group">
                  <span className="c-icen-legend__heading" style={{ color: '#2255ff' }}>La Niña</span>
                  {[
                    { label: 'Débil', color: '#aaddff', range: '-1.1 a -0.7' },
                    { label: 'Moderada', color: '#2255ff', range: '-1.3 a -1.1' },
                    { label: 'Fuerte', color: '#0011cc', range: '< -1.3' },
                  ].map(item => (
                    <div key={item.label} className="c-icen-legend__item">
                      <span className="c-icen-legend__swatch" style={{ background: item.color }} />
                      <span className="c-icen-legend__label">{item.label}</span>
                      <span className="c-icen-legend__range">{item.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </section>
  );
}
