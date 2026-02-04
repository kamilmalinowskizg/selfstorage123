// ===== SELF-STORAGE KONFIGURATOR PRO =====
// Main Application Logic

// ===== GLOBAL STATE =====
const state = {
    hallShape: 'rectangle',
    hallLength: 30,
    hallWidth: 20,
    armALength: 20,
    armAWidth: 10,
    armBLength: 15,
    armBWidth: 10,
    totalArea: 600,
    systemHeight: 3000,
    doorHeight: 2130,
    corridorWidth: 1400,
    smallPercent: 50,
    mediumPercent: 30,
    largePercent: 20,
    // Options
    hasMesh: true,
    hasSoffit: false,
    hasElectroLocks: true,
    hasRollerDoors: false,
    needsGate: false,
    hasCameras: true,
    hasLighting: true,
    // Calculated values
    boxes: [],
    corridorLength: 0,
    frontWallLength: 0,
    partitionWallLength: 0,
    netArea: 0,
    grossArea: 600,
    efficiency: 0,              // Osiągnięta wydajność (netArea/grossArea)
    targetEfficiency: 70,     // Wydajność realna/docelowa % (korytarze + przestrzeń gospodarcza)
    maxEfficiency: 0,         // Wydajność maksymalna teoretyczna %
    calculatedCorridorArea: 0,
    nonUsableArea: 0,         // Korytarze + przestrzeń gospodarcza (m²)
    // Manual override mode
    calcMode: 'auto', // 'auto' or 'manual'
    manualValues: {
        whiteWall: null,
        grayWall: null,
        mesh: null,
        kickPlate: null,
        singleDoors: null,
        doubleDoors: null,
        rollers15: null,
        rollers20: null,
        electroLocks: null,
        totalBoxes: null,
        netArea: null,
        corridorArea: null
    }
};

// ===== PRICING (default values) =====
const prices = {
    whiteWall: 110,      // PLN/m²
    grayWall: 84,        // PLN/m²
    mesh: 50,            // PLN/m²
    kickPlate: 81,       // PLN/mb
    doorSingle: 780,     // PLN/szt
    doorDouble: 1560,    // PLN/szt
    roller15: 1700,      // PLN/szt
    roller20: 1800,      // PLN/szt
    electroLock: 550,    // PLN/szt
    soffit: 80,          // PLN/mb
    gate: 15000,         // PLN
    camera: 500,         // PLN/szt
    lamp: 350            // PLN/szt
};

// ===== CASH FLOW PARAMS =====
const cashFlowParams = {
    rentPrice: 85,           // PLN/m²/msc
    monthlyRental: 20,       // m²/msc
    maxOccupancy: 85,        // %
    contractLength: 10,      // lat
    licenseFee: 15,          // %
    fixedCosts: 5000         // PLN/msc
};

// Calculated costs and results
let calculatedCosts = null;
let cashFlowResults = null;
let cashFlowChart = null;

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeInputs();
    initializeSliders();
    initializeEventListeners();
    updateGrossArea();
});

// ===== TAB NAVIGATION =====
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected content
            const tabId = 'tab-' + tab.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// ===== INPUT INITIALIZATION =====
function initializeInputs() {
    // Hall shape selector
    document.getElementById('hallShape').addEventListener('change', (e) => {
        state.hallShape = e.target.value;
        toggleDimensionInputs();
        updateGrossArea();
    });

    // Dimension inputs
    const dimInputs = ['hallLength', 'hallWidth', 'armALength', 'armAWidth', 
                       'armBLength', 'armBWidth', 'totalArea', 'systemHeight',
                       'doorHeight', 'corridorWidth'];
    
    dimInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                state[id] = parseFloat(e.target.value) || 0;
                updateGrossArea();
            });
        }
    });
    
    // Wydajność docelowa (suwak + pole liczby)
    const targetEffSlider = document.getElementById('targetEfficiency');
    const targetEffNumber = document.getElementById('targetEfficiencyNumber');
    if (targetEffSlider) {
        targetEffSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.targetEfficiency = val;
            if (targetEffNumber) targetEffNumber.value = val;
        });
    }
    if (targetEffNumber) {
        targetEffNumber.addEventListener('input', (e) => {
            let val = parseInt(e.target.value) || 70;
            val = Math.max(55, Math.min(85, val));
            state.targetEfficiency = val;
            e.target.value = val;
            if (targetEffSlider) targetEffSlider.value = val;
        });
    }

    // Options checkboxes
    const options = ['hasMesh', 'hasSoffit', 'hasElectroLocks', 'hasRollerDoors',
                     'needsGate', 'hasCameras', 'hasLighting'];
    
    options.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                state[id] = e.target.checked;
            });
        }
    });

    // Price inputs
    const priceInputs = {
        'priceWhiteWall': 'whiteWall',
        'priceGrayWall': 'grayWall',
        'priceMesh': 'mesh',
        'priceKickPlate': 'kickPlate',
        'priceDoorSingle': 'doorSingle',
        'priceDoorDouble': 'doorDouble',
        'priceRoller15': 'roller15',
        'priceRoller20': 'roller20',
        'priceElectroLock': 'electroLock',
        'priceSoffit': 'soffit',
        'priceGate': 'gate',
        'priceCamera': 'camera',
        'priceLamp': 'lamp'
    };

    Object.entries(priceInputs).forEach(([inputId, priceKey]) => {
        const el = document.getElementById(inputId);
        if (el) {
            el.addEventListener('input', (e) => {
                prices[priceKey] = parseFloat(e.target.value) || 0;
            });
        }
    });

    // Cash flow inputs
    const cfInputs = {
        'rentPrice': 'rentPrice',
        'monthlyRental': 'monthlyRental',
        'maxOccupancy': 'maxOccupancy',
        'contractLength': 'contractLength',
        'licenseFee': 'licenseFee',
        'fixedCosts': 'fixedCosts'
    };

    Object.entries(cfInputs).forEach(([inputId, paramKey]) => {
        const el = document.getElementById(inputId);
        if (el) {
            el.addEventListener('input', (e) => {
                cashFlowParams[paramKey] = parseFloat(e.target.value) || 0;
            });
        }
    });
}

// ===== SLIDER INITIALIZATION =====
function initializeSliders() {
    const sliders = ['small', 'medium', 'large'];
    
    sliders.forEach(size => {
        const slider = document.getElementById(`${size}Percent`);
        const value = document.getElementById(`${size}PercentValue`);
        
        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state[`${size}Percent`] = val;
            value.textContent = val + '%';
            updateProgressBar();
        });
    });
}

function updateProgressBar() {
    const total = state.smallPercent + state.mediumPercent + state.largePercent;
    
    document.getElementById('progressSmall').style.width = 
        (state.smallPercent / Math.max(total, 1) * 100) + '%';
    document.getElementById('progressMedium').style.width = 
        (state.mediumPercent / Math.max(total, 1) * 100) + '%';
    document.getElementById('progressLarge').style.width = 
        (state.largePercent / Math.max(total, 1) * 100) + '%';
    
    const totalEl = document.getElementById('totalPercent');
    totalEl.textContent = total + '%';
    
    // Visual feedback for validation
    const progressBar = document.querySelector('.total-progress');
    if (total === 100) {
        totalEl.style.color = '#28a745';
        progressBar.style.boxShadow = '0 0 8px rgba(40, 167, 69, 0.5)';
        totalEl.innerHTML = total + '% <i class="fas fa-check-circle" style="color:#28a745"></i>';
    } else if (total > 100) {
        totalEl.style.color = '#dc3545';
        progressBar.style.boxShadow = '0 0 8px rgba(220, 53, 69, 0.5)';
        totalEl.innerHTML = total + '% <i class="fas fa-exclamation-circle" style="color:#dc3545"></i>';
    } else {
        totalEl.style.color = '#ffc107';
        progressBar.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.5)';
        totalEl.innerHTML = total + '% <i class="fas fa-exclamation-triangle" style="color:#ffc107"></i>';
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Generate plan button
    document.getElementById('generatePlan').addEventListener('click', generatePlan);
    
    // Calculate cashflow button
    document.getElementById('calculateCashflow').addEventListener('click', calculateCashFlow);
    
    // Reset prices button
    document.getElementById('resetPrices').addEventListener('click', resetPrices);
    
    // Print button
    document.getElementById('printBtn').addEventListener('click', printReport);
    
    // Export PDF
    document.getElementById('exportPdf').addEventListener('click', printReport);
    
    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettings').addEventListener('click', closeSettingsModal);
    document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
    document.getElementById('clearApiKey').addEventListener('click', clearApiKey);
    document.getElementById('toggleApiKey').addEventListener('click', toggleApiKeyVisibility);
    
    // Close modal on overlay click
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') closeSettingsModal();
    });
    
    // Load saved API key
    loadApiKey();
    
    // Verification tab event listeners
    initializeVerificationTab();
}

// ===== VERIFICATION TAB =====
function initializeVerificationTab() {
    // Mode toggle
    document.querySelectorAll('input[name="calcMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.calcMode = e.target.value;
            updateVerificationUI();
        });
    });
    
    // Manual input fields
    const manualInputs = {
        'manualWhiteWall': 'whiteWall',
        'manualGrayWall': 'grayWall',
        'manualMesh': 'mesh',
        'manualKickPlate': 'kickPlate',
        'manualSingleDoors': 'singleDoors',
        'manualDoubleDoors': 'doubleDoors',
        'manualRollers15': 'rollers15',
        'manualRollers20': 'rollers20',
        'manualElectroLocks': 'electroLocks',
        'manualTotalBoxes': 'totalBoxes',
        'manualNetArea': 'netArea',
        'manualCorridorArea': 'corridorArea'
    };
    
    Object.entries(manualInputs).forEach(([inputId, stateKey]) => {
        const el = document.getElementById(inputId);
        if (el) {
            el.addEventListener('input', (e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                state.manualValues[stateKey] = value;
                updateComparisonTable();
            });
        }
    });
    
    // Copy auto values button
    document.getElementById('copyAutoValues')?.addEventListener('click', copyAutoToManual);
    
    // Recalculate with manual values
    document.getElementById('recalculateWithManual')?.addEventListener('click', recalculateWithManual);
    
    // PDF Upload
    const pdfInput = document.getElementById('pdfFileInput');
    const uploadArea = document.getElementById('pdfUploadArea');
    const selectBtn = document.getElementById('selectPdfBtn');
    
    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pdfInput.click();
        });
    }
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => pdfInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        });
    }
    
    if (pdfInput) {
        pdfInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files);
            }
        });
    }
}

function updateVerificationUI() {
    const isManual = state.calcMode === 'manual';
    const manualInputs = document.querySelectorAll('.verify-input-wrapper input');
    
    manualInputs.forEach(input => {
        input.disabled = !isManual && state.calcMode === 'auto';
        if (!isManual) {
            input.style.opacity = '0.6';
        } else {
            input.style.opacity = '1';
        }
    });
}

function updateAutoValues() {
    // Update auto value displays after plan generation
    if (!calculatedCosts) return;
    
    const autoValues = {
        'autoWhiteWall': calculatedCosts.whiteWall?.qty || '-',
        'autoGrayWall': calculatedCosts.grayWall?.qty || '-',
        'autoMesh': calculatedCosts.mesh?.qty || '-',
        'autoKickPlate': calculatedCosts.kickPlate?.qty || '-',
        'autoSingleDoors': calculatedCosts.singleDoors?.qty || '-',
        'autoDoubleDoors': calculatedCosts.doubleDoors?.qty || '-',
        'autoRollers15': calculatedCosts.rollers15?.qty || '-',
        'autoRollers20': calculatedCosts.rollers20?.qty || '-',
        'autoElectroLocks': calculatedCosts.electroLocks?.qty || '-',
        'autoTotalBoxes': state.boxes.length,
        'autoNetArea': state.netArea,
        'autoCorridorArea': state.calculatedCorridorArea?.toFixed(1) || '-'
    };
    
    Object.entries(autoValues).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    });
    
    updateComparisonTable();
}

function updateComparisonTable() {
    const container = document.getElementById('comparisonTable');
    if (!calculatedCosts) {
        container.innerHTML = `
            <div class="comparison-placeholder">
                <i class="fas fa-sync-alt"></i>
                <p>Wygeneruj plan, aby zobaczyć porównanie</p>
            </div>
        `;
        return;
    }
    
    const items = [
        { label: 'Ściany frontowe (białe)', autoKey: 'whiteWall', manualKey: 'whiteWall', unit: 'm²' },
        { label: 'Ścianki działowe (szare)', autoKey: 'grayWall', manualKey: 'grayWall', unit: 'm²' },
        { label: 'Siatka zabezpieczająca', autoKey: 'mesh', manualKey: 'mesh', unit: 'm²' },
        { label: 'Kick Plate', autoKey: 'kickPlate', manualKey: 'kickPlate', unit: 'mb' },
        { label: 'Drzwi pojedyncze', autoKey: 'singleDoors', manualKey: 'singleDoors', unit: 'szt' },
        { label: 'Drzwi podwójne', autoKey: 'doubleDoors', manualKey: 'doubleDoors', unit: 'szt' },
        { label: 'Zamki elektroniczne', autoKey: 'electroLocks', manualKey: 'electroLocks', unit: 'szt' },
        { label: 'Liczba boksów', autoVal: state.boxes.length, manualKey: 'totalBoxes', unit: 'szt' },
        { label: 'Powierzchnia netto', autoVal: state.netArea, manualKey: 'netArea', unit: 'm²' },
        { label: 'Powierzchnia korytarzy', autoVal: state.calculatedCorridorArea?.toFixed(1), manualKey: 'corridorArea', unit: 'm²' }
    ];
    
    let html = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Parametr</th>
                    <th class="auto-col">Automatyczne</th>
                    <th class="manual-col">Ręczne</th>
                    <th>Różnica</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    items.forEach(item => {
        let autoVal = item.autoVal !== undefined 
            ? item.autoVal 
            : (calculatedCosts[item.autoKey]?.qty || 0);
        let manualVal = state.manualValues[item.manualKey];
        
        autoVal = parseFloat(autoVal) || 0;
        const displayManual = manualVal !== null ? manualVal : '-';
        
        let diff = '-';
        let diffClass = 'diff-zero';
        if (manualVal !== null) {
            const diffVal = manualVal - autoVal;
            diff = diffVal >= 0 ? `+${diffVal.toFixed(1)}` : diffVal.toFixed(1);
            diffClass = diffVal > 0 ? 'diff-positive' : (diffVal < 0 ? 'diff-negative' : 'diff-zero');
        }
        
        html += `
            <tr>
                <td>${item.label}</td>
                <td class="auto-col">${autoVal} ${item.unit}</td>
                <td class="manual-col">${displayManual !== '-' ? displayManual + ' ' + item.unit : '-'}</td>
                <td class="diff-col ${diffClass}">${diff}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function copyAutoToManual() {
    if (!calculatedCosts) {
        alert('Najpierw wygeneruj plan!');
        return;
    }
    
    // Copy auto values to manual inputs
    const mappings = {
        'manualWhiteWall': calculatedCosts.whiteWall?.qty,
        'manualGrayWall': calculatedCosts.grayWall?.qty,
        'manualMesh': calculatedCosts.mesh?.qty,
        'manualKickPlate': calculatedCosts.kickPlate?.qty,
        'manualSingleDoors': calculatedCosts.singleDoors?.qty,
        'manualDoubleDoors': calculatedCosts.doubleDoors?.qty,
        'manualRollers15': calculatedCosts.rollers15?.qty,
        'manualRollers20': calculatedCosts.rollers20?.qty,
        'manualElectroLocks': calculatedCosts.electroLocks?.qty,
        'manualTotalBoxes': state.boxes.length,
        'manualNetArea': state.netArea,
        'manualCorridorArea': state.calculatedCorridorArea?.toFixed(1)
    };
    
    Object.entries(mappings).forEach(([inputId, value]) => {
        const el = document.getElementById(inputId);
        if (el && value !== undefined) {
            el.value = value;
            // Trigger input event to update state
            el.dispatchEvent(new Event('input'));
        }
    });
    
    // Switch to manual mode
    document.getElementById('modeManual').checked = true;
    state.calcMode = 'manual';
    updateVerificationUI();
}

function recalculateWithManual() {
    if (state.calcMode !== 'manual') {
        alert('Przełącz na tryb ręczny, aby użyć własnych wartości.');
        return;
    }
    
    // Recalculate costs using manual values where provided
    calculateCostsWithManual();
    
    // Update UI
    renderCostSummary();
    generateSummary();
    
    // Switch to costs tab to show results
    document.querySelector('.nav-tab[data-tab="costs"]').click();
}

function calculateCostsWithManual() {
    if (!calculatedCosts) {
        alert('Najpierw wygeneruj plan!');
        return;
    }
    
    const systemHeightM = state.systemHeight / 1000;
    const doorHeightM = state.doorHeight / 1000;
    const doorArea = 1 * doorHeightM;
    
    // Use manual values if provided, otherwise use auto
    const getVal = (manualKey, autoKey, defaultVal = 0) => {
        if (state.manualValues[manualKey] !== null) {
            return state.manualValues[manualKey];
        }
        return calculatedCosts[autoKey]?.qty || defaultVal;
    };
    
    const whiteWallArea = getVal('whiteWall', 'whiteWall');
    const grayWallArea = getVal('grayWall', 'grayWall');
    const meshArea = getVal('mesh', 'mesh');
    const kickPlateLength = getVal('kickPlate', 'kickPlate');
    const singleDoors = getVal('singleDoors', 'singleDoors');
    const doubleDoors = getVal('doubleDoors', 'doubleDoors');
    const rollers15 = getVal('rollers15', 'rollers15');
    const rollers20 = getVal('rollers20', 'rollers20');
    const electroLocks = getVal('electroLocks', 'electroLocks');
    
    // Recalculate costs with (possibly) manual values
    calculatedCosts = {
        whiteWall: { qty: whiteWallArea, unit: 'm²', price: prices.whiteWall, total: whiteWallArea * prices.whiteWall },
        grayWall: { qty: grayWallArea, unit: 'm²', price: prices.grayWall, total: grayWallArea * prices.grayWall },
        mesh: { qty: meshArea, unit: 'm²', price: prices.mesh, total: meshArea * prices.mesh },
        kickPlate: { qty: kickPlateLength, unit: 'mb', price: prices.kickPlate, total: kickPlateLength * prices.kickPlate },
        singleDoors: { qty: singleDoors, unit: 'szt', price: prices.doorSingle, total: singleDoors * prices.doorSingle },
        doubleDoors: { qty: doubleDoors, unit: 'szt', price: prices.doorDouble, total: doubleDoors * prices.doorDouble },
        rollers15: { qty: rollers15, unit: 'szt', price: prices.roller15, total: rollers15 * prices.roller15 },
        rollers20: { qty: rollers20, unit: 'szt', price: prices.roller20, total: rollers20 * prices.roller20 },
        electroLocks: { qty: electroLocks, unit: 'szt', price: prices.electroLock, total: electroLocks * prices.electroLock },
        soffit: calculatedCosts.soffit,
        gate: calculatedCosts.gate,
        cameras: calculatedCosts.cameras,
        lamps: calculatedCosts.lamps
    };
    
    // Calculate grand total
    calculatedCosts.grandTotal = Object.values(calculatedCosts).reduce((sum, item) => {
        return sum + (item?.total || 0);
    }, 0);
}

// ===== PDF UPLOAD AND AI ANALYSIS =====
async function handleFileUpload(files) {
    const statusEl = document.getElementById('uploadStatus');
    statusEl.style.display = 'block';
    statusEl.className = 'upload-status loading';
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Przetwarzanie pliku...';
    
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        statusEl.className = 'upload-status error';
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Skonfiguruj klucz API OpenAI w ustawieniach';
        return;
    }
    
    try {
        // Convert files to base64
        const imagePromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    const mimeType = file.type || 'image/png';
                    resolve({ base64, mimeType, name: file.name });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });
        
        const images = await Promise.all(imagePromises);
        
        statusEl.innerHTML = '<i class="fas fa-robot"></i> AI analizuje plan... (może to potrwać 15-30 sekund)';
        
        // Prepare messages for OpenAI Vision API
        const imageContent = images.map(img => ({
            type: 'image_url',
            image_url: {
                url: `data:${img.mimeType};base64,${img.base64}`,
                detail: 'high'
            }
        }));
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Jesteś ekspertem od analizy planów architektonicznych Self-Storage. Analizujesz rzuty i wyciągasz dane o konstrukcji.
                        
Zwróć odpowiedź w formacie JSON z następującymi polami (użyj null jeśli nie możesz określić):
{
    "whiteWallArea": <liczba m² ścian frontowych/białych>,
    "grayWallArea": <liczba m² ścian działowych/szarych>,
    "meshArea": <liczba m² siatki zabezpieczającej>,
    "kickPlateLength": <metry bieżące odbojnicy>,
    "singleDoors": <liczba drzwi pojedynczych ~1m>,
    "doubleDoors": <liczba drzwi podwójnych ~2m>,
    "rollerDoors": <liczba bram/rolet>,
    "totalBoxes": <całkowita liczba boksów>,
    "smallBoxes": <liczba małych boksów 1-3m²>,
    "mediumBoxes": <liczba średnich boksów 4-7m²>,
    "largeBoxes": <liczba dużych boksów 8+m²>,
    "netArea": <powierzchnia netto boksów w m²>,
    "corridorArea": <powierzchnia korytarzy w m²>,
    "grossArea": <powierzchnia brutto w m²>,
    "hallDimensions": {"length": <długość>, "width": <szerokość>},
    "confidence": <0-100 pewność analizy>,
    "notes": "<dodatkowe uwagi o planie>"
}

Dokładnie policz elementy widoczne na planie. Jeśli nie jesteś pewien, daj szacunek z niższą pewnością.`
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Przeanalizuj ten plan Self-Storage i wyciągnij wszystkie dane konstrukcyjne. Policz ściany, drzwi i boksy.' },
                            ...imageContent
                        ]
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Błąd API');
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse JSON from response
        let analysisData;
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Nie znaleziono danych JSON w odpowiedzi');
            }
        } catch (parseError) {
            console.error('Parse error:', parseError);
            throw new Error('Nie udało się sparsować odpowiedzi AI');
        }
        
        // Apply extracted data to manual inputs
        applyAIAnalysisData(analysisData);
        
        statusEl.className = 'upload-status success';
        statusEl.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            <span>Analiza zakończona (pewność: ${analysisData.confidence || '?'}%)</span>
            ${analysisData.notes ? `<br><small>${analysisData.notes}</small>` : ''}
        `;
        
    } catch (error) {
        console.error('Upload/Analysis error:', error);
        statusEl.className = 'upload-status error';
        statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Błąd: ${error.message}`;
    }
}

function applyAIAnalysisData(data) {
    // Map AI data to manual inputs
    const mappings = {
        'manualWhiteWall': data.whiteWallArea,
        'manualGrayWall': data.grayWallArea,
        'manualMesh': data.meshArea,
        'manualKickPlate': data.kickPlateLength,
        'manualSingleDoors': data.singleDoors,
        'manualDoubleDoors': data.doubleDoors,
        'manualRollers15': data.rollerDoors,
        'manualTotalBoxes': data.totalBoxes,
        'manualNetArea': data.netArea,
        'manualCorridorArea': data.corridorArea
    };
    
    Object.entries(mappings).forEach(([inputId, value]) => {
        if (value !== null && value !== undefined) {
            const el = document.getElementById(inputId);
            if (el) {
                el.value = value;
                el.dispatchEvent(new Event('input'));
            }
        }
    });
    
    // Update hall dimensions if provided
    if (data.hallDimensions) {
        if (data.hallDimensions.length) {
            document.getElementById('hallLength').value = data.hallDimensions.length;
            state.hallLength = data.hallDimensions.length;
        }
        if (data.hallDimensions.width) {
            document.getElementById('hallWidth').value = data.hallDimensions.width;
            state.hallWidth = data.hallDimensions.width;
        }
        updateGrossArea();
    }
    
    // Switch to manual mode
    document.getElementById('modeManual').checked = true;
    state.calcMode = 'manual';
    updateVerificationUI();
    updateComparisonTable();
}

// ===== API KEY MANAGEMENT =====
function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('active');
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
    }
    updateApiStatus();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (key) {
        localStorage.setItem('openai_api_key', key);
        updateApiStatus();
        alert('Klucz API został zapisany!');
        closeSettingsModal();
    } else {
        alert('Wprowadź klucz API');
    }
}

function clearApiKey() {
    localStorage.removeItem('openai_api_key');
    document.getElementById('apiKeyInput').value = '';
    updateApiStatus();
    alert('Klucz API został usunięty');
}

function loadApiKey() {
    updateApiStatus();
}

function updateApiStatus() {
    const status = document.getElementById('apiStatus');
    const key = localStorage.getItem('openai_api_key');
    
    if (key) {
        status.className = 'api-status connected';
        status.innerHTML = '<i class="fas fa-circle"></i><span>Klucz API skonfigurowany</span>';
    } else {
        status.className = 'api-status disconnected';
        status.innerHTML = '<i class="fas fa-circle"></i><span>Brak klucza API</span>';
    }
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKeyInput');
    const icon = document.querySelector('#toggleApiKey i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ===== HELPER FUNCTIONS =====
function toggleDimensionInputs() {
    const rectDims = document.getElementById('rectangleDims');
    const lDims = document.getElementById('lShapeDims');
    const customArea = document.getElementById('customArea');
    
    rectDims.style.display = state.hallShape === 'rectangle' ? 'block' : 'none';
    lDims.style.display = state.hallShape === 'L-shape' ? 'block' : 'none';
    customArea.style.display = state.hallShape === 'custom' ? 'block' : 'none';
}

function updateGrossArea() {
    let area = 0;
    
    switch(state.hallShape) {
        case 'rectangle':
            area = state.hallLength * state.hallWidth;
            break;
        case 'L-shape':
            area = (state.armALength * state.armAWidth) + 
                   (state.armBLength * state.armBWidth) -
                   (Math.min(state.armAWidth, state.armBWidth) * Math.min(state.armAWidth, state.armBWidth));
            break;
        case 'custom':
            area = state.totalArea;
            break;
    }
    
    state.grossArea = Math.round(area);
    document.getElementById('grossArea').textContent = state.grossArea;
}

function resetPrices() {
    // Reset to defaults
    document.getElementById('priceWhiteWall').value = 110;
    document.getElementById('priceGrayWall').value = 84;
    document.getElementById('priceMesh').value = 50;
    document.getElementById('priceKickPlate').value = 81;
    document.getElementById('priceDoorSingle').value = 780;
    document.getElementById('priceDoorDouble').value = 1560;
    document.getElementById('priceRoller15').value = 1700;
    document.getElementById('priceRoller20').value = 1800;
    document.getElementById('priceElectroLock').value = 550;
    document.getElementById('priceSoffit').value = 80;
    document.getElementById('priceGate').value = 15000;
    document.getElementById('priceCamera').value = 500;
    document.getElementById('priceLamp').value = 350;
    
    // Update prices object
    prices.whiteWall = 110;
    prices.grayWall = 84;
    prices.mesh = 50;
    prices.kickPlate = 81;
    prices.doorSingle = 780;
    prices.doorDouble = 1560;
    prices.roller15 = 1700;
    prices.roller20 = 1800;
    prices.electroLock = 550;
    prices.soffit = 80;
    prices.gate = 15000;
    prices.camera = 500;
    prices.lamp = 350;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

// ===== MAIN PLAN GENERATION =====
function generatePlan() {
    // Validate percentages - must be exactly 100%
    const total = state.smallPercent + state.mediumPercent + state.largePercent;
    if (total !== 100) {
        alert(`Suma procentów musi wynosić dokładnie 100%!\nObecnie: ${total}%\n\nDostosuj suwaki podziału boksów.`);
        return;
    }
    
    const normalizedSmall = state.smallPercent / 100;
    const normalizedMedium = state.mediumPercent / 100;
    const normalizedLarge = state.largePercent / 100;
    
    // === WYDAJNOŚĆ REALNA (docelowa) ===
    // Użytkownik ustawia np. 70% – wtedy 30% to korytarze + przestrzeń gospodarcza
    const targetEff = state.targetEfficiency / 100;
    const usableArea = state.grossArea * targetEff;
    state.nonUsableArea = state.grossArea - usableArea; // korytarze + gospodarcza
    
    // Szacunek powierzchni samych korytarzy (do wyświetlania i kosztów)
    const corridorWidthM = state.corridorWidth / 1000;
    const hallLengthM = state.hallLength;
    let corridorArea;
    if (state.hallShape === 'rectangle') {
        const mainCorridorArea = hallLengthM * corridorWidthM;
        corridorArea = mainCorridorArea * 1.3; // +30% na dostępy
    } else if (state.hallShape === 'L-shape') {
        corridorArea = (state.armALength * corridorWidthM + state.armBLength * corridorWidthM) * 1.3;
    } else {
        corridorArea = Math.sqrt(state.totalArea) * 1.5 * corridorWidthM * 1.3;
    }
    // Nie przekraczaj powierzchni „nieużytkowej”
    state.calculatedCorridorArea = Math.min(corridorArea, state.nonUsableArea);
    
    // Wydajność maksymalna (teoretyczna): gdy tylko minimalne korytarze
    const minCorridorArea = corridorArea;
    const maxUsableArea = Math.max(0, state.grossArea - minCorridorArea);
    state.maxEfficiency = Math.round((maxUsableArea / state.grossArea) * 100);
    state.maxEfficiency = Math.min(state.maxEfficiency, 88); // cap realisty
    
    // Generate boxes with optimization
    state.boxes = generateBoxesOptimized(usableArea, normalizedSmall, normalizedMedium, normalizedLarge);
    
    // Calculate metrics
    state.netArea = state.boxes.reduce((sum, box) => sum + box.area, 0);
    state.efficiency = Math.round((state.netArea / state.grossArea) * 100); // osiągnięta
    
    // Pokazanie podsumowania wydajności (realna vs maksymalna)
    const effSummary = document.getElementById('efficiencySummary');
    if (effSummary) {
        effSummary.style.display = 'block';
        const effAchieved = document.getElementById('effAchieved');
        const effMax = document.getElementById('effMax');
        if (effAchieved) effAchieved.textContent = state.efficiency + '%';
        if (effMax) effMax.textContent = state.maxEfficiency + '%';
    }
    
    // Calculate wall lengths
    calculateWallLengths();
    
    // Update stats
    updatePlanStats();
    
    // Calculate costs
    calculateCosts();
    
    // Generate summary
    generateSummary();
    
    // Generate floor plan display
    generateFloorPlanDisplay();
    
    // Update verification tab auto values
    updateAutoValues();
    
    // Switch to plan tab
    document.querySelector('.nav-tab[data-tab="plan"]').click();
}

// ===== BOX GENERATION WITH OPTIMIZATION =====
function generateBoxesOptimized(usableArea, smallRatio, mediumRatio, largeRatio) {
    const boxes = [];
    
    // Optimal box sizes for each category (most space-efficient)
    const smallSizes = [2, 3]; // Prefer 2m² for max quantity
    const mediumSizes = [4, 5, 6]; // Prefer 4m² for max quantity
    const largeSizes = [8, 10, 12]; // Prefer 8m² for max quantity
    
    // Target areas for each category
    const targetSmall = usableArea * smallRatio;
    const targetMedium = usableArea * mediumRatio;
    const targetLarge = usableArea * largeRatio;
    
    let totalUsed = 0;
    
    // OPTIMIZATION STRATEGY: Use smallest size in each category to maximize box count
    // But maintain variety for realistic distribution
    
    // Generate large boxes - prefer 8m² for quantity, mix in some larger
    let currentArea = 0;
    while (currentArea < targetLarge) {
        // 70% chance for smallest (8m²), 20% for medium (10m²), 10% for largest (12m²)
        let size;
        const rand = Math.random();
        if (rand < 0.7) size = 8;
        else if (rand < 0.9) size = 10;
        else size = 12;
        
        if (currentArea + size <= targetLarge + 2) {
            boxes.push({ area: size, category: 'large' });
            currentArea += size;
            totalUsed += size;
        } else {
            // Try smaller size
            if (currentArea + 8 <= targetLarge + 2) {
                boxes.push({ area: 8, category: 'large' });
                currentArea += 8;
                totalUsed += 8;
            } else break;
        }
    }
    
    // Generate medium boxes - prefer 4m² for quantity
    currentArea = 0;
    while (currentArea < targetMedium) {
        let size;
        const rand = Math.random();
        if (rand < 0.5) size = 4;
        else if (rand < 0.8) size = 5;
        else size = 6;
        
        if (currentArea + size <= targetMedium + 2) {
            boxes.push({ area: size, category: 'medium' });
            currentArea += size;
            totalUsed += size;
        } else {
            if (currentArea + 4 <= targetMedium + 2) {
                boxes.push({ area: 4, category: 'medium' });
                currentArea += 4;
                totalUsed += 4;
            } else break;
        }
    }
    
    // Generate small boxes - prefer 2m² for maximum quantity
    currentArea = 0;
    while (currentArea < targetSmall) {
        let size;
        const rand = Math.random();
        if (rand < 0.6) size = 2;
        else size = 3;
        
        if (currentArea + size <= targetSmall + 1) {
            boxes.push({ area: size, category: 'small' });
            currentArea += size;
            totalUsed += size;
        } else {
            if (currentArea + 2 <= targetSmall + 1) {
                boxes.push({ area: 2, category: 'small' });
                currentArea += 2;
                totalUsed += 2;
            } else break;
        }
    }
    
    // FINAL OPTIMIZATION: Fill ALL remaining space with smallest boxes
    let remainingSpace = usableArea - totalUsed;
    while (remainingSpace >= 2) {
        boxes.push({ area: 2, category: 'small' });
        remainingSpace -= 2;
        totalUsed += 2;
    }
    
    // Sort boxes for better visual layout: large first, then medium, then small
    boxes.sort((a, b) => b.area - a.area);
    
    return boxes;
}

// ===== FLOOR PLAN DISPLAY =====
function generateFloorPlanDisplay() {
    // Simply show the optimized box layout
    showFloorPlanPlaceholder();
}

function getBoxCountsBySize() {
    const counts = {};
    state.boxes.forEach(box => {
        if (!counts[box.area]) {
            counts[box.area] = 0;
        }
        counts[box.area]++;
    });
    return counts;
}

function showFloorPlanPlaceholder() {
    const container = document.getElementById('svgContainer');
    const boxCounts = getBoxCountsBySize();
    const sortedSizes = Object.keys(boxCounts).map(Number).sort((a, b) => a - b);
    
    // Calculate hall dimensions for visual
    const hallWidth = Math.min(state.hallLength * 12, 550);
    const hallHeight = Math.min(state.hallWidth * 12, 350);
    const corridorHeight = 40;
    const rowHeight = (hallHeight - corridorHeight - 20) / 2;
    
    // Calculate box widths to fit in hall
    const totalBoxArea = state.boxes.reduce((sum, b) => sum + b.area, 0);
    const halfBoxes = Math.ceil(state.boxes.length / 2);
    const topRowBoxes = state.boxes.slice(0, halfBoxes);
    const bottomRowBoxes = state.boxes.slice(halfBoxes);
    
    // Calculate scale factor to fit boxes
    const topRowArea = topRowBoxes.reduce((sum, b) => sum + b.area, 0);
    const bottomRowArea = bottomRowBoxes.reduce((sum, b) => sum + b.area, 0);
    const maxRowArea = Math.max(topRowArea, bottomRowArea);
    const scaleFactor = (hallWidth - 20) / (maxRowArea * 6);
    
    // Create a visual representation
    let html = `
        <div class="floor-plan-display">
            <div class="plan-visual">
                <div class="hall-outline" style="width: ${hallWidth}px; height: ${hallHeight}px;">
                    <div class="hall-label">${state.hallLength}m x ${state.hallWidth}m (${state.grossArea}m²)</div>
                    <div class="boxes-row top-row" style="height:${rowHeight}px;">`;
    
    // Add visual boxes for top row - scaled to fit
    topRowBoxes.forEach(box => {
        const colorClass = box.category;
        const width = Math.max(Math.min(box.area * scaleFactor * 5, 80), 18);
        html += `<div class="visual-box ${colorClass}" style="width:${width}px;height:${rowHeight - 6}px;font-size:${width > 25 ? '10px' : '8px'}" title="${box.area}m²">${box.area}</div>`;
    });
    
    html += `</div>
                    <div class="corridor" style="height:${corridorHeight}px;">
                        <span>KORYTARZ ${state.corridorWidth}mm</span>
                    </div>
                    <div class="boxes-row bottom-row" style="height:${rowHeight}px;">`;
    
    // Add visual boxes for bottom row
    bottomRowBoxes.forEach(box => {
        const colorClass = box.category;
        const width = Math.max(Math.min(box.area * scaleFactor * 5, 80), 18);
        html += `<div class="visual-box ${colorClass}" style="width:${width}px;height:${rowHeight - 6}px;font-size:${width > 25 ? '10px' : '8px'}" title="${box.area}m²">${box.area}</div>`;
    });
    
    html += `</div>
                </div>
                <div class="hall-legend">
                    <div class="legend-item"><span class="legend-box small"></span> Małe (1-3m²)</div>
                    <div class="legend-item"><span class="legend-box medium"></span> Średnie (4-7m²)</div>
                    <div class="legend-item"><span class="legend-box large"></span> Duże (8-15m²)</div>
                </div>
            </div>
            <div class="box-stats-table">
                <h4><i class="fas fa-th"></i> Przykładowe zestawienie boksów</h4>
                <p class="table-subtitle">Na podstawie wybranej konfiguracji</p>
                <table>
                    <thead>
                        <tr>
                            <th>Rozmiar</th>
                            <th>Ilość</th>
                            <th>Suma m²</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    let totalCount = 0;
    let totalArea = 0;
    
    sortedSizes.forEach(size => {
        const count = boxCounts[size];
        const area = size * count;
        totalCount += count;
        totalArea += area;
        
        let category = 'small';
        if (size >= 4 && size <= 7) category = 'medium';
        if (size >= 8) category = 'large';
        
        html += `<tr class="${category}-row">
            <td><span class="size-badge ${category}">${size} m²</span></td>
            <td>${count} szt.</td>
            <td>${area} m²</td>
        </tr>`;
    });
    
    html += `</tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td><strong>SUMA</strong></td>
                            <td><strong>${totalCount} szt.</strong></td>
                            <td><strong>${totalArea} m²</strong></td>
                        </tr>
                    </tfoot>
                </table>
                <div class="optimization-note">
                    <i class="fas fa-lightbulb"></i>
                    <span>Algorytm optymalizuje ilość boksów przy zachowaniu zadanych proporcji</span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ===== WALL LENGTH CALCULATIONS =====
// Zgodnie z wytycznymi:
// - Ściana frontowa (biała/niebieska linia): zewnętrzne ściany boksów od strony korytarza
// - Ściana działowa (szara/pomarańczowa linia): wewnętrzne ściany między boksami
function calculateWallLengths() {
    // Standardowa głębokość boksu (zakładamy układ dwurzędowy z korytarzem pośrodku)
    const standardDepth = 3; // 3m głębokości boksu (typowe dla self-storage)
    
    let totalFrontWallLength = 0; // Suma szerokości wszystkich boksów (ściany frontowe)
    let totalPartitionWallLength = 0; // Suma ścian działowych (między boksami)
    
    // Oblicz szerokość każdego boksu przy założeniu standardowej głębokości
    state.boxes.forEach(box => {
        // Szerokość boksu = powierzchnia / głębokość
        const boxWidth = box.area / standardDepth;
        totalFrontWallLength += boxWidth;
    });
    
    // Ściany działowe - każdy boks ma ścianę z jednej strony (dzielona z sąsiadem)
    // Liczba ścian działowych = liczba boksów - 1 (dla każdego rzędu)
    // Przy układzie dwurzędowym mamy 2 rzędy
    const boxesPerRow = Math.ceil(state.boxes.length / 2);
    const partitionWallsPerRow = Math.max(0, boxesPerRow - 1);
    const totalPartitionWalls = partitionWallsPerRow * 2; // 2 rzędy
    
    // Każda ściana działowa ma wysokość = głębokość boksu
    totalPartitionWallLength = totalPartitionWalls * standardDepth;
    
    // Tylne ściany boksów (też są działowe/szare)
    // W układzie dwurzędowym - boksy dzielą tylną ścianę lub są przy ścianie hali
    // Zakładamy że tylne ściany to pełna długość rzędu × 2 (dwa rzędy)
    const backWallLength = (totalFrontWallLength / 2) * 2; // przybliżenie
    
    // Całkowita długość ścian działowych = boczne + tylne
    totalPartitionWallLength += backWallLength;
    
    // Długość korytarza (przy układzie dwurzędowym)
    // Korytarz biegnie przez środek hali
    let corridorLengthEstimate;
    if (state.hallShape === 'rectangle') {
        corridorLengthEstimate = state.hallLength;
    } else if (state.hallShape === 'L-shape') {
        corridorLengthEstimate = state.armALength + state.armBLength;
    } else {
        corridorLengthEstimate = Math.sqrt(state.grossArea) * 1.2;
    }
    
    state.corridorLength = Math.round(corridorLengthEstimate);
    state.frontWallLength = Math.round(totalFrontWallLength * 10) / 10; // zaokrąglenie do 0.1
    state.partitionWallLength = Math.round(totalPartitionWallLength * 10) / 10;
    state.standardBoxDepth = standardDepth; // zapisz do użycia w innych miejscach
}

// ===== SVG GENERATION =====
function generateSVG() {
    const container = document.getElementById('svgContainer');
    
    // Calculate SVG dimensions
    const padding = 50;
    const scale = 18; // pixels per meter
    
    let hallW, hallH;
    if (state.hallShape === 'rectangle') {
        hallW = state.hallLength;
        hallH = state.hallWidth;
    } else if (state.hallShape === 'L-shape') {
        hallW = Math.max(state.armALength, state.armBLength);
        hallH = state.armAWidth + state.armBWidth;
    } else {
        const side = Math.sqrt(state.grossArea);
        hallW = side;
        hallH = side;
    }
    
    const width = hallW * scale + padding * 2;
    const height = hallH * scale + padding * 2 + 80; // Extra space for stats table
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%; height:auto; font-family: Inter, sans-serif;">`;
    
    // Definitions for gradients and patterns
    svg += `<defs>
        <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#e8f5e9;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#c8e6c9;stop-opacity:1" />
        </linearGradient>
        <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#eee" stroke-width="0.5"/>
        </pattern>
    </defs>`;
    
    // Background with grid
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#fafafa"/>`;
    svg += `<rect x="${padding}" y="${padding}" width="${hallW * scale}" height="${hallH * scale}" fill="url(#gridPattern)"/>`;
    
    // Draw hall outline
    svg += drawHallOutline(padding, scale, hallW, hallH);
    
    // Draw improved boxes layout
    svg += drawImprovedBoxesLayout(padding, scale, hallW, hallH);
    
    // Draw dimensions
    svg += drawDimensions(padding, scale, hallW, hallH);
    
    // Draw stats table
    svg += drawStatsTable(padding, scale, hallW, hallH, height);
    
    svg += '</svg>';
    
    container.innerHTML = svg;
}

function drawHallOutline(padding, scale, hallW, hallH) {
    let path = '';
    const w = hallW * scale;
    const h = hallH * scale;
    
    if (state.hallShape === 'rectangle' || state.hallShape === 'custom') {
        path = `<rect x="${padding}" y="${padding}" width="${w}" height="${h}" 
                 fill="#f5f5f5" stroke="#1a1a2e" stroke-width="5"/>`;
    } else if (state.hallShape === 'L-shape') {
        const aW = state.armAWidth * scale;
        const aL = state.armALength * scale;
        const bW = state.armBWidth * scale;
        const bL = state.armBLength * scale;
        
        path = `<path d="M ${padding} ${padding} 
                         L ${padding + aL} ${padding} 
                         L ${padding + aL} ${padding + aW} 
                         L ${padding + bL} ${padding + aW}
                         L ${padding + bL} ${padding + aW + bW}
                         L ${padding} ${padding + aW + bW} Z"
                 fill="#f5f5f5" stroke="#1a1a2e" stroke-width="5"/>`;
    }
    
    return path;
}

function drawImprovedBoxesLayout(padding, scale, hallW, hallH) {
    let svg = '';
    const w = hallW * scale;
    const h = hallH * scale;
    
    // Corridor parameters
    const corridorWidthM = state.corridorWidth / 1000;
    const corridorPx = corridorWidthM * scale;
    
    // Standard box depth (meters)
    const boxDepthM = 3; // typical 3m deep boxes
    const boxDepthPx = boxDepthM * scale;
    
    // Calculate layout - central corridor with boxes on both sides
    const corridorY = padding + (h - corridorPx) / 2;
    
    // Draw corridor
    svg += `<rect x="${padding + 3}" y="${corridorY}" width="${w - 6}" height="${corridorPx}" 
             fill="url(#corridorGrad)" stroke="#4caf50" stroke-width="2"/>`;
    
    // Corridor label
    svg += `<text x="${padding + w/2}" y="${corridorY + corridorPx/2 + 5}" 
             text-anchor="middle" fill="#2e7d32" font-size="14" font-weight="600">KORYTARZ ${state.corridorWidth}mm</text>`;
    
    // Sort boxes by size for better layout
    const sortedBoxes = [...state.boxes].sort((a, b) => b.area - a.area);
    
    // Split boxes for top and bottom rows
    const topBoxes = [];
    const bottomBoxes = [];
    
    sortedBoxes.forEach((box, i) => {
        if (i % 2 === 0) {
            topBoxes.push(box);
        } else {
            bottomBoxes.push(box);
        }
    });
    
    // Calculate available space for each row
    const topRowY = padding + 3;
    const topRowHeight = corridorY - padding - 6;
    const bottomRowY = corridorY + corridorPx + 3;
    const bottomRowHeight = h - (corridorY - padding) - corridorPx - 6;
    
    // Draw top row boxes
    let currentX = padding + 5;
    const maxX = padding + w - 5;
    
    topBoxes.forEach((box, index) => {
        // Calculate box width based on area and fixed depth
        const boxWidthM = box.area / boxDepthM;
        let boxWidthPx = boxWidthM * scale;
        
        // Ensure minimum width
        boxWidthPx = Math.max(boxWidthPx, 25);
        
        // Check if fits
        if (currentX + boxWidthPx > maxX) return;
        
        // Colors
        const colors = getBoxColors(box.category);
        
        // Box rectangle
        svg += `<rect x="${currentX}" y="${topRowY}" width="${boxWidthPx}" height="${topRowHeight}" 
                 fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.5" rx="1"/>`;
        
        // Front wall (facing corridor) - BLUE
        svg += `<line x1="${currentX}" y1="${topRowY + topRowHeight}" 
                      x2="${currentX + boxWidthPx}" y2="${topRowY + topRowHeight}"
                      stroke="#0066cc" stroke-width="4"/>`;
        
        // Partition walls (sides) - ORANGE
        if (index > 0) {
            svg += `<line x1="${currentX}" y1="${topRowY}" 
                          x2="${currentX}" y2="${topRowY + topRowHeight - 2}"
                          stroke="#ff8c00" stroke-width="2"/>`;
        }
        
        // Door indication
        const doorWidth = box.category === 'large' ? 15 : 10;
        const doorX = currentX + (boxWidthPx - doorWidth) / 2;
        svg += `<rect x="${doorX}" y="${topRowY + topRowHeight - 4}" width="${doorWidth}" height="6" 
                 fill="#fff" stroke="#0066cc" stroke-width="1"/>`;
        
        // Box label
        if (boxWidthPx > 30) {
            svg += `<text x="${currentX + boxWidthPx/2}" y="${topRowY + topRowHeight/2}" 
                     text-anchor="middle" fill="#fff" font-size="${boxWidthPx > 50 ? 12 : 10}" font-weight="700">${box.area} m²</text>`;
        }
        
        currentX += boxWidthPx + 2;
    });
    
    // Draw bottom row boxes
    currentX = padding + 5;
    
    bottomBoxes.forEach((box, index) => {
        const boxWidthM = box.area / boxDepthM;
        let boxWidthPx = boxWidthM * scale;
        boxWidthPx = Math.max(boxWidthPx, 25);
        
        if (currentX + boxWidthPx > maxX) return;
        
        const colors = getBoxColors(box.category);
        
        // Box rectangle
        svg += `<rect x="${currentX}" y="${bottomRowY}" width="${boxWidthPx}" height="${bottomRowHeight}" 
                 fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.5" rx="1"/>`;
        
        // Front wall (facing corridor) - BLUE
        svg += `<line x1="${currentX}" y1="${bottomRowY}" 
                      x2="${currentX + boxWidthPx}" y2="${bottomRowY}"
                      stroke="#0066cc" stroke-width="4"/>`;
        
        // Partition walls - ORANGE
        if (index > 0) {
            svg += `<line x1="${currentX}" y1="${bottomRowY + 2}" 
                          x2="${currentX}" y2="${bottomRowY + bottomRowHeight}"
                          stroke="#ff8c00" stroke-width="2"/>`;
        }
        
        // Door indication
        const doorWidth = box.category === 'large' ? 15 : 10;
        const doorX = currentX + (boxWidthPx - doorWidth) / 2;
        svg += `<rect x="${doorX}" y="${bottomRowY - 2}" width="${doorWidth}" height="6" 
                 fill="#fff" stroke="#0066cc" stroke-width="1"/>`;
        
        // Box label
        if (boxWidthPx > 30) {
            svg += `<text x="${currentX + boxWidthPx/2}" y="${bottomRowY + bottomRowHeight/2 + 4}" 
                     text-anchor="middle" fill="#fff" font-size="${boxWidthPx > 50 ? 12 : 10}" font-weight="700">${box.area} m²</text>`;
        }
        
        currentX += boxWidthPx + 2;
    });
    
    return svg;
}

function getBoxColors(category) {
    switch(category) {
        case 'small':
            return { fill: '#26a69a', stroke: '#00897b' }; // Teal
        case 'medium':
            return { fill: '#42a5f5', stroke: '#1e88e5' }; // Blue
        case 'large':
            return { fill: '#66bb6a', stroke: '#43a047' }; // Green
        default:
            return { fill: '#78909c', stroke: '#546e7a' }; // Gray
    }
}

function drawDimensions(padding, scale, hallW, hallH) {
    let svg = '';
    const w = hallW * scale;
    const h = hallH * scale;
    
    // Width dimension (top)
    svg += `<line x1="${padding}" y1="${padding - 20}" x2="${padding + w}" y2="${padding - 20}" 
             stroke="#666" stroke-width="1.5"/>`;
    svg += `<line x1="${padding}" y1="${padding - 28}" x2="${padding}" y2="${padding - 12}" stroke="#666" stroke-width="1"/>`;
    svg += `<line x1="${padding + w}" y1="${padding - 28}" x2="${padding + w}" y2="${padding - 12}" stroke="#666" stroke-width="1"/>`;
    svg += `<rect x="${padding + w/2 - 30}" y="${padding - 40}" width="60" height="18" fill="#fff" rx="2"/>`;
    svg += `<text x="${padding + w/2}" y="${padding - 26}" text-anchor="middle" 
             fill="#1a1a2e" font-size="13" font-weight="700">${hallW.toFixed(1)} m</text>`;
    
    // Height dimension (right)
    svg += `<line x1="${padding + w + 20}" y1="${padding}" x2="${padding + w + 20}" y2="${padding + h}" 
             stroke="#666" stroke-width="1.5"/>`;
    svg += `<line x1="${padding + w + 12}" y1="${padding}" x2="${padding + w + 28}" y2="${padding}" stroke="#666" stroke-width="1"/>`;
    svg += `<line x1="${padding + w + 12}" y1="${padding + h}" x2="${padding + w + 28}" y2="${padding + h}" stroke="#666" stroke-width="1"/>`;
    svg += `<text x="${padding + w + 35}" y="${padding + h/2 + 5}" 
             fill="#1a1a2e" font-size="13" font-weight="700" 
             transform="rotate(90 ${padding + w + 35} ${padding + h/2})">${hallH.toFixed(1)} m</text>`;
    
    return svg;
}

function drawStatsTable(padding, scale, hallW, hallH, svgHeight) {
    let svg = '';
    const w = hallW * scale;
    const tableY = padding + hallH * scale + 25;
    const tableX = padding;
    
    // Group boxes by size
    const sizeGroups = {};
    state.boxes.forEach(box => {
        if (!sizeGroups[box.area]) {
            sizeGroups[box.area] = { count: 0, total: 0 };
        }
        sizeGroups[box.area].count++;
        sizeGroups[box.area].total += box.area;
    });
    
    // Sort by size
    const sortedSizes = Object.keys(sizeGroups).map(Number).sort((a, b) => a - b);
    
    // Table header
    svg += `<rect x="${tableX}" y="${tableY}" width="280" height="25" fill="#1a1a2e" rx="4 4 0 0"/>`;
    svg += `<text x="${tableX + 10}" y="${tableY + 17}" fill="#fff" font-size="11" font-weight="600">ROZMIAR</text>`;
    svg += `<text x="${tableX + 90}" y="${tableY + 17}" fill="#fff" font-size="11" font-weight="600">ILOŚĆ</text>`;
    svg += `<text x="${tableX + 160}" y="${tableY + 17}" fill="#fff" font-size="11" font-weight="600">SUMA m²</text>`;
    
    // Table rows
    let rowY = tableY + 25;
    let totalCount = 0;
    let totalArea = 0;
    
    sortedSizes.forEach((size, i) => {
        const group = sizeGroups[size];
        const bgColor = i % 2 === 0 ? '#f8f9fa' : '#fff';
        
        svg += `<rect x="${tableX}" y="${rowY}" width="280" height="20" fill="${bgColor}"/>`;
        svg += `<text x="${tableX + 10}" y="${rowY + 14}" fill="#333" font-size="11">${size} m²</text>`;
        svg += `<text x="${tableX + 90}" y="${rowY + 14}" fill="#333" font-size="11">${group.count}</text>`;
        svg += `<text x="${tableX + 160}" y="${rowY + 14}" fill="#333" font-size="11">${group.total}</text>`;
        
        totalCount += group.count;
        totalArea += group.total;
        rowY += 20;
    });
    
    // Total row
    svg += `<rect x="${tableX}" y="${rowY}" width="280" height="24" fill="#0066cc" rx="0 0 4 4"/>`;
    svg += `<text x="${tableX + 10}" y="${rowY + 16}" fill="#fff" font-size="12" font-weight="700">SUMA</text>`;
    svg += `<text x="${tableX + 90}" y="${rowY + 16}" fill="#fff" font-size="12" font-weight="700">${totalCount}</text>`;
    svg += `<text x="${tableX + 160}" y="${rowY + 16}" fill="#fff" font-size="12" font-weight="700">${totalArea}</text>`;
    
    // Stats panel on the right
    const statsX = tableX + 300;
    
    svg += `<rect x="${statsX}" y="${tableY}" width="160" height="90" fill="#fff" stroke="#ddd" rx="4"/>`;
    svg += `<text x="${statsX + 80}" y="${tableY + 20}" text-anchor="middle" fill="#666" font-size="10">Powierzchnia Brutto</text>`;
    svg += `<text x="${statsX + 80}" y="${tableY + 38}" text-anchor="middle" fill="#0066cc" font-size="18" font-weight="700">${state.grossArea} m²</text>`;
    
    svg += `<text x="${statsX + 80}" y="${tableY + 55}" text-anchor="middle" fill="#666" font-size="10">Wydajność</text>`;
    svg += `<text x="${statsX + 80}" y="${tableY + 73}" text-anchor="middle" fill="#28a745" font-size="18" font-weight="700">${state.efficiency}%</text>`;
    
    // Legend
    const legendX = statsX + 170;
    svg += `<rect x="${legendX}" y="${tableY}" width="130" height="90" fill="#fff" stroke="#ddd" rx="4"/>`;
    svg += `<text x="${legendX + 10}" y="${tableY + 18}" fill="#333" font-size="10" font-weight="600">LEGENDA</text>`;
    
    svg += `<rect x="${legendX + 10}" y="${tableY + 28}" width="14" height="10" fill="#26a69a" rx="2"/>`;
    svg += `<text x="${legendX + 30}" y="${tableY + 36}" fill="#333" font-size="9">Małe (1-3m²)</text>`;
    
    svg += `<rect x="${legendX + 10}" y="${tableY + 44}" width="14" height="10" fill="#42a5f5" rx="2"/>`;
    svg += `<text x="${legendX + 30}" y="${tableY + 52}" fill="#333" font-size="9">Średnie (4-7m²)</text>`;
    
    svg += `<rect x="${legendX + 10}" y="${tableY + 60}" width="14" height="10" fill="#66bb6a" rx="2"/>`;
    svg += `<text x="${legendX + 30}" y="${tableY + 68}" fill="#333" font-size="9">Duże (8-15m²)</text>`;
    
    svg += `<line x1="${legendX + 10}" y1="${tableY + 80}" x2="${legendX + 24}" y2="${tableY + 80}" stroke="#0066cc" stroke-width="3"/>`;
    svg += `<text x="${legendX + 30}" y="${tableY + 83}" fill="#333" font-size="9">Frontowa</text>`;
    
    svg += `<line x1="${legendX + 75}" y1="${tableY + 80}" x2="${legendX + 89}" y2="${tableY + 80}" stroke="#ff8c00" stroke-width="3"/>`;
    svg += `<text x="${legendX + 95}" y="${tableY + 83}" fill="#333" font-size="9">Działowa</text>`;
    
    return svg;
}

// ===== UPDATE PLAN STATS =====
function updatePlanStats() {
    document.getElementById('planStats').style.display = 'grid';
    document.getElementById('statTotalBoxes').textContent = state.boxes.length;
    document.getElementById('statNetArea').textContent = state.netArea + ' m²';
    document.getElementById('statEfficiency').textContent = state.efficiency + '%';
    
    const avgBox = state.boxes.length > 0 ? (state.netArea / state.boxes.length).toFixed(2) : 0;
    document.getElementById('statAvgBox').textContent = avgBox + ' m²';
    
    // Update box count breakdown
    const smallCount = state.boxes.filter(b => b.category === 'small').length;
    const mediumCount = state.boxes.filter(b => b.category === 'medium').length;
    const largeCount = state.boxes.filter(b => b.category === 'large').length;
    
    document.getElementById('statSmallCount').textContent = smallCount;
    document.getElementById('statMediumCount').textContent = mediumCount;
    document.getElementById('statLargeCount').textContent = largeCount;
}

// ===== COST CALCULATIONS =====
// Zgodnie z wytycznymi Kuzaja:
function calculateCosts() {
    const systemHeightM = state.systemHeight / 1000; // np. 3000mm = 3m
    const doorHeight = 2.1; // Wszystkie drzwi mają wysokość 2.1m wg wytycznych
    
    // Count boxes by category
    const smallBoxes = state.boxes.filter(b => b.category === 'small').length;
    const mediumBoxes = state.boxes.filter(b => b.category === 'medium').length;
    const largeBoxes = state.boxes.filter(b => b.category === 'large').length;
    
    // === DRZWI I ROLETY ===
    // Małe i średnie boksy: drzwi pojedyncze (1m × 2.1m)
    // Duże boksy: drzwi podwójne (2m × 2.1m) LUB rolety (1.5m lub 2m × 2.1m)
    let singleDoors = smallBoxes + mediumBoxes;
    let doubleDoors = 0;
    let rollers15 = 0;
    let rollers20 = 0;
    
    if (state.hasRollerDoors) {
        // Duże boksy mają rolety 2m
        rollers20 = largeBoxes;
    } else {
        // Duże boksy mają drzwi podwójne
        doubleDoors = largeBoxes;
    }
    
    // Szerokości drzwi dla obliczeń
    const singleDoorWidth = 1.0;  // 1m
    const doubleDoorWidth = 2.0;  // 2m
    const roller15Width = 1.5;    // 1.5m
    const roller20Width = 2.0;    // 2m
    
    // Suma szerokości wszystkich drzwi
    const totalDoorWidth = (singleDoors * singleDoorWidth) + 
                           (doubleDoors * doubleDoorWidth) + 
                           (rollers15 * roller15Width) + 
                           (rollers20 * roller20Width);
    
    // Powierzchnia wszystkich drzwi (szerokość × 2.1m)
    const singleDoorsArea = singleDoors * singleDoorWidth * doorHeight;
    const doubleDoorsArea = doubleDoors * doubleDoorWidth * doorHeight;
    const rollers15Area = rollers15 * roller15Width * doorHeight;
    const rollers20Area = rollers20 * roller20Width * doorHeight;
    const totalDoorsArea = singleDoorsArea + doubleDoorsArea + rollers15Area + rollers20Area;
    
    // === 1. ŚCIANA FRONTOWA (BIAŁA) ===
    // Wytyczne: (Suma długości ścian frontowych + suma szerokości drzwi) × wysokość - powierzchnia drzwi
    // Interpretacja: Ściana frontowa to pełna powierzchnia frontu boksów (włącznie z miejscem na drzwi)
    // minus otwory na drzwi
    const frontWallGrossArea = state.frontWallLength * systemHeightM;
    const whiteWallArea = frontWallGrossArea - totalDoorsArea;
    
    // === 2. ŚCIANA DZIAŁOWA (SZARA) ===
    // Wytyczne: Suma długości wszystkich ścian wewnętrznych × wysokość
    const grayWallArea = state.partitionWallLength * systemHeightM;
    
    // === 3. KICK PLATE (ODBOJNICA) ===
    // Wytyczne: Metry bieżące ścian frontowych BEZ szerokości drzwi
    const kickPlateLength = state.frontWallLength - totalDoorWidth;
    
    // === 4. SIATKA ZABEZPIECZAJĄCA ===
    // Wytyczne: Suma powierzchni wszystkich boksów (bez korytarzy)
    const meshArea = state.hasMesh ? state.netArea : 0;
    
    // === 5. ZAMKI ELEKTRONICZNE ===
    // Wytyczne: Ilość = ilość boksów
    const electroLocks = state.hasElectroLocks ? state.boxes.length : 0;
    
    // === 6. LEKKI SUFIT (SOFFIT) ===
    // Wytyczne: Długość wszystkich korytarzy
    const soffitLength = state.hasSoffit ? state.corridorLength : 0;
    
    // === 7. KAMERY ===
    // Wytyczne: Na każde 50m² powierzchni hali
    const cameras = state.hasCameras ? Math.ceil(state.grossArea / 50) : 0;
    
    // === 8. OŚWIETLENIE ===
    // Wytyczne: Na każde ~10m korytarza
    const lamps = state.hasLighting ? Math.ceil(state.corridorLength / 10) : 0;
    
    // === 9. BRAMA WJAZDOWA ===
    const gateQty = state.needsGate ? 1 : 0;
    
    // Zapisz szczegóły obliczeń do wyświetlenia
    state.calculationDetails = {
        systemHeightM,
        doorHeight,
        smallBoxes,
        mediumBoxes,
        largeBoxes,
        singleDoors,
        doubleDoors,
        rollers15,
        rollers20,
        totalDoorWidth,
        totalDoorsArea,
        frontWallGrossArea,
        whiteWallArea,
        grayWallArea,
        kickPlateLength,
        meshArea,
        electroLocks,
        soffitLength,
        cameras,
        lamps
    };
    
    // Calculate costs
    calculatedCosts = {
        whiteWall: { 
            qty: Math.round(whiteWallArea * 10) / 10, 
            unit: 'm²', 
            price: prices.whiteWall, 
            total: whiteWallArea * prices.whiteWall,
            formula: `(${state.frontWallLength} mb × ${systemHeightM} m) - ${totalDoorsArea.toFixed(1)} m² drzwi`
        },
        grayWall: { 
            qty: Math.round(grayWallArea * 10) / 10, 
            unit: 'm²', 
            price: prices.grayWall, 
            total: grayWallArea * prices.grayWall,
            formula: `${state.partitionWallLength} mb × ${systemHeightM} m`
        },
        mesh: { 
            qty: Math.round(meshArea * 10) / 10, 
            unit: 'm²', 
            price: prices.mesh, 
            total: meshArea * prices.mesh,
            formula: `Suma powierzchni boksów = ${state.netArea} m²`
        },
        kickPlate: { 
            qty: Math.round(kickPlateLength * 10) / 10, 
            unit: 'mb', 
            price: prices.kickPlate, 
            total: kickPlateLength * prices.kickPlate,
            formula: `${state.frontWallLength} mb - ${totalDoorWidth.toFixed(1)} mb drzwi`
        },
        singleDoors: { 
            qty: singleDoors, 
            unit: 'szt', 
            price: prices.doorSingle, 
            total: singleDoors * prices.doorSingle,
            formula: `Małe (${smallBoxes}) + Średnie (${mediumBoxes}) boksy`
        },
        doubleDoors: { 
            qty: doubleDoors, 
            unit: 'szt', 
            price: prices.doorDouble, 
            total: doubleDoors * prices.doorDouble,
            formula: `Duże boksy bez rolet = ${doubleDoors}`
        },
        rollers15: { 
            qty: rollers15, 
            unit: 'szt', 
            price: prices.roller15, 
            total: rollers15 * prices.roller15,
            formula: `Rolety 1.5m`
        },
        rollers20: { 
            qty: rollers20, 
            unit: 'szt', 
            price: prices.roller20, 
            total: rollers20 * prices.roller20,
            formula: `Duże boksy z roletami = ${rollers20}`
        },
        electroLocks: { 
            qty: electroLocks, 
            unit: 'szt', 
            price: prices.electroLock, 
            total: electroLocks * prices.electroLock,
            formula: `1 zamek × ${state.boxes.length} boksów`
        },
        soffit: { 
            qty: Math.round(soffitLength * 10) / 10, 
            unit: 'mb', 
            price: prices.soffit, 
            total: soffitLength * prices.soffit,
            formula: `Długość korytarzy = ${state.corridorLength} mb`
        },
        gate: { 
            qty: gateQty, 
            unit: 'szt', 
            price: prices.gate, 
            total: gateQty * prices.gate,
            formula: gateQty ? 'Brama wjazdowa wymagana' : 'Nie wymagana'
        },
        cameras: { 
            qty: cameras, 
            unit: 'szt', 
            price: prices.camera, 
            total: cameras * prices.camera,
            formula: `${state.grossArea} m² ÷ 50 m² = ${cameras} kamer`
        },
        lamps: { 
            qty: lamps, 
            unit: 'szt', 
            price: prices.lamp, 
            total: lamps * prices.lamp,
            formula: `${state.corridorLength} mb korytarzy ÷ 10 = ${lamps} lamp`
        }
    };
    
    // Calculate grand total
    calculatedCosts.grandTotal = Object.values(calculatedCosts).reduce((sum, item) => {
        return sum + (item.total || 0);
    }, 0);
    
    // Render cost summary
    renderCostSummary();
}

function renderCostSummary() {
    const container = document.getElementById('costSummary');
    
    const costLabels = {
        whiteWall: 'Ściana frontowa (biała)',
        grayWall: 'Ściana działowa (szara)',
        mesh: 'Siatka zabezpieczająca',
        kickPlate: 'Kick Plate (odbojnica)',
        singleDoors: 'Drzwi pojedyncze (1m × 2.1m)',
        doubleDoors: 'Drzwi podwójne (2m × 2.1m)',
        rollers15: 'Roleta (1.5m × 2.1m)',
        rollers20: 'Roleta (2m × 2.1m)',
        electroLocks: 'Zamki elektroniczne',
        soffit: 'Sufit (soffit)',
        gate: 'Brama wjazdowa',
        cameras: 'Kamery',
        lamps: 'Oświetlenie LED'
    };
    
    // Główna tabela kosztów
    let html = `
    <div class="cost-summary-wrapper">
        <table class="cost-table">
            <thead>
                <tr>
                    <th>Pozycja</th>
                    <th>Ilość</th>
                    <th>Cena jedn.</th>
                    <th class="amount">Wartość</th>
                </tr>
            </thead>
            <tbody>`;
    
    Object.entries(costLabels).forEach(([key, label]) => {
        const item = calculatedCosts[key];
        if (item && item.qty > 0) {
            html += `<tr>
                <td>${label}</td>
                <td>${item.qty} ${item.unit}</td>
                <td>${formatCurrency(item.price)}/${item.unit}</td>
                <td class="amount">${formatCurrency(item.total)}</td>
            </tr>`;
        }
    });
    
    html += `</tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="3">SUMA CAŁKOWITA</td>
                <td class="amount">${formatCurrency(calculatedCosts.grandTotal)}</td>
            </tr>
        </tfoot>
    </table>
    
    <!-- SEKCJA TESTOWA: Logika obliczeniowa -->
    <div class="calculation-logic-section">
        <h4><i class="fas fa-calculator"></i> Logika Obliczeniowa (TRYB TESTOWY)</h4>
        
        <div class="logic-group">
            <h5>📐 Parametry bazowe</h5>
            <ul>
                <li><strong>Powierzchnia hali (brutto):</strong> ${state.grossArea} m²</li>
                <li><strong>Powierzchnia boksów (netto):</strong> ${state.netArea} m²</li>
                <li><strong>Powierzchnia korytarzy:</strong> ${state.calculatedCorridorArea?.toFixed(1) || '-'} m²</li>
                <li><strong>Wysokość systemu:</strong> ${state.systemHeight} mm = ${state.systemHeight/1000} m</li>
                <li><strong>Długość korytarzy:</strong> ${state.corridorLength} mb</li>
            </ul>
        </div>
        
        <div class="logic-group">
            <h5>📦 Boksy</h5>
            <ul>
                <li><strong>Liczba boksów:</strong> ${state.boxes.length} szt</li>
                <li><strong>Małe (1-3m²):</strong> ${state.calculationDetails?.smallBoxes || 0} szt</li>
                <li><strong>Średnie (4-7m²):</strong> ${state.calculationDetails?.mediumBoxes || 0} szt</li>
                <li><strong>Duże (8-15m²):</strong> ${state.calculationDetails?.largeBoxes || 0} szt</li>
            </ul>
        </div>
        
        <div class="logic-group">
            <h5>🚪 Drzwi i rolety</h5>
            <ul>
                <li><strong>Drzwi pojedyncze (1m × 2.1m):</strong> ${state.calculationDetails?.singleDoors || 0} szt → pow. ${((state.calculationDetails?.singleDoors || 0) * 1 * 2.1).toFixed(1)} m²</li>
                <li><strong>Drzwi podwójne (2m × 2.1m):</strong> ${state.calculationDetails?.doubleDoors || 0} szt → pow. ${((state.calculationDetails?.doubleDoors || 0) * 2 * 2.1).toFixed(1)} m²</li>
                <li><strong>Rolety 1.5m:</strong> ${state.calculationDetails?.rollers15 || 0} szt</li>
                <li><strong>Rolety 2m:</strong> ${state.calculationDetails?.rollers20 || 0} szt</li>
                <li><strong>Suma szerokości drzwi:</strong> ${state.calculationDetails?.totalDoorWidth?.toFixed(1) || 0} mb</li>
                <li><strong>Suma powierzchni drzwi:</strong> ${state.calculationDetails?.totalDoorsArea?.toFixed(1) || 0} m²</li>
            </ul>
        </div>
        
        <div class="logic-group">
            <h5>🧱 Ściany</h5>
            <ul>
                <li><strong>Ściany frontowe (mb):</strong> ${state.frontWallLength} mb</li>
                <li><strong>Ściany działowe (mb):</strong> ${state.partitionWallLength} mb</li>
            </ul>
        </div>
        
        <div class="logic-group highlight">
            <h5>📝 Wzory obliczeniowe</h5>
            <table class="formula-table">
                <tr>
                    <td><strong>1. Ściana biała</strong></td>
                    <td>${calculatedCosts.whiteWall?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.whiteWall?.qty} m²</strong></td>
                </tr>
                <tr>
                    <td><strong>2. Ściana szara</strong></td>
                    <td>${calculatedCosts.grayWall?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.grayWall?.qty} m²</strong></td>
                </tr>
                <tr>
                    <td><strong>3. Kick Plate</strong></td>
                    <td>${calculatedCosts.kickPlate?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.kickPlate?.qty} mb</strong></td>
                </tr>
                <tr>
                    <td><strong>4. Siatka</strong></td>
                    <td>${calculatedCosts.mesh?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.mesh?.qty} m²</strong></td>
                </tr>
                <tr>
                    <td><strong>5. Drzwi pojedyncze</strong></td>
                    <td>${calculatedCosts.singleDoors?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.singleDoors?.qty} szt</strong></td>
                </tr>
                <tr>
                    <td><strong>6. Drzwi podwójne</strong></td>
                    <td>${calculatedCosts.doubleDoors?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.doubleDoors?.qty} szt</strong></td>
                </tr>
                <tr>
                    <td><strong>7. Rolety 2m</strong></td>
                    <td>${calculatedCosts.rollers20?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.rollers20?.qty} szt</strong></td>
                </tr>
                <tr>
                    <td><strong>8. Zamki</strong></td>
                    <td>${calculatedCosts.electroLocks?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.electroLocks?.qty} szt</strong></td>
                </tr>
                <tr>
                    <td><strong>9. Kamery</strong></td>
                    <td>${calculatedCosts.cameras?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.cameras?.qty} szt</strong></td>
                </tr>
                <tr>
                    <td><strong>10. Oświetlenie</strong></td>
                    <td>${calculatedCosts.lamps?.formula || '-'}</td>
                    <td>= <strong>${calculatedCosts.lamps?.qty} szt</strong></td>
                </tr>
            </table>
        </div>
        
        <div class="logic-note">
            <i class="fas fa-info-circle"></i>
            <span>Ta sekcja służy do weryfikacji poprawności obliczeń. Można ją ukryć w wersji produkcyjnej.</span>
        </div>
    </div>
    </div>`;
    
    container.innerHTML = html;
}

// ===== CASH FLOW CALCULATIONS =====
function calculateCashFlow() {
    if (!calculatedCosts) {
        alert('Najpierw wygeneruj plan!');
        return;
    }
    
    const totalInvestment = calculatedCosts.grandTotal;
    const maxRentableArea = state.netArea * (cashFlowParams.maxOccupancy / 100);
    const monthlyRent = cashFlowParams.rentPrice;
    const monthlyGrowth = cashFlowParams.monthlyRental;
    const licenseFeeRate = cashFlowParams.licenseFee / 100;
    const fixedCosts = cashFlowParams.fixedCosts;
    const contractMonths = cashFlowParams.contractLength * 12;
    
    // Calculate monthly cash flows
    const monthlyData = [];
    let currentRentedArea = 0;
    let cumulativeCashFlow = -totalInvestment;
    let breakEvenMonth = null;
    
    for (let month = 1; month <= contractMonths; month++) {
        // Increase rented area
        currentRentedArea = Math.min(currentRentedArea + monthlyGrowth, maxRentableArea);
        
        // Calculate revenues
        const grossRevenue = currentRentedArea * monthlyRent;
        const licenseFee = grossRevenue * licenseFeeRate;
        const netRevenue = grossRevenue - licenseFee - fixedCosts;
        
        cumulativeCashFlow += netRevenue;
        
        if (breakEvenMonth === null && cumulativeCashFlow >= 0) {
            breakEvenMonth = month;
        }
        
        monthlyData.push({
            month,
            rentedArea: currentRentedArea,
            grossRevenue,
            licenseFee,
            fixedCosts,
            netRevenue,
            cumulativeCashFlow
        });
    }
    
    // Calculate summary metrics
    const monthlyRevenueAtMax = maxRentableArea * monthlyRent;
    const monthlyNetAtMax = monthlyRevenueAtMax - (monthlyRevenueAtMax * licenseFeeRate) - fixedCosts;
    const totalProfit = cumulativeCashFlow;
    const roi = ((totalProfit + totalInvestment) / totalInvestment * 100 - 100).toFixed(1);
    const annualReturn = (roi / cashFlowParams.contractLength).toFixed(1);
    
    cashFlowResults = {
        totalInvestment,
        maxRentableArea,
        breakEvenMonth,
        monthlyRevenueAtMax,
        monthlyNetAtMax,
        totalProfit,
        roi,
        annualReturn,
        monthlyData
    };
    
    // Render results
    renderCashFlowResults();
    renderCashFlowChart();
}

function renderCashFlowResults() {
    const container = document.getElementById('cashflowResults');
    
    const breakEvenText = cashFlowResults.breakEvenMonth 
        ? `${cashFlowResults.breakEvenMonth} msc (${(cashFlowResults.breakEvenMonth / 12).toFixed(1)} lat)`
        : 'Powyżej okresu kontraktu';
    
    container.innerHTML = `
        <div class="financial-metrics">
            <div class="metric-card highlight">
                <span class="metric-value">${formatCurrency(cashFlowResults.totalInvestment)}</span>
                <span class="metric-label">Całkowita inwestycja</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${formatNumber(cashFlowResults.maxRentableArea, 1)} m²</span>
                <span class="metric-label">Max. pow. do wynajęcia</span>
            </div>
            <div class="metric-card success">
                <span class="metric-value">${breakEvenText}</span>
                <span class="metric-label">Próg rentowności</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${formatCurrency(cashFlowResults.monthlyRevenueAtMax)}</span>
                <span class="metric-label">Przychód msc (max)</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${formatCurrency(cashFlowResults.monthlyNetAtMax)}</span>
                <span class="metric-label">Zysk netto msc (max)</span>
            </div>
            <div class="metric-card highlight">
                <span class="metric-value">${cashFlowResults.roi}%</span>
                <span class="metric-label">ROI (${cashFlowParams.contractLength} lat)</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${cashFlowResults.annualReturn}%</span>
                <span class="metric-label">Śr. roczny zwrot</span>
            </div>
            <div class="metric-card success">
                <span class="metric-value">${formatCurrency(cashFlowResults.totalProfit)}</span>
                <span class="metric-label">Całkowity zysk</span>
            </div>
        </div>
    `;
}

function renderCashFlowChart() {
    const ctx = document.getElementById('cashflowChart').getContext('2d');
    
    // Destroy existing chart
    if (cashFlowChart) {
        cashFlowChart.destroy();
    }
    
    // Prepare data (yearly aggregation for readability)
    const years = [];
    const revenue = [];
    const profit = [];
    const cumulative = [];
    
    for (let year = 1; year <= cashFlowParams.contractLength; year++) {
        years.push(`Rok ${year}`);
        
        const yearData = cashFlowResults.monthlyData.slice((year - 1) * 12, year * 12);
        const yearRevenue = yearData.reduce((sum, m) => sum + m.grossRevenue, 0);
        const yearProfit = yearData.reduce((sum, m) => sum + m.netRevenue, 0);
        const yearEndCumulative = yearData[yearData.length - 1]?.cumulativeCashFlow || 0;
        
        revenue.push(yearRevenue);
        profit.push(yearProfit);
        cumulative.push(yearEndCumulative);
    }
    
    cashFlowChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Przychód roczny',
                    data: revenue,
                    backgroundColor: 'rgba(0, 102, 204, 0.7)',
                    borderColor: 'rgba(0, 102, 204, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Zysk netto roczny',
                    data: profit,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Skumulowany Cash Flow',
                    data: cumulative,
                    type: 'line',
                    borderColor: 'rgba(255, 140, 0, 1)',
                    backgroundColor: 'rgba(255, 140, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                y1: {
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// ===== SUMMARY GENERATION =====
function generateSummary() {
    const container = document.getElementById('summaryContent');
    
    const avgBox = state.boxes.length > 0 ? (state.netArea / state.boxes.length).toFixed(2) : 0;
    const smallBoxes = state.boxes.filter(b => b.category === 'small').length;
    const mediumBoxes = state.boxes.filter(b => b.category === 'medium').length;
    const largeBoxes = state.boxes.filter(b => b.category === 'large').length;
    
    // Round down to thousands
    const roundedCost = calculatedCosts ? Math.floor(calculatedCosts.grandTotal / 1000) * 1000 : 0;
    
    container.innerHTML = `
        <div class="summary-section">
            <div class="summary-header">
                <h2><i class="fas fa-warehouse"></i> Projekt Self-Storage</h2>
            </div>
            <div class="summary-body">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="value">${state.grossArea} m²</span>
                        <span class="label">Powierzchnia brutto</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.netArea} m²</span>
                        <span class="label">Powierzchnia netto</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.efficiency}%</span>
                        <span class="label">Wydajność</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.boxes.length}</span>
                        <span class="label">Liczba boksów</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <div class="summary-header">
                <h2><i class="fas fa-th"></i> Struktura Boksów</h2>
            </div>
            <div class="summary-body">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="value" style="color:#26a69a">${smallBoxes}</span>
                        <span class="label">Małe (1-3m²)</span>
                    </div>
                    <div class="summary-item">
                        <span class="value" style="color:#42a5f5">${mediumBoxes}</span>
                        <span class="label">Średnie (4-7m²)</span>
                    </div>
                    <div class="summary-item">
                        <span class="value" style="color:#66bb6a">${largeBoxes}</span>
                        <span class="label">Duże (8-15m²)</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${avgBox} m²</span>
                        <span class="label">Średni rozmiar</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <div class="summary-header">
                <h2><i class="fas fa-cogs"></i> Parametry Techniczne</h2>
            </div>
            <div class="summary-body">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="value">${state.systemHeight} mm</span>
                        <span class="label">Wysokość systemu</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.corridorWidth} mm</span>
                        <span class="label">Szerokość korytarza</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.frontWallLength} mb</span>
                        <span class="label">Ściany frontowe</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.partitionWallLength} mb</span>
                        <span class="label">Ścianki działowe</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${calculatedCosts ? `
        <div class="summary-total">
            <span class="label">Szacunkowy koszt inwestycji (w przybliżeniu)</span>
            <span class="value">~ ${formatCurrency(roundedCost)}</span>
        </div>
        <p class="summary-note">* Koszt zaokrąglony w dół do tysięcy PLN</p>
        ` : ''}
        
        <!-- Wydajność: realna vs maksymalna -->
        <div class="summary-section efficiency-summary-section">
            <div class="summary-header">
                <h2><i class="fas fa-chart-pie"></i> Wydajność</h2>
            </div>
            <div class="summary-body">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="value">${state.targetEfficiency}%</span>
                        <span class="label">Wydajność realna (docelowa)</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.efficiency}%</span>
                        <span class="label">Wydajność osiągnięta</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.maxEfficiency}%</span>
                        <span class="label">Wydajność maks. (teoretyczna)</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${state.nonUsableArea?.toFixed(0) || 0} m²</span>
                        <span class="label">Korytarze + przestrzeń gosp.</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Logika kalkulatora -->
        <div class="summary-section calculator-logic-section">
            <div class="summary-header">
                <h2><i class="fas fa-book"></i> Logika kalkulatora</h2>
            </div>
            <div class="summary-body">
                <p class="logic-intro">Poniżej opis działania kalkulatora, przyjęte założenia oraz wzory używane do optymalizacji i wyliczeń.</p>
                
                <div class="logic-block">
                    <h4>1. Powierzchnie</h4>
                    <ul>
                        <li><strong>Powierzchnia brutto</strong> – z wymiarów hali (prostokąt: długość × szerokość; L: suma ramion minus przekrycie; własna: wpisana wartość).</li>
                        <li><strong>Wydajność realna (docelowa)</strong> – przyjmowana z suwaka (domyślnie 70%). Średnia w obiektach self-storage; reszta to korytarze i przestrzeń gospodarcza.</li>
                        <li><strong>Powierzchnia na boksy</strong> = brutto × (wydajność realna / 100).</li>
                        <li><strong>Powierzchnia nieużytkowa</strong> = brutto − powierzchnia na boksy (korytarze, gospodarcza, wejścia).</li>
                    </ul>
                </div>
                
                <div class="logic-block">
                    <h4>2. Wydajności</h4>
                    <ul>
                        <li><strong>Wydajność osiągnięta</strong> = (powierzchnia netto boksów / powierzchnia brutto) × 100%.</li>
                        <li><strong>Wydajność maksymalna (teoretyczna)</strong> = (brutto − minimalna powierzchnia korytarzy) / brutto × 100%, z limitem ok. 88%.</li>
                    </ul>
                </div>
                
                <div class="logic-block">
                    <h4>3. Boksy</h4>
                    <ul>
                        <li>Podział procentowy: małe (1–3 m²), średnie (4–7 m²), duże (8–15 m²). Suma = 100%.</li>
                        <li>Algorytm wypełnia powierzchnię na boksy zgodnie z proporcjami, preferując typowe rozmiary (2, 4, 8 m² itd.).</li>
                    </ul>
                </div>
                
                <div class="logic-block">
                    <h4>4. Ściany i koszty (wzory)</h4>
                    <ul>
                        <li><strong>Ściana biała (frontowa)</strong>: (długość ścian frontowych × wysokość systemu) − powierzchnia wszystkich drzwi; cena 110 PLN/m².</li>
                        <li><strong>Ściana szara (działowa)</strong>: długość ścian wewnętrznych × wysokość; 84 PLN/m².</li>
                        <li><strong>Kick Plate</strong>: mb ścian frontowych − suma szerokości drzwi; 81 PLN/mb.</li>
                        <li><strong>Siatka</strong>: powierzchnia netto boksów; 50 PLN/m².</li>
                        <li><strong>Drzwi</strong>: pojedyncze 1 m × 2,1 m, podwójne 2 m × 2,1 m, rolety 1,5 m / 2 m × 2,1 m – liczone na sztuki.</li>
                        <li><strong>Zamki</strong>: 1 na boks; 550 PLN/szt. <strong>Kamery</strong>: brutto ÷ 50 m². <strong>Oświetlenie</strong>: mb korytarzy ÷ 10.</li>
                    </ul>
                </div>
                
                <div class="logic-block">
                    <h4>5. Cash flow</h4>
                    <ul>
                        <li>Przychód = pow. wynajęta × cena za m²/msc. Komercjalizacja: przyrost wynajmowanej pow. miesięcznie do max. obłożenia.</li>
                        <li>Zysk netto = przychód − opłata licencyjna − koszty stałe. Próg rentowności i ROI na podstawie skumulowanego cash flow.</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- AI Analysis Section -->
        <div class="summary-section ai-analysis-section">
            <div class="summary-header">
                <h2><i class="fas fa-robot"></i> Analiza AI - Optymalizacja ROI</h2>
                <button class="btn btn-primary btn-sm" id="generateAiAnalysis">
                    <i class="fas fa-magic"></i> Generuj analizę
                </button>
            </div>
            <div class="summary-body">
                <div id="aiAnalysisContent" class="ai-analysis-content">
                    <div class="ai-analysis-placeholder">
                        <i class="fas fa-lightbulb"></i>
                        <p>Kliknij "Generuj analizę" aby otrzymać rekomendacje AI dotyczące optymalizacji projektu</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for AI analysis button
    document.getElementById('generateAiAnalysis').addEventListener('click', generateAIAnalysis);
}

// ===== AI ANALYSIS FOR ROI OPTIMIZATION =====
async function generateAIAnalysis() {
    const container = document.getElementById('aiAnalysisContent');
    const apiKey = localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
        container.innerHTML = `
            <div class="ai-analysis-error">
                <i class="fas fa-key"></i>
                <p>Skonfiguruj klucz API OpenAI w ustawieniach (ikona zębatki)</p>
            </div>
        `;
        return;
    }
    
    // Show loading
    container.innerHTML = `
        <div class="ai-loading">
            <div class="spinner"></div>
            <p>Analizuję projekt...</p>
        </div>
    `;
    
    // Prepare data for analysis
    const boxCounts = getBoxCountsBySize();
    const smallBoxes = state.boxes.filter(b => b.category === 'small').length;
    const mediumBoxes = state.boxes.filter(b => b.category === 'medium').length;
    const largeBoxes = state.boxes.filter(b => b.category === 'large').length;
    const roundedCost = Math.floor(calculatedCosts.grandTotal / 1000) * 1000;
    
    let boxBreakdown = '';
    Object.entries(boxCounts).forEach(([size, count]) => {
        boxBreakdown += `${count}x ${size}m², `;
    });
    
    const prompt = `Jesteś ekspertem w branży Self-Storage. Przeanalizuj poniższy projekt i podaj konkretne rekomendacje dotyczące optymalizacji ROI i kosztów.

DANE PROJEKTU:
- Powierzchnia brutto: ${state.grossArea} m²
- Powierzchnia netto (boksy): ${state.netArea} m²
- Wydajność: ${state.efficiency}%
- Liczba boksów: ${state.boxes.length}
- Podział: ${smallBoxes} małych (1-3m²), ${mediumBoxes} średnich (4-7m²), ${largeBoxes} dużych (8-15m²)
- Szczegółowy rozkład: ${boxBreakdown.slice(0, -2)}
- Średni rozmiar boksu: ${(state.netArea / state.boxes.length).toFixed(2)} m²
- Szacunkowy koszt inwestycji: ${roundedCost} PLN
- Cena najmu: ${cashFlowParams.rentPrice} PLN/m²/msc
${cashFlowResults ? `- ROI (${cashFlowParams.contractLength} lat): ${cashFlowResults.roi}%
- Próg rentowności: ${cashFlowResults.breakEvenMonth} miesięcy` : ''}

Podaj analizę w następującym formacie:
1. OCENA MIKSU BOKSÓW - czy obecny podział jest optymalny dla ROI
2. REKOMENDACJE OPTYMALIZACJI - konkretne zmiany w strukturze boksów
3. POTENCJAŁ ZWIĘKSZENIA PRZYCHODÓW - ile można zyskać przy optymalizacji
4. RYZYKA I UWAGI - na co zwrócić uwagę

Odpowiedz zwięźle, konkretnie, po polsku. Maksymalnie 300 słów.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Jesteś ekspertem w branży Self-Storage z 15-letnim doświadczeniem w Polsce. Analizujesz projekty pod kątem maksymalizacji ROI.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Błąd API');
        }
        
        const data = await response.json();
        const analysis = data.choices[0].message.content;
        
        // Format and display analysis
        container.innerHTML = `
            <div class="ai-analysis-result">
                ${formatAIAnalysis(analysis)}
                <div class="analysis-footer">
                    <span><i class="fas fa-robot"></i> Wygenerowano przez AI (GPT-4)</span>
                    <button class="btn btn-secondary btn-sm" onclick="generateAIAnalysis()">
                        <i class="fas fa-sync-alt"></i> Odśwież
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        container.innerHTML = `
            <div class="ai-analysis-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Błąd: ${error.message}</p>
                <button class="btn btn-secondary btn-sm" onclick="generateAIAnalysis()">Spróbuj ponownie</button>
            </div>
        `;
    }
}

function formatAIAnalysis(text) {
    // Convert markdown-like formatting to HTML
    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/(\d+)\.\s+(.*?)(?=<br>|<\/p>|$)/g, '<div class="analysis-point"><span class="point-number">$1</span><span class="point-text">$2</span></div>');
    
    return `<p>${html}</p>`;
}

// ===== PRINT REPORT =====
function printReport() {
    if (!calculatedCosts) {
        alert('Najpierw wygeneruj plan!');
        return;
    }
    
    const printContainer = document.getElementById('printContent');
    
    // Get box counts
    const boxCounts = getBoxCountsBySize();
    const sortedSizes = Object.keys(boxCounts).map(Number).sort((a, b) => a - b);
    const smallBoxes = state.boxes.filter(b => b.category === 'small').length;
    const mediumBoxes = state.boxes.filter(b => b.category === 'medium').length;
    const largeBoxes = state.boxes.filter(b => b.category === 'large').length;
    
    // Round cost down to thousands
    const roundedCost = Math.floor(calculatedCosts.grandTotal / 1000) * 1000;
    
    // Build box table rows
    let boxTableRows = '';
    let totalCount = 0;
    let totalArea = 0;
    
    sortedSizes.forEach(size => {
        const count = boxCounts[size];
        const area = size * count;
        totalCount += count;
        totalArea += area;
        boxTableRows += `<tr><td>${size} m²</td><td>${count} szt.</td><td>${area} m²</td></tr>`;
    });
    
    // Build cost table rows
    const costLabels = {
        whiteWall: 'Ściana frontowa (biała)',
        grayWall: 'Ściana działowa (szara)',
        mesh: 'Siatka zabezpieczająca',
        kickPlate: 'Kick Plate (odbojnica)',
        singleDoors: 'Drzwi pojedyncze (1m)',
        doubleDoors: 'Drzwi podwójne (2m)',
        rollers15: 'Roleta 1.5m',
        rollers20: 'Roleta 2m',
        electroLocks: 'Zamki elektroniczne',
        soffit: 'Sufit (soffit)',
        gate: 'Brama wjazdowa',
        cameras: 'Kamery',
        lamps: 'Oświetlenie LED'
    };
    
    let costTableRows = '';
    Object.entries(costLabels).forEach(([key, label]) => {
        const item = calculatedCosts[key];
        if (item && item.qty > 0) {
            costTableRows += `<tr>
                <td>${label}</td>
                <td>${item.qty} ${item.unit}</td>
                <td>${formatCurrency(item.price)}/${item.unit}</td>
                <td style="text-align:right;font-weight:600;">${formatCurrency(item.total)}</td>
            </tr>`;
        }
    });
    
    // Cash flow data
    let cashFlowSection = '';
    if (cashFlowResults) {
        const breakEvenText = cashFlowResults.breakEvenMonth 
            ? `${cashFlowResults.breakEvenMonth} msc (${(cashFlowResults.breakEvenMonth / 12).toFixed(1)} lat)`
            : 'Powyżej okresu kontraktu';
        
        cashFlowSection = `
            <div class="print-section">
                <h2>Analiza Cash Flow</h2>
                <div class="print-grid">
                    <div class="print-stat">
                        <span class="value">${formatCurrency(cashFlowResults.maxRentableArea * cashFlowParams.rentPrice)}</span>
                        <span class="label">Przychód msc (max)</span>
                    </div>
                    <div class="print-stat">
                        <span class="value">${formatCurrency(cashFlowResults.monthlyNetAtMax)}</span>
                        <span class="label">Zysk netto msc</span>
                    </div>
                    <div class="print-stat">
                        <span class="value">${breakEvenText}</span>
                        <span class="label">Próg rentowności</span>
                    </div>
                    <div class="print-stat">
                        <span class="value">${cashFlowResults.roi}%</span>
                        <span class="label">ROI (${cashFlowParams.contractLength} lat)</span>
                    </div>
                </div>
                <table class="print-table">
                    <tr><th>Parametr</th><th>Wartość</th></tr>
                    <tr><td>Cena najmu</td><td>${cashFlowParams.rentPrice} PLN/m²/msc</td></tr>
                    <tr><td>Komercjalizacja</td><td>${cashFlowParams.monthlyRental} m²/msc</td></tr>
                    <tr><td>Max. obłożenie</td><td>${cashFlowParams.maxOccupancy}%</td></tr>
                    <tr><td>Długość kontraktu</td><td>${cashFlowParams.contractLength} lat</td></tr>
                    <tr><td>Opłata licencyjna</td><td>${cashFlowParams.licenseFee}%</td></tr>
                    <tr><td>Koszty stałe</td><td>${formatCurrency(cashFlowParams.fixedCosts)}/msc</td></tr>
                    <tr class="total-row"><td>Całkowity zysk (${cashFlowParams.contractLength} lat)</td><td>${formatCurrency(cashFlowResults.totalProfit)}</td></tr>
                </table>
            </div>
        `;
    }
    
    // Generate print content
    printContainer.innerHTML = `
        <div class="print-header">
            <h1>Self-Storage - Projekt Inwestycyjny</h1>
            <p>Data: ${new Date().toLocaleDateString('pl-PL')} | Powierzchnia: ${state.grossArea} m²</p>
        </div>
        
        <div class="print-section">
            <h2>Parametry Projektu</h2>
            <div class="print-grid">
                <div class="print-stat">
                    <span class="value">${state.grossArea} m²</span>
                    <span class="label">Pow. brutto</span>
                </div>
                <div class="print-stat">
                    <span class="value">${state.netArea} m²</span>
                    <span class="label">Pow. netto</span>
                </div>
                <div class="print-stat">
                    <span class="value">${state.efficiency}%</span>
                    <span class="label">Wydajność</span>
                </div>
                <div class="print-stat">
                    <span class="value">${state.boxes.length}</span>
                    <span class="label">Liczba boksów</span>
                </div>
            </div>
            <div class="print-grid">
                <div class="print-stat">
                    <span class="value">${smallBoxes}</span>
                    <span class="label">Małe (1-3m²)</span>
                </div>
                <div class="print-stat">
                    <span class="value">${mediumBoxes}</span>
                    <span class="label">Średnie (4-7m²)</span>
                </div>
                <div class="print-stat">
                    <span class="value">${largeBoxes}</span>
                    <span class="label">Duże (8-15m²)</span>
                </div>
                <div class="print-stat">
                    <span class="value">${state.systemHeight} mm</span>
                    <span class="label">Wys. systemu</span>
                </div>
            </div>
        </div>
        
        <div class="print-section">
            <h2>Zestawienie Boksów</h2>
            <table class="print-table">
                <tr><th>Rozmiar</th><th>Ilość</th><th>Suma m²</th></tr>
                ${boxTableRows}
                <tr class="total-row"><td>RAZEM</td><td>${totalCount} szt.</td><td>${totalArea} m²</td></tr>
            </table>
        </div>
        
        <div class="print-section">
            <h2>Kalkulacja Kosztów</h2>
            <table class="print-table">
                <tr><th>Pozycja</th><th>Ilość</th><th>Cena jedn.</th><th style="text-align:right;">Wartość</th></tr>
                ${costTableRows}
                <tr class="total-row"><td colspan="3">SUMA</td><td style="text-align:right;">${formatCurrency(calculatedCosts.grandTotal)}</td></tr>
            </table>
        </div>
        
        ${cashFlowSection}
        
        <div class="print-total">
            <span class="label">Szacunkowy koszt inwestycji</span>
            <span class="value">~ ${formatCurrency(roundedCost)}</span>
        </div>
        
        <div class="print-footer">
            <p>Dokument wygenerowany przez Self-Storage Konfigurator Pro | ${new Date().toLocaleString('pl-PL')}</p>
            <p>* Koszty są orientacyjne i mogą ulec zmianie</p>
        </div>
    `;
    
    // Trigger print
    setTimeout(() => {
        window.print();
    }, 100);
}
