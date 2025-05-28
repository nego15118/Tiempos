// Variables globales
let currentData = [];
let filteredData = [];
let analysts = [];
let selectedAnalysts = [];
let charts = {};
let currentPage = 1;
const itemsPerPage = 10;
let selectedDays = [];
let pointsOfSale = [];
let selectedPointsOfSale = [];
let dateRange = null;
let selectedFilters = {};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Evento para cargar archivo Excel
    document.getElementById('loadNewData').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('fileModal'));
        modal.show();
    });
    
    // Procesar archivo Excel
    document.getElementById('processFile').addEventListener('click', processExcelFile);
    
    // Botón para borrar selección de analistas
    document.getElementById('clearAnalystFilters').addEventListener('click', clearAnalystSelection);
    
    // Botón para borrar filtro de días
    document.getElementById('clearDayFilters').addEventListener('click', clearDaySelection);
    
    // Botón para borrar filtro de puntos de venta
    document.getElementById('clearPointOfSaleFilters').addEventListener('click', clearPointOfSaleSelection);
    
    // Botón para borrar filtro de fechas
    document.getElementById('clearDateFilter').addEventListener('click', function() {
        dateRange = null;
        document.getElementById('dateFromFilter')._flatpickr.clear();
        document.getElementById('dateToFilter')._flatpickr.clear();
        applyFilters();
    });
    
    // Búsqueda en la tabla principal
    document.getElementById('searchInput').addEventListener('input', updateRequestsTable);
    
    // Evento para selección múltiple de puntos de venta
    document.getElementById('pointOfSaleSelect')?.addEventListener('change', function() {
        selectedPointsOfSale = Array.from(this.selectedOptions).map(opt => opt.value);
        applyFilters();
    });
    
    // Configuración de datepickers para rango de fechas
    flatpickr("#dateFromFilter", {
        dateFormat: "d/m/Y",
        locale: "es",
        onChange: function(selectedDates) {
            if (selectedDates.length) {
                dateRange = dateRange || {};
                dateRange.start = selectedDates[0];
                if (!dateRange.end || dateRange.end < dateRange.start) {
                    dateRange.end = null;
                    document.getElementById('dateToFilter')._flatpickr.clear();
                }
                applyFilters();
            } else {
                dateRange = dateRange || {};
                dateRange.start = null;
                applyFilters();
            }
        }
    });

    flatpickr("#dateToFilter", {
        dateFormat: "d/m/Y",
        locale: "es",
        onChange: function(selectedDates) {
            if (selectedDates.length) {
                dateRange = dateRange || {};
                dateRange.end = selectedDates[0];
                applyFilters();
            } else {
                dateRange = dateRange || {};
                dateRange.end = null;
                applyFilters();
            }
        }
    });
    
    // Inicializar gráficos vacíos
    initializeCharts();
    
    // Mostrar mensaje inicial en puntos de venta
    document.getElementById('pointOfSaleSelect').innerHTML = `
        <option disabled>Cargue un archivo Excel para comenzar</option>
    `;
});

function initializeCharts() {
    try {
        // Configuración común para todos los gráficos
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            
                            if (context.chart.config.type === 'bar') {
                                if (context.dataset.label.includes('Tiempo')) {
                                    const hours = Math.floor(value / 60);
                                    const mins = Math.round(value % 60);
                                    return `${label}: ${hours}h ${mins}m (${percentage}%)`;
                                }
                                return `${label}: ${Math.round(value)} (${percentage}%)`;
                            }
                            return `${label}: ${Math.round(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        };

        // Gráfico de Tiempo de Procesamiento
        const timeCtx = document.getElementById('timeChart').getContext('2d');
        charts.timeChart = new Chart(timeCtx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                ...commonOptions,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        title: { display: true, text: 'Horas' },
                        ticks: {
                            callback: function(value) {
                                const hours = Math.floor(value);
                                const mins = Math.round((value - hours) * 60);
                                return `${hours}h ${mins}m`;
                            }
                        }
                    },
                    x: { title: { display: true, text: 'Fecha' } }
                }
            }
        });

        // Gráfico por Estado
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        charts.statusChart = new Chart(statusCtx, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por País
        const countryCtx = document.getElementById('countryChart').getContext('2d');
        charts.countryChart = new Chart(countryCtx, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por Segmento
        const segmentCtx = document.getElementById('segmentChart').getContext('2d');
        charts.segmentChart = new Chart(segmentCtx, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por Punto de Venta
        const pointOfSaleCtx = document.getElementById('pointOfSaleChart').getContext('2d');
        charts.pointOfSaleChart = new Chart(pointOfSaleCtx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por Comercio Afiliado
        const commerceCtx = document.getElementById('commerceChart').getContext('2d');
        charts.commerceChart = new Chart(commerceCtx, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por Marca
        const brandCtx = document.getElementById('brandChart').getContext('2d');
        charts.brandChart = new Chart(brandCtx, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por Subcategoría
        const subcategoryCtx = document.getElementById('subcategoryChart').getContext('2d');
        charts.subcategoryChart = new Chart(subcategoryCtx, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Gráfico por Día de la Semana
        const dayOfWeekCtx = document.getElementById('dayOfWeekChart').getContext('2d');
        charts.dayOfWeekChart = new Chart(dayOfWeekCtx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: commonOptions
        });

        // Agregar eventos de click a los gráficos
        Object.values(charts).forEach(chart => {
            chart.canvas.onclick = function(evt) {
                const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const firstPoint = points[0];
                    const label = chart.data.labels[firstPoint.index];
                    const datasetLabel = chart.data.datasets[firstPoint.datasetIndex].label || '';
                    
                    let filterType = '';
                    if (chart === charts.statusChart) filterType = 'estado';
                    else if (chart === charts.countryChart) filterType = 'Pais';
                    else if (chart === charts.segmentChart) filterType = 'Segmento';
                    else if (chart === charts.pointOfSaleChart) filterType = 'Punto de Venta';
                    else if (chart === charts.commerceChart) filterType = 'Comercio';
                    else if (chart === charts.brandChart) filterType = 'Marca';
                    else if (chart === charts.subcategoryChart) filterType = 'Subcategoria';
                    else if (chart === charts.dayOfWeekChart) filterType = 'DiaSemana';
                    
                    if (filterType) {
                        if (selectedFilters[filterType] === label) {
                            delete selectedFilters[filterType];
                        } else {
                            selectedFilters[filterType] = label;
                        }
                        applyFilters();
                    }
                }
            };
        });

    } catch (error) {
        console.error("Error al inicializar gráficos:", error);
    }
}

function processExcelFile() {
    try {
        const fileInput = document.getElementById('excelFile');
        if (!fileInput) {
            throw new Error('No se encontró el input de archivo');
        }

        const file = fileInput.files[0];
        if (!file) {
            throw new Error('Por favor seleccione un archivo Excel');
        }

        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExtension)) {
            throw new Error('Formato de archivo no válido. Por favor suba un archivo .xlsx, .xls o .csv');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    if (!e.target?.result) {
                        throw new Error('No se pudo leer el contenido del archivo');
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true,
                        dateNF: 'dd/mm/yyyy HH:MM:ss'
                    });

                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('El archivo no contiene hojas válidas');
                    }

                    const firstSheetName = workbook.SheetNames[0];
                    const firstSheet = workbook.Sheets[firstSheetName];
                    
                    if (!firstSheet) {
                        throw new Error('No se pudo acceder a la primera hoja del archivo');
                    }

                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                        raw: false,
                        defval: null,
                        header: 1
                    });

                    if (!jsonData || jsonData.length < 2) {
                        throw new Error('El archivo no contiene datos o la estructura no es válida');
                    }

                    // Procesar encabezados
                    const headers = jsonData[0].map(h => h.toString().trim());

                    // Procesar datos
                    currentData = jsonData.slice(1).map((row, index) => {
                        const rowData = {};
                        headers.forEach((header, i) => {
                            rowData[header] = i < row.length ? row[i] : null;
                        });

                        try {
                            return {
                                numeroSolicitud: rowData['NumeroSolicitud'] || `N/A-${index + 1}`,
                                analista: rowData['Analista'] || 'Sin asignar',
                                estado: rowData['Estado'] || 'Sin estado',
                                fechaCreacion: convertExcelDate(rowData['Fecha Creacion']),
                                fechaPrimerAnalisis: convertExcelDate(rowData['Fecha_Primer_Analisis']),
                                fechaAprobado: convertExcelDate(rowData['Fecha_Aprobado']),
                                fechaDesistido: convertExcelDate(rowData['Fecha_Desistido']),
                                fechaRechazado: convertExcelDate(rowData['Fecha_Rechazado']),
                                fechaPrimeraReproceso: convertExcelDate(rowData['Fecha_Primera_Reproceso']),
                                fechaPrimeraDevolucion: convertExcelDate(rowData['Fecha_Primera_Devolucion']),
                                fechaPrimeraAprobacion: convertExcelDate(rowData['Fecha_Primera_Aprobacion']),
                                
                                // Propiedades para gráficos
                                Pais: rowData['Pais'] || 'No especificado',
                                Segmento: rowData['Segmento'] || 'No especificado',
                                'Punto de Venta': rowData['Punto de Venta'] || 'No especificado',
                                Comercio: rowData['Comercio'] || 'No especificado',
                                Subcategoria: rowData['Subcategoria'] || 'No especificado',
                                Marca: rowData['Marca'] || 'No especificado',
                                DiaSemana: rowData['Fecha Creacion'] ? new Date(convertExcelDate(rowData['Fecha Creacion'])).getDay() : null,
                                
                                cliente: `${rowData['Nombres'] || ''} ${rowData['Apellidos'] || ''}`.trim(),
                                producto: rowData['Producto'] || ''
                            };
                        } catch (error) {
                            console.error(`Error procesando fila ${index + 1}:`, error);
                            return null;
                        }
                    }).filter(item => item !== null && item.fechaCreacion);

                    if (currentData.length === 0) {
                        throw new Error('No se pudieron procesar los datos. Verifique los formatos.');
                    }

                    updateUIAfterLoad();
                    const modal = bootstrap.Modal.getInstance(document.getElementById('fileModal'));
                    if (modal) modal.hide();

                    resolve(currentData);
                } catch (error) {
                    console.error('Error en reader.onload:', error);
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                console.error('Error al leer el archivo:', error);
                reject(new Error('Error al leer el archivo. Intente con otro archivo.'));
            };

            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        console.error('Error en processExcelFile:', error);
        alert(`Error al procesar el archivo: ${error.message}`);
        return Promise.reject(error);
    }
}

function convertExcelDate(excelDate) {
    if (excelDate === null || excelDate === undefined || excelDate === '' || excelDate === 'NULL') {
        return null;
    }

    if (excelDate instanceof Date && !isNaN(excelDate.getTime())) {
        return excelDate;
    }

    if (typeof excelDate === 'number') {
        try {
            const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            if (date instanceof Date && !isNaN(date.getTime())) {
                if (excelDate >= 60) {
                    date.setTime(date.getTime() - 86400 * 1000);
                }
                return date;
            }
        } catch (e) {
            console.warn('Error al convertir fecha serial de Excel:', excelDate, e);
            return null;
        }
    }

    if (typeof excelDate === 'string') {
        const trimmedDate = excelDate.trim();
        
        if (trimmedDate === '' || 
            trimmedDate === '0001-01-01 00:00:00.0000000' || 
            trimmedDate === '1899-12-30 00:00:00' ||
            trimmedDate.toLowerCase() === 'null') {
            return null;
        }

        try {
            const luxonFormats = [
                'yyyy-MM-dd HH:mm:ss.SSSSSSS', 
                'yyyy-MM-dd HH:mm:ss',
                'yyyy-MM-dd HH:mm',
                'yyyy-MM-dd',
                'dd/MM/yyyy HH:mm:ss',
                'dd/MM/yyyy HH:mm',
                'dd/MM/yyyy',
                'MM/dd/yyyy HH:mm:ss',
                'MM/dd/yyyy HH:mm',
                'MM/dd/yyyy',
                'yyyyMMdd',
                'dd-MM-yyyy',
                'MM-dd-yyyy',
                'dd.MM.yyyy',
                'MM.dd.yyyy'
            ];

            for (const format of luxonFormats) {
                try {
                    const parsedDate = luxon.DateTime.fromFormat(trimmedDate, format);
                    if (parsedDate.isValid) {
                        return parsedDate.toJSDate();
                    }
                } catch (e) {
                    continue;
                }
            }

            const autoParsed = luxon.DateTime.fromISO(trimmedDate) || 
                              luxon.DateTime.fromRFC2822(trimmedDate) || 
                              luxon.DateTime.fromHTTP(trimmedDate);
            if (autoParsed && autoParsed.isValid) {
                return autoParsed.toJSDate();
            }
        } catch (e) {
            console.warn('Error al parsear con Luxon:', trimmedDate, e);
        }

        try {
            const normalizedDate = trimmedDate
                .replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')
                .replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1')
                .replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1');

            const date = new Date(normalizedDate);
            if (!isNaN(date.getTime())) {
                return date;
            }

            const isoDate = new Date(trimmedDate);
            if (!isNaN(isoDate.getTime())) {
                return isoDate;
            }
        } catch (e) {
            console.warn('Error al convertir fecha con Date:', trimmedDate, e);
        }
    }

    console.warn('Formato de fecha no reconocido:', excelDate);
    return null;
}

function updateUIAfterLoad() {
    try {
        extractAnalysts();
        extractPointsOfSale();
        updateAnalystsList();
        updatePointOfSaleSelect();
        
        filteredData = [...currentData];
        currentPage = 1;
        
        updateSummary();
        updateCharts();
        updateRequestsTable();
    } catch (error) {
        console.error('Error en updateUIAfterLoad:', error);
        alert('Ocurrió un error al actualizar la interfaz. Por favor verifique los datos.');
    }
}

function extractAnalysts() {
    const analystNames = [...new Set(currentData.map(item => item.analista))];
    
    analysts = analystNames.map(name => {
        const analystData = currentData.filter(item => item.analista === name);
        const approved = analystData.filter(item => item.estado === 'APROBADO' || item.estado === 'DESEMBOLSADO').length;
        const rejected = analystData.filter(item => item.estado === 'RECHAZADO').length;
        const withdrawn = analystData.filter(item => item.estado === 'DESISTIDO').length;
        
        const approvedItems = analystData.filter(item => 
            (item.estado === 'APROBADO' || item.estado === 'DESEMBOLSADO') && 
            item.fechaPrimerAnalisis && 
            item.fechaAprobado
        );
        
        let avgTime = 0;
        if (approvedItems.length > 0) {
            const totalTime = approvedItems.reduce((sum, item) => {
                return sum + calculateWorkingTime(item.fechaPrimerAnalisis, item.fechaAprobado);
            }, 0);
            avgTime = totalTime / approvedItems.length;
        }
        
        return {
            name: name,
            requestCount: analystData.length,
            approvedCount: approved,
            rejectedCount: rejected,
            withdrawnCount: withdrawn,
            avgTime: avgTime,
            efficiency: approvedItems.length > 0 ? (approved / analystData.length) * 100 : 0
        };
    });
    
    analysts.sort((a, b) => b.requestCount - a.requestCount);
}

function extractPointsOfSale() {
    pointsOfSale = [...new Set(currentData.map(item => item['Punto de Venta'] || 'No especificado'))];
    pointsOfSale.sort();
}

function updatePointOfSaleSelect() {
    const select = document.getElementById('pointOfSaleSelect');
    
    if (pointsOfSale.length === 0) {
        select.innerHTML = '<option disabled>Cargue un archivo Excel para comenzar</option>';
        return;
    }
    
    select.innerHTML = pointsOfSale.map(point => 
        `<option value="${point}" ${selectedPointsOfSale.includes(point) ? 'selected' : ''}>${point}</option>`
    ).join('');
}

function calculateWorkingTime(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    
    let workingMinutes = 0;
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    if (current >= end) return 0;
    
    while (current < end) {
        const day = current.getDay();
        const hour = current.getHours();
        const minute = current.getMinutes();
        
        const isWorkingDay = (day >= 1 && day <= 5);
        const isWorkingHour = isWorkingDay 
            ? (hour >= 8 && (hour < 19 || (hour === 19 && minute === 0)))
            : (hour >= 9 && (hour < 18 || (hour === 18 && minute === 0)));
        
        if (isWorkingHour) {
            workingMinutes += 1;
        }
        
        current = new Date(current.getTime() + 60000);
    }
    
    return workingMinutes;
}

function updateAnalystsList() {
    const listContainer = document.getElementById('analystsList');
    const countElement = document.getElementById('analystCount');
    
    if (analysts.length === 0) {
        listContainer.innerHTML = `
            <div class="list-group-item text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                <p class="mb-0">No se encontraron analistas en el archivo</p>
            </div>
        `;
        countElement.textContent = '0';
        return;
    }
    
    listContainer.innerHTML = analysts.map((analyst, index) => `
        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
            <div class="form-check w-100">
                <input class="form-check-input analyst-checkbox" type="checkbox" 
                       id="analyst-${index}" value="${analyst.name}" 
                       onchange="toggleAnalystSelection('${analyst.name}')">
                <label class="form-check-label w-100" for="analyst-${index}">
                    <div class="analyst-info">
                        <div class="analyst-avatar">${analyst.name.charAt(0)}</div>
                        <div>
                            <div class="analyst-name">${analyst.name}</div>
                            <div class="analyst-stats">${analyst.requestCount} solicitudes</div>
                        </div>
                    </div>
                </label>
            </div>
            <span class="badge bg-primary rounded-pill">${Math.round(analyst.efficiency)}%</span>
        </div>
    `).join('');
    
    countElement.textContent = analysts.length;
}

function toggleAnalystSelection(analystName) {
    const index = selectedAnalysts.indexOf(analystName);
    if (index === -1) {
        selectedAnalysts.push(analystName);
    } else {
        selectedAnalysts.splice(index, 1);
    }
    
    applyFilters();
}

function clearAnalystSelection() {
    selectedAnalysts = [];
    document.querySelectorAll('.analyst-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    applyFilters();
}

function toggleDaySelection(day) {
    const index = selectedDays.indexOf(day);
    if (index === -1) {
        selectedDays.push(day);
    } else {
        selectedDays.splice(index, 1);
    }
    applyFilters();
}

function clearDaySelection() {
    selectedDays = [];
    document.querySelectorAll('.day-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    applyFilters();
}

function clearPointOfSaleSelection() {
    selectedPointsOfSale = [];
    const select = document.getElementById('pointOfSaleSelect');
    if (select) {
        Array.from(select.options).forEach(opt => opt.selected = false);
    }
    applyFilters();
}

function applyFilters() {
    try {
        if (!currentData || currentData.length === 0) {
            console.error("No hay datos para filtrar");
            return;
        }
        
        // Empezar con todos los datos
        let tempData = [...currentData];
        
        // Filtrar por analistas seleccionados
        if (selectedAnalysts.length > 0) {
            tempData = tempData.filter(item => 
                selectedAnalysts.includes(item.analista)
            );
        }
        
        // Filtrar por días de la semana seleccionados
        if (selectedDays.length > 0) {
            tempData = tempData.filter(item => {
                if (!item.fechaCreacion) return false;
                const day = item.fechaCreacion.getDay();
                return selectedDays.includes(day);
            });
        }
        
        // Filtrar por puntos de venta seleccionados
        if (selectedPointsOfSale.length > 0) {
            tempData = tempData.filter(item => 
                selectedPointsOfSale.includes(item['Punto de Venta'] || 'No especificado')
            );
        }
        
        // Filtrar por rango de fechas
        if (dateRange && (dateRange.start || dateRange.end)) {
            tempData = tempData.filter(item => {
                if (!item.fechaCreacion) return false;
                const itemDate = new Date(item.fechaCreacion);
                
                const startCondition = !dateRange.start || itemDate >= dateRange.start;
                const endCondition = !dateRange.end || itemDate <= dateRange.end;
                
                return startCondition && endCondition;
            });
        }
        
        // Aplicar filtros de gráficos
        for (const [key, value] of Object.entries(selectedFilters)) {
            if (key === 'DiaSemana') {
                tempData = tempData.filter(item => {
                    if (!item.fechaCreacion) return false;
                    return item.fechaCreacion.getDay() === parseInt(value);
                });
            } else {
                tempData = tempData.filter(item => String(item[key] || 'No especificado') === value);
            }
        }
        
        // Guardar datos filtrados
        filteredData = tempData;
        
        // Actualizar la interfaz
        updateSummary();
        updateCharts();
        updateRequestsTable();
    } catch (error) {
        console.error('Error al aplicar filtros:', error);
        alert('Ocurrió un error al filtrar los datos');
    }
}

function isDefaultDate(date) {
    if (!date) return true;
    const defaultDates = [
        new Date('0001-01-01T00:00:00.000Z'),
        new Date('1899-12-30T00:00:00.000Z'),
        new Date(0)
    ];
    return defaultDates.some(d => date.getTime() === d.getTime());
}

function updateCharts() {
    if (!filteredData || filteredData.length === 0) {
        Object.values(charts).forEach(chart => {
            chart.data.labels = [];
            chart.data.datasets = [];
            chart.update();
        });
        return;
    }
    
    updateTimeChart();
    updateStatusChart();
    updateCountryChart();
    updateSegmentChart();
    updatePointOfSaleChart();
    updateCommerceChart();
    updateBrandChart();
    updateSubcategoryChart();
    updateDayOfWeekChart();
}

function updateTimeChart() {
    const dailyData = groupDataByDay(filteredData);
    
    charts.timeChart.data.labels = dailyData.map(day => day.date);
    charts.timeChart.data.datasets = [{
        label: 'Tiempo Promedio (horas)',
        data: dailyData.map(day => day.avgTime / 60),
        backgroundColor: 'rgba(67, 97, 238, 0.8)',
        borderColor: 'rgba(67, 97, 238, 1)',
        borderWidth: 1
    }];
    
    charts.timeChart.update();
}

function groupDataByDay(data) {
    const approvedItems = data.filter(item => 
        (item.estado === 'APROBADO' || item.estado === 'DESEMBOLSADO') && 
        item.fechaPrimerAnalisis && 
        item.fechaAprobado
    );
    
    if (approvedItems.length === 0) return [];
    
    const daysMap = {};
    
    approvedItems.forEach(item => {
        const date = new Date(item.fechaCreacion);
        const dateStr = luxon.DateTime.fromJSDate(date).toFormat('dd/MM');
        
        if (!daysMap[dateStr]) {
            daysMap[dateStr] = {
                date: dateStr,
                times: []
            };
        }
        
        const workingTime = calculateWorkingTime(item.fechaPrimerAnalisis, item.fechaAprobado);
        daysMap[dateStr].times.push(workingTime);
    });
    
    return Object.values(daysMap).map(day => ({
        date: day.date,
        avgTime: day.times.reduce((a, b) => a + b, 0) / day.times.length
    })).sort((a, b) => {
        const dateA = luxon.DateTime.fromFormat(a.date, 'dd/MM').toJSDate();
        const dateB = luxon.DateTime.fromFormat(b.date, 'dd/MM').toJSDate();
        return dateA - dateB;
    });
}

function updateStatusChart() {
    const statusCounts = filteredData.reduce((acc, item) => {
        const status = item.estado || 'Sin estado';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    
    const backgroundColors = labels.map(status => {
        if (status === 'APROBADO' || status === 'DESEMBOLSADO') return 'rgba(40, 167, 69, 0.8)';
        if (status === 'RECHAZADO') return 'rgba(220, 53, 69, 0.8)';
        if (status === 'DESISTIDO') return 'rgba(255, 193, 7, 0.8)';
        return 'rgba(108, 117, 125, 0.8)';
    });
    
    charts.statusChart.data.labels = labels;
    charts.statusChart.data.datasets = [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: '#fff',
        borderWidth: 1
    }];
    
    charts.statusChart.update();
}

function updateCountryChart() {
    const countryCounts = filteredData.reduce((acc, item) => {
        const country = item.Pais || 'No especificado';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
    }, {});
    
    const labels = Object.keys(countryCounts);
    const data = Object.values(countryCounts);
    
    charts.countryChart.data.labels = labels;
    charts.countryChart.data.datasets = [{
        data: data,
        backgroundColor: generateColors(labels.length),
        borderColor: '#fff',
        borderWidth: 1
    }];
    
    charts.countryChart.update();
}

function updateSegmentChart() {
    const segmentCounts = filteredData.reduce((acc, item) => {
        const segment = item.Segmento || 'No especificado';
        acc[segment] = (acc[segment] || 0) + 1;
        return acc;
    }, {});
    
    const labels = Object.keys(segmentCounts);
    const data = Object.values(segmentCounts);
    
    charts.segmentChart.data.labels = labels;
    charts.segmentChart.data.datasets = [{
        data: data,
        backgroundColor: generateColors(labels.length),
        borderColor: '#fff',
        borderWidth: 1
    }];
    
    charts.segmentChart.update();
}

function updatePointOfSaleChart() {
    const pointOfSaleCounts = filteredData.reduce((acc, item) => {
        const point = item['Punto de Venta'] || 'No especificado';
        acc[point] = (acc[point] || 0) + 1;
        return acc;
    }, {});
    
    const sorted = Object.entries(pointOfSaleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(([point]) => point);
    const data = sorted.map(([_, count]) => count);
    
    charts.pointOfSaleChart.data.labels = labels;
    charts.pointOfSaleChart.data.datasets = [{
        label: 'Solicitudes',
        data: data,
        backgroundColor: 'rgba(67, 97, 238, 0.8)',
        borderColor: 'rgba(67, 97, 238, 1)',
        borderWidth: 1
    }];
    
    charts.pointOfSaleChart.update();
}

function updateCommerceChart() {
    const commerceCounts = filteredData.reduce((acc, item) => {
        const commerce = item.Comercio || 'No especificado';
        acc[commerce] = (acc[commerce] || 0) + 1;
        return acc;
    }, {});
    
    const sorted = Object.entries(commerceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(([commerce]) => commerce);
    const data = sorted.map(([_, count]) => count);
    
    charts.commerceChart.data.labels = labels;
    charts.commerceChart.data.datasets = [{
        data: data,
        backgroundColor: generateColors(labels.length),
        borderColor: '#fff',
        borderWidth: 1
    }];
    
    charts.commerceChart.update();
}

function updateBrandChart() {
    const brandCounts = filteredData.reduce((acc, item) => {
        const brand = item.Marca || 'No especificado';
        acc[brand] = (acc[brand] || 0) + 1;
        return acc;
    }, {});
    
    const sorted = Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(([brand]) => brand);
    const data = sorted.map(([_, count]) => count);
    
    charts.brandChart.data.labels = labels;
    charts.brandChart.data.datasets = [{
        data: data,
        backgroundColor: generateColors(labels.length),
        borderColor: '#fff',
        borderWidth: 1
    }];
    
    charts.brandChart.update();
}

function updateSubcategoryChart() {
    const subcategoryCounts = filteredData.reduce((acc, item) => {
        const subcategory = item.Subcategoria || 'No especificado';
        acc[subcategory] = (acc[subcategory] || 0) + 1;
        return acc;
    }, {});
    
    const labels = Object.keys(subcategoryCounts);
    const data = Object.values(subcategoryCounts);
    
    charts.subcategoryChart.data.labels = labels;
    charts.subcategoryChart.data.datasets = [{
        data: data,
        backgroundColor: generateColors(labels.length),
        borderColor: '#fff',
        borderWidth: 1
    }];
    
    charts.subcategoryChart.update();
}

function updateDayOfWeekChart() {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayCounts = Array(7).fill(0);
    
    filteredData.forEach(item => {
        if (item.fechaCreacion) {
            const day = item.fechaCreacion.getDay();
            dayCounts[day]++;
        }
    });
    
    charts.dayOfWeekChart.data.labels = days;
    charts.dayOfWeekChart.data.datasets = [{
        label: 'Solicitudes',
        data: dayCounts,
        backgroundColor: 'rgba(67, 97, 238, 0.8)',
        borderColor: 'rgba(67, 97, 238, 1)',
        borderWidth: 1
    }];
    
    charts.dayOfWeekChart.update();
}

function generateColors(count) {
    const colors = [];
    const hueStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
        const hue = i * hueStep;
        colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
    }
    
    return colors;
}

function updateSummary() {
    if (!filteredData || filteredData.length === 0) {
        resetSummaryCards();
        return;
    }

    const totalGestiones = filteredData.length;
    document.getElementById('totalGestiones').textContent = totalGestiones.toLocaleString();
    document.getElementById('countTotalGestiones').textContent = totalGestiones.toLocaleString();

    const reprocesos = filteredData.filter(item => 
        item.fechaPrimeraReproceso && 
        !isDefaultDate(item.fechaPrimeraReproceso)
    ).length;
    
    const solicitudesNuevas = totalGestiones - reprocesos;
    
    document.getElementById('solicitudesNuevas').textContent = solicitudesNuevas.toLocaleString();
    document.getElementById('reprocesos').textContent = reprocesos.toLocaleString();
    
    document.getElementById('porcentajeNuevas').textContent = totalGestiones > 0 ? 
        Math.round((solicitudesNuevas / totalGestiones) * 100) + '%' : '0%';
    document.getElementById('porcentajeReprocesos').textContent = totalGestiones > 0 ? 
        Math.round((reprocesos / totalGestiones) * 100) + '%' : '0%';
    
    calculateAndDisplayTime('colaEspera', 'countColaEspera', 
        item => item.fechaCreacion, 
        item => item.fechaPrimerAnalisis);
    
    calculateAndDisplayTime('primeraDevolucion', 'countPrimeraDevolucion', 
        item => item.fechaCreacion, 
        item => item.fechaPrimeraDevolucion);
    
    calculateAndDisplayTime('primeraAprobacion', 'countPrimeraAprobacion', 
        item => item.fechaCreacion, 
        item => item.fechaPrimeraAprobacion,
        item => !item.fechaPrimeraDevolucion || isDefaultDate(item.fechaPrimeraDevolucion));
    
    calculateAndDisplayTime('primerRechazo', 'countPrimerRechazo', 
        item => item.fechaCreacion, 
        item => item.fechaRechazado,
        item => !item.fechaPrimeraDevolucion || isDefaultDate(item.fechaPrimeraDevolucion));
}

function calculateAndDisplayTime(timeElementId, countElementId, getStartDateFn, getEndDateFn, additionalFilterFn = () => true) {
    const validItems = filteredData.filter(item => {
        const startDate = getStartDateFn(item);
        const endDate = getEndDateFn(item);
        return startDate && !isDefaultDate(startDate) && 
               endDate && !isDefaultDate(endDate) &&
               additionalFilterFn(item);
    });

    const count = validItems.length;
    document.getElementById(countElementId).textContent = count.toLocaleString();

    let avgTime = 0;
    if (count > 0) {
        const totalTime = validItems.reduce((sum, item) => {
            return sum + calculateWorkingTime(getStartDateFn(item), getEndDateFn(item));
        }, 0);
        avgTime = totalTime / count;
    }

    updateTimeDisplay(timeElementId, avgTime);
}

function resetSummaryCards() {
    const elementsToReset = [
        'totalGestiones', 'solicitudesNuevas', 'reprocesos',
        'colaEspera', 'primeraDevolucion', 'primeraAprobacion',
        'primerRechazo'
    ];

    elementsToReset.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = element.id.includes('Gestiones') || 
                                 element.id.includes('Nuevas') || 
                                 element.id.includes('reprocesos') ? '0' : 'N/A';
        }
    });

    document.getElementById('porcentajeNuevas').textContent = '0%';
    document.getElementById('porcentajeReprocesos').textContent = '0%';

    ['countTotalGestiones', 'countColaEspera', 'countPrimeraDevolucion', 
     'countPrimeraAprobacion', 'countPrimerRechazo'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
}

function updateTimeDisplay(elementId, minutes) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (minutes <= 0) {
        element.textContent = 'N/A';
        return;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const hoursDecimal = (minutes / 60).toFixed(1);
    element.textContent = `${hours}h ${mins}m (${hoursDecimal} horas)`;
}

function updateRequestsTable() {
    const tableBody = document.getElementById('requestsTable');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let dataToShow = [...filteredData];
    if (searchTerm) {
        dataToShow = dataToShow.filter(item => 
            (item.numeroSolicitud && item.numeroSolicitud.toString().toLowerCase().includes(searchTerm)) ||
            (item.analista && item.analista.toLowerCase().includes(searchTerm)) ||
            (item.cliente && item.cliente.toLowerCase().includes(searchTerm)) ||
            (item.estado && item.estado.toLowerCase().includes(searchTerm))
        );
    }
    
    tableBody.innerHTML = dataToShow.map(item => {
        let processingTime = '';
        if ((item.estado === 'APROBADO' || item.estado === 'DESEMBOLSADO') && 
            item.fechaPrimerAnalisis && item.fechaPrimeraAprobacion) {
            const minutes = calculateWorkingTime(item.fechaPrimerAnalisis, item.fechaPrimeraAprobacion);
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            processingTime = `${hours}h ${mins}m`;
        }
        
        let statusClass = '';
        if (item.estado === 'APROBADO' || item.estado === 'DESEMBOLSADO') {
            statusClass = 'badge-approved';
        } else if (item.estado === 'RECHAZADO') {
            statusClass = 'badge-rejected';
        } else if (item.estado === 'DESISTIDO') {
            statusClass = 'badge-pending';
        }
        
        return `
            <tr>
                <td>${item.numeroSolicitud || 'N/A'}</td>
                <td>${item.analista || 'Sin asignar'}</td>
                <td><span class="status-badge ${statusClass}">${item.estado || 'Sin estado'}</span></td>
                <td>${item.fechaCreacion ? luxon.DateTime.fromJSDate(item.fechaCreacion).toFormat('dd/MM/yyyy HH:mm') : 'N/A'}</td>
                <td>${item.fechaPrimerAnalisis ? luxon.DateTime.fromJSDate(item.fechaPrimerAnalisis).toFormat('dd/MM/yyyy HH:mm') : 'N/A'}</td>
                <td>${item.fechaPrimeraAprobacion ? luxon.DateTime.fromJSDate(item.fechaPrimeraAprobacion).toFormat('dd/MM/yyyy HH:mm') : 'N/A'}</td>
                <td>${processingTime || 'N/A'}</td>
            </tr>
        `;
    }).join('');
}

function changePage(page) {
    currentPage = page;
    updateRequestsTable();
    window.scrollTo({ top: document.getElementById('requestsTable').offsetTop, behavior: 'smooth' });
}