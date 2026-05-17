import type { SolutionStep } from '../types'

interface StepsOutputProps {
  steps: SolutionStep[]
  title?: string
}

export function StepsOutput({ steps, title = 'Resolución paso a paso' }: StepsOutputProps) {
  if (steps.length === 0) return null

  return (
    <section className="panel steps-panel">
      <div className="panel-title">
        <div>
          <span className="tag">Resolución</span>
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
