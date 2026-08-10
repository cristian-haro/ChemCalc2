/**
 * Base de datos de productos químicos con sus nombres comerciales y códigos técnicos de referencia.
 * Nombres comerciales actualizados.
 * Fórmula: y = m * x + c
 * donde:
 *   x = Conductividad del Químico - Conductividad del Agua
 *   y = Concentración despejada
 */
export const CHEMICAL_DATA = [
  { id: 'G-FORTE',        code: 'I-202-A',  name: 'G-FORTE',        m: 0.0546, c: -0.1998, traceable: true },
  { id: 'G-FORTE-S',      code: 'I-202-S',  name: 'G-FORTE-S',      m: null,   c: null,    traceable: false, note: 'CARECE DE TRAZABILIDAD METROLÓGICA' },
  { id: 'G-CLORBOX',      code: 'I-211',    name: 'G-CLORBOX',      m: 0.1663, c: 0.0416,  traceable: true },
  { id: 'G-OPTIBACTER',   code: 'I-240-A',  name: 'G-OPTIBACTER',   m: null,   c: null,    traceable: false, note: 'CARECE DE TRAZABILIDAD METROLÓGICA' },
  { id: 'G-TINS',         code: 'I-306',    name: 'G-TINS',         m: 0.0045, c: 0.3655,  traceable: true },
  { id: 'G-TINS-HD',      code: 'I-306-HD', name: 'G-TINS HD',      m: null,   c: null,    traceable: false, note: 'CARECE DE TRAZABILIDAD METROLÓGICA' },
  { id: 'G-DESALCALIS',   code: 'I308-A',   name: 'G-DESALCALIS',   m: 0.0491, c: -0.3285, traceable: true },
  { id: 'G-DESALCALIS-S', code: 'I-308-S',  name: 'G-DESALCALIS-S', m: null,   c: null,    traceable: false, note: 'CARECE DE TRAZABILIDAD METROLÓGICA' },
  { id: 'G-CLORFOAM',     code: 'I-311-A',  name: 'G-CLORFOAM',     m: 0.3384, c: -0.0533, traceable: true },
  { id: 'G-FOAM',         code: 'I312-A',   name: 'G-FOAM',         m: 0.7707, c: 0.0400,  traceable: true },
  { id: 'G-ENERGYFOAM',   code: 'I-313',    name: 'G-ENERGYFOAM',   m: 0.2786, c: -0.0314, traceable: true },
  { id: 'G-ACIDFOAM',     code: 'I-314-A',  name: 'G-ACIDFOAM',     m: 0.2449, c: -0.3613, traceable: true },
  { id: 'G-FORTGRAS',     code: 'I-370-A',  name: 'G-FORTGRAS',     m: 0.2452, c: 0.0099,  traceable: true },
  { id: 'G-CLOR',         code: 'I-600-GB', name: 'G-CLOR',         m: 0.1446, c: -0.0694, traceable: true },
  { id: 'G-CLOR-PLUS',    code: 'I-601-G',  name: 'G-CLOR PLUS',    m: 0.1640, c: -0.0374, traceable: true },
  { id: 'G-ALCAFER',      code: 'I-602-G',  name: 'G-ALCAFER',      m: 0.1229, c: 0.0318,  traceable: true },
  { id: 'G-ACID',         code: 'I-610-G',  name: 'G-ACID',         m: 0.0630, c: -0.0203, traceable: true },
  { id: 'G-ACID-PLUS',    code: 'I-611-G',  name: 'G-ACID PLUS',    m: 0.2535, c: -0.4996, traceable: true },
  { id: 'G-ACID-LT',      code: 'I-611-LT', name: 'G-ACID LT',      m: null,   c: null,    traceable: false, note: 'CARECE DE TRAZABILIDAD METROLÓGICA' }
];

/**
 * Obtiene la información del químico por su ID, nombre comercial o código
 * @param {string} searchKey 
 * @returns {object|null}
 */
export function getChemicalById(searchKey) {
  if (!searchKey) return null;
  return CHEMICAL_DATA.find(chem => 
    chem.id === searchKey || 
    chem.name === searchKey || 
    chem.code === searchKey
  ) || null;
}
