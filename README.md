# ChemCalc2 - Calculadora de Concentración Química por Conductividad

[![GitHub Pages](https://img.shields.io/badge/Despliegue-GitHub%20Pages-00f2fe?style=flat-square&logo=github)](https://github.com/)

**ChemCalc2** es una aplicación web científica moderna e interactiva diseñada para calcular la concentración ($y$) de productos químicos en laboratorios e industria a partir de lecturas de conductividad del producto ($mS/cm$) y del agua base a restar ($x = \text{Cond}_{\text{químico}} - \text{Cond}_{\text{agua}}$).

---

## 🧪 Tabla de Productos Comerciales, Referencias y Fórmulas

| Nombre Comercial | Ref. Técnica | Fórmula de Calibración | Estado Metrológico |
| :--- | :--- | :--- | :--- |
| **G-FORTE** | I-202-A | $y = 0,0546x - 0,1998$ | ✅ Trazable |
| **G-FORTE-S** | I-202-S | *N/A* | ⚠️ CARECE DE TRAZABILIDAD METROLÓGICA |
| **G-CLORBOX** | I-211 | $y = 0,1663x + 0,0416$ | ✅ Trazable |
| **G-OPTIBACTER** | I-240-A | *N/A* | ⚠️ CARECE DE TRAZABILIDAD METROLÓGICA |
| **G-TINS** | I-306 | $y = 0,0045x + 0,3655$ | ✅ Trazable |
| **G-TINS HD** | I-306-HD | *N/A* | ⚠️ CARECE DE TRAZABILIDAD METROLÓGICA |
| **G-DESALCALIS** | I308-A | $y = 0,0491x - 0,3285$ | ✅ Trazable |
| **G-DESALCALIS-S** | I-308-S | *N/A* | ⚠️ CARECE DE TRAZABILIDAD METROLÓGICA |
| **G-CLORFOAM** | I-311-A | $y = 0,3384x - 0,0533$ | ✅ Trazable |
| **G-FOAM** | I312-A | $y = 0,7707x + 0,04$ | ✅ Trazable |
| **G-ENERGYFOAM** | I-313 | $y = 0,2786x - 0,0314$ | ✅ Trazable |
| **G-ACIDFOAM** | I-314-A | $y = 0,2449x - 0,3613$ | ✅ Trazable |
| **G-FORTGRAS** | I-370-A | $y = 0,2452x + 0,0099$ | ✅ Trazable |
| **G-CLOR** | I-600-GB | $y = 0,1446x - 0,0694$ | ✅ Trazable |
| **G-CLOR PLUS** | I-601-G | $y = 0,164x - 0,0374$ | ✅ Trazable |
| **G-ALCAFER** | I-602-G | *N/A* | ⚠️ CARECE DE TRAZABILIDAD METROLÓGICA |
| **G-ACID** | I-610-G | $y = 0,063x - 0,0203$ | ✅ Trazable |
| **G-ACID PLUS** | I-611-G | $y = 0,2535x - 0,4996$ | ✅ Trazable |
| **G-ACID LT** | I-611-LT | *N/A* | ⚠️ CARECE DE TRAZABILIDAD METROLÓGICA |

---

## 💡 Ejemplo Práctico

Si se selecciona el producto **`I-202-A`** con la fórmula $y = 0,0546x - 0,1998$:
1. **Medida del químico**: $4,25\text{ mS/cm}$
2. **Medida del agua**: $0,34\text{ mS/cm}$
3. **Cálculo de $x$**: $x = 4,25 - 0,34 = 3,91\text{ mS/cm}$
4. **Sustitución en la ecuación**:
   $$y = (0,0546 \times 3,91) - 0,1998 = 0,213486 - 0,1998 = 0,013686$$

---

## 🚀 Cómo Publicar la App en GitHub Pages (Paso a Paso)

Para tener esta calculadora accesible desde cualquier móvil o equipo conectado a internet:

### Paso 1: Crear un nuevo repositorio en GitHub
1. Inicia sesión en [GitHub.com](https://github.com).
2. Haz clic en el botón **+** en la esquina superior derecha y selecciona **New repository**.
3. Nombra tu repositorio como `ChemCalc2` (puedes dejarlo público).
4. **No** selecciones "Add a README file" ni ninguna opción adicional, y haz clic en **Create repository**.

### Paso 2: Subir tu código local
Abre la terminal en la carpeta de este proyecto y ejecuta los siguientes comandos (sustituyendo `TU_USUARIO` por tu nombre de usuario de GitHub):

```bash
git add .
git commit -m "Initial commit - ChemCalc2 App"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ChemCalc2.git
git push -u origin main
```

### Paso 3: Activar GitHub Pages
1. En tu repositorio en GitHub, ve a la pestaña **Settings** (Configuración).
2. En el menú de la izquierda, selecciona **Pages**.
3. En la sección **Build and deployment > Source**, selecciona **GitHub Actions** (o la rama `main` / `/ (root)`).
4. Guarda los cambios.

En aproximadamente **1 minuto**, tu aplicación estará disponible online en la dirección:
`https://TU_USUARIO.github.io/ChemCalc2/`

---

## ⚡ Características Destacadas

- **Diseño Científico Premium**: Tema oscuro con *glassmorphism* optimizado para laboratorios y dispositivos móviles.
- **Formato Numérico Flexible**: Soporta tanto la coma (`,`) como el punto (`.`) como separadores decimales.
- **Gráfica de Calibración Interactiva**: Generada en tiempo real mediante **Chart.js** con marcado del punto de trabajo.
- **Alertas Metrológicas**: Identificación automática de productos sin trazabilidad metrológica.
- **Historial y Exportación**: Guardado automático en `localStorage` con exportación en un clic a formato **CSV**.
