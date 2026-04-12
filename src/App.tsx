import { useMemo, useRef, useState } from 'react'
import './App.css'
import {
  computeConstantHazardSeries,
  type EventHistoryPoint,
  type StudyScenario,
} from './lib/eventHistory'

// ─── Types ────────────────────────────────────────────────────────────────────

type StudyTextField =
  | 'populationLabel'
  | 'targetEvent'
  | 'timeOrigin'
  | 'timeScale'
  | 'exitRule'

type StudyNumericField = 'populationSize' | 'hazardRate' | 'maxTime'

type SeriesKey = keyof Pick<
  EventHistoryPoint,
  'survival' | 'cumulativeIncidence' | 'density' | 'hazard' | 'cumulativeHazard'
>

interface SliderDefinition {
  key: StudyNumericField
  label: string
  min: number
  max: number
  step: number
  formatValue: (value: number) => string
}

interface ChartSeriesConfig {
  key: SeriesKey
  label: string
  color: string
}

interface ReferenceLine {
  value: number
  label: string
}

interface ChartPanelDefinition {
  id: string
  title: string
  yLabel: string
  series: ChartSeriesConfig[]
  yMax: (points: EventHistoryPoint[]) => number
  referenceLines?: ReferenceLine[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFirstNumber(text: string): number | null {
  const match = text.match(/\d+(?:\.\d+)?/)
  return match ? parseFloat(match[0]) : null
}

function formatXTick(value: number) {
  return String(Math.round(value))
}

function formatAxisValue(value: number, yUpper: number) {
  if (yUpper <= 1.1) return value.toFixed(2)
  if (yUpper < 10) return value.toFixed(2)
  return value.toFixed(1)
}

function createTicks(min: number, max: number, steps: number) {
  return Array.from({ length: steps + 1 }, (_, i) => min + ((max - min) * i) / steps)
}

function buildLinePath(
  points: EventHistoryPoint[],
  values: number[],
  xScale: (v: number) => number,
  yScale: (v: number) => number,
) {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(p.time).toFixed(2)} ${yScale(values[i]).toFixed(2)}`,
    )
    .join(' ')
}

// ─── Static data ──────────────────────────────────────────────────────────────

const defaultStudy: StudyScenario = {
  populationLabel: '',
  populationSize: 0,
  targetEvent: '',
  timeOrigin: '',
  timeScale: '',
  exitRule: '',
  hazardRate: 0.32,
  maxTime: 3,
}

const hazardPanel: ChartPanelDefinition = {
  id: 'hazard',
  title: 'Hazard function',
  yLabel: 'Rate',
  series: [{ key: 'hazard', label: 'Hazard h(t)', color: '#0f766e' }],
  yMax: () => 0.6,
}

const panelDefinitions: ChartPanelDefinition[] = [
  {
    id: 'survival-incidence',
    title: 'Survival & cumulative incidence',
    yLabel: 'Probability',
    series: [
      { key: 'survival', label: 'Survival S(t)', color: '#2563eb' },
      { key: 'cumulativeIncidence', label: 'Cumulative incidence F(t)', color: '#f97316' },
    ],
    yMax: () => 1,
  },
  {
    id: 'density',
    title: 'Probability density function',
    yLabel: 'Density',
    series: [{ key: 'density', label: 'Density f(t)', color: '#9333ea' }],
    // yMax: (points) => Math.max(...points.map((p) => p.density), 0.05) * 1.1,
    yMax: () => 0.6,
  },
  {
    id: 'cumulative-hazard',
    title: 'Cumulative hazard function',
    yLabel: 'Cumulative hazard',
    series: [{ key: 'cumulativeHazard', label: 'Cumulative hazard H(t)', color: '#dc2626' }],
    yMax: () => 11,
  },
]

// ─── Exercises ────────────────────────────────────────────────────────────────

interface Exercise {
  id: string
  question: string
}

const exercises: Exercise[] = [
  {
    id: 'ex-30pct',
    question: 'At what time have 30% of the population experienced the target event?',
  },
  {
    id: 'ex-cumhaz-lambda',
    question: 'What happens to the cumulative hazard function when you double the hazard rate λ?',
  },
  {
    id: 'ex-cumhaz-time',
    question: 'What happens to the cumulative hazard function when you increase the follow-up window?',
  },
  {
    id: 'ex-find-lambda',
    question: 'Given a study of length 10 years, what λ is needed so that exactly 50% of the population has experienced the event by 6 years?',
  },
  {
    id: 'ex-survival-end',
    question: 'Following the same example, what is the survival proportion at the end of follow up?',
  },
  {
    id: 'ex-density-area',
    question: 'What does the area under the probability density function represent, and what value should it approach over infinite follow-up?',
  },
  {
    id: 'ex-density-vs-hazard',
    question: 'Compare the density f(t) at t = 0 with the hazard rate h(t). Are they equal? Now look at f(t) at later times — why does it fall below h(t)?',
  },
]

// ─── App component ────────────────────────────────────────────────────────────

function App() {
  const [study, setStudy] = useState(defaultStudy)

  const isDurationScale = study.timeScale === 'Time since entry (duration)'
  const xStart = (study.timeScale === 'Age' || study.timeScale === 'Calendar year')
    ? (parseFirstNumber(study.timeOrigin) ?? 0)
    : 0

  const studyReady =
    study.timeOrigin.trim() !== '' &&
    study.timeScale.trim() !== ''

  const points = useMemo(
    () => computeConstantHazardSeries(study.hazardRate, study.maxTime),
    [study.hazardRate, study.maxTime],
  )

  const sliderDefinitions: SliderDefinition[] = [
    {
      key: 'hazardRate',
      label: 'Hazard rate \u03BB',
      min: 0.02,
      max: 0.6,
      step: 0.01,
      formatValue: (v) => v.toFixed(2),
    },
    {
      key: 'maxTime',
      label: 'Follow-up window',
      min: 1,
      max: 20,
      step: 1,
      formatValue: (v) => String(Math.round(v)),
    },
  ]

  function handleTextChange(field: StudyTextField, value: string) {
    setStudy((current) => {
      let updated = { ...current, [field]: value }
      // When duration scale is selected, lock timeOrigin to '0'
      if (field === 'timeScale' && value === 'Time since entry (duration)') {
        updated = { ...updated, timeOrigin: '0' }
      }
      // Prevent user from changing timeOrigin when duration scale is active
      if (field === 'timeOrigin' && current.timeScale === 'Time since entry (duration)') {
        updated = { ...updated, timeOrigin: '0' }
      }
      return updated
    })
  }

  function handleNumericChange(field: StudyNumericField, value: number) {
    setStudy((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="app-shell">
      <main className="page-content">
        <h1 className="page-title">Event History Functions</h1>

        {/* Study setup */}
        <section className="study-card" aria-labelledby="study-setup-heading">
          <h2 id="study-setup-heading">Study setup</h2>
          <div className="study-grid">
            <LabeledField label="Time-scale">
              <select
                value={study.timeScale}
                onChange={(e) => handleTextChange('timeScale', e.target.value)}
              >
                <option value="">— select —</option>
                <option value="Age">Age</option>
                <option value="Calendar year">Calendar year</option>
                <option value="Time since entry (duration)">Time since entry (duration)</option>
              </select>
            </LabeledField>

            <LabeledField label="Time origin">
              <input
                value={isDurationScale ? '0' : study.timeOrigin}
                placeholder="e.g., Eligibility for getting a driver's license, age 18"
                onChange={(e) => handleTextChange('timeOrigin', e.target.value)}
                disabled={isDurationScale}
              />
            </LabeledField>
          </div>
        </section>

        {/* Sliders */}
        <section className="sliders-card" aria-label="Chart controls">
          {sliderDefinitions.map((slider) => (
            <label className="slider-control" key={slider.key}>
              <span className="slider-control__row">
                <strong>{slider.label}</strong>
                <span>{slider.formatValue(study[slider.key])}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={Math.min(study[slider.key], slider.max)}
                onChange={(e) => handleNumericChange(slider.key, Number(e.target.value))}
              />
            </label>
          ))}
        </section>

        {/* Four panels */}
        <section className="panel-grid" aria-label="Event history figure">
          <FunctionPanel
            panel={hazardPanel}
            points={points}
            study={study}
            xStart={xStart}
            ready={studyReady}
            draggableY={study.hazardRate}
            onYDrag={(v) => handleNumericChange('hazardRate', v)}
          />
          {panelDefinitions.map((panel) => (
            <FunctionPanel
              key={panel.id}
              panel={panel}
              points={points}
              study={study}
              xStart={xStart}
              ready={studyReady}
            />
          ))}
        </section>

        {/* Guided exercises */}
        <ExercisesSection />
      </main>
    </div>
  )
}

// ─── FunctionPanel ────────────────────────────────────────────────────────────

function FunctionPanel({
  panel,
  points,
  study,
  xStart,
  ready,
  draggableY,
  onYDrag,
  yMaxOverride,
}: {
  panel: ChartPanelDefinition
  points: EventHistoryPoint[]
  study: StudyScenario
  xStart: number
  ready: boolean
  draggableY?: number
  onYDrag?: (value: number) => void
  yMaxOverride?: number
}) {
  const yMax = yMaxOverride ?? panel.yMax(points)
  const chartSeries = panel.series.map((s) => ({
    ...s,
    values: points.map((p) => p[s.key]),
  }))

  return (
    <article className="panel-card">
      <h3>{panel.title}</h3>

      <ChartCanvas
        points={points}
        series={chartSeries}
        yLabel={panel.yLabel}
        xLabel={study.timeScale}
        yMax={yMax}
        xStart={xStart}
        ready={ready}
        referenceLines={panel.referenceLines}
        draggableY={draggableY}
        onYDrag={onYDrag}
      />

      <div className="panel-card__legend">
        {chartSeries.map((s) => (
          <span key={s.key}>
            <i style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </article>
  )
}

// ─── ChartCanvas ──────────────────────────────────────────────────────────────

function ChartCanvas({
  points,
  series,
  xLabel,
  yLabel,
  yMax,
  xStart = 0,
  ready = true,
  referenceLines,
  draggableY,
  onYDrag,
}: {
  points: EventHistoryPoint[]
  series: Array<ChartSeriesConfig & { values: number[] }>
  xLabel: string
  yLabel: string
  yMax: number
  xStart?: number
  ready?: boolean
  referenceLines?: ReferenceLine[]
  draggableY?: number
  onYDrag?: (value: number) => void
}) {
  const width = 400
  const height = 160
  const margin = { top: 10, right: 10, bottom: 30, left: 44 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const maxTime = points.at(-1)?.time ?? 1
  const yUpper = yMax <= 0 ? 1 : yMax

  const xScale = (t: number) => margin.left + (t / maxTime) * innerWidth
  const yScale = (v: number) => margin.top + innerHeight - (v / yUpper) * innerHeight
  const xInverse = (px: number) => ((px - margin.left) / innerWidth) * maxTime
  const yInverse = (py: number) => ((margin.top + innerHeight - py) / innerHeight) * yUpper

  // Generate x-axis ticks with consistent spacing
  let xTicks: number[] = []
  if (maxTime <= 5) {
    // For small windows, show all integer ticks
    const xTickMin = Math.ceil(0)
    const xTickMax = Math.floor(maxTime)
    for (let t = xTickMin; t <= xTickMax; t++) {
      xTicks.push(t)
    }
  } else {
    // For larger windows, find a nice step size that gives ~4-6 ticks
    const candidateSteps = [1, 2, 3, 4, 5, 10, 15, 20, 25, 50, 100, 250, 500, 1000]
    let bestStep = 1
    let bestDiff = Math.abs(Math.ceil(maxTime / 1) - 5)
    
    for (const step of candidateSteps) {
      const numTicks = Math.floor(maxTime / step) + 1
      const diff = Math.abs(numTicks - 5)
      
      // Prefer step that gives us at least 3 ticks and is closest to 5
      if (numTicks >= 3 && diff < bestDiff) {
        bestDiff = diff
        bestStep = step
      }
    }
    
    // Generate ticks with consistent step size
    for (let t = 0; t <= maxTime; t += bestStep) {
      xTicks.push(t)
    }
  }
  const yTicks = createTicks(0, yUpper, 4)

  const [cursorX, setCursorX] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  function getSvgScaledCoords(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const coords = getSvgScaledCoords(e)
    if (!coords) return

    if (isDragging && onYDrag) {
      const v = yInverse(coords.y)
      const clamped = Math.min(1, Math.max(0.02, parseFloat(v.toFixed(2))))
      onYDrag(clamped)
    } else {
      const t = xInverse(coords.x)
      if (t >= 0 && t <= maxTime) setCursorX(t)
      else setCursorX(null)
    }
  }

  function handlePointerLeave() {
    if (!isDragging) setCursorX(null)
  }

  function handleDragHandlePointerDown(e: React.PointerEvent<SVGRectElement>) {
    e.stopPropagation()
    e.currentTarget.releasePointerCapture(e.pointerId)
    svgRef.current?.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setCursorX(null)
  }

  function handleSvgPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (isDragging) {
      svgRef.current?.releasePointerCapture(e.pointerId)
      setIsDragging(false)
    }
  }

  function interpolate(values: number[], t: number): number {
    const idx = (t / maxTime) * (points.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, points.length - 1)
    const frac = idx - lo
    return values[lo] + frac * (values[hi] - values[lo])
  }

  const tooltipValues =
    cursorX !== null
      ? series.map((s) => ({
          label: s.label,
          color: s.color,
          value: interpolate(s.values, cursorX),
        }))
      : []

  const cursorPx = cursorX !== null ? xScale(cursorX) : null
  const tooltipOnLeft = cursorX !== null && cursorX > maxTime * 0.55

  return (
    <div className="chart-shell">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${yLabel} over ${xLabel}`}
        className={`chart-svg${isDragging ? ' chart-svg--dragging' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerUp}
      >
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          className="chart-area"
        />

        {ready && yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              className="chart-gridline"
            />
            <text
              x={margin.left - 6}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="chart-tick"
            >
              {formatAxisValue(tick, yUpper)}
            </text>
          </g>
        ))}

        {ready && xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={margin.top}
              y2={height - margin.bottom}
              className="chart-gridline chart-gridline--vertical"
            />
            <text
              x={xScale(tick)}
              y={height - margin.bottom + 12}
              textAnchor="middle"
              className="chart-tick"
            >
              {formatXTick(xStart + tick)}
            </text>
          </g>
        ))}

        {ready && (
          <>
            <line
              x1={margin.left}
              x2={margin.left}
              y1={margin.top}
              y2={height - margin.bottom}
              className="chart-axis"
            />
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={height - margin.bottom}
              y2={height - margin.bottom}
              className="chart-axis"
            />
          </>
        )}

        {ready && series.map((line) => (
          <path
            key={line.key}
            d={buildLinePath(points, line.values, xScale, yScale)}
            fill="none"
            stroke={line.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {ready && referenceLines?.map((rl) => {
          const ry = yScale(rl.value)
          if (ry < margin.top || ry > height - margin.bottom) return null
          return (
            <g key={`refline-${rl.value}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={ry}
                y2={ry}
                className="chart-refline"
              />
              <text
                x={width - margin.right - 3}
                y={ry - 3}
                textAnchor="end"
                className="chart-refline-label"
              >
                {rl.label}
              </text>
            </g>
          )
        })}

        {ready && draggableY != null && onYDrag && (() => {
          const lineY = yScale(draggableY)
          return (
            <rect
              x={margin.left}
              y={Math.max(margin.top, lineY - 8)}
              width={innerWidth}
              height={16}
              fill="transparent"
              className="chart-drag-handle"
              onPointerDown={handleDragHandlePointerDown}
            />
          )
        })()}

        {ready && (
          <>
            <text
              x={margin.left + innerWidth / 2}
              y={height - 4}
              textAnchor="middle"
              className="chart-label"
            >
              {xLabel}
            </text>
            <text
              x={12}
              y={margin.top + innerHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 12 ${margin.top + innerHeight / 2})`}
              className="chart-label"
            >
              {yLabel}
            </text>
          </>
        )}

        {ready && cursorPx !== null && (
          <>
            <line
              x1={cursorPx}
              x2={cursorPx}
              y1={margin.top}
              y2={height - margin.bottom}
              className="chart-crosshair"
            />
            {tooltipValues.map((tv) => (
              <circle
                key={tv.label}
                cx={cursorPx}
                cy={yScale(tv.value)}
                r={4}
                fill={tv.color}
                stroke="#fff"
                strokeWidth="1.5"
              />
            ))}

            {tooltipValues.length > 0 && (() => {
              const boxW = 110
              const boxH = 14 + tooltipValues.length * 15
              const bx = tooltipOnLeft ? cursorPx - boxW - 8 : cursorPx + 8
              const by = margin.top + 4
              return (
                <g>
                  <rect
                    x={bx}
                    y={by}
                    width={boxW}
                    height={boxH}
                    rx={4}
                    className="chart-tooltip-bg"
                  />
                  <text x={bx + 6} y={by + 11} className="chart-tooltip-time">
                    t = {(xStart + cursorX!).toFixed(2)}
                  </text>
                  {tooltipValues.map((tv, i) => (
                    <text
                      key={tv.label}
                      x={bx + 6}
                      y={by + 11 + (i + 1) * 15}
                      className="chart-tooltip-val"
                    >
                      <tspan fill={tv.color}>&#9679;</tspan>
                      {` ${tv.label.split(' ')[0]}: ${tv.value.toFixed(3)}`}
                    </text>
                  ))}
                </g>
              )
            })()}
          </>
        )}
      </svg>
    </div>
  )
}

// ─── LabeledField ─────────────────────────────────────────────────────────────

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

// ─── ExercisesSection ─────────────────────────────────────────────────────────

function ExercisesSection() {
  return (
    <section className="exercises-card" aria-labelledby="exercises-heading">
      <h2 id="exercises-heading">Guided exercises</h2>
      <ol className="exercises-list">
        {exercises.map((ex, i) => (
          <li key={ex.id} className="exercise-item">
            <p className="exercise-question-text">
              <span className="exercise-question__num">{i + 1}</span>
              {ex.question}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default App
