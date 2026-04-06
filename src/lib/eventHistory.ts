export interface StudyScenario {
  populationLabel: string
  populationSize: number
  targetEvent: string
  timeOrigin: string
  timeScale: string
  exitRule: string
  hazardRate: number
  maxTime: number
}

export interface EventHistoryPoint {
  time: number
  survival: number
  cumulativeIncidence: number
  density: number
  hazard: number
  cumulativeHazard: number
}

export interface StudySummary {
  cumulativeIncidenceAtEnd: number
  survivalAtEnd: number
  expectedEvents: number
  expectedNonEvents: number
  peakDensity: number
  cumulativeHazardAtEnd: number
}

const MIN_SAMPLE_COUNT = 60

export function computeConstantHazardSeries(
  hazardRate: number,
  maxTime: number,
): EventHistoryPoint[] {
  const safeHazardRate = Math.max(hazardRate, 0.0001)
  const safeMaxTime = Math.max(maxTime, 0.5)
  const sampleCount = Math.max(MIN_SAMPLE_COUNT, Math.round(safeMaxTime * 24))
  const step = safeMaxTime / sampleCount

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const time = step * index
    const survival = Math.exp(-safeHazardRate * time)
    const cumulativeIncidence = 1 - survival
    const density = safeHazardRate * survival
    const cumulativeHazard = safeHazardRate * time

    return {
      time,
      survival,
      cumulativeIncidence,
      density,
      hazard: safeHazardRate,
      cumulativeHazard,
    }
  })
}

export function summarizeStudy(
  populationSize: number,
  series: EventHistoryPoint[],
): StudySummary {
  const lastPoint = series.at(-1)

  if (!lastPoint) {
    return {
      cumulativeIncidenceAtEnd: 0,
      survivalAtEnd: 1,
      expectedEvents: 0,
      expectedNonEvents: populationSize,
      peakDensity: 0,
      cumulativeHazardAtEnd: 0,
    }
  }

  const expectedEvents = populationSize * lastPoint.cumulativeIncidence
  const expectedNonEvents = populationSize * lastPoint.survival
  const peakDensity = Math.max(...series.map((point) => point.density))

  return {
    cumulativeIncidenceAtEnd: lastPoint.cumulativeIncidence,
    survivalAtEnd: lastPoint.survival,
    expectedEvents,
    expectedNonEvents,
    peakDensity,
    cumulativeHazardAtEnd: lastPoint.cumulativeHazard,
  }
}
