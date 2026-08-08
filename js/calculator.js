/**
 * Módulo de cálculo para la concentración de químicos por conductividad.
 */

/**
 * Convierte un texto con número (aceptando comas o puntos) a float válido.
 * @param {string|number} val 
 * @returns {number|NaN}
 */
export function parseNumber(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().trim().replace(',', '.');
  return parseFloat(cleaned);
}

/**
 * Formatea un número según la convención en español (coma decimal) con decimales configurables.
 * @param {number} num 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatSpanishNumber(num, decimals = 4) {
  if (isNaN(num) || num === null) return '-';
  // Formatear omitiendo ceros innecesarios al final si no aportan
  const fixed = Number(num.toFixed(decimals));
  return fixed.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Calcula la concentración del químico dada la información del químico y las conductividades.
 * @param {object} chemical Objeto químico de CHEMICAL_DATA
 * @param {number|string} chemCond Conductividad del químico en mS/cm
 * @param {number|string} waterCond Conductividad del agua en mS/cm
 * @returns {object} Resultado del cálculo y desglose
 */
export function calculateConcentration(chemical, chemCondInput, waterCondInput) {
  if (!chemical) {
    return {
      success: false,
      error: 'Debe seleccionar un producto químico válido.'
    };
  }

  if (!chemical.traceable) {
    return {
      success: false,
      isNotTraceable: true,
      error: `El químico ${chemical.name} CARECE DE TRAZABILIDAD METROLÓGICA. No se puede calcular la concentración.`,
      chemical
    };
  }

  const chemCond = parseNumber(chemCondInput);
  const waterCond = parseNumber(waterCondInput);

  if (isNaN(chemCond)) {
    return {
      success: false,
      error: 'Por favor, introduzca un valor numérico válido para la conductividad del químico.',
      chemical
    };
  }

  if (isNaN(waterCond)) {
    return {
      success: false,
      error: 'Por favor, introduzca un valor numérico válido para la conductividad del agua.',
      chemical
    };
  }

  if (chemCond < 0 || waterCond < 0) {
    return {
      success: false,
      error: 'Las conductividades no pueden ser valores negativos.',
      chemical
    };
  }

  // x = Conductividad Químico - Conductividad Agua
  const x = chemCond - waterCond;

  // y = m * x + c
  const { m, c } = chemical;
  const y = (m * x) + c;

  const warning = x < 0 ? 'Atención: La conductividad del agua es mayor que la del químico (x < 0).' : null;

  // Formato para la fórmula explícita
  const cSign = c >= 0 ? `+ ${formatSpanishNumber(c, 4)}` : `- ${formatSpanishNumber(Math.abs(c), 4)}`;
  const formulaStr = `y = ${formatSpanishNumber(m, 4)}x ${cSign}`;

  const step1Str = `x = ${formatSpanishNumber(chemCond, 4)} - ${formatSpanishNumber(waterCond, 4)} = ${formatSpanishNumber(x, 4)} mS/cm`;
  const step2Str = `y = (${formatSpanishNumber(m, 4)} × ${formatSpanishNumber(x, 4)}) ${cSign}`;
  const step3Str = `y = ${formatSpanishNumber(y, 6)}`;

  return {
    success: true,
    chemical,
    chemCond,
    waterCond,
    x,
    y,
    m,
    c,
    formulaStr,
    step1Str,
    step2Str,
    step3Str,
    warning
  };
}
