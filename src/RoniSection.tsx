import React, { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RoniRecord {
  seas: string;   // e.g. "MJJ"
  year: number;
  total: number;
  anom: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Maps the 3-char season code to a display label (center month label)
const SEAS_LABEL: Record<string, string> = {
  DJF: 'Dic-Ene-Feb', JFM: 'Ene-Feb-Mar', FMA: 'Feb-Mar-Abr',
  MAM: 'Mar-Abr-May', AMJ: 'Abr-May-Jun', MJJ: 'May-Jun-Jul',
  JJA: 'Jun-Jul-Ago', JAS: 'Jul-Ago-Sep', ASO: 'Ago-Sep-Oct',
  SON: 'Sep-Oct-Nov', OND: 'Oct-Nov-Dic', NDJ: 'Nov-Dic-Ene',
};

// RONI classification (same thresholds as ONI standard, ±0.5 / 1.0 / 1.5 / 2.0)
const CATEGORIES = [
  { label: 'Muy Fuerte', min: 2.0, max: Infinity, color: '#aa0000', side: 'nino' },
  { label: 'Fuerte', min: 1.5, max: 2.0, color: '#ff1a55', side: 'nino' },
  { label: 'Moderado', min: 1.0, max: 1.5, color: '#ff6688', side: 'nino' },
  { label: 'Débil', min: 0.5, max: 1.0, color: '#ffbbcc', side: 'nino' },
  { label: 'Neutro', min: -0.5, max: 0.5, color: '#888888', side: 'neutro' },
  { label: 'Débil', min: -1.0, max: -0.5, color: '#aaddff', side: 'nina' },
  { label: 'Moderada', min: -1.5, max: -1.0, color: '#2255ee', side: 'nina' },
  { label: 'Fuerte', min: -2.0, max: -1.5, color: '#0011cc', side: 'nina' },
  { label: 'Muy Fuerte', min: -Infinity, max: -2.0, color: '#000077', side: 'nina' },
];

// ─── Data Parsing ─────────────────────────────────────────────────────────────
function parseOniData(raw: string): RoniRecord[] {
  return raw
    .split('\n')
    .slice(1) // skip header line
    .filter(line => line.trim() && !line.startsWith('%') && !line.startsWith('SEAS'))
    .map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) return null;

      const rawAnom = +parts[2];

      return {
        seas: parts[0],
        year: +parts[1],
        anom: isNaN(rawAnom) ? NaN : Math.round(rawAnom * 10) / 10,
      };
    })
    .filter((r): r is RoniRecord => r !== null && !isNaN(r.anom));
}

function getCategory(value: number) {
  for (const cat of CATEGORIES) {
    if (value >= cat.min && value < cat.max) return cat;
  }
  return CATEGORIES[4]; // neutro fallback
}

// ─── SVG Gauge (mirrors ICEN gauge pattern) ───────────────────────────────────
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

// Upper semicircle: 180° (El Niño left) → 270° (top) → 360° (La Niña right)
function valueToAngle(value: number): number {
  const clamped = Math.max(-3, Math.min(3, value));
  return 360 - ((clamped + 3) / 6) * 180;
}

interface GaugeProps {
  latest: RoniRecord | null;
  loading: boolean;
}

const RoniGauge: React.FC<GaugeProps> = ({ latest, loading }) => {
  const CX = 260, CY = 220, R_OUTER = 190, R_INNER = 125;

  const segments: Array<{ vMin: number; vMax: number; color: string }> = [
    { vMin: 2.0, vMax: 3.0, color: '#aa0000' }, // Muy Fuerte El Niño
    { vMin: 1.5, vMax: 2.0, color: '#ff1a55' }, // Fuerte El Niño
    { vMin: 1.0, vMax: 1.5, color: '#ff6688' }, // Moderado El Niño
    { vMin: 0.5, vMax: 1.0, color: '#ffbbcc' }, // Débil El Niño
    { vMin: -0.5, vMax: 0.5, color: '#888888' }, // Neutro
    { vMin: -1.0, vMax: -0.5, color: '#aaddff' }, // Débil La Niña
    { vMin: -1.5, vMax: -1.0, color: '#2255ee' }, // Moderada La Niña
    { vMin: -2.0, vMax: -1.5, color: '#0011cc' }, // Fuerte La Niña
    { vMin: -3.0, vMax: -2.0, color: '#000077' }, // Muy Fuerte La Niña
  ];

  const needleAngle = latest ? valueToAngle(latest.anom) : 270; // 270° = top
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = R_INNER - 10;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY + needleLen * Math.sin(needleRad);

  const label = latest ? getCategory(latest.anom) : null;
  const seasLabel = latest ? (SEAS_LABEL[latest.seas] ?? latest.seas) + ' ' + latest.year : '…';
  const valueLabel = latest
    ? `${latest.anom >= 0 ? '+' : ''}${latest.anom.toFixed(2)}°C`
    : '';

  const labelRadius = R_OUTER + 32;

  const segLabels = [
    { vMid: 2.5, text: 'Muy Fuerte' },
    { vMid: 1.75, text: 'Fuerte' },
    { vMid: 1.25, text: 'Moderado' },
    { vMid: 0.75, text: 'Débil' },
    { vMid: 0.0, text: 'Neutro' },
    { vMid: -0.75, text: 'Débil' },
    { vMid: -1.25, text: 'Moderada' },
    { vMid: -1.75, text: 'Fuerte' },
  ];

  return (
    <div className="c-icen-gauge-wrap">
      <svg
        viewBox="-80 -60 680 360"
        className="c-icen-gauge-svg"
        aria-label="Gauge semicircular RONI"
      >
        {/* Segments */}
        {segments.map((seg, i) => {
          const aStart = valueToAngle(seg.vMax);
          const aEnd = valueToAngle(seg.vMin);
          return (
            <path
              key={i}
              d={ringSlice(CX, CY, R_INNER, R_OUTER, aStart, aEnd)}
              fill={seg.color}
              opacity={0.88}
              stroke="rgba(3,3,5,0.6)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Outer arc border — upper semicircle */}
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
          const isLeft = a < 220;
          const isRight = a > 320;
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

        {/* Center labels */}
        {!loading && latest && (
          <>
            <text x={CX} y={CY + 40} textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
              {valueLabel}
            </text>
            <text x={CX} y={CY + 62} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="12" fontFamily="Space Grotesk, sans-serif">
              {seasLabel}
            </text>
          </>
        )}

        {/* Footer labels — flush with flat base ends */}
        <text x={CX - R_OUTER - 10} y={CY + 5} textAnchor="end" fill="#ff1a55" fontSize="13" fontWeight="700" fontFamily="Space Grotesk, sans-serif">El Niño</text>
        <text x={CX + R_OUTER + 10} y={CY + 5} textAnchor="start" fill="#2255ee" fontSize="13" fontWeight="700" fontFamily="Space Grotesk, sans-serif">La Niña</text>

        {loading && (
          <text x={CX} y={CY} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="Space Grotesk, sans-serif">Cargando…</text>
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
export default function RoniSection() {
  const [data, setData] = useState<RoniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const PROXY = 'https://felicidad.com.pe/testdeafinidad/datos?url=';
    const TARGET = encodeURIComponent('https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt');

    fetch(`${PROXY}${TARGET}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.text();
      })
      .then(txt => {
        const records = parseOniData(txt);
        if (records.length === 0) throw new Error('Sin datos');
        setData(records);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo cargar el índice RONI/ONI.'); setLoading(false);
      });
  }, []);

  const latest = data.length ? data[data.length - 1] : null;

  const threeMonthLabel = latest
    ? (SEAS_LABEL[latest.seas] ?? latest.seas) + ' ' + latest.year
    : '';

  return (
    <section id="roni" className="o-section">
      <div className="o-container">
        <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
          <span className="c-section-header__subtitle">Monitoreo NOAA · CPC</span>
          <h2 className="c-section-header__title">
            Índice Oceánico El Niño&nbsp;<span className="u-text-cyan">(RONI / ONI)</span>
          </h2>
          <p className="c-section-header__desc">
            Promedio móvil de 3 meses de las anomalías de TSM (ERSSTv5) en la región Niño 3.4 (5°N–5°S, 120°–170°W),
            relativo a la anomalía media del cinturón tropical (20°N–20°S).
            Se declara evento cuando el umbral ±0.5°C se mantiene 5 trimestres consecutivos.
            Fuente:{' '}
            <a href="https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent-cyan)' }}>
              NOAA / CPC
            </a>.
          </p>
        </header>

        <div className="c-icen-layout js-reveal" style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
          {/* Gauge */}
          <div className="c-icen-gauge-col">
            <h3 className="c-icen-gauge-title">Índice RONI — El Niño Pacífico Central</h3>
            {threeMonthLabel && latest && (
              <p className="c-icen-gauge-subtitle">
                {threeMonthLabel}:{' '}
                <strong style={{ color: latest.anom >= 0.5 ? '#ff6688' : latest.anom <= -0.5 ? '#2255ee' : '#aaa' }}>
                  {latest.anom >= 0 ? '+' : ''}{latest.anom.toFixed(2)}°C
                </strong>
              </p>
            )}
            {error ? (
              <p className="c-icen-error">{error}</p>
            ) : (
              <RoniGauge latest={latest} loading={loading} />
            )}
          </div>

          {/* Right panel */}
          <div className="c-icen-info-col">
            <div className="c-icen-legend">
              <h4 className="c-icen-legend__title">Clasificación ONI / RONI — NOAA</h4>
              <div className="c-icen-legend__grid">

                <div className="c-icen-legend__group">
                  <span className="c-icen-legend__heading" style={{ color: '#ff6688' }}>El Niño</span>
                  {[
                    { label: 'Muy Fuerte', color: '#aa0000', range: '≥ 2.0°C' },
                    { label: 'Fuerte', color: '#ff1a55', range: '1.5 – 2.0°C' },
                    { label: 'Moderado', color: '#ff6688', range: '1.0 – 1.5°C' },
                    { label: 'Débil', color: '#ffbbcc', range: '0.5 – 1.0°C' },
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
                    <span className="c-icen-legend__range">-0.5 – 0.5°C</span>
                  </div>
                </div>

                <div className="c-icen-legend__group">
                  <span className="c-icen-legend__heading" style={{ color: '#2255ee' }}>La Niña</span>
                  {[
                    { label: 'Débil', color: '#aaddff', range: '-1.0 – -0.5°C' },
                    { label: 'Moderada', color: '#2255ee', range: '-1.5 – -1.0°C' },
                    { label: 'Fuerte', color: '#0011cc', range: '-2.0 – -1.5°C' },
                    { label: 'Muy Fuerte', color: '#000077', range: '≤ -2.0°C' },
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
