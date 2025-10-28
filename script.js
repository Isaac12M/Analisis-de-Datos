// script.js - VERSIÓN SIMPLIFICADA (funcionalidades completas)
let populationData = [];
let charts = {};
let comparison = { type: null, elements: [] };

const CONFIG = {
    charts: {
        populationChart: { type: 'line', title: 'Evolución de la Población (1960-2024)' },
        yearChart: { type: 'bar', title: 'Población por Año' },
        histogramChart: { type: 'bar', title: 'Distribución de Población' },
        scatterChart: { type: 'scatter', title: 'Dispersión: Población vs Año' }
    },
    colors: ['54, 162, 235', '255, 99, 132', '75, 192, 192', '255, 159, 64', '153, 102, 255', '255, 205, 86'],
    startYear: 1960,
    endYear: 2024
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
});

// Configurar gráficos
function initializeCharts() {
    Object.entries(CONFIG.charts).forEach(([id, config]) => {
        const ctx = document.getElementById(id).getContext('2d');
        charts[id] = new Chart(ctx, {
            type: config.type,
            data: { datasets: [] },
            options: {
                responsive: true,
                plugins: { 
                    title: { display: true, text: config.title },
                    legend: { display: true }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    });
}

// Configurar event listeners unificados
function setupEventListeners() {
    const eventConfig = {
        'fileInput': { event: 'change', handler: (e) => handleFileUpload(e) },
        'countrySearch': { event: 'input', handler: () => handleCountrySearch() },
        'countrySelect': { event: 'change', handler: () => handleCountryChange() },
        'yearSelect': { event: 'change', handler: () => handleYearChange() },
        'comparisonType': { event: 'change', handler: () => handleComparisonTypeChange() },
        'comparisonSelect': { event: 'change', handler: () => toggleCompareButton(true) },
        'compareButton': { event: 'click', handler: () => updateComparison() }
    };

    Object.entries(eventConfig).forEach(([id, config]) => {
        document.getElementById(id).addEventListener(config.event, config.handler);
    });
}

// Handlers unificados
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    document.querySelector('.upload-section').classList.add('loading');
    
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            processExcelData(jsonData);
            enableControls(['countrySearch', 'countrySelect', 'yearSelect']);
        } catch (error) {
            alert('Error al procesar el archivo Excel.');
        } finally {
            document.querySelector('.upload-section').classList.remove('loading');
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleCountrySearch() {
    const searchTerm = document.getElementById('countrySearch').value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (searchTerm.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const matchingCountries = populationData
        .filter(country => country.country.toLowerCase().includes(searchTerm))
        .slice(0, 10);
    
    displaySearchResults(matchingCountries);
}

function displaySearchResults(countries) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (countries.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    countries.forEach(country => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = country.country;
        item.addEventListener('click', () => selectCountry(country.country));
        resultsContainer.appendChild(item);
    });
    
    resultsContainer.style.display = 'block';
}

function selectCountry(countryName) {
    document.getElementById('countrySearch').value = countryName;
    document.getElementById('countrySelect').value = countryName;
    document.getElementById('searchResults').style.display = 'none';
    updateAllVisualizations(countryName);
}

function handleCountryChange() {
    const country = document.getElementById('countrySelect').value;
    if (country) {
        updateAllVisualizations(country);
        updateComparisonOptions();
        toggleCompareButton();
    }
}

function handleYearChange() {
    const year = document.getElementById('yearSelect').value;
    const country = document.getElementById('countrySelect').value;
    if (year && country) updateYearChart(year);
}

function handleComparisonTypeChange() {
    const type = document.getElementById('comparisonType').value;
    const elements = {
        control: document.getElementById('comparisonControl'),
        section: document.getElementById('comparisonSection')
    };
    
    elements.control.style.display = type === 'none' ? 'none' : 'flex';
    elements.section.style.display = type === 'none' ? 'none' : 'block';
    
    if (type === 'none') {
        comparison = { type: null, elements: [] };
        updateAllVisualizations(document.getElementById('countrySelect').value);
    } else {
        updateComparisonOptions();
    }
    toggleCompareButton();
}

// Procesamiento de datos unificado
function processExcelData(data) {
    const years = data[0].slice(1);
    populationData = data.slice(1)
        .filter(row => row && row[0])
        .map(row => ({
            country: row[0],
            data: years.reduce((obj, year, i) => ({
                ...obj, 
                [year]: row[i+1] !== undefined ? row[i+1] : undefined
            }), {})
        }));
    
    updateSelectors();
}

function updateSelectors() {
    // Selector de países unificado
    const countrySelect = document.getElementById('countrySelect');
    countrySelect.innerHTML = '<option value="">-- Selecciona un país --</option>' + 
        populationData.map(c => `<option value="${c.country}">${c.country}</option>`).join('');
    
    // Selector de años unificado
    const yearSelect = document.getElementById('yearSelect');
    const years = Array.from({length: CONFIG.endYear - CONFIG.startYear + 1}, 
        (_, i) => CONFIG.startYear + i);
    yearSelect.innerHTML = '<option value="">-- Selecciona un año --</option>' + 
        years.map(year => `<option value="${year}">${year}</option>`).join('');
}

// Visualizaciones unificadas
function updateAllVisualizations(countryName) {
    const country = getCountryData(countryName);
    if (!country) return;

    const populations = getValidPopulations(country.data);
    if (populations.length === 0) return;

    updateCharts(country);
    updateStatistics(country, populations);
    updateDataTable(country);
    updateComparisonOptions();
    toggleCompareButton();
}

function updateCharts(country) {
    updateMainChart(country);
    updateYearChart(document.getElementById('yearSelect').value);
    updateHistogramChart(country);
    updateScatterChart(country);
}

function updateMainChart(country) {
    const datasets = createComparisonDatasets(country, 'line');
    const years = getSortedYears(country.data);
    charts.populationChart.data = { labels: years, datasets };
    charts.populationChart.update();
}

function updateYearChart(year) {
    const country = getCountryData(document.getElementById('countrySelect').value);
    if (!country) return;

    const datasets = createComparisonDatasets(country, 'bar', year);
    charts.yearChart.data = { 
        labels: datasets.map(ds => ds.label),
        datasets
    };
    charts.yearChart.update();
}

function updateHistogramChart(country) {
    const populations = getValidPopulations(country.data);
    const { bins, labels } = createHistogramData(populations);
    charts.histogramChart.data = { 
        labels,
        datasets: [createDataset(country.country, bins, 0, 'bar')]
    };
    charts.histogramChart.update();
}

function updateScatterChart(country) {
    const datasets = createComparisonDatasets(country, 'scatter');
    charts.scatterChart.data = { datasets };
    charts.scatterChart.update();
}

// Núcleo de comparación unificado
function createComparisonDatasets(mainCountry, chartType, specificYear = null) {
    let datasets = [];

    if (comparison.type === 'countries' && comparison.elements.length > 0) {
        // Comparación de países
        [mainCountry, ...comparison.elements].forEach((country, index) => {
            addDatasetForCountry(country, index, chartType, specificYear, datasets);
        });
    } else if (comparison.type === 'years' && comparison.elements.length > 0) {
        // Comparación de años
        const yearsToCompare = [document.getElementById('yearSelect').value, ...comparison.elements];
        
        if (specificYear) {
            yearsToCompare.forEach((year, index) => {
                addDatasetForYear(mainCountry, year, index, chartType, datasets);
            });
        } else {
            addYearComparisonDatasets(mainCountry, yearsToCompare, chartType, datasets);
        }
    } else {
        // Modo normal
        addSingleCountryDataset(mainCountry, chartType, specificYear, datasets);
    }

    return datasets;
}

// Funciones helper para datasets
function addDatasetForCountry(country, index, chartType, specificYear, datasets) {
    if (specificYear) {
        if (country.data[specificYear]) {
            datasets.push(createDataset(country.country, [country.data[specificYear]], index, chartType));
        }
    } else {
        const years = getSortedYears(country.data);
        const data = chartType === 'scatter' 
            ? years.map(year => ({ x: year, y: country.data[year] }))
            : years.map(year => country.data[year]);
        datasets.push(createDataset(country.country, data, index, chartType));
    }
}

function addDatasetForYear(country, year, index, chartType, datasets) {
    if (country.data[year]) {
        datasets.push(createDataset(`Año ${year}`, [country.data[year]], index, chartType));
    }
}

function addYearComparisonDatasets(mainCountry, yearsToCompare, chartType, datasets) {
    const allYears = getSortedYears(mainCountry.data);
    const allData = allYears.map(year => mainCountry.data[year]);
    
    datasets.push(createDataset(mainCountry.country, allData, 0, chartType));
    
    yearsToCompare.forEach((year, index) => {
        if (mainCountry.data[year]) {
            const yearIndex = allYears.indexOf(parseInt(year));
            if (yearIndex !== -1) {
                const highlightData = allYears.map((y, i) => i === yearIndex ? mainCountry.data[year] : null);
                datasets.push(createDataset(`Año ${year}`, highlightData, index + 1, chartType, true));
            }
        }
    });
}

function addSingleCountryDataset(country, chartType, specificYear, datasets) {
    if (specificYear) {
        if (country.data[specificYear]) {
            datasets.push(createDataset(country.country, [country.data[specificYear]], 0, chartType));
        }
    } else {
        const years = getSortedYears(country.data);
        const data = chartType === 'scatter' 
            ? years.map(year => ({ x: year, y: country.data[year] }))
            : years.map(year => country.data[year]);
        datasets.push(createDataset(country.country, data, 0, chartType));
    }
}

function createDataset(label, data, colorIndex, chartType = 'line', isHighlight = false) {
    const config = {
        label,
        data,
        backgroundColor: `rgba(${CONFIG.colors[colorIndex]}, ${getOpacity(chartType, isHighlight)})`,
        borderColor: `rgba(${CONFIG.colors[colorIndex]}, 1)`,
        borderWidth: chartType === 'line' ? 2 : 1,
        fill: false
    };

    // Configuración de puntos para scatter y line
    if (chartType === 'scatter' || chartType === 'line') {
        Object.assign(config, {
            pointRadius: isHighlight ? 8 : (chartType === 'scatter' ? 5 : 3),
            pointBackgroundColor: isHighlight ? `rgba(${CONFIG.colors[colorIndex]}, 1)` : undefined,
            pointBorderColor: isHighlight ? '#ffffff' : undefined,
            pointBorderWidth: isHighlight ? 2 : 0,
            showLine: !isHighlight
        });
    }

    return config;
}

function getOpacity(chartType, isHighlight) {
    if (chartType === 'bar') return '0.7';
    return isHighlight ? '0.9' : '0.4';
}

function createHistogramData(populations) {
    const min = Math.min(...populations);
    const max = Math.max(...populations);
    const binSize = (max - min) / 10;
    
    const bins = Array.from({length: 10}, (_, i) => 
        populations.filter(p => p >= min + i * binSize && p < min + (i+1) * binSize).length
    );
    
    const labels = Array.from({length: 10}, (_, i) => 
        `${formatNumber(Math.round(min + i * binSize))} - ${formatNumber(Math.round(min + (i+1) * binSize))}`
    );
    
    return { bins, labels };
}

// Estadísticas y tabla unificadas
function updateStatistics(country, populations) {
    const years = getSortedYears(country.data);
    const stats = calculateStatistics(populations, years);
    
    Object.entries(stats).forEach(([key, value]) => {
        document.getElementById(key).textContent = value;
    });
}

function calculateStatistics(populations, years) {
    const max = Math.max(...populations), min = Math.min(...populations);
    const sum = populations.reduce((a, b) => a + b, 0);
    const avg = sum / populations.length;
    const variance = populations.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / populations.length;
    
    return {
        maxPopulation: formatNumber(max),
        maxYear: `Año: ${years[populations.indexOf(max)]}`,
        minPopulation: formatNumber(min),
        minYear: `Año: ${years[populations.indexOf(min)]}`,
        sumPopulation: formatNumber(sum),
        avgPopulation: formatNumber(Math.round(avg)),
        modePopulation: formatNumber(calculateMode(populations)),
        variancePopulation: formatNumber(Math.round(variance)),
        stdDevPopulation: formatNumber(Math.round(Math.sqrt(variance)))
    };
}

function updateDataTable(country) {
    const tableBody = document.querySelector('#populationTable tbody');
    const rows = Object.entries(country.data)
        .filter(([_, pop]) => pop !== undefined)
        .sort(([a], [b]) => a - b)
        .map(([year, pop]) => 
            `<tr class="fade-in">
                <td>${country.country}</td>
                <td>${year}</td>
                <td>${formatNumber(pop)}</td>
            </tr>`
        )
        .join('');
    
    tableBody.innerHTML = rows || '<tr><td colspan="3">No hay datos disponibles</td></tr>';
}

// Sistema de comparación unificado
function updateComparisonOptions() {
    const type = document.getElementById('comparisonType').value;
    const select = document.getElementById('comparisonSelect');
    const country = document.getElementById('countrySelect').value;
    const year = document.getElementById('yearSelect').value;
    
    document.getElementById('comparisonLabel').textContent = 
        type === 'years' ? 'Segundo año:' : 'Segundo país:';
    
    const options = type === 'years' ? getYearOptions(year) : getCountryOptions(country);
    select.innerHTML = '<option value="">-- Selecciona --</option>' + options.join('');
}

function getYearOptions(excludeYear) {
    return Array.from({length: CONFIG.endYear - CONFIG.startYear + 1}, (_, i) => CONFIG.startYear + i)
        .filter(y => y != excludeYear)
        .map(y => `<option value="${y}">${y}</option>`);
}

function getCountryOptions(excludeCountry) {
    return populationData
        .filter(c => c.country !== excludeCountry)
        .map(c => `<option value="${c.country}">${c.country}</option>`);
}

function updateComparison() {
    const elements = {
        type: document.getElementById('comparisonType').value,
        compValue: document.getElementById('comparisonSelect').value,
        country: document.getElementById('countrySelect').value,
        year: document.getElementById('yearSelect').value
    };
    
    if (!elements.type || !elements.compValue || !elements.country || !elements.year) {
        return alert('Completa todos los campos para comparar.');
    }
    
    const mainCountry = getCountryData(elements.country);
    const comparisonData = prepareComparisonData(mainCountry, elements);
    
    if (!comparisonData.pop1 || !comparisonData.pop2) {
        return alert('Datos no disponibles para la comparación.');
    }
    
    updateComparisonDisplay(comparisonData);
    updateCharts(mainCountry);
}

function prepareComparisonData(mainCountry, elements) {
    let data = {};
    
    if (elements.type === 'years') {
        data = {
            pop1: mainCountry.data[elements.year],
            pop2: mainCountry.data[elements.compValue],
            title1: `${elements.country} (${elements.year})`,
            title2: `${elements.country} (${elements.compValue})`,
            year2: elements.compValue
        };
        comparison = { type: 'years', elements: [elements.compValue] };
    } else {
        const country2 = getCountryData(elements.compValue);
        data = {
            pop1: mainCountry.data[elements.year],
            pop2: country2.data[elements.year],
            title1: `${elements.country} (${elements.year})`,
            title2: `${elements.compValue} (${elements.year})`,
            year2: elements.year
        };
        comparison = { type: 'countries', elements: [country2] };
    }
    
    return data;
}

function updateComparisonDisplay(data) {
    const diff = data.pop2 - data.pop1;
    const percent = ((diff / data.pop1) * 100).toFixed(2);
    
    const displayElements = {
        comparisonTitle1: data.title1,
        comparisonTitle2: data.title2,
        comparisonPopulation1: formatNumber(data.pop1),
        comparisonPopulation2: formatNumber(data.pop2),
        comparisonYear1: document.getElementById('yearSelect').value,
        comparisonYear2: data.year2,
        comparisonDifference: formatNumber(diff),
        comparisonPercentage: `${percent}%`
    };
    
    Object.entries(displayElements).forEach(([id, value]) => {
        document.getElementById(id).textContent = value;
    });
}

// Utilidades unificadas
function toggleCompareButton(forceShow = false) {
    const btn = document.getElementById('compareButton');
    const type = document.getElementById('comparisonType').value;
    const hasData = document.getElementById('countrySelect').value && document.getElementById('yearSelect').value;
    btn.style.display = (type !== 'none' && hasData) || forceShow ? 'block' : 'none';
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(Math.round(num));
}

function calculateMode(arr) {
    const freq = {};
    return arr.reduce((a, b) => (freq[b] = (freq[b] || 0) + 1, freq[b] > freq[a] ? b : a), arr[0]);
}

function getCountryData(countryName) {
    return populationData.find(c => c.country === countryName);
}

function getValidPopulations(countryData) {
    return Object.values(countryData).filter(p => p !== undefined);
}

function getSortedYears(countryData) {
    return Object.keys(countryData)
        .map(Number)
        .sort((a, b) => a - b)
        .filter(year => countryData[year] !== undefined);
}

function enableControls(controlIds) {
    controlIds.forEach(id => {
        document.getElementById(id).disabled = false;
    });
}