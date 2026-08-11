import { getChemicalById } from './data.js';

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
 * @param {object|string} chemicalOrId Objeto químico o ID de producto
 * @param {number|string} chemCondInput Conductividad del producto en mS/cm
 * @param {number|string} waterCondInput Conductividad del agua en mS/cm
 * @returns {object} Resultado del cálculo
 */
export function calculateConcentration(chemicalOrId, chemCondInput, waterCondInput) {
  const chemical = typeof chemicalOrId === 'string' ? getChemicalById(chemicalOrId) : chemicalOrId;

  if (!chemical) {
    return {
      success: false,
      error: 'Debe seleccionar un producto válido.'
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
    warning,
    mode: 'conc'
  };
}

/**
 * Calcula la conductividad esperada del producto dada la concentración deseada y la conductividad del agua.
 * @param {object|string} chemicalOrId Objeto químico o ID de producto
 * @param {number|string} targetYInput Concentración deseada (y)
 * @param {number|string} waterCondInput Conductividad del agua en mS/cm
 * @returns {object} Resultado del cálculo
 */
export function calculateConductivity(chemicalOrId, targetYInput, waterCondInput) {
  const chemical = typeof chemicalOrId === 'string' ? getChemicalById(chemicalOrId) : chemicalOrId;

  if (!chemical) {
    return {
      success: false,
      error: 'Debe seleccionar un producto válido.'
    };
  }

  if (!chemical.traceable) {
    return {
      success: false,
      isNotTraceable: true,
      error: `El químico ${chemical.name} CARECE DE TRAZABILIDAD METROLÓGICA. No se puede calcular la conductividad.`,
      chemical
    };
  }

  const y = parseNumber(targetYInput);
  const waterCond = parseNumber(waterCondInput);

  if (isNaN(y)) {
    return {
      success: false,
      error: 'Por favor, introduzca un valor numérico válido para la concentración deseada.',
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

  if (waterCond < 0) {
    return {
      success: false,
      error: 'La conductividad del agua no puede ser negativa.',
      chemical
    };
  }

  const { m, c } = chemical;
  if (!m || m === 0) {
    return {
      success: false,
      error: 'Error matemático: El parámetro m no puede ser cero.',
      chemical
    };
  }

  // y = m * x + c  =>  x = (y - c) / m
  const x = (y - c) / m;

  // Cond. Producto = x + Cond. Agua
  const chemCond = x + waterCond;

  const warning = x < 0 ? 'Atención: La concentración deseada requiere una conductividad neta negativa (x < 0).' : null;

  const cSign = c >= 0 ? `+ ${formatSpanishNumber(c, 4)}` : `- ${formatSpanishNumber(Math.abs(c), 4)}`;
  const formulaStr = `x = (y ${c >= 0 ? '-' : '+'} ${formatSpanishNumber(Math.abs(c), 4)}) / ${formatSpanishNumber(m, 4)}`;

  const step1Str = `x = (${formatSpanishNumber(y, 4)} - ${formatSpanishNumber(c, 4)}) / ${formatSpanishNumber(m, 4)} = ${formatSpanishNumber(x, 4)} mS/cm`;
  const step2Str = `Conductividad Producto = ${formatSpanishNumber(x, 4)} + ${formatSpanishNumber(waterCond, 4)}`;
  const step3Str = `Conductividad Estimada = ${formatSpanishNumber(chemCond, 4)} mS/cm`;

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
    warning,
    mode: 'cond'
  };
}
