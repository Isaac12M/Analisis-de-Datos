// script.js - VERSIÓN CORREGIDA
let populationData = [];
let charts = {};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
});

// Configurar gráficos
function initializeCharts() {
    const configs = {
        populationChart: { type: 'line', color: '54, 162, 235', title: 'Evolución de la Población (1960-2024)', fill: true },
        yearChart: { type: 'bar', color: '54, 162, 235', title: 'Población por Año' },
        histogramChart: { type: 'bar', color: '255, 99, 132', title: 'Distribución de Población' },
        scatterChart: { type: 'scatter', color: '75, 192, 192', title: 'Dispersión: Población vs Año', pointRadius: 5 }
    };

    Object.entries(configs).forEach(([id, config]) => {
        const ctx = document.getElementById(id).getContext('2d');
        charts[id] = new Chart(ctx, {
            type: config.type,
            data: { datasets: [{
                backgroundColor: `rgba(${config.color}, 0.7)`,
                borderColor: `rgba(${config.color}, 1)`,
                borderWidth: 1,
                pointRadius: config.pointRadius,
                fill: config.fill
            }]},
            options: {
                responsive: true,
                plugins: { title: { display: true, text: config.title } },
                scales: { y: { beginAtZero: true } }
            }
        });
    });
}

// Configurar event listeners CORREGIDO
function setupEventListeners() {
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('countrySearch').addEventListener('input', handleCountrySearch);
    document.getElementById('countrySelect').addEventListener('change', handleCountryChange);
    document.getElementById('yearSelect').addEventListener('change', handleYearChange);
    document.getElementById('comparisonType').addEventListener('change', handleComparisonTypeChange);
    document.getElementById('comparisonSelect').addEventListener('change', () => toggleCompareButton(true));
    document.getElementById('compareButton').addEventListener('click', updateComparison);
}

// Handlers principales
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.querySelector('.upload-section').classList.add('loading');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            
            processExcelData(jsonData);
            ['countrySearch', 'countrySelect', 'yearSelect'].forEach(id => document.getElementById(id).disabled = false);
            document.querySelector('.upload-section').classList.remove('loading');
        } catch (error) {
            alert('Error al procesar el archivo Excel.');
            document.querySelector('.upload-section').classList.remove('loading');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Handler del buscador CORREGIDO
function handleCountrySearch() {
    const searchTerm = this.value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (searchTerm.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const matchingCountries = populationData.filter(country => 
        country.country.toLowerCase().includes(searchTerm)
    );
    
    displaySearchResults(matchingCountries);
}

// Mostrar resultados CORREGIDO
function displaySearchResults(countries) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (countries.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    countries.slice(0, 10).forEach(country => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = country.country;
        item.addEventListener('click', () => {
            document.getElementById('countrySearch').value = country.country;
            document.getElementById('countrySelect').value = country.country;
            resultsContainer.style.display = 'none';
            updateAllVisualizations(country.country);
        });
        resultsContainer.appendChild(item);
    });
    
    resultsContainer.style.display = 'block';
}

function handleCountryChange() {
    if (this.value) {
        updateAllVisualizations(this.value);
        updateComparisonOptions();
        toggleCompareButton();
    }
}

function handleYearChange() {
    if (this.value && document.getElementById('countrySelect').value) {
        updateYearChart(this.value);
        toggleCompareButton();
    }
}

function handleComparisonTypeChange() {
    const type = this.value;
    const control = document.getElementById('comparisonControl');
    const section = document.getElementById('comparisonSection');
    
    control.style.display = type === 'none' ? 'none' : 'flex';
    section.style.display = type === 'none' ? 'none' : 'block';
    
    if (type !== 'none') updateComparisonOptions();
    toggleCompareButton();
}

// Funciones de datos
function processExcelData(data) {
    const years = data[0].slice(1);
    populationData = data.slice(1).filter(row => row && row[0]).map(row => ({
        country: row[0],
        data: years.reduce((obj, year, i) => (row[i+1] !== undefined ? { ...obj, [year]: row[i+1] } : obj), {})
    }));
    
    updateSelectors();
}

function updateSelectors() {
    const countrySelect = document.getElementById('countrySelect');
    const yearSelect = document.getElementById('yearSelect');
    
    countrySelect.innerHTML = '<option value="">-- Selecciona un país --</option>' + 
        populationData.map(c => `<option value="${c.country}">${c.country}</option>`).join('');
    
    yearSelect.innerHTML = '<option value="">-- Selecciona un año --</option>' + 
        Array.from({length: 65}, (_, i) => 1960 + i).map(year => `<option value="${year}">${year}</option>`).join('');
}

// Visualizaciones
function updateAllVisualizations(countryName) {
    const country = populationData.find(c => c.country === countryName);
    if (!country) return;

    const populations = Object.values(country.data).filter(p => p !== undefined);
    if (populations.length === 0) return;

    updateCharts(country, populations);
    updateStatistics(country, populations);
    updateDataTable(country);
    updateComparisonOptions();
    toggleCompareButton();
}

function updateCharts(country, populations) {
    const years = Object.keys(country.data).map(Number).sort((a, b) => a - b);
    
    // Gráfico principal
    charts.populationChart.data = { labels: years, datasets: [{ ...charts.populationChart.data.datasets[0], data: populations, label: country.country }] };
    charts.populationChart.update();
    
    // Gráfico por año
    const selectedYear = document.getElementById('yearSelect').value;
    if (selectedYear && country.data[selectedYear]) {
        charts.yearChart.data = { labels: [country.country], datasets: [{ ...charts.yearChart.data.datasets[0], data: [country.data[selectedYear]] }] };
        charts.yearChart.update();
    }
    
    // Histograma
    const min = Math.min(...populations), max = Math.max(...populations), binSize = (max - min) / 10;
    const bins = Array(10).fill(0).map((_, i) => 
        populations.filter(p => p >= min + i * binSize && p < min + (i+1) * binSize).length
    );
    charts.histogramChart.data = { 
        labels: Array(10).fill(0).map((_, i) => 
            `${formatNumber(Math.round(min + i * binSize))} - ${formatNumber(Math.round(min + (i+1) * binSize))}`
        ),
        datasets: [{ ...charts.histogramChart.data.datasets[0], data: bins }]
    };
    charts.histogramChart.update();
    
    // Scatter
    charts.scatterChart.data = { 
        datasets: [{ 
            ...charts.scatterChart.data.datasets[0], 
            data: years.map(year => ({ x: year, y: country.data[year] })), 
            label: `Población de ${country.country}` 
        }]
    };
    charts.scatterChart.update();
}

function updateYearChart(year) {
    const country = populationData.find(c => c.country === document.getElementById('countrySelect').value);
    if (!country || !year || !country.data[year]) return;

    charts.yearChart.data = {
        labels: [country.country],
        datasets: [{ ...charts.yearChart.data.datasets[0], data: [country.data[year]] }]
    };
    charts.yearChart.update();
}

function updateStatistics(country, populations) {
    const years = Object.keys(country.data).map(Number);
    const max = Math.max(...populations), min = Math.min(...populations), sum = populations.reduce((a, b) => a + b, 0);
    const avg = sum / populations.length, variance = populations.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / populations.length;
    
    const stats = {
        maxPopulation: formatNumber(max), maxYear: `Año: ${years[populations.indexOf(max)]}`,
        minPopulation: formatNumber(min), minYear: `Año: ${years[populations.indexOf(min)]}`,
        sumPopulation: formatNumber(sum), avgPopulation: formatNumber(Math.round(avg)),
        modePopulation: formatNumber(calculateMode(populations)),
        variancePopulation: formatNumber(Math.round(variance)),
        stdDevPopulation: formatNumber(Math.round(Math.sqrt(variance)))
    };
    
    Object.entries(stats).forEach(([key, value]) => document.getElementById(key).textContent = value);
}

function calculateMode(arr) {
    const freq = {};
    return arr.reduce((a, b) => (freq[b] = (freq[b] || 0) + 1, freq[b] > freq[a] ? b : a), arr[0]);
}

function updateDataTable(country) {
    const tableBody = document.querySelector('#populationTable tbody');
    const rows = Object.entries(country.data)
        .filter(([_, pop]) => pop !== undefined)
        .sort(([a], [b]) => a - b)
        .map(([year, pop]) => `<tr class="fade-in"><td>${country.country}</td><td>${year}</td><td>${formatNumber(pop)}</td></tr>`)
        .join('');
    
    tableBody.innerHTML = rows || '<tr><td colspan="3">No hay datos disponibles</td></tr>';
}

// Comparación
function updateComparisonOptions() {
    const type = document.getElementById('comparisonType').value;
    const select = document.getElementById('comparisonSelect');
    const country = document.getElementById('countrySelect').value;
    const year = document.getElementById('yearSelect').value;
    
    document.getElementById('comparisonLabel').textContent = type === 'years' ? 'Segundo año:' : 'Segundo país:';
    
    const options = type === 'years' 
        ? Array.from({length: 65}, (_, i) => 1960 + i).filter(y => y != year).map(y => `<option value="${y}">${y}</option>`)
        : populationData.filter(c => c.country !== country).map(c => `<option value="${c.country}">${c.country}</option>`);
    
    select.innerHTML = '<option value="">-- Selecciona --</option>' + options.join('');
}

function updateComparison() {
    const type = document.getElementById('comparisonType').value;
    const compSelect = document.getElementById('comparisonSelect');
    const country = document.getElementById('countrySelect').value;
    const year = document.getElementById('yearSelect').value;
    
    if (!type || !compSelect.value || !country || !year) {
        return alert('Completa todos los campos para comparar.');
    }
    
    const country1 = populationData.find(c => c.country === country);
    let pop1, pop2, title1, title2, year2;
    
    if (type === 'years') {
        year2 = compSelect.value;
        pop1 = country1.data[year]; pop2 = country1.data[year2];
        title1 = `${country} (${year})`; title2 = `${country} (${year2})`;
    } else {
        const country2 = populationData.find(c => c.country === compSelect.value);
        pop1 = country1.data[year]; pop2 = country2.data[year];
        title1 = `${country} (${year})`; title2 = `${compSelect.value} (${year})`;
        year2 = year;
    }
    
    if (pop1 === undefined || pop2 === undefined) {
        return alert('Datos no disponibles para la comparación.');
    }
    
    const diff = pop2 - pop1, percent = ((diff / pop1) * 100).toFixed(2);
    
    ['comparisonTitle1', 'comparisonTitle2'].forEach((id, i) => document.getElementById(id).textContent = [title1, title2][i]);
    ['comparisonPopulation1', 'comparisonPopulation2'].forEach((id, i) => document.getElementById(id).textContent = formatNumber([pop1, pop2][i]));
    document.getElementById('comparisonYear1').textContent = year;
    document.getElementById('comparisonYear2').textContent = year2;
    document.getElementById('comparisonDifference').textContent = formatNumber(diff);
    document.getElementById('comparisonPercentage').textContent = `${percent}%`;
}

// Utilidades
function toggleCompareButton(forceShow = false) {
    const btn = document.getElementById('compareButton');
    const type = document.getElementById('comparisonType').value;
    const hasData = document.getElementById('countrySelect').value && document.getElementById('yearSelect').value;
    btn.style.display = (type !== 'none' && hasData) || forceShow ? 'block' : 'none';
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(Math.round(num));
}