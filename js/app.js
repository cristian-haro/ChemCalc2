import { CHEMICAL_DATA, BRANDS, getProductsByBrand, getChemicalById } from './data.js';
import { calculateConcentration, calculateConductivity, formatSpanishNumber, parseNumber } from './calculator.js';
import { getHistory, saveToHistory, clearHistory, exportToCSV } from './storage.js';

// Global variables
let chartInstance = null;
let currentChemical = null;
let currentPdfType = 'ft';
let currentMode = 'conc'; // 'conc' (Directo) | 'cond' (Inverso)
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  initBrandSelect();
  initEventListeners();
  renderHistoryTable();
  initChart();
  initPWA();
});

/**
 * Inicializa el Service Worker y la gestión de instalación PWA
 */
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[PWA] Service Worker registrado:', reg.scope))
        .catch((err) => console.error('[PWA] Error al registrar Service Worker:', err));
    });
  }

  const btnInstall = document.getElementById('btn-install-pwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) btnInstall.classList.remove('hidden');
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Respuesta del usuario: ${outcome}`);
      deferredPrompt = null;
      btnInstall.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] La app Tesiscalc fue instalada correctamente.');
    if (btnInstall) btnInstall.classList.add('hidden');
  });
}

/**
 * Inicializa la lista desplegable de Marcas
 */
function initBrandSelect() {
  const brandSelect = document.getElementById('brand-select');
  if (!brandSelect) return;

  brandSelect.innerHTML = '<option value="">-- Seleccionar marca --</option>';
  BRANDS.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    brandSelect.appendChild(opt);
  });

  const chemSelect = document.getElementById('chemical-select');
  if (chemSelect) {
    chemSelect.disabled = true;
    chemSelect.innerHTML = '<option value="">-- Seleccionar marca primero --</option>';
  }
}

/**
 * Evento al cambiar la marca seleccionada
 */
function onBrandChange() {
  const brandSelect = document.getElementById('brand-select');
  const chemSelect = document.getElementById('chemical-select');
  if (!brandSelect || !chemSelect) return;

  const brandId = brandSelect.value;

  if (!brandId) {
    chemSelect.disabled = true;
    chemSelect.innerHTML = '<option value="">-- Seleccionar marca primero --</option>';
    onChemicalChange();
    autoCalculate();
    return;
  }

  const products = getProductsByBrand(brandId);
  chemSelect.disabled = false;
  chemSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';

  products.forEach(chem => {
    const opt = document.createElement('option');
    opt.value = chem.id;
    opt.textContent = chem.traceable
      ? chem.name
      : `${chem.name} - [SIN TRAZABILIDAD]`;
    chemSelect.appendChild(opt);
  });

  onChemicalChange();
  autoCalculate();
}

/**
 * Cambia el modo de cálculo (Directo: Concentración vs Inverso: Conductividad)
 */
function setMode(mode) {
  if (currentMode === mode) return;
  currentMode = mode;

  const tabConc = document.getElementById('tab-mode-conc');
  const tabCond = document.getElementById('tab-mode-cond');
  const groupChemCond = document.getElementById('group-chem-cond');
  const groupTargetY = document.getElementById('group-target-y');
  const resultLabel = document.getElementById('result-label');
  const resultUnit = document.getElementById('result-unit');
  const resultSubDetail = document.getElementById('result-sub-detail');

  if (tabConc) tabConc.classList.toggle('active', mode === 'conc');
  if (tabCond) tabCond.classList.toggle('active', mode === 'cond');

  if (groupChemCond) groupChemCond.classList.toggle('hidden', mode === 'cond');
  if (groupTargetY) groupTargetY.classList.toggle('hidden', mode === 'conc');

  if (resultLabel) {
    resultLabel.textContent = mode === 'conc'
      ? 'CONCENTRACIÓN DE PRODUCTO'
      : 'CONDUCTIVIDAD ESTIMADA DEL PRODUCTO';
  }

  if (resultUnit) {
    resultUnit.textContent = mode === 'conc' ? 'conc.' : 'mS/cm';
  }

  if (resultSubDetail) {
    resultSubDetail.classList.add('hidden');
    resultSubDetail.textContent = '';
  }

  autoCalculate();
}

/**
 * Inicializa los eventos de la interfaz
 */
function initEventListeners() {
  const brandSelect = document.getElementById('brand-select');
  const chemSelect = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond');
  const targetYInput = document.getElementById('target-y');
  const waterCondInput = document.getElementById('water-cond');
  const btnCalculate = document.getElementById('btn-calculate');
  const btnReset = document.getElementById('btn-reset');
  const btnExportTop = document.getElementById('btn-export-top');
  const btnExportHistory = document.getElementById('btn-export-history');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Pestañas de modo
  const tabConc = document.getElementById('tab-mode-conc');
  const tabCond = document.getElementById('tab-mode-cond');

  if (tabConc) tabConc.addEventListener('click', () => setMode('conc'));
  if (tabCond) tabCond.addEventListener('click', () => setMode('cond'));

  if (brandSelect) {
    brandSelect.addEventListener('change', onBrandChange);
  }

  if (chemSelect) {
    chemSelect.addEventListener('change', () => {
      onChemicalChange();
      autoCalculate();
    });
  }

  if (chemCondInput) chemCondInput.addEventListener('input', autoCalculate);
  if (targetYInput) targetYInput.addEventListener('input', autoCalculate);
  if (waterCondInput) waterCondInput.addEventListener('input', autoCalculate);

  if (btnCalculate) {
    btnCalculate.addEventListener('click', () => {
      const result = performCalculation();
      if (result && result.success) {
        saveToHistory(result);
        renderHistoryTable();
      }
    });
  }

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

/**
 * Evento al cambiar el producto seleccionado
 */
function onChemicalChange() {
  const select = document.getElementById('chemical-select');
  const formulaPreview = document.getElementById('formula-preview');
  const formulaText = document.getElementById('formula-text');
  const traceableBadge = document.getElementById('traceable-badge');
  const untraceableBanner = document.getElementById('untraceable-banner');
  const resultBox = document.getElementById('result-box');

  const chemical = select ? getChemicalById(select.value) : null;
  currentChemical = chemical;

  updateDocumentButtons(chemical);

  if (!chemical) {
    if (formulaPreview) formulaPreview.classList.add('hidden');
    if (untraceableBanner) untraceableBanner.classList.add('hidden');
    if (resultBox) resultBox.classList.remove('hidden');
    updateChart(null);
    return;
  }

  // if (formulaPreview) formulaPreview.classList.remove('hidden');

  if (!chemical.traceable) {
    if (formulaText) formulaText.textContent = 'Carece de trazabilidad metrológica';
    if (traceableBadge) {
      traceableBadge.textContent = 'Sin Trazabilidad';
      traceableBadge.className = 'badge badge-danger';
    }
    
    if (untraceableBanner) untraceableBanner.classList.remove('hidden');
    if (resultBox) resultBox.classList.add('hidden');
    updateChart(null);
  } else {
    const cSign = chemical.c >= 0 ? `+ ${chemical.c}` : `- ${Math.abs(chemical.c)}`;
    if (formulaText) formulaText.textContent = `y = ${chemical.m}x ${cSign}`;
    if (traceableBadge) {
      traceableBadge.textContent = 'Trazable Metrológicamente';
      traceableBadge.className = 'badge badge-success';
    }
    
    if (untraceableBanner) untraceableBanner.classList.add('hidden');
    if (resultBox) resultBox.classList.remove('hidden');
  }
}

/**
 * Actualiza los botones de Fichas Técnicas (FT) y Fichas de Seguridad (FDS)
 */
function updateDocumentButtons(chemical) {
  const docButtons = document.getElementById('doc-buttons');
  const btnViewFt = document.getElementById('btn-view-ft');
  const btnViewFds = document.getElementById('btn-view-fds');

  if (!docButtons || !btnViewFt || !btnViewFds) return;

  if (!chemical || (!chemical.ft && !chemical.fds)) {
    docButtons.classList.add('hidden');
    return;
  }

  docButtons.classList.remove('hidden');

  if (chemical.ft) {
    btnViewFt.disabled = false;
    btnViewFt.title = `Ver Ficha Técnica de ${chemical.name}`;
    btnViewFt.style.opacity = '1';
  } else {
    btnViewFt.disabled = true;
    btnViewFt.title = 'Ficha Técnica no disponible';
    btnViewFt.style.opacity = '0.5';
  }

  if (chemical.fds) {
    btnViewFds.disabled = false;
    btnViewFds.title = `Ver Ficha de Seguridad de ${chemical.name}`;
    btnViewFds.style.opacity = '1';
  } else {
    btnViewFds.disabled = true;
    btnViewFds.title = 'Ficha de Seguridad no disponible';
    btnViewFds.style.opacity = '0.5';
  }
}

/**
 * Abre el modal del visor de PDF
 */
function openPdfModal(type) {
  if (!currentChemical) return;

  currentPdfType = type;
  const pdfModal = document.getElementById('pdf-modal');

  renderPdfContent();

  if (pdfModal) pdfModal.classList.add('active');
}

/**
 * Renderiza el PDF actual en el modal
 */
function renderPdfContent() {
  if (!currentChemical) return;

  const pdfFrame = document.getElementById('pdf-frame');
  const titleEl = document.getElementById('pdf-modal-title');
  const tabFt = document.getElementById('pdf-tab-ft');
  const tabFds = document.getElementById('pdf-tab-fds');
  const openNewTabLink = document.getElementById('pdf-open-newtab');

  const pdfPath = currentPdfType === 'ft' ? currentChemical.ft : currentChemical.fds;
  const docTypeName = currentPdfType === 'ft' ? 'Ficha Técnica' : 'Ficha de Seguridad';

  const isMobile = window.innerWidth <= 640;
  if (titleEl) {
    titleEl.textContent = isMobile
      ? `${currentChemical.brandName} - ${currentChemical.name}`
      : `${currentChemical.brandName} - ${currentChemical.name} - ${docTypeName}`;
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
    if (pdfFrame) pdfFrame.src = encodedPath;
    if (openNewTabLink) openNewTabLink.href = encodedPath;
  } else {
    if (pdfFrame) pdfFrame.src = 'about:blank';
    if (openNewTabLink) openNewTabLink.href = '#';
  }
}

/**
 * Cierra el modal de PDF
 */
function closePdfModal() {
  const pdfModal = document.getElementById('pdf-modal');
  const pdfFrame = document.getElementById('pdf-frame');

  if (pdfModal) pdfModal.classList.remove('active');
  if (pdfFrame) pdfFrame.src = '';
}

/**
 * Cálculo automático al escribir en los inputs de conductividad o concentración
 */
function autoCalculate() {
  const select = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond');
  const targetYInput = document.getElementById('target-y');
  const waterCondInput = document.getElementById('water-cond');

  if (!select || !select.value) return;

  const waterVal = waterCondInput ? waterCondInput.value.trim() : '';

  if (currentMode === 'conc') {
    const chemVal = chemCondInput ? chemCondInput.value.trim() : '';
    if (chemVal !== '' && waterVal !== '') {
      performCalculation();
    }
  } else {
    const targetYVal = targetYInput ? targetYInput.value.trim() : '';
    if (targetYVal !== '' && waterVal !== '') {
      performCalculation();
    }
  }
}

/**
 * Ejecuta el cálculo según el modo activo y actualiza la UI
 */
function performCalculation() {
  const select = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond');
  const targetYInput = document.getElementById('target-y');
  const waterCondInput = document.getElementById('water-cond');

  const chemicalId = select ? select.value : '';
  const waterCondStr = waterCondInput ? waterCondInput.value : '';

  let result = null;

  if (currentMode === 'conc') {
    const chemCondStr = chemCondInput ? chemCondInput.value : '';
    result = calculateConcentration(chemicalId, chemCondStr, waterCondStr);
  } else {
    const targetYStr = targetYInput ? targetYInput.value : '';
    result = calculateConductivity(chemicalId, targetYStr, waterCondStr);
  }

  const resultYValue = document.getElementById('result-y-value');
  const resultSubDetail = document.getElementById('result-sub-detail');
  const warningText = document.getElementById('warning-text');

  if (!result || !result.success) {
    if (!result || !result.isNotTraceable) {
      if (resultYValue) resultYValue.textContent = '--';
      if (resultSubDetail) resultSubDetail.classList.add('hidden');
      if (warningText) warningText.classList.add('hidden');
    }
    updateChart(null);
    return result;
  }

  // Actualizar UI del Resultado
  if (currentMode === 'conc') {
    if (resultYValue) resultYValue.textContent = formatSpanishNumber(result.y, 6);
    if (resultSubDetail) {
      resultSubDetail.textContent = `Conductividad Neta Medida (x): ${formatSpanishNumber(result.x, 4)} mS/cm`;
      resultSubDetail.classList.remove('hidden');
    }
  } else {
    if (resultYValue) resultYValue.textContent = formatSpanishNumber(result.chemCond, 4);
    if (resultSubDetail) {
      resultSubDetail.textContent = `Conductividad Neta Requerida (x): ${formatSpanishNumber(result.x, 4)} mS/cm`;
      resultSubDetail.classList.remove('hidden');
    }
  }

  if (result.warning) {
    if (warningText) {
      warningText.textContent = result.warning;
      warningText.classList.remove('hidden');
    }
  } else {
    if (warningText) warningText.classList.add('hidden');
  }

  // Actualizar Gráfica
  updateChart(result);

  return result;
}

/**
 * Inicializa el gráfico de la recta de calibración con Chart.js
 */
function initChart() {
  const canvas = document.getElementById('calibration-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Recta de Calibración',
          data: [],
          borderColor: '#00f2fe',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: 'Punto Medido (x, y)',
          data: [],
          backgroundColor: '#ef4444',
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false
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
            color: '#9ca3af',
            font: { size: 12, weight: '500' }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af' }
        },
        y: {
          title: {
            display: true,
            text: 'Concentración y',
            color: '#9ca3af',
            font: { size: 12, weight: '500' }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#e2e8f0', font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `x: ${context.parsed.x.toFixed(4)}, y: ${context.parsed.y.toFixed(4)}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Actualiza los datos de la gráfica con el Producto y el cálculo actual
 */
function updateChart(result) {
  if (!chartInstance) return;

  if (!result || !result.success || !result.chemical.traceable) {
    chartInstance.data.datasets[0].data = [];
    chartInstance.data.datasets[1].data = [];
    chartInstance.update();
    return;
  }

  const m = result.chemical.m;
  const c = result.chemical.c;

  // Generar puntos de la recta
  const xMax = Math.max(10, Math.ceil(result.x * 1.25));
  const linePoints = [
    { x: 0, y: c },
    { x: xMax, y: m * xMax + c }
  ];

  const currentPoint = [
    { x: result.x, y: result.y }
  ];

  chartInstance.data.datasets[0].label = `Recta ${result.chemical.brandName} - ${result.chemical.name}: y = ${m}x ${c >= 0 ? '+' : ''}${c}`;
  chartInstance.data.datasets[0].data = linePoints;
  chartInstance.data.datasets[1].data = currentPoint;

  chartInstance.update();
}

/**
 * Renderiza la tabla con el historial de mediciones
 */
function renderHistoryTable() {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  const history = getHistory();

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
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
        <td style="color: var(--text-muted); font-weight: 500;">${item.brandName || '-'}</td>
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
  const brandSelect = document.getElementById('brand-select');
  const chemSelect = document.getElementById('chemical-select');
  const chemCondInput = document.getElementById('chem-cond');
  const targetYInput = document.getElementById('target-y');
  const waterCondInput = document.getElementById('water-cond');
  const resultYValue = document.getElementById('result-y-value');
  const resultSubDetail = document.getElementById('result-sub-detail');
  const warningText = document.getElementById('warning-text');
  const formulaPreview = document.getElementById('formula-preview');
  const untraceableBanner = document.getElementById('untraceable-banner');
  const resultBox = document.getElementById('result-box');

  if (brandSelect) brandSelect.value = '';
  if (chemSelect) {
    chemSelect.value = '';
    chemSelect.disabled = true;
    chemSelect.innerHTML = '<option value="">-- Seleccionar marca primero --</option>';
  }

  if (chemCondInput) chemCondInput.value = '';
  if (targetYInput) targetYInput.value = '';
  if (waterCondInput) waterCondInput.value = '';
  if (resultYValue) resultYValue.textContent = '--';
  if (resultSubDetail) resultSubDetail.classList.add('hidden');
  if (warningText) warningText.classList.add('hidden');
  if (formulaPreview) formulaPreview.classList.add('hidden');
  if (untraceableBanner) untraceableBanner.classList.add('hidden');
  if (resultBox) resultBox.classList.remove('hidden');

  updateChart(null);
}
