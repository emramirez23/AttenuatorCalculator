import type { SolutionStep } from '../types'
import { useLang } from '../LangContext'

interface StepsOutputProps {
  steps: SolutionStep[]
  stepsType: 'conversion' | 'design' | 'analysis' | 'steps'
}

export function StepsOutput({ steps, stepsType }: StepsOutputProps) {
  const { tr } = useLang()
  if (steps.length === 0) return null

  const title =
    stepsType === 'conversion' ? tr.conversionStepsTitle
    : stepsType === 'analysis' ? tr.analysisStepsTitle
    : stepsType === 'steps'    ? tr.stepsStepsTitle
    : tr.designStepsTitle

  return (
    <section className="panel steps-panel">
      <div className="panel-title">
        <div>
          <span className="tag">{tr.stepsTag}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="steps-list">
        {steps.map((step, i) => (
          <article className="step-article" key={i}>
            <h4>{step.title}</h4>
            {step.explanation && (
              <p className="step-explanation">{step.explanation}</p>
            )}
            {step.equations.map((eq, j) =>
              eq === '' ? (
                <br key={j} />
              ) : (
                <code key={j}>{eq}</code>
              )
            )}
            {step.result && (
              <div>
                <span className="step-result">{step.result}</span>
              </div>
            )}
            {step.warnings.map((w, j) => (
              <div key={j}>
                <span className="step-warn">⚠ {w}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}
