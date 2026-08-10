import { CHEMICAL_DATA, getChemicalById } from './data.js';
import { calculateConcentration, formatSpanishNumber, parseNumber } from './calculator.js';
import { getHistory, saveToHistory, clearHistory, exportToCSV } from './storage.js';

// Global variables
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  initChemicalSelect();
  onChemicalChange();
  initEventListeners();
  renderHistoryTable();
  initChart();
});

/**
 * Rena la lista desplegable de químicos
 */
function initChemicalSelect() {
  const select = document.getElementById('chemical-select');
  select.innerHTML = '<option value="">-- Seleccionar producto químico --</option>';

  CHEMICAL_DATA.forEach(chem => {
    const opt = document.createElement('option');
    opt.value = chem.id;
    opt.textContent = chem.traceable 
      ? `${chem.name} (Ref: ${chem.code})`
      : `${chem.name} (Ref: ${chem.code}) - [SIN TRAZABILIDAD]`;
    select.appendChild(opt);
  });
}

/**
 * Inicializa los eventos de la interfaz
 */
function initEventListeners() {
  const select = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond');
  const waterCondInput = document.getElementById('water-cond');
  const btnCalculate = document.getElementById('btn-calculate');
  const btnReset = document.getElementById('btn-reset');
  const btnExportTop = document.getElementById('btn-export-top');
  const btnExportHistory = document.getElementById('btn-export-history');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Modales
  const btnGithubModal = document.getElementById('btn-github-modal');
  const modal = document.getElementById('github-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCloseModalBottom = document.getElementById('btn-close-modal-bottom');

  select.addEventListener('change', () => {
    onChemicalChange();
    autoCalculate();
  });

  chemCondInput.addEventListener('input', autoCalculate);
  waterCondInput.addEventListener('input', autoCalculate);

  btnCalculate.addEventListener('click', () => {
    const result = performCalculation();
    if (result && result.success) {
      saveToHistory(result);
      renderHistoryTable();
    }
  });

  if (btnReset) btnReset.addEventListener('click', resetForm);

  if (btnExportTop) btnExportTop.addEventListener('click', exportToCSV);
  if (btnExportHistory) btnExportHistory.addEventListener('click', exportToCSV);

  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas borrar todo el historial de mediciones?')) {
        clearHistory();
        renderHistoryTable();
      }
    });
  }

  // Modal handlers si existen en el DOM
  if (btnGithubModal && modal) {
    btnGithubModal.addEventListener('click', () => modal.classList.add('active'));
    if (btnCloseModal) btnCloseModal.addEventListener('click', () => modal.classList.remove('active'));
    if (btnCloseModalBottom) btnCloseModalBottom.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // PDF Viewer Modal handlers
  const btnViewFt = document.getElementById('btn-view-ft');
  const btnViewFds = document.getElementById('btn-view-fds');
  const pdfModal = document.getElementById('pdf-modal');
  const btnClosePdfModal = document.getElementById('btn-close-pdf-modal');
  const tabFt = document.getElementById('pdf-tab-ft');
  const tabFds = document.getElementById('pdf-tab-fds');

  if (btnViewFt) btnViewFt.addEventListener('click', () => openPdfModal('ft'));
  if (btnViewFds) btnViewFds.addEventListener('click', () => openPdfModal('fds'));

  if (tabFt) tabFt.addEventListener('click', () => { currentPdfType = 'ft'; renderPdfContent(); });
  if (tabFds) tabFds.addEventListener('click', () => { currentPdfType = 'fds'; renderPdfContent(); });

  if (btnClosePdfModal) btnClosePdfModal.addEventListener('click', closePdfModal);
  if (pdfModal) {
    pdfModal.addEventListener('click', (e) => {
      if (e.target === pdfModal) closePdfModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePdfModal();
  });
}

let currentChemical = null;
let currentPdfType = 'ft';

/**
 * Evento al cambiar el producto químico seleccionado
 */
function onChemicalChange() {
  const select = document.getElementById('chemical-select');
  const formulaPreview = document.getElementById('formula-preview');
  const formulaText = document.getElementById('formula-text');
  const traceableBadge = document.getElementById('traceable-badge');
  const untraceableBanner = document.getElementById('untraceable-banner');
  const resultBox = document.getElementById('result-box');

  const chemical = getChemicalById(select.value);
  currentChemical = chemical;

  updateDocumentButtons(chemical);

  if (!chemical) {
    formulaPreview.classList.add('hidden');
    untraceableBanner.classList.add('hidden');
    resultBox.classList.remove('hidden');
    updateChart(null);
    return;
  }

  formulaPreview.classList.remove('hidden');

  if (!chemical.traceable) {
    formulaText.textContent = 'Carece de trazabilidad metrológica';
    traceableBadge.textContent = 'Sin Trazabilidad';
    traceableBadge.className = 'badge badge-danger';
    
    untraceableBanner.classList.remove('hidden');
    resultBox.classList.add('hidden');
    document.getElementById('breakdown-content').innerHTML = `
      <p style="color: #f87171; font-weight: 500;">
        ⚠️ El producto comercial <strong>${chemical.name}</strong> (Ref: ${chemical.code}) carece de ecuación de calibración y trazabilidad metrológica validada. No es posible realizar el despeje matemático.
      </p>
    `;
    updateChart(null);
  } else {
    const cSign = chemical.c >= 0 ? `+ ${chemical.c}` : `- ${Math.abs(chemical.c)}`;
    formulaText.textContent = `y = ${chemical.m}x ${cSign}`;
    traceableBadge.textContent = 'Trazable Metrológicamente';
    traceableBadge.className = 'badge badge-success';
    
    untraceableBanner.classList.add('hidden');
    resultBox.classList.remove('hidden');
  }
}

/**
 * Actualiza la visibilidad y estado de los botones de Ficha Técnica y Seguridad
 */
function updateDocumentButtons(chemical) {
  const docButtonsContainer = document.getElementById('doc-buttons');
  const btnFt = document.getElementById('btn-view-ft');
  const btnFds = document.getElementById('btn-view-fds');

  if (!docButtonsContainer || !btnFt || !btnFds) return;

  if (!chemical || (!chemical.ft && !chemical.fds)) {
    docButtonsContainer.classList.add('hidden');
    return;
  }

  docButtonsContainer.classList.remove('hidden');

  btnFt.disabled = !chemical.ft;
  btnFt.style.opacity = chemical.ft ? '1' : '0.4';

  btnFds.disabled = !chemical.fds;
  btnFds.style.opacity = chemical.fds ? '1' : '0.4';
}

/**
 * Abre el visor modal de PDF con el tipo de documento especificado ('ft' o 'fds')
 */
function openPdfModal(type) {
  const select = document.getElementById('chemical-select');
  const chemical = getChemicalById(select.value);
  if (!chemical) return;

  currentChemical = chemical;
  currentPdfType = type;

  const pdfModal = document.getElementById('pdf-modal');
  if (!pdfModal) return;

  renderPdfContent();
  pdfModal.classList.add('active');
}

/**
 * Cierra el visor de PDF
 */
function closePdfModal() {
  const pdfModal = document.getElementById('pdf-modal');
  const frameEl = document.getElementById('pdf-frame');
  if (pdfModal) pdfModal.classList.remove('active');
  if (frameEl) frameEl.src = 'about:blank';
}

/**
 * Renderiza el documento PDF en el iframe del modal
 */
function renderPdfContent() {
  if (!currentChemical) return;

  const titleEl = document.getElementById('pdf-modal-title');
  const frameEl = document.getElementById('pdf-frame');
  const openNewtabEl = document.getElementById('pdf-open-newtab');
  const tabFt = document.getElementById('pdf-tab-ft');
  const tabFds = document.getElementById('pdf-tab-fds');

  const pdfPath = currentPdfType === 'ft' ? currentChemical.ft : currentChemical.fds;
  const docTypeName = currentPdfType === 'ft' ? 'Ficha Técnica' : 'Ficha de Seguridad';

  const isMobile = window.innerWidth <= 640;
  if (titleEl) {
    titleEl.textContent = isMobile 
      ? `${currentChemical.name} (${currentChemical.code})` 
      : `${currentChemical.name} (${currentChemical.code}) - ${docTypeName}`;
  }

  if (tabFt) {
    tabFt.classList.toggle('active', currentPdfType === 'ft');
    tabFt.disabled = !currentChemical.ft;
  }
  if (tabFds) {
    tabFds.classList.toggle('active', currentPdfType === 'fds');
    tabFds.disabled = !currentChemical.fds;
  }

  if (pdfPath) {
    const encodedPath = encodeURI(pdfPath);
    if (frameEl) frameEl.src = encodedPath;
    if (openNewtabEl) openNewtabEl.href = encodedPath;
  } else {
    if (frameEl) frameEl.src = 'about:blank';
    if (openNewtabEl) openNewtabEl.href = '#';
  }
}

/**
 * Intenta hacer el cálculo automáticamente si los inputs son válidos
 */
function autoCalculate() {
  const select = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond').value;
  const waterCondInput = document.getElementById('water-cond').value;

  const chemical = getChemicalById(select.value);
  if (!chemical || !chemical.traceable) return;

  const cVal = parseNumber(chemCondInput);
  const wVal = parseNumber(waterCondInput);

  if (!isNaN(cVal) && !isNaN(wVal)) {
    performCalculation();
  }
}

/**
 * Ejecuta el cálculo principal y actualiza la UI
 */
function performCalculation() {
  const select = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond').value;
  const waterCondInput = document.getElementById('water-cond').value;

  const chemical = getChemicalById(select.value);
  const result = calculateConcentration(chemical, chemCondInput, waterCondInput);

  const resultYValue = document.getElementById('result-y-value');
  const warningText = document.getElementById('warning-text');
  const breakdownContent = document.getElementById('breakdown-content');

  if (!result.success) {
    if (!result.isNotTraceable) {
      resultYValue.textContent = '--';
      warningText.classList.add('hidden');
      breakdownContent.innerHTML = `<p style="color: #f87171;">${result.error}</p>`;
    }
    updateChart(null);
    return result;
  }

  // Actualizar UI del Resultado
  resultYValue.textContent = formatSpanishNumber(result.y, 6);

  if (result.warning) {
    warningText.textContent = result.warning;
    warningText.classList.remove('hidden');
  } else {
    warningText.classList.add('hidden');
  }

  // Actualizar Desglose Paso a Paso
  breakdownContent.innerHTML = `
    <div class="step-item">
      <span class="step-badge">Paso 1</span>
      <span class="step-content">Resta conductividades: <strong>${result.step1Str}</strong></span>
    </div>
    <div class="step-item">
      <span class="step-badge">Paso 2</span>
      <span class="step-content">Sustitución en fórmula: <strong>${result.step2Str}</strong></span>
    </div>
    <div class="step-item">
      <span class="step-badge">Paso 3</span>
      <span class="step-content">Resultado final: <strong style="color: var(--accent-cyan);">${result.step3Str}</strong></span>
    </div>
  `;

  // Actualizar Gráfica
  updateChart(result);

  return result;
}

/**
 * Inicializa la gráfica con Chart.js
 */
function initChart() {
  const ctx = document.getElementById('calibration-chart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Curva de Calibración y = mx + c',
          data: [],
          borderColor: '#00f2fe',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0,
          fill: false
        },
        {
          label: 'Punto Medido (x, y)',
          data: [],
          backgroundColor: '#ef4444',
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 7,
          pointHoverRadius: 9,
          type: 'scatter'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Conductividad Neta x (mS/cm)',
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Concentración y',
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#f3f4f6'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `x: ${context.parsed.x.toFixed(4)}, y: ${context.parsed.y.toFixed(4)}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Actualiza los datos de la gráfica con el químico y el cálculo actual
 */
function updateChart(result) {
  if (!chartInstance) return;

  if (!result || !result.success || !result.chemical.traceable) {
    chartInstance.data.datasets[0].data = [];
    chartInstance.data.datasets[1].data = [];
    chartInstance.update();
    return;
  }

  const { m, c, x, y } = result;
  const maxX = Math.max(10, Math.ceil(x > 0 ? x * 1.5 : 10));

  // Generar puntos de la recta
  const linePoints = [
    { x: 0, y: c },
    { x: maxX, y: m * maxX + c }
  ];

  chartInstance.data.datasets[0].label = `Recta ${result.chemical.name}: y = ${m}x ${c >= 0 ? '+' : ''}${c}`;
  chartInstance.data.datasets[0].data = linePoints;
  chartInstance.data.datasets[1].data = [{ x, y }];

  chartInstance.update();
}

/**
 * Dibuja la tabla del historial de mediciones
 */
function renderHistoryTable() {
  const tbody = document.getElementById('history-tbody');
  const history = getHistory();

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
          No hay mediciones guardadas aún.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = history.map(item => {
    const dateStr = new Date(item.timestamp).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    return `
      <tr>
        <td style="color: var(--text-muted);">${dateStr}</td>
        <td><strong style="color: var(--accent-cyan);">${item.chemicalName}</strong></td>
        <td>${formatSpanishNumber(item.chemCond, 4)}</td>
        <td>${formatSpanishNumber(item.waterCond, 4)}</td>
        <td>${formatSpanishNumber(item.netCond, 4)}</td>
        <td><strong style="color: #34d399;">${formatSpanishNumber(item.concentration, 6)}</strong></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${item.formula}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Resetea el formulario y los resultados
 */
function resetForm() {
  document.getElementById('chemical-select').value = '';
  document.getElementById('chem-cond').value = '';
  document.getElementById('water-cond').value = '';
  document.getElementById('result-y-value').textContent = '--';
  document.getElementById('warning-text').classList.add('hidden');
  document.getElementById('formula-preview').classList.add('hidden');
  document.getElementById('untraceable-banner').classList.add('hidden');
  document.getElementById('result-box').classList.remove('hidden');
  document.getElementById('breakdown-content').innerHTML = `
    <p style="color: var(--text-dim); font-size: 0.85rem;">Selecciona un producto e introduce las conductividades para ver la resolución de la ecuación.</p>
  `;
  updateChart(null);
}
