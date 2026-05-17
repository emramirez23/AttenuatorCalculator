interface HeroProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Hero({ theme, onToggleTheme }: HeroProps) {
  return (
    <header className="hero">
      <div>
        <div className="hero-brand">
          <img src="/logo_utn_clean.png" alt="UTN Avellaneda" className="utn-logo" />
          <div className="creator-card" aria-label="Autor">
            <span className="creator-name">BY ELÍAS RAMÍREZ</span>
            <div className="social-links">
              <a
                className="social-link"
                href="https://www.linkedin.com/in/elias-ramirez-rolon/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn de Elías Ramírez"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <path d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0ZM7.1 20.45H3.54V9H7.1v11.45ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm15.13 13.02h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28Z"/>
                </svg>
                <span>LinkedIn</span>
              </a>
              <a
                className="social-link"
                href="https://github.com/emramirez23"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub de Elías Ramírez"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <path d="M12 .5C5.73.5.75 5.58.75 11.93c0 5.05 3.27 9.33 7.8 10.84.57.1.78-.25.78-.55v-2c-3.17.7-3.84-1.55-3.84-1.55-.52-1.34-1.27-1.7-1.27-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.2 1.76 1.2 1.02 1.78 2.68 1.27 3.34.97.1-.75.4-1.27.72-1.56-2.53-.29-5.19-1.29-5.19-5.73 0-1.27.44-2.3 1.17-3.12-.12-.29-.51-1.47.11-3.08 0 0 .96-.31 3.14 1.19.91-.26 1.89-.38 2.86-.39.97.01 1.95.13 2.86.39 2.18-1.5 3.13-1.19 3.13-1.19.62 1.61.23 2.79.11 3.08.73.82 1.17 1.85 1.17 3.12 0 4.45-2.66 5.43-5.2 5.72.41.36.77 1.07.77 2.15v3.19c0 .3.21.66.79.55 4.52-1.51 7.79-5.79 7.79-10.84C23.25 5.58 18.27.5 12 .5Z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
        <p className="eyebrow">Teoría de Circuitos II · UTN</p>
        <h1>Simulador de Atenuadores</h1>
        <p className="lead">
          Calculá resistencias para atenuadores T y π simétricos y asimétricos, adaptadores tipo L
          de pérdida mínima, T puenteado, convertí unidades de atenuación y seguí la resolución paso a paso.
        </p>
      </div>
      <div className="hero-card hero-card--controls-only">
        <div className="preference-actions" aria-label="Preferencias">
          <button
            className="secondary compact"
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? '☀ Claro' : '☾ Oscuro'}
          </button>
        </div>
      </div>
    </header>
  )
}
