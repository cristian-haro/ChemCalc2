/**
 * Módulo de almacenamiento local y exportación de datos.
 */

const STORAGE_KEY = 'chemcalc_history_v1';

/**
 * Obtiene el historial guardado en localStorage.
 * @returns {Array}
 */
export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error al leer historial:', e);
    return [];
  }
}

/**
 * Añade un nuevo cálculo al historial.
 * @param {object} calculationResult 
 */
export function saveToHistory(result) {
  if (!result || !result.success) return;

  const history = getHistory();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    mode: result.mode || 'conc',
    brandName: result.chemical.brandName || 'Gute',
    chemicalName: result.chemical.name,
    chemCond: result.chemCond,
    waterCond: result.waterCond,
    netCond: result.x,
    concentration: result.y,
    formula: result.formulaStr
  };

  // Mantener como máximo 100 registros
  const updatedHistory = [newEntry, ...history].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
  }

  return newEntry;
}

/**
 * Borra todo el historial guardado.
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error al borrar historial:', e);
  }
}

/**
 * Exporta el historial guardado como archivo CSV.
 */
export function exportToCSV() {
  const history = getHistory();
  if (history.length === 0) return false;

  const headers = ['Fecha y Hora', 'Modo', 'Marca', 'Producto', 'Conductividad Producto (mS/cm)', 'Conductividad Agua (mS/cm)', 'Conductividad Neta x (mS/cm)', 'Concentración y', 'Fórmula'];

  const rows = history.map(item => [
    `"${new Date(item.timestamp).toLocaleString('es-ES')}"`,
    `"${item.mode === 'cond' ? 'Calc. Conductividad' : 'Calc. Concentración'}"`,
    `"${item.brandName || '-'}"`,
    `"${item.chemicalName}"`,
    item.chemCond !== undefined ? item.chemCond.toString().replace('.', ',') : '-',
    item.waterCond !== undefined ? item.waterCond.toString().replace('.', ',') : '-',
    item.netCond !== undefined ? item.netCond.toString().replace('.', ',') : '-',
    item.concentration !== undefined ? item.concentration.toString().replace('.', ',') : '-',
    `"${item.formula}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_calculos_quimicos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}
