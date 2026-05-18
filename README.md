# Simulador de Atenuadores Pasivos - UTN FRA

Herramienta educativa interactiva para el diseño, simulación y resolución paso a paso de atenuadores de radiofrecuencia (RF) y adaptadores de impedancia de pérdidas mínimas. Este proyecto fue desarrollado para la cátedra de **Teoría de Circuitos II** en la **Universidad Tecnológica Nacional (UTN) - Facultad Regional Avellaneda**.

## Características principales

* **Conversión de Unidades**: Conversión bidireccional inmediata entre dB, factor de atenuación lineal ($K$), y Népers ($Np$).
* **Diseño de 6 Topologías de Atenuadores**:
  * **T Simétrico**: Atenuador en estrella simétrico.
  * **$\pi$ Simétrico**: Atenuador en triángulo simétrico.
  * **T Asimétrico**: Atenuador en estrella asimétrico con impedancias de entrada y salida desiguales ($Z_1 \neq Z_2$).
  * **$\pi$ Asimétrico**: Atenuador en triángulo asimétrico ($Z_1 \neq Z_2$).
  * **L de Pérdidas Mínimas**: Adaptador asimétrico de pérdidas mínimas con impedancias distintas.
  * **T Puenteado (Bridged T)**: Atenuador simétrico puenteado ideal para sistemas variables y control de ganancia.
* **Resolución Paso a Paso**: Detalle matemático completo del procedimiento analítico de diseño, incluyendo ecuaciones teóricas, sustitución aritmética y fórmulas de verificación (impedancias características y atenuación esperada).
* **Esquemas Dinámicos (SVG)**: Renderizado en tiempo real del circuito resultante indicando los valores calculados para cada resistencia ($R_1$, $R_2$, $R_3$, $R_4$).
* **Soporte de Interfaz Premium**: Visualización adaptada en modo claro/oscuro que permite estudiar cómodamente en cualquier entorno.

---

## Requisitos previos

* **Python 3.10 o superior** (para el motor de cálculo y backend FastAPI)
* **Node.js 18 o superior** (para el frontend de React y Vite)
* Entorno Windows con PowerShell (recomendado para usar el lanzador rápido)

---

## Estructura del proyecto

```text
├── backend/                 # Backend FastAPI (motor de cálculo del simulador)
│   ├── engines/             # Motores de diseño por topología
│   └── main.py              # Inicialización de la API HTTP
├── web/                     # Frontend en React + TypeScript + Vite + CSS
│   ├── src/                 # Componentes interactivos y estilos visuales
│   └── public/              # Recursos gráficos y logo de UTN
├── tests/                   # Suite de pruebas unitarias (pytest)
├── Abrir Simulador.bat      # Lanzador rápido de un solo clic
└── Abrir Simulador.ps1      # Script robusto de inicialización en PowerShell
```

---

## Instrucciones de instalación y ejecución rápida

### Ejecución automática (Recomendado)
Simplemente haz doble clic en el archivo **`Abrir Simulador.bat`** en la raíz del proyecto. Este lanzador se encarga de:
1. Buscar y verificar el entorno virtual de Python.
2. Comprobar la instalación de dependencias del backend (`requirements.txt`).
3. Verificar `node_modules` del frontend e instalar las dependencias de Node si faltan.
4. Finalizar de forma segura cualquier proceso huérfano de sesiones anteriores en los puertos del simulador.
5. Iniciar los servidores del backend (FastAPI en `:8000`) y frontend (Vite en `:5173`) en segundo plano.
6. Abrir automáticamente tu navegador predeterminado en la aplicación lista para usarse.

### Ejecución manual paso a paso

Si prefieres realizar la inicialización manualmente, abre una consola en la raíz del proyecto y sigue estos pasos:

1. **Crear y activar el entorno virtual de Python**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. **Instalar dependencias del backend**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Iniciar el servidor backend (FastAPI)**:
   ```bash
   uvicorn backend.main:app --port 8000
   ```

4. **Instalar dependencias e iniciar el frontend** (en otra terminal dentro de la carpeta `web`):
   ```bash
   cd web
   npm install
   npm run dev
   ```

5. **Acceder a la aplicación**: Abre tu navegador e ingresa a `http://localhost:5173` (o la dirección IPv6 `http://[::1]:5173`).

---

## Suite de pruebas

Para asegurar la rigurosidad científica y matemática de los cálculos y las identidades del simulador, el proyecto incluye una completa suite de **68 pruebas unitarias** que validan todas las topologías con ejercicios académicos reales.

Para ejecutar los tests de forma manual:
```bash
.venv\Scripts\activate
pytest tests/ -v
```

