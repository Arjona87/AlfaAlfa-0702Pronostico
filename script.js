// ===== DATASET GAMMA COMPLETO =====

// ===== CREDENCIALES DE AUTENTICACIÓN =====
const VALID_CREDENTIALS = {
    'Usuario 007': 'Swordfish123',
    'Alejandro': 'Arjona'
};

// ===== CONFIGURACIÓN DE COLORES POR AÑO =====
const YEAR_COLORS = {
    2018: '#2C3E50', // Negro/gris oscuro
    2019: '#27AE60', // Verde
    2020: '#3498DB', // Azul
    2021: '#F1C40F', // Amarillo
    2022: '#E67E22', // Naranja
    2023: '#9B59B6', // Morado
    2024: '#95A5A6', // Gris
    2025: '#E74C3C', // Rojo
    '2025p': '#000000' // Negro para estrellas 2025p
};

// ===== VARIABLES GLOBALES =====
let map;
let allData = [];
let filteredData = [];
let markersLayer;
let starsLayer2025p; // Nueva capa para estrellas 2025p
let heatmapConcentracion;
let heatmapVictimas;
let municipalBordersLayer;
let municipioChart;
let anualChart;
let fosasChart;
let fosasAnualChart;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    
    // Cargar datos
    allData = EXCEL_DATA;
    filteredData = [...allData];
    
    console.log('Dataset GAMMA cargado:', allData.length, 'registros');
    console.log('Total víctimas:', allData.reduce((sum, item) => sum + item.victimas, 0));
});

// ===== AUTENTICACIÓN =====
function initializeAuth() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (VALID_CREDENTIALS[username] === password) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('currentUser').textContent = username;
        
        // Inicializar aplicación
        initializeApp();
        
        console.log('Login exitoso para:', username);
    } else {
        alert('Credenciales incorrectas. Use: Usuario 007 / Swordfish123');
    }
}

function handleLogout() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// ===== INICIALIZACIÓN DE LA APLICACIÓN =====
function initializeApp() {
    initializeMap();
    populateFilters();
    setupEventListeners();
    updateDashboard(allData);
    updateCharts(allData);
}

// ===== MAPA =====
function initializeMap() {
    // Crear mapa centrado en Jalisco
    map = L.map('map').setView([20.6597, -103.3496], 8);
    
    // Definir capas base
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });
    
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, Maxar, Earthstar Geographics'
    });
    
    const terrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, HERE, Garmin, Intermap, increment P Corp.'
    });
    
    // Agregar capa base predeterminada (Relieve)
    terrainLayer.addTo(map);
    
    // Crear control de capas base
    const baseLayers = {
        "OSM": osmLayer,
        "Satelital": satelliteLayer,
        "Relieve": terrainLayer
    };
    
    L.control.layers(baseLayers, null, { collapsed: false, position: 'topright' }).addTo(map);
    
    // Inicializar capas
    markersLayer = L.layerGroup().addTo(map);
    starsLayer2025p = L.layerGroup().addTo(map); // Nueva capa para estrellas 2025p
    
    // Agregar controles
    addHeatmapControl();
    
    // Agregar control de escala dinámico
    addScaleControl();
    
    // Cargar marcadores iniciales
    updateMapMarkers(allData);
    
    // Cargar bordes municipales
    loadMunicipalBorders();
}

function updateMapMarkers(data) {
    markersLayer.clearLayers();
    starsLayer2025p.clearLayers();
    
    // Obtener años seleccionados y estado de 2025p
    const selectedYears = getSelectedYears();
    const show2025p = getShow2025p();
    
    data.forEach(item => {
        // Manejar registros 2025p por separado
        if (item.año === '2025p') {
            if (show2025p) {
                createStar2025p(item);
            }
            return;
        }
        
        // Solo mostrar marcadores de años seleccionados (excluyendo 2025p)
        if (!selectedYears.includes(item.año.toString())) {
            return;
        }
        
        const color = YEAR_COLORS[item.año] || '#ff0000';
        
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        
        const marker = L.marker([item.latitud, item.longitud], {
            icon: customIcon
        });
        
        // Verificar si existe enlace válido
        const hasValidLink = item.link && 
                           item.link !== '' && 
                           item.link !== 'undefined' && 
                           item.link !== 'null' &&
                           item.link.startsWith('http');
        
        // Pop-up con las 9 columnas completas según especificación del Bloque 2
        const popupContent = `
            <div class="popup-content-complete" style="line-height: 1.2; font-size: 13px;">
                <h4 style="margin: 0 0 8px 0; color: #2c3e50;">📍 ${item.municipio}</h4>
                <div style="margin-bottom: 4px;"><strong>📋 Referencia:</strong> ${item.referencia}</div>
                <div style="margin-bottom: 4px;"><strong>🏘️ Colonia:</strong> ${item.colonia}</div>
                <div style="margin-bottom: 4px;"><strong>👥 Víctimas:</strong> ${item.victimas}</div>
                <div style="margin-bottom: 4px;"><strong>📅 Año:</strong> ${item.año}</div>
                <div style="margin-bottom: 4px;"><strong>🗓️ Mes:</strong> ${item.mes}</div>
                <div style="margin-bottom: 4px;"><strong>🚨 Delito:</strong> ${item.delito}</div>
                <div style="margin-bottom: 4px;"><strong>📍 Latitud:</strong> ${item.latitud.toFixed(6)}</div>
                <div style="margin-bottom: 4px;"><strong>📍 Longitud:</strong> ${item.longitud.toFixed(6)}</div>
                ${hasValidLink ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee;"><strong>🔗 Link:</strong> <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #3498db; text-decoration: underline;">Ver más información</a></div>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        markersLayer.addLayer(marker);
    });
}

// ===== FUNCIÓN PARA CREAR ESTRELLAS 2025P =====
function createStar2025p(item) {
    // Crear icono de estrella negra de 12px
    const starIcon = L.divIcon({
        className: 'star-marker-2025p',
        html: `<div style="color: #000000; font-size: 12px; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">★</div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
    
    const marker = L.marker([item.latitud, item.longitud], {
        icon: starIcon
    });
    
    // Verificar si existe enlace válido
    const hasValidLink = item.link && 
                       item.link !== '' && 
                       item.link !== 'undefined' && 
                       item.link !== 'null' &&
                       item.link.startsWith('http');
    
    // Pop-up especial para 2025p con indicador visual
    const popupContent = `
        <div class="popup-content-complete" style="line-height: 1.2; font-size: 13px;">
            <h4 style="margin: 0 0 8px 0; color: #000000;">⭐ ${item.municipio} (2025p)</h4>
            <div style="margin-bottom: 4px;"><strong>📋 Referencia:</strong> ${item.referencia}</div>
            <div style="margin-bottom: 4px;"><strong>🏘️ Colonia:</strong> ${item.colonia}</div>
            <div style="margin-bottom: 4px;"><strong>👥 Víctimas:</strong> ${item.victimas}</div>
            <div style="margin-bottom: 4px;"><strong>📅 Año:</strong> ${item.año}</div>
            <div style="margin-bottom: 4px;"><strong>🗓️ Mes:</strong> ${item.mes}</div>
            <div style="margin-bottom: 4px;"><strong>🚨 Delito:</strong> ${item.delito}</div>
            <div style="margin-bottom: 4px;"><strong>📍 Latitud:</strong> ${item.latitud.toFixed(6)}</div>
            <div style="margin-bottom: 4px;"><strong>📍 Longitud:</strong> ${item.longitud.toFixed(6)}</div>
            ${hasValidLink ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee;"><strong>🔗 Link:</strong> <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #3498db; text-decoration: underline;">Ver más información</a></div>` : ''}
        </div>
    `;
    
    marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
    });
    starsLayer2025p.addLayer(marker);
}

// ===== CONTROLES DEL MAPA =====
function addHeatmapControl() {
    const heatmapControl = L.control({position: 'topright'});
    
    heatmapControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-control-heatmap');
        
        div.innerHTML = `
            <h4>Mapa de Calor</h4>
            <div class="heatmap-container">
                <div class="checkbox-container">
                    <div class="checkbox-item">
                        <input type="checkbox" id="heatmapConcentracion">
                        <label for="heatmapConcentracion">Concentración<br>de Puntos</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="heatmapVictimas">
                        <label for="heatmapVictimas">Intensidad por<br>Víctimas</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="municipalBorders" checked>
                        <label for="municipalBorders">Bordes de<br>Municipios</label>
                    </div>
                </div>
            </div>
        `;
        
        return div;
    };
    
    heatmapControl.addTo(map);
    
    // Event listeners para checkboxes
    setTimeout(() => {
        document.getElementById('heatmapConcentracion').addEventListener('change', toggleHeatmapConcentracion);
        document.getElementById('heatmapVictimas').addEventListener('change', toggleHeatmapVictimas);
        document.getElementById('municipalBorders').addEventListener('change', toggleMunicipalBorders);
    }, 100);
}

function addScaleControl() {
    // Crear control de escala dinámico
    const scaleControl = L.control.scale({
        position: 'bottomleft',    // Posición inferior izquierda
        maxWidth: 200,             // Ancho máximo del control
        metric: true,              // Mostrar unidades métricas (m/km)
        imperial: false,           // No mostrar unidades imperiales
        updateWhenIdle: false      // Actualizar durante el movimiento del mapa
    });
    
    // Agregar el control al mapa
    scaleControl.addTo(map);
    
    console.log('✅ Control de escala dinámico agregado en posición inferior izquierda');
}

// ===== MAPAS DE CALOR =====
function toggleHeatmapConcentracion() {
    const checkbox = document.getElementById('heatmapConcentracion');
    
    if (checkbox.checked) {
        if (heatmapConcentracion) {
            map.removeLayer(heatmapConcentracion);
        }
        
        const heatData = filteredData.map(item => [item.latitud, item.longitud, 1]);
        
        heatmapConcentracion = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
        }).addTo(map);
        
        console.log('Mapa de calor de concentración activado');
    } else {
        if (heatmapConcentracion) {
            map.removeLayer(heatmapConcentracion);
            heatmapConcentracion = null;
        }
        
        console.log('Mapa de calor de concentración desactivado');
    }
}


////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////



function toggleHeatmapVictimas() {
    const checkbox = document.getElementById('heatmapVictimas');
    
    if (checkbox.checked) {
        if (heatmapVictimas) {
            map.removeLayer(heatmapVictimas);
        }
        
        // Crear datos del mapa de calor usando valores reales de víctimas del nuevo dataset
        const heatData = filteredData.map(item => {
            const victimas = parseFloat(item.victimas) || 1;
            console.log(`Punto: ${item.municipio}, Colonia: ${item.colonia}, Víctimas: ${victimas}, Coords: [${item.latitud}, ${item.longitud}]`);
            return [parseFloat(item.latitud), parseFloat(item.longitud), victimas];
        });
        
        // Calcular el máximo de víctimas para normalización correcta con el nuevo dataset
        const maxVictimas = Math.max(...filteredData.map(item => parseFloat(item.victimas) || 1));
        console.log('✅ Máximo de víctimas encontrado en nuevo dataset:', maxVictimas);
        console.log('📊 Total de puntos en mapa de calor:', heatData.length);

        heatmapVictimas = L.heatLayer(heatData, {
            radius: 35,           // Radio optimizado para nueva densidad
            blur: 8,              // Blur ajustado para mejor visualización
            maxZoom: 12,          // Zoom máximo ajustado
            max: maxVictimas,     // Usar el máximo real del dataset
            gradient: {
                0.0001: 'rgba(0, 0, 255, 0.1)',      // Azul muy transparente (pocas víctimas)
                0.1: 'rgba(0, 255, 255, 0.4)',       // Cian (víctimas bajas)
                0.3: 'rgba(0, 255, 0, 0.6)',         // Verde (víctimas medias)
                0.5: 'rgba(255, 255, 0, 0.8)',       // Amarillo (víctimas altas)
                0.7: 'rgba(255, 165, 0, 0.9)',       // Naranja (víctimas muy altas)
                1.0: 'rgba(255, 0, 0, 1.0)'          // Rojo intenso (máximas víctimas)
            }
        }).addTo(map);

        console.log('🔥 Mapa de calor DELTA V1.2 - Actualizado con nuevo dataset');
        console.log('📈 Configuración: Radio=35, Blur=8, Max=' + maxVictimas);
        console.log('🎯 Dataset: 205 registros, 1944 víctimas totales');
        
    } else {
        if (heatmapVictimas) {
            map.removeLayer(heatmapVictimas);
            heatmapVictimas = null;
            console.log('❌ Mapa de calor de víctimas desactivado');
        }
    }
}

// ===== BORDES MUNICIPALES =====
function loadMunicipalBorders() {
    // Cargar bordes municipales exactos del AMG desde archivo Shapefile procesado
    fetch('./amg_borders_real.geojson')
        .then(response => response.json())
        .then(municipalBorders => {
            municipalBordersLayer = L.geoJSON(municipalBorders, {
                style: {
                    color: '#2C3E50',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0,
                    dashArray: '5,5'
                }
            }).addTo(map);
            
            console.log('✅ Bordes municipales exactos del AMG cargados desde Shapefile');
            console.log('📍 Municipios incluidos:', municipalBorders.features.map(f => f.properties.name).join(', '));
        })
        .catch(error => {
            console.error('❌ Error cargando bordes municipales:', error);
            // Fallback: usar bordes simplificados si no se puede cargar el archivo
            loadFallbackBorders();
        });
}

function loadFallbackBorders() {
    // Bordes simplificados como respaldo
    const fallbackBorders = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Guadalajara"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.4200, 20.6200], [-103.3800, 20.6200], [-103.3800, 20.7200], 
                        [-103.4200, 20.7200], [-103.4200, 20.6200]
                    ]]
                }
            },
            {
                "type": "Feature", 
                "properties": {"name": "Zapopan"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.4600, 20.6800], [-103.3400, 20.6800], [-103.3400, 20.7600],
                        [-103.4600, 20.7600], [-103.4600, 20.6800]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Tlajomulco de Zúñiga"},
                "geometry": {
                    "type": "Polygon", 
                    "coordinates": [[
                        [-103.5200, 20.4200], [-103.4400, 20.4200], [-103.4400, 20.5200],
                        [-103.5200, 20.5200], [-103.5200, 20.4200]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Tonalá"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.2800, 20.6000], [-103.2200, 20.6000], [-103.2200, 20.6600],
                        [-103.2800, 20.6600], [-103.2800, 20.6000]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "El Salto"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.2400, 20.5000], [-103.1800, 20.5000], [-103.1800, 20.5600],
                        [-103.2400, 20.5600], [-103.2400, 20.5000]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "San Pedro Tlaquepaque"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.3400, 20.6000], [-103.2800, 20.6000], [-103.2800, 20.6400],
                        [-103.3400, 20.6400], [-103.3400, 20.6000]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Zapotlanejo"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.1800, 20.6600], [-103.1200, 20.6600], [-103.1200, 20.7000],
                        [-103.1800, 20.7000], [-103.1800, 20.6600]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Juanacatlán"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.2000, 20.5400], [-103.1600, 20.5400], [-103.1600, 20.5600],
                        [-103.2000, 20.5600], [-103.2000, 20.5400]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Ixtlahuacán de los Membrillos"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-103.3600, 20.5000], [-103.3000, 20.5000], [-103.3000, 20.5400],
                        [-103.3600, 20.5400], [-103.3600, 20.5000]
                    ]]
                }
            }
        ]
    };
    
    municipalBordersLayer = L.geoJSON(fallbackBorders, {
        style: {
            color: '#2C3E50',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0,
            dashArray: '5,5'
        }
    }).addTo(map);
    
    console.log('⚠️ Usando bordes municipales simplificados (fallback)');
}

function toggleMunicipalBorders() {
    const checkbox = document.getElementById('municipalBorders');
    
    if (checkbox.checked) {
        if (municipalBordersLayer) {
            municipalBordersLayer.addTo(map);
            console.log('✅ Bordes municipales activados');
        }
    } else {
        if (municipalBordersLayer) {
            map.removeLayer(municipalBordersLayer);
            console.log('❌ Bordes municipales desactivados');
        }
    }
}

// ===== FILTROS =====
function populateFilters() {
    populateMunicipioFilter();
    populateDelitoFilter();
    setupTimelineControls();
}

function populateMunicipioFilter() {
    const municipioFilter = document.getElementById('municipioFilter');
    const municipios = [...new Set(allData.map(item => item.municipio))].sort();
    
    municipioFilter.innerHTML = '<option value="">Todos los municipios</option>';
    municipios.forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio;
        option.textContent = municipio;
        municipioFilter.appendChild(option);
    });
}

function populateDelitoFilter() {
    const delitoFilter = document.getElementById('delitoFilter');
    const delitos = [...new Set(allData.map(item => item.delito))].sort();
    
    delitoFilter.innerHTML = '<option value="">Todos los delitos</option>';
    delitos.forEach(delito => {
        const option = document.createElement('option');
        option.value = delito;
        option.textContent = delito;
        delitoFilter.appendChild(option);
    });
}

function setupTimelineControls() {
    const startYear = document.getElementById('startYear');
    const endYear = document.getElementById('endYear');
    const startYearValue = document.getElementById('startYearValue');
    const endYearValue = document.getElementById('endYearValue');
    
    startYear.addEventListener('input', function() {
        startYearValue.textContent = this.value;
    });
    
    endYear.addEventListener('input', function() {
        endYearValue.textContent = this.value;
    });
}

function setupEventListeners() {
    document.getElementById('applyFilters').addEventListener('click', applyAllFilters);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    document.getElementById('exportResults').addEventListener('click', exportFilteredData);
    
    // Event listeners para la simbología por año
    setupYearSymbologyListeners();
}

// ===== FUNCIONES DE SIMBOLOGÍA POR AÑO =====
function setupYearSymbologyListeners() {
    const yearCheckboxes = document.querySelectorAll('.year-checkbox input[type="checkbox"]');
    
    yearCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Actualizar marcadores cuando cambie la selección
            updateMapMarkers(filteredData.length > 0 ? filteredData : allData);
        });
    });
    
    // Event listener específico para checkbox 2025p
    const checkbox2025p = document.getElementById('show2025p');
    if (checkbox2025p) {
        checkbox2025p.addEventListener('change', function() {
            // Actualizar marcadores cuando cambie la selección de 2025p
            updateMapMarkers(filteredData.length > 0 ? filteredData : allData);
        });
    }
}

function getSelectedYears() {
    const yearCheckboxes = document.querySelectorAll('.year-checkbox input[type="checkbox"]:checked');
    return Array.from(yearCheckboxes).map(checkbox => checkbox.value);
}

function getShow2025p() {
    const checkbox2025p = document.getElementById('show2025p');
    return checkbox2025p ? checkbox2025p.checked : false;
}

function applyAllFilters() {
    const municipioFilter = document.getElementById('municipioFilter').value;
    const delitoFilter = document.getElementById('delitoFilter').value;
    const startYear = parseInt(document.getElementById('startYear').value);
    const endYear = parseInt(document.getElementById('endYear').value);
    const startMonth = parseInt(document.getElementById('startMonth').value);
    const endMonth = parseInt(document.getElementById('endMonth').value);
    
    // Mapeo de números de mes a nombres de mes
    const monthNames = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    
    // Crear fechas de inicio y fin para comparación
    const startDate = startYear * 12 + startMonth; // Convertir a "meses absolutos"
    const endDate = endYear * 12 + endMonth;
    
    filteredData = allData.filter(item => {
        const municipioMatch = !municipioFilter || item.municipio === municipioFilter;
        const delitoMatch = !delitoFilter || item.delito === delitoFilter;
        
        // Obtener el mes del item
        const itemMonth = item.mes ? item.mes.toUpperCase() : '';
        let itemMonthIndex = monthNames.indexOf(itemMonth);
        
        // Si no encuentra el mes en el mapeo, usar mes 0 (enero) como default
        if (itemMonthIndex === -1) {
            itemMonthIndex = 0;
        }
        
        // Convertir fecha del item a "meses absolutos"
        const itemDate = item.año * 12 + itemMonthIndex;
        
        // Filtro de fecha combinado (año-mes)
        let dateMatch = true;
        if (startMonth !== 0 || endMonth !== 0) {
            // Si se especifican meses, usar filtrado por fecha completa
            dateMatch = itemDate >= startDate && itemDate <= endDate;
        } else {
            // Si no se especifican meses, usar solo filtrado por año
            dateMatch = item.año >= startYear && item.año <= endYear;
        }
        
        return municipioMatch && delitoMatch && dateMatch;
    });
    
    updateDashboard(filteredData);
    updateCharts(filteredData);
    updateMapMarkers(filteredData);
    
    // Actualizar mapas de calor si están activos
    if (document.getElementById('heatmapConcentracion').checked) {
        toggleHeatmapConcentracion();
        document.getElementById('heatmapConcentracion').checked = true;
        toggleHeatmapConcentracion();
    }
    
    if (document.getElementById('heatmapVictimas').checked) {
        toggleHeatmapVictimas();
        document.getElementById('heatmapVictimas').checked = true;
        toggleHeatmapVictimas();
    }
    
    console.log('Filtros aplicados. Registros filtrados:', filteredData.length);
}

function clearAllFilters() {
    document.getElementById('municipioFilter').value = '';
    document.getElementById('delitoFilter').value = '';
    document.getElementById('startYear').value = '2018';
    document.getElementById('endYear').value = '2025';
    document.getElementById('startMonth').value = '0';
    document.getElementById('endMonth').value = '0';
    document.getElementById('startYearValue').textContent = '2018';
    document.getElementById('endYearValue').textContent = '2025';
    
    filteredData = [...allData];
    updateDashboard(filteredData);
    updateCharts(filteredData);
    updateMapMarkers(filteredData);
    
    console.log('Filtros limpiados. Mostrando todos los datos:', filteredData.length);
}

// ===== DASHBOARD =====
function updateDashboard(data) {
    const totalRegistros = data.length;
    const totalVictimas = data.reduce((sum, item) => sum + item.victimas, 0);
    
    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalVictimas').textContent = totalVictimas;
}

// ===== GRÁFICAS =====
function updateCharts(data) {
    updateMunicipioChart(data);
    updateAnualChart(data);
    updateFosasChart(data);
    updateFosasAnualChart(data);
}

function updateMunicipioChart(data) {
    const municipioData = {};
    data.forEach(item => {
        municipioData[item.municipio] = (municipioData[item.municipio] || 0) + item.victimas;
    });
    
    const sortedData = Object.entries(municipioData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const ctx = document.getElementById('municipioChart').getContext('2d');
    
    if (municipioChart) {
        municipioChart.destroy();
    }
    
    municipioChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([municipio]) => municipio),
            datasets: createStackedDatasets(sortedData, data)
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 8,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Víctimas'
                    }
                }
            }
        }
    });
}

function createStackedDatasets(sortedData, data) {
    const municipios = sortedData.map(([municipio]) => municipio);
    const years = Object.keys(YEAR_COLORS).sort();
    
    return years.map(year => {
        const yearInt = parseInt(year);
        const chartData = municipios.map(municipio => {
            const municipioData = data.filter(item => 
                item.municipio === municipio && item.año === yearInt
            );
            return municipioData.reduce((sum, item) => sum + item.victimas, 0);
        });
        
        return {
            label: year,
            data: chartData,
            backgroundColor: YEAR_COLORS[year],
            borderColor: YEAR_COLORS[year],
            borderWidth: 1
        };
    });
}

function updateAnualChart(data) {
    const anualData = {};
    data.forEach(item => {
        anualData[item.año] = (anualData[item.año] || 0) + item.victimas;
    });
    
    const sortedData = Object.entries(anualData).sort(([a], [b]) => a - b);
    
    const ctx = document.getElementById('anualChart').getContext('2d');
    
    if (anualChart) {
        anualChart.destroy();
    }
    
    anualChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedData.map(([año]) => año),
            datasets: [{
                label: 'Víctimas por Año',
                data: sortedData.map(([, victimas]) => victimas),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Víctimas'
                    }
                }
            }
        }
    });
}

// ===== NUEVOS GRÁFICOS DE FOSAS CLANDESTINAS =====

function updateFosasChart(data) {
    // Gráfico 1: Fosas clandestinas por municipio (Stacked Bar Chart)
    
    // Agrupar datos por municipio y año
    const fosasData = {};
    data.forEach(item => {
        if (!fosasData[item.municipio]) {
            fosasData[item.municipio] = {};
        }
        fosasData[item.municipio][item.año] = (fosasData[item.municipio][item.año] || 0) + 1;
    });
    
    // Calcular totales por municipio y ordenar descendente
    const municipioTotals = {};
    Object.keys(fosasData).forEach(municipio => {
        municipioTotals[municipio] = Object.values(fosasData[municipio]).reduce((sum, count) => sum + count, 0);
    });
    
    const municipiosOrdenados = Object.keys(municipioTotals)
        .sort((a, b) => municipioTotals[b] - municipioTotals[a])
        .slice(0, 8); // Mostrar top 8 municipios
    
    // Obtener todos los años únicos y ordenarlos
    const años = [...new Set(data.map(item => item.año))].sort();
    
    // Crear datasets para cada año (cada año será un segmento apilado)
    const coloresAños = {
        2018: '#2C3E50', // Negro/gris oscuro
        2019: '#27AE60', // Verde
        2020: '#3498DB', // Azul
        2021: '#F1C40F', // Amarillo
        2022: '#E67E22', // Naranja
        2023: '#9B59B6', // Morado
        2024: '#95A5A6', // Gris
        2025: '#E74C3C'  // Rojo
    };
    
    const datasets = años.map(año => {
        return {
            label: año.toString(),
            data: municipiosOrdenados.map(municipio => {
                return fosasData[municipio] && fosasData[municipio][año] ? fosasData[municipio][año] : 0;
            }),
            backgroundColor: coloresAños[año] || '#BDC3C7',
            borderColor: coloresAños[año] || '#BDC3C7',
            borderWidth: 1
        };
    });
    
    const ctx = document.getElementById('fosasChart').getContext('2d');
    
    if (fosasChart) {
        fosasChart.destroy();
    }
    
    fosasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: municipiosOrdenados,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 8,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Fosas'
                    }
                }
            }
        }
    });
}

function updateFosasAnualChart(data) {
    // Gráfico 2: Evolución Anual de Fosas Clandestinas (Total)
    const fosasAnualData = {};
    
    data.forEach(item => {
        fosasAnualData[item.año] = (fosasAnualData[item.año] || 0) + 1; // Contar registros por año
    });
    
    const sortedData = Object.entries(fosasAnualData).sort(([a], [b]) => a - b);
    
    const ctx = document.getElementById('fosasAnualChart').getContext('2d');
    
    if (fosasAnualChart) {
        fosasAnualChart.destroy();
    }
    
    fosasAnualChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedData.map(([año]) => año),
            datasets: [{
                label: 'Fosas Clandestinas por Año',
                data: sortedData.map(([, fosas]) => fosas),
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#FF6B6B',
                pointBorderColor: '#FF6B6B',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Fosas'
                    }
                }
            }
        }
    });
}

// ===== EXPORTACIÓN =====
function exportFilteredData() {
    try {
        const dataToExport = filteredData.length > 0 ? filteredData : allData;
        
        if (dataToExport.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        console.log(`📊 Exportando ${dataToExport.length} registros...`);
        
        // Crear contenido CSV simple y efectivo
        const csvRows = [];
        
        // Encabezados
        csvRows.push('Referencia,Municipio,Colonia,Victimas,Año,Mes,Delito,Latitud,Longitud,Link');
        
        // Datos - formateo simple pero efectivo
        dataToExport.forEach(item => {
            const link = item.link && item.link !== '' && item.link !== 'undefined' ? item.link : '';
            const row = [
                item.referencia || '',
                `"${(item.municipio || '').replace(/"/g, '""')}"`,
                `"${(item.colonia || '').replace(/"/g, '""')}"`,
                item.victimas || 0,
                item.año || '',
                `"${(item.mes || '').replace(/"/g, '""')}"`,
                `"${(item.delito || '').replace(/"/g, '""')}"`,
                item.latitud || '',
                item.longitud || '',
                `"${link.replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        // Crear archivo CSV con codificación UTF-8
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Nombre del archivo con timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
        link.setAttribute('download', `fosas_clandestinas_${timestamp}.csv`);
        
        // Descargar archivo
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ Exportación completada: ${dataToExport.length} registros en formato CSV`);
        
    } catch (error) {
        console.error('❌ Error al exportar datos:', error);
        alert('Error al exportar los datos. Por favor, inténtelo de nuevo.');
    }
}
const EXCEL_DATA = [
  {
    "referencia": 81,
    "municipio": "Chapala",
    "colonia": "Santa Cruz de la Soledad",
    "victimas": 2,
    "año": 2021,
    "mes": "AGOSTO",
    "latitud": 20.31677143,
    "longitud": -103.1587718,
    "link": "https://www.lavozdelaribera.mx/localizan-fosa-clandestina-en-chapala/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 77,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Los Cántaros",
    "victimas": 2,
    "año": 2021,
    "mes": "JULIO",
    "latitud": 20.5066333,
    "longitud": -103.3361698,
    "link": "https://jalisco.quadratin.com.mx/sucesos/tlajomulco-el-municipio-con-mas-fosas-clandestinas-en-el-2021/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 78,
    "municipio": "Zapopan",
    "colonia": "Jardines de Santa Ana",
    "victimas": 36,
    "año": 2021,
    "mes": "JULIO",
    "latitud": 20.62026003,
    "longitud": -103.4642002,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Suman-24-bolsas-con-restos-humanos-extraidas-de-fosa-en-Santa-Ana-Tepetitlan-20231002-0128.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 10,
    "municipio": "Zapopan",
    "colonia": "El Colli Urbano",
    "victimas": 17,
    "año": 2019,
    "mes": "ABRIL",
    "latitud": 20.64325079,
    "longitud": -103.4294827,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 11,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Santa Cruz del Valle",
    "victimas": 2,
    "año": 2019,
    "mes": "ABRIL",
    "latitud": 20.54323898,
    "longitud": -103.3392751,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 43,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "La Calerilla",
    "victimas": 7,
    "año": 2020,
    "mes": "ABRIL",
    "latitud": 20.56563629,
    "longitud": -103.400078,
    "link": "https://www.informador.mx/jalisco/En-lo-que-va-del-ano-la-Fiscalia-halla-17-fosas-arresta-solo-a-uno-20200520-0021.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 44,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Santa Cruz del Valle",
    "victimas": 30,
    "año": 2020,
    "mes": "ABRIL",
    "latitud": 20.54696371,
    "longitud": -103.3353772,
    "link": "https://www.cascadanoticias.com/noticias/jalisco-noticias/jalisco/desde-hace-un-ano-estaban-restos-de-karey-franco-en-ijcf",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 45,
    "municipio": "Zapopan",
    "colonia": "Nextipac",
    "victimas": 2,
    "año": 2020,
    "mes": "ABRIL",
    "latitud": 20.76478292,
    "longitud": -103.5338127,
    "link": "https://www.proceso.com.mx/nacional/estados/2020/6/20/recuperan-75-bolsas-con-restos-humanos-de-fosas-clandestinas-en-jalisco-244878.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 74,
    "municipio": "Chapala",
    "colonia": "Chapala",
    "victimas": 4,
    "año": 2021,
    "mes": "ABRIL",
    "latitud": 20.2948348,
    "longitud": -103.1902973,
    "link": "https://www.lavozdelaribera.mx/localizan-fosa-clandestina-en-chapala/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 75,
    "municipio": "Tonalá",
    "colonia": "Alamedas de Zalatitan",
    "victimas": 31,
    "año": 2021,
    "mes": "ABRIL",
    "latitud": 20.66149647,
    "longitud": -103.2540512,
    "link": "https://oem.com.mx/elsoldemexico/mexico/localizan-13-bolsas-con-restos-humanos-en-fosa-de-tonala-15405770",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 102,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 8,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.49491904,
    "longitud": -103.3637725,
    "link": "https://www.debate.com.mx/guadalajara/Localizan-20-bolsas-con-posibles-restos-humanos-en-Jalisco-durante-segunda-jornada-de-busqueda-20220401-0424.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 103,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Felipe Angeles",
    "victimas": 14,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.59820579,
    "longitud": -103.3267667,
    "link": "https://www.tiktok.com/@guardianocturnamx/video/7082506599532612869",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 104,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villas Terranova",
    "victimas": 2,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.49894648,
    "longitud": -103.4009749,
    "link": "https://www.facebook.com/AZTECAJALISCO/videos/%C3%BAltimomomento-localizan-un-cuerpo-en-un-predio-de-la-col-colinas-del-roble-en-tl/2323370331355184/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 105,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 2,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.50586659,
    "longitud": -103.365228,
    "link": "https://www.facebook.com/RadioUdeG/videos/695200315018891",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 106,
    "municipio": "Guadalajara",
    "colonia": "San Joaquin",
    "victimas": 2,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.67131626,
    "longitud": -103.2756974,
    "link": "https://oem.com.mx/eloccidental/policiaca/hallan-cuerpo-en-una-casa-de-la-colonia-san-joaquin-15741863",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 107,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 12,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.50578637,
    "longitud": -103.3653483,
    "link": "https://www.facebook.com/RadioUdeG/videos/695200315018891",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 108,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villas Terranova",
    "victimas": 2,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.49788442,
    "longitud": -103.4085168,
    "link": "https://www.zonadocs.mx/2022/05/15/venimos-a-buscar-lo-que-no-han-querido-encontrar-brigada-nacional-busqueda/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 109,
    "municipio": "Puerto Vallarta",
    "colonia": "Palma Real",
    "victimas": 2,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.67953043,
    "longitud": -105.1882091,
    "link": "https://vivepuertovallarta.mx/2022/04/18/confirman-localizacion-de-fosas-clandestinas-en-puerto-vallarta/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 110,
    "municipio": "El Salto",
    "colonia": "Tototlán",
    "victimas": 4,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.54484773,
    "longitud": -102.7868872,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 111,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Fracc. Real del Valle",
    "victimas": 3,
    "año": 2022,
    "mes": "ABRIL",
    "latitud": 20.54202847,
    "longitud": -103.3714596,
    "link": "https://www.milenio.com/policia/tlajomulco-localizan-bolsa-restos-humanos-casas-abandonadas",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 137,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villas de San Sebastián",
    "victimas": 2,
    "año": 2023,
    "mes": "ABRIL",
    "latitud": 20.52281066,
    "longitud": -103.4366371,
    "link": "https://oem.com.mx/eloccidental/policiaca/tlajomulco-van-104-bolsas-con-restos-humanos-extraidas-de-una-y-ya-localizaron-otra-15737603.app.json",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 154,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Hacienda Santa Fe",
    "victimas": 2,
    "año": 2024,
    "mes": "ABRIL",
    "latitud": 20.52318386,
    "longitud": -103.3732557,
    "link": "https://www.meganoticias.mx/TEPIC/noticia/localizan-restos-humanos-en-fosa-de-las-huertas/523230",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 155,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Terralta",
    "victimas": 8,
    "año": 2024,
    "mes": "ABRIL",
    "latitud": 20.60571066,
    "longitud": -103.3631502,
    "link": "https://latinus.us/mexico/2024/4/8/colectivo-halla-al-menos-cinco-cuerpos-en-una-nueva-fosa-clandestina-en-san-pedro-tlaquepaque-112063.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 194,
    "municipio": "Guadalajara",
    "colonia": "Rancho Nuevo",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.71824223,
    "longitud": -103.3298035,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/pensaron-que-era-una-fosa-clandestina-era-extremidad-un-hombre-victima-derrumbe/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 195,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Los Abedules",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.52299426,
    "longitud": -103.4497104,
    "link": "https://www.milenio.com/policia/tlajomulco-localizan-bolsas-negras-restos-humanos-predio",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 196,
    "municipio": "Tonalá",
    "colonia": "Cofradía de la Luz",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.47692127,
    "longitud": -103.5552624,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/colectivo-busqueda-localiza-dos-cuerpos-fosa-clandestina-la-cofradia-tlajomulco-zuniga/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 197,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Romita",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.58768679,
    "longitud": -103.3346392,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/colectivo-busqueda-localiza-restos-humanos-la-colonia-romita-tlaquepaque/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 198,
    "municipio": "Zapopan",
    "colonia": "Cerro de Copalita",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.81019007,
    "longitud": -103.4352286,
    "link": "https://guardianocturna.mx/2025/04/localizaron-restos-oseos-cerca-de-copalita-zapopan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 199,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Capilla del Refugio",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.43783633,
    "longitud": -103.2119874,
    "link": "https://www.youtube.com/watch?v=AoNwecKsmEo",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 200,
    "municipio": "Guadalajara",
    "colonia": "Balcones de Oblatos",
    "victimas": 3,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.68778281,
    "longitud": -103.2904398,
    "link": "https://www.aztecajalisco.com/local/localizan-restos-humanos-en-la-colonia-balcones-oblatos-guadalajara",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 201,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.49420729,
    "longitud": -103.4148866,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/localizan-posible-fosa-tlajomulco-hallaron-joven-semienterrado-ficha-busqueda/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 202,
    "municipio": "Tonalá",
    "colonia": "Emiliano Zapata",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.69049343,
    "longitud": -103.2577579,
    "link": "https://www.nmas.com.mx/guadalajara/localizan-nueva-fosa-clandestina-en-bodega-que-fungio-como-billar-en-tonala-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 203,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Capilla del Refugio",
    "victimas": 1,
    "año": 2025,
    "mes": "ABRIL",
    "latitud": 20.43725016,
    "longitud": -103.2117267,
    "link": "https://www.milenio.com/policia/hallan-cuerpo-semienterrado-en-fraccionamiento-de-ixtlahuacan",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 22,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 2,
    "año": 2019,
    "mes": "AGOSTO",
    "latitud": 20.49620257,
    "longitud": -103.3646094,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 23,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 2,
    "año": 2019,
    "mes": "AGOSTO",
    "latitud": 20.49615398,
    "longitud": -103.3645062,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 24,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 9,
    "año": 2019,
    "mes": "AGOSTO",
    "latitud": 20.49947935,
    "longitud": -103.3616198,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 25,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Mirador",
    "victimas": 1,
    "año": 2019,
    "mes": "AGOSTO",
    "latitud": 20.49469595,
    "longitud": -103.3456734,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 54,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "El Campesino",
    "victimas": 2,
    "año": 2020,
    "mes": "AGOSTO",
    "latitud": 20.60479378,
    "longitud": -103.3326317,
    "link": "https://www.milenio.com/policia/tlaquepaque-intervienen-fosa-clandestina",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 55,
    "municipio": "Tonalá",
    "colonia": "Las Torres",
    "victimas": 30,
    "año": 2020,
    "mes": "AGOSTO",
    "latitud": 20.66347544,
    "longitud": -103.2536667,
    "link": "https://democratacoahuila.com/2021/05/19/localizan-al-menos-70-bolsas-con-restos-humanos-en-fosa-clandestina-de-tonala/?noamp=mobile&amp",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 82,
    "municipio": "El Salto",
    "colonia": "San Jose del Quince",
    "victimas": 12,
    "año": 2021,
    "mes": "AGOSTO",
    "latitud": 20.54118479,
    "longitud": -103.2931677,
    "link": "https://udgtv.com/noticias/localizan-fosa-clandestina-en-el-quince-el-salto-el-instituto-jalisciense-de-ciencias-forenses-llega-cinco-horas-despues/57504",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 120,
    "municipio": "Zapopan",
    "colonia": "El Colli Urbano",
    "victimas": 5,
    "año": 2022,
    "mes": "AGOSTO",
    "latitud": 20.64317901,
    "longitud": -103.4292317,
    "link": "https://www.facebook.com/AZTECAJALISCO/photos/a.688217761189848/5683916224953285/?type=3",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 121,
    "municipio": "Zapopan",
    "colonia": "Los Cántaros",
    "victimas": 6,
    "año": 2022,
    "mes": "AGOSTO",
    "latitud": 20.49952182,
    "longitud": -103.339508,
    "link": "https://www.facebook.com/fundejoficial/photos/a.499064290428565/1667797190221930/?type=3&eid=ARCNrwR-tLCjUf5WdQNmleh-GvgqV3wDN9_vX8H2kpAKlL_ppQ2aAWSzQ7r2Zop4fSK7f7hanKFvkEko&locale=ms_MY&_rdr",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 143,
    "municipio": "Zapopan",
    "colonia": "Lomas del Refugio",
    "victimas": 7,
    "año": 2023,
    "mes": "AGOSTO",
    "latitud": 20.74751102,
    "longitud": -103.3337585,
    "link": "https://oem.com.mx/eloccidental/policiaca/fosa-de-lomas-del-refugio-en-zapopan-se-han-extraido-33-bolsas-con-restos-humanos-15728975",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 144,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "La Arbolada",
    "victimas": 4,
    "año": 2023,
    "mes": "AGOSTO",
    "latitud": 20.52165381,
    "longitud": -103.3701442,
    "link": "https://www.infobae.com/mexico/2023/08/31/horror-en-tlajomulco-un-hombre-logro-escapar-de-sus-secuestradores-y-ayudo-al-hallazgo-de-dos-cadaveres/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 2,
    "municipio": "El Salto",
    "colonia": "Las Pintitas",
    "victimas": 6,
    "año": 2018,
    "mes": "DICIEMBRE",
    "latitud": 20.55774325,
    "longitud": -103.3113839,
    "link": "https://lasillarota.com/estados/2018/6/7/suman-cuerpos-en-fosa-de-el-salto-jalisco-160628.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 37,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "El Mirador",
    "victimas": 110,
    "año": 2019,
    "mes": "DICIEMBRE",
    "latitud": 20.48472992,
    "longitud": -103.3431806,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 38,
    "municipio": "Lagos de Moreno",
    "colonia": "0",
    "victimas": 3,
    "año": 2019,
    "mes": "DICIEMBRE",
    "latitud": 21.41726475,
    "longitud": -101.8943634,
    "link": "https://oem.com.mx/elsoldemexico/mexico/descubren-otra-fosa-clandestina-en-lagos-de-moreno-jalisco-15425297",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 64,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Santa Anita",
    "victimas": 18,
    "año": 2020,
    "mes": "DICIEMBRE",
    "latitud": 20.54555827,
    "longitud": -103.4473367,
    "link": "https://oem.com.mx/eloccidental/policiaca/noticias-localizan-restos-humanos-en-un-predio-de-tlajomulco-podria-tratarse-de-una-fosa-15717503",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 65,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villas Terranova",
    "victimas": 14,
    "año": 2020,
    "mes": "DICIEMBRE",
    "latitud": 20.49567896,
    "longitud": -103.4087677,
    "link": "https://www.facebook.com/quierotvGDL/videos/ent%C3%A9rate-localizan-una-fosa-clandestina-en-la-colonia-villas-terranova-en-tlajom/307130960628478/?locale=es_LA",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 88,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Arvento",
    "victimas": 4,
    "año": 2021,
    "mes": "DICIEMBRE",
    "latitud": 20.44800641,
    "longitud": -103.3067598,
    "link": "https://heraldodemexico.com.mx/nacional/2022/11/1/colectivos-de-madres-buscadoras-senalan-zona-donde-hay-restos-humanos-453542.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 151,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Mirador",
    "victimas": 2,
    "año": 2023,
    "mes": "DICIEMBRE",
    "latitud": 20.49209984,
    "longitud": -103.3441737,
    "link": "https://guardianocturna.mx/2023/11/localizan-restos-humanos-ahora-en-tlajomulco-de-zuniga/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 172,
    "municipio": "Zapopan",
    "colonia": "Indígena de Mezquitán",
    "victimas": 24,
    "año": 2024,
    "mes": "DICIEMBRE",
    "latitud": 20.74168005,
    "longitud": -103.3333787,
    "link": "https://www.proceso.com.mx/nacional/estados/2025/1/20/localizan-24-cuerpos-en-una-fosa-clandestina-en-zapopan-preidentifican-seis-personas-344041.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 3,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "La Cofradía",
    "victimas": 1,
    "año": 2019,
    "mes": "ENERO",
    "latitud": 20.47193195,
    "longitud": -103.5586006,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 4,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Mirador",
    "victimas": 2,
    "año": 2019,
    "mes": "ENERO",
    "latitud": 20.49903462,
    "longitud": -103.3435391,
    "link": "https://www.informador.mx/jalisco/Encuentran-restos-humanos-en-Villa-Fontana-Aqua-20190117-0126.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 5,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 1,
    "año": 2019,
    "mes": "ENERO",
    "latitud": 20.47026305,
    "longitud": -103.4822871,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 6,
    "municipio": "Zapopan",
    "colonia": "Nextipac",
    "victimas": 7,
    "año": 2019,
    "mes": "ENERO",
    "latitud": 20.78355633,
    "longitud": -103.5102161,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 39,
    "municipio": "Lagos de Moreno",
    "colonia": "La Estanzuela",
    "victimas": 9,
    "año": 2020,
    "mes": "ENERO",
    "latitud": 21.51535782,
    "longitud": -101.9895125,
    "link": "https://oem.com.mx/elsoldemexico/mexico/descubren-otra-fosa-clandestina-en-lagos-de-moreno-jalisco-15425297",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 40,
    "municipio": "Zapopan",
    "colonia": "Lomas del Centinela",
    "victimas": 14,
    "año": 2020,
    "mes": "ENERO",
    "latitud": 20.76909134,
    "longitud": -103.3658339,
    "link": "https://www.milenio.com/policia/zapopan-hallan-cuerpos-fosa-vistas-centinela",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 41,
    "municipio": "Jocotepec",
    "colonia": "Jocotepec",
    "victimas": 5,
    "año": 2020,
    "mes": "ENERO",
    "latitud": 20.27475585,
    "longitud": -103.4223147,
    "link": "https://oem.com.mx/eloccidental/policiaca/se-han-localizado-563-bolsas-con-restos-humanos-en-el-estado-15745949",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 66,
    "municipio": "Guadalajara",
    "colonia": "Colinas de Huentitan",
    "victimas": 4,
    "año": 2021,
    "mes": "ENERO",
    "latitud": 20.7265789,
    "longitud": -103.3051568,
    "link": "https://oem.com.mx/eloccidental/policiaca/fosas-clandestinas-encontradas-en-donde-menos-te-imaginas-15747421",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 67,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 4,
    "año": 2021,
    "mes": "ENERO",
    "latitud": 20.4954763,
    "longitud": -103.3636608,
    "link": "https://www.proceso.com.mx/nacional/2021/1/13/hallan-17-bolsas-con-restos-humanos-una-fosa-clandestina-en-tlajomulco-256221.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 89,
    "municipio": "Tonalá",
    "colonia": "Alamedas de Zalatitan",
    "victimas": 31,
    "año": 2022,
    "mes": "ENERO",
    "latitud": 20.6600895,
    "longitud": -103.2575606,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=177417",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 130,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Teopantli CalpullI",
    "victimas": 61,
    "año": 2023,
    "mes": "ENERO",
    "latitud": 20.58170715,
    "longitud": -103.5768177,
    "link": "https://oem.com.mx/eloccidental/policiaca/tlajomulco-de-zuniga-lider-en-numero-de-fosas-clandestinas-15724370",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 131,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Teopantli CalpullI",
    "victimas": 23,
    "año": 2023,
    "mes": "ENERO",
    "latitud": 20.58222428,
    "longitud": -103.5734115,
    "link": "https://oem.com.mx/eloccidental/policiaca/tlajomulco-de-zuniga-lider-en-numero-de-fosas-clandestinas-15724370",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 173,
    "municipio": "Lagos de Moreno",
    "colonia": "Presa La Sauceda",
    "victimas": 3,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 21.36223143,
    "longitud": -101.8239489,
    "link": "https://web.ntrguadalajara.com/post.php?id_nota=226006",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 174,
    "municipio": "Zapopan",
    "colonia": "Santa Lucía",
    "victimas": 1,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.79419631,
    "longitud": -103.4984132,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=226006",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 175,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 1,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.4889367,
    "longitud": -103.4025726,
    "link": "https://www.mural.com.mx/dos-colectivos-hallan-fosas-clandestinas-en-tlajomulco/ar2939473",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 176,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Fracc. Colinas de Desarrollo",
    "victimas": 2,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.47025097,
    "longitud": -103.4237724,
    "link": "https://www.informador.mx/jalisco/Desaparecidos-en-Jalisco-Localizan-fosa-clandestina-en-un-fraccionamiento-en-Tlajomulco-20250121-0113.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 177,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Fracc. Colinas de Desarrollo",
    "victimas": 1,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.46880304,
    "longitud": -103.4248385,
    "link": "https://www.informador.mx/jalisco/Desaparecidos-en-Jalisco-Localizan-fosa-clandestina-en-un-fraccionamiento-en-Tlajomulco-20250121-0113.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 178,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Fracc. Colinas de Desarrollo",
    "victimas": 1,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.46893744,
    "longitud": -103.4234944,
    "link": "https://www.informador.mx/jalisco/Desaparecidos-en-Jalisco-Localizan-fosa-clandestina-en-un-fraccionamiento-en-Tlajomulco-20250121-0113.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 179,
    "municipio": "Zapopan",
    "colonia": "Villa de Guadalupe",
    "victimas": 1,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.75567801,
    "longitud": -103.3449026,
    "link": "https://issuu.com/ntrguadalajara.com/docs/2025-02-12",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 180,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Cerro del Cuatro",
    "victimas": 1,
    "año": 2025,
    "mes": "ENERO",
    "latitud": 20.60393983,
    "longitud": -103.3646727,
    "link": "https://www.milenio.com/policia/tlaquepaque-localizan-cuerpo-mujer-barranco-aires",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 7,
    "municipio": "El Salto",
    "colonia": "Cab. Mun. El Salto",
    "victimas": 1,
    "año": 2019,
    "mes": "FEBRERO",
    "latitud": 20.52000065,
    "longitud": -103.1749866,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 68,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Zapote del Valle",
    "victimas": 2,
    "año": 2021,
    "mes": "FEBRERO",
    "latitud": 20.50319488,
    "longitud": -103.3027129,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=162447",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 69,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Los Hornos",
    "victimas": 6,
    "año": 2021,
    "mes": "FEBRERO",
    "latitud": 20.59913854,
    "longitud": -103.2726164,
    "link": "https://suracapulco.mx/encuentran-cuatro-cuerpos-y-12-bolsas-en-fosas-de-tlaquepaque-y-tlajomulco-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 70,
    "municipio": "Zapopan",
    "colonia": "Nextipac",
    "victimas": 2,
    "año": 2021,
    "mes": "FEBRERO",
    "latitud": 20.77744814,
    "longitud": -103.505618,
    "link": "https://oem.com.mx/eloccidental/policiaca/noticias-policiaca-crimen-fiscalia-busca-cuerpos-en-fosa-de-santa-lucia-termina-trabajos-en-colinas-de-huentitan-13150275",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 71,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villa Fontana Aqua",
    "victimas": 3,
    "año": 2021,
    "mes": "FEBRERO",
    "latitud": 20.50186118,
    "longitud": -103.3482852,
    "link": "https://jaliscorojo.com/2021/02/26/hallan-cadaver-calcinado-dentro-de-una-finca-en-villa-fontana-aqua-tlajomulco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 90,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 2,
    "año": 2022,
    "mes": "FEBRERO",
    "latitud": 20.49087488,
    "longitud": -103.4176684,
    "link": "https://www.jornada.com.mx/noticia/2022/02/25/estados/buscadoras-de-desaparecidos-hallan-mas-fosas-en-tlajomulco-jalisco-7681",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 91,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 2,
    "año": 2022,
    "mes": "FEBRERO",
    "latitud": 20.49696161,
    "longitud": -103.3645605,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Estas-son-las-fosas-clandestinas-encontradas-este-ano-20220425-0079.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 92,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 6,
    "año": 2022,
    "mes": "FEBRERO",
    "latitud": 20.49675253,
    "longitud": -103.3638171,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Estas-son-las-fosas-clandestinas-encontradas-este-ano-20220425-0079.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 93,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 1,
    "año": 2022,
    "mes": "FEBRERO",
    "latitud": 20.49720555,
    "longitud": -103.3655478,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Estas-son-las-fosas-clandestinas-encontradas-este-ano-20220425-0079.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 94,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 17,
    "año": 2022,
    "mes": "FEBRERO",
    "latitud": 20.49815805,
    "longitud": -103.3639855,
    "link": "https://www.aztecajalisco.com/policiaca/chulavista-colonia-fincas-habitadas-fosas-clandestinas",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 95,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 3,
    "año": 2022,
    "mes": "FEBRERO",
    "latitud": 20.49755402,
    "longitud": -103.3647986,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Estas-son-las-fosas-clandestinas-encontradas-este-ano-20220425-0079.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 132,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 2,
    "año": 2023,
    "mes": "FEBRERO",
    "latitud": 20.49230287,
    "longitud": -103.3518717,
    "link": "https://oem.com.mx/eloccidental/policiaca/tlajomulco-suman-cuatro-fosas-clandestinas-localizadas-este-ano-15721381",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 133,
    "municipio": "Zapopan",
    "colonia": "El Centinela",
    "victimas": 6,
    "año": 2023,
    "mes": "FEBRERO",
    "latitud": 20.77898158,
    "longitud": -103.3895971,
    "link": "https://guardianocturna.mx/2023/02/colectivo-encuentra-cuerpos-en-fosa-clandestina-de-zapopan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 134,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Cuxpala",
    "victimas": 50,
    "año": 2023,
    "mes": "FEBRERO",
    "latitud": 20.56850711,
    "longitud": -103.6488632,
    "link": "https://www.meganoticias.mx/guadalajara/noticia/localizan-74-de-5-fosas-en-jalisco/404718",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 152,
    "municipio": "Zapopan",
    "colonia": "Mision de Santa Ana",
    "victimas": 4,
    "año": 2024,
    "mes": "FEBRERO",
    "latitud": 20.61501115,
    "longitud": -103.4586695,
    "link": "https://www.facebook.com/watch/?v=377917771652269",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 181,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Paseos del Valle",
    "victimas": 1,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.52506693,
    "longitud": -103.3323904,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 182,
    "municipio": "Tonalá",
    "colonia": "El Sauz",
    "victimas": 1,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.57590563,
    "longitud": -103.2527681,
    "link": "https://guardianocturna.mx/2025/02/escalofriante-hallazgo-cerca-del-cerro-del-gato/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 183,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Nueva Santa Maria",
    "victimas": 1,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.60372396,
    "longitud": -103.3804717,
    "link": "https://oem.com.mx/eloccidental/policiaca/hallan-fosa-en-la-nueva-santa-maria-21741510",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 184,
    "municipio": "Zapopan",
    "colonia": "La Venta del Astillero",
    "victimas": 1,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.72090306,
    "longitud": -103.5446935,
    "link": "https://www.aztecajalisco.com/local/madres-buscadoras-podian-encontrar-cuerpos-fosa-clandestina-venta-astillero",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 185,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Los Puestos",
    "victimas": 1,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.60301526,
    "longitud": -103.2712838,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 186,
    "municipio": "Ameca",
    "colonia": "San Antonio Matute",
    "victimas": 1,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.57083072,
    "longitud": -103.9524377,
    "link": "https://www.telediario.mx/comunidad/jalisco-reporta-5-fosas-clandestinas-febrero",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 187,
    "municipio": "Zapopan",
    "colonia": "Las Agujas",
    "victimas": 27,
    "año": 2025,
    "mes": "FEBRERO",
    "latitud": 20.79257904,
    "longitud": -103.4850898,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 20,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Los Olivos",
    "victimas": 2,
    "año": 2019,
    "mes": "JULIO",
    "latitud": 20.44552027,
    "longitud": -103.236997,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 21,
    "municipio": "Tonalá",
    "colonia": "Santa Cruz de las Huertas",
    "victimas": 20,
    "año": 2019,
    "mes": "JULIO",
    "latitud": 20.6209177,
    "longitud": -103.2652235,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 51,
    "municipio": "El Salto",
    "colonia": "El Pedregal",
    "victimas": 30,
    "año": 2020,
    "mes": "JULIO",
    "latitud": 20.50870683,
    "longitud": -103.1839402,
    "link": "https://animalpolitico.com/2020/07/hallan-cuerpos-fosa-clandestina-salto-jalisco",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 52,
    "municipio": "Lagos de Moreno",
    "colonia": "Tepeyac",
    "victimas": 3,
    "año": 2020,
    "mes": "JULIO",
    "latitud": 21.37587464,
    "longitud": -101.9218145,
    "link": "https://oem.com.mx/eloccidental/policiaca/noticias-policiaca-localizacion-restos-personas-semienterradas-lagos-de-moreno-15723865?token=1818764635",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 53,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "El Campesino",
    "victimas": 10,
    "año": 2020,
    "mes": "JULIO",
    "latitud": 20.60484033,
    "longitud": -103.3325386,
    "link": "https://www.milenio.com/policia/tlaquepaque-intervienen-fosa-clandestina",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 79,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "San José Residencial",
    "victimas": 8,
    "año": 2021,
    "mes": "JULIO",
    "latitud": 20.5460809,
    "longitud": -103.360749,
    "link": "https://www.jornada.com.mx/2021/07/09/estados/024n3est",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 80,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 8,
    "año": 2021,
    "mes": "JULIO",
    "latitud": 20.491945,
    "longitud": -103.4023688,
    "link": "https://www.proceso.com.mx/nacional/estados/2021/7/13/hallan-13-bolsas-con-restos-humanos-en-una-finca-de-tlajomulco-267711.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 116,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Las Juntas",
    "victimas": 2,
    "año": 2022,
    "mes": "JULIO",
    "latitud": 20.60520281,
    "longitud": -103.3325896,
    "link": "https://oem.com.mx/eloccidental/policiaca/colectivo-en-busca-de-nuestros-corazones-perdidos-localiza-fosa-clandestina-en-las-juntas-tlaquepaque-15730086",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 117,
    "municipio": "El Salto",
    "colonia": "La Azucena",
    "victimas": 6,
    "año": 2022,
    "mes": "JULIO",
    "latitud": 20.50394277,
    "longitud": -103.2039939,
    "link": "https://www.infobae.com/mexico/2025/03/15/los-sabinos-la-mayor-fosa-clandestina-de-jalisco-donde-rescataron-134-cuerpos/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 118,
    "municipio": "Zapopan",
    "colonia": "Indigena de Mezquitan",
    "victimas": 27,
    "año": 2022,
    "mes": "JULIO",
    "latitud": 20.74221278,
    "longitud": -103.3337083,
    "link": "https://www.facebook.com/AZTECAJALISCO/videos/en-una-fosa-clandestina-en-el-tizate-zapopan-localizaron-veintiocho-bolsas-con-r/608865587345509/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 119,
    "municipio": "Zapopan",
    "colonia": "La Higuera",
    "victimas": 27,
    "año": 2022,
    "mes": "JULIO",
    "latitud": 20.75369289,
    "longitud": -103.3245127,
    "link": "https://www.reforma.com/hallan-restos-humanos-y-matan-a-dos-en-zapopan/ar2214909",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 142,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "San Lucas Evangelista",
    "victimas": 11,
    "año": 2023,
    "mes": "JULIO",
    "latitud": 20.39370511,
    "longitud": -103.3662012,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=200562",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 160,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Los Olivos",
    "victimas": 11,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.43996414,
    "longitud": -103.2320511,
    "link": "https://oem.com.mx/eloccidental/policiaca/suman-10-cuerpos-en-fosa-de-los-olivos-13150486",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 161,
    "municipio": "Guadalajara",
    "colonia": "Del Fresno",
    "victimas": 3,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.66443539,
    "longitud": -103.3734934,
    "link": "https://www.milenio.com/politica/comunidad/terminan-trabajos-fosas-ixtlahuacan-pueblo-quieto",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 162,
    "municipio": "Zapopan",
    "colonia": "Paraisos del Colli",
    "victimas": 4,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.64665795,
    "longitud": -103.4529535,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=217850",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 163,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 3,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.49049372,
    "longitud": -103.4114343,
    "link": "https://www.telediario.mx/local/localizan-fosa-clandestina-en-tlajomulco",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 164,
    "municipio": "Zapopan",
    "colonia": "Paraisos del Colli",
    "victimas": 6,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.64569176,
    "longitud": -103.4525509,
    "link": "https://www.notisistema.com/noticias/recuperan-25-cadaveres-en-dos-fosas-clandestinas-en-zapopan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 165,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Los Olivos",
    "victimas": 2,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.43877287,
    "longitud": -103.2316529,
    "link": "https://oem.com.mx/eloccidental/policiaca/suman-3-osamentas-exhumadas-en-fosa-de-los-olivos-en-ixtlahuacan-de-los-membrillos-13157032",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 166,
    "municipio": "Zapopan",
    "colonia": "Paraisos del Colli",
    "victimas": 21,
    "año": 2024,
    "mes": "JULIO",
    "latitud": 20.64585467,
    "longitud": -103.4526976,
    "link": "https://www.notisistema.com/noticias/recuperan-25-cadaveres-en-dos-fosas-clandestinas-en-zapopan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 17,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Santa Cruz de la Loma",
    "victimas": 1,
    "año": 2019,
    "mes": "JUNIO",
    "latitud": 20.48588602,
    "longitud": -103.55094,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 18,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "El Campesino",
    "victimas": 5,
    "año": 2019,
    "mes": "JUNIO",
    "latitud": 20.60486626,
    "longitud": -103.3324437,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 19,
    "municipio": "El Salto",
    "colonia": "San Jose del Castillo",
    "victimas": 1,
    "año": 2019,
    "mes": "JUNIO",
    "latitud": 20.50919204,
    "longitud": -103.2362497,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 48,
    "municipio": "Zapopan",
    "colonia": "Lomas del Refugio",
    "victimas": 42,
    "año": 2020,
    "mes": "JUNIO",
    "latitud": 20.74724671,
    "longitud": -103.3342278,
    "link": "https://oem.com.mx/eloccidental/policiaca/noticias-fosas-clandestinas-restos-humanos-identifican-cuerpos-santa-anita-y-la-higuera-15718194?token=-48247071",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 49,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "España",
    "victimas": 46,
    "año": 2020,
    "mes": "JUNIO",
    "latitud": 20.55409272,
    "longitud": -103.4476194,
    "link": "https://www.informador.mx/jalisco/Con-86-bolsas-con-restos-concluye-busqueda-en-fosa-de-Santa-Anita-20200702-0112.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 50,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 1,
    "año": 2020,
    "mes": "JUNIO",
    "latitud": 20.49045324,
    "longitud": -103.4114541,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=150332",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 76,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Del Verde",
    "victimas": 8,
    "año": 2021,
    "mes": "JUNIO",
    "latitud": 20.56287168,
    "longitud": -103.2852573,
    "link": "https://www.proceso.com.mx/nacional/estados/2021/6/29/hallan-dos-cadaveres-bolsas-con-restos-en-fosa-ubicada-en-tlaquepaque-266822.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 114,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 4,
    "año": 2022,
    "mes": "JUNIO",
    "latitud": 20.48828256,
    "longitud": -103.4062258,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/madres-buscadoras-localizan-fosa-clandestina-tlajomulco-zuniga/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 115,
    "municipio": "Zapopan",
    "colonia": "El Centinela",
    "victimas": 2,
    "año": 2022,
    "mes": "JUNIO",
    "latitud": 20.77982546,
    "longitud": -103.3897866,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 156,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Las Huertas",
    "victimas": 5,
    "año": 2024,
    "mes": "JUNIO",
    "latitud": 20.61894543,
    "longitud": -103.3073563,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/localizan-otra-fosa-clandestina-la-colonia-las-huertas-tlaquepaque/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 157,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 7,
    "año": 2024,
    "mes": "JUNIO",
    "latitud": 20.49189713,
    "longitud": -103.3516352,
    "link": "https://ntrguadalajara.com/post.php?id_nota=216472",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 158,
    "municipio": "Zapopan",
    "colonia": "Emiliano Zapata",
    "victimas": 2,
    "año": 2024,
    "mes": "JUNIO",
    "latitud": 20.65115236,
    "longitud": -103.484177,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/vuelven-localizar-restos-humanos-lomas-la-primavera-zapopan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 159,
    "municipio": "Zapopan",
    "colonia": "Las Cañadas",
    "victimas": 3,
    "año": 2024,
    "mes": "JUNIO",
    "latitud": 20.75802561,
    "longitud": -103.3534895,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 8,
    "municipio": "Zapopan",
    "colonia": "La Venta del Astillero",
    "victimas": 3,
    "año": 2019,
    "mes": "MARZO",
    "latitud": 20.73072167,
    "longitud": -103.5400166,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 9,
    "municipio": "Villa Guerrero",
    "colonia": "Villa Guerrero",
    "victimas": 3,
    "año": 2019,
    "mes": "MARZO",
    "latitud": 21.99497299,
    "longitud": -103.5960595,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 42,
    "municipio": "Juanacatlán",
    "colonia": "El Saucillo",
    "victimas": 95,
    "año": 2020,
    "mes": "MARZO",
    "latitud": 20.4814939,
    "longitud": -103.1082383,
    "link": "https://www.meganoticias.mx/guadalajara/noticia/el-cuerpo-de-luis-martin-duro-4-anos-en-semefo/607154",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 72,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villa Fontana Aqua",
    "victimas": 2,
    "año": 2021,
    "mes": "MARZO",
    "latitud": 20.50870782,
    "longitud": -103.3465107,
    "link": "https://www.milenio.com/policia/tlajomulco-aseguran-departamentos-donde-localizaron-dos-cuerpos",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 73,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Paseos del Valle",
    "victimas": 3,
    "año": 2021,
    "mes": "MARZO",
    "latitud": 20.52204773,
    "longitud": -103.3457238,
    "link": "https://bit.ly/3lwgUWo",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 96,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 4,
    "año": 2022,
    "mes": "MARZO",
    "latitud": 20.49735655,
    "longitud": -103.3638403,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Estas-son-las-fosas-clandestinas-encontradas-este-ano-20220425-0079.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 97,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 1,
    "año": 2022,
    "mes": "MARZO",
    "latitud": 20.49784442,
    "longitud": -103.3647173,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Estas-son-las-fosas-clandestinas-encontradas-este-ano-20220425-0079.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 98,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 4,
    "año": 2022,
    "mes": "MARZO",
    "latitud": 20.49418541,
    "longitud": -103.3652981,
    "link": "https://ntrguadalajara.com/post.php?id_nota=180330",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 99,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "San Lucas Evangelista",
    "victimas": 8,
    "año": 2022,
    "mes": "MARZO",
    "latitud": 20.40797802,
    "longitud": -103.3547741,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/14-bolsas-restos-humanos-fueron-encontradas-una-fosa-clandestina/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 100,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 4,
    "año": 2022,
    "mes": "MARZO",
    "latitud": 20.49459052,
    "longitud": -103.3648596,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 101,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 6,
    "año": 2022,
    "mes": "MARZO",
    "latitud": 20.49462972,
    "longitud": -103.3640189,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 135,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Paseos del Valle",
    "victimas": 2,
    "año": 2023,
    "mes": "MARZO",
    "latitud": 20.52504851,
    "longitud": -103.3259598,
    "link": "https://www.notisistema.com/noticias/investigan-posible-nueva-fosa-clandestina-en-tlajomulco-2/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 136,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Villa Fontana Aqua",
    "victimas": 2,
    "año": 2023,
    "mes": "MARZO",
    "latitud": 20.50752497,
    "longitud": -103.3453903,
    "link": "https://www.notisistema.com/noticias/investigan-posible-nueva-fosa-clandestina-en-tlajomulco-2/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 153,
    "municipio": "El Salto",
    "colonia": "La Pedrera",
    "victimas": 13,
    "año": 2024,
    "mes": "MARZO",
    "latitud": 20.55002502,
    "longitud": -103.3115542,
    "link": "https://www.dallasnews.com/espanol/al-dia/mexico/2024/03/25/crematorio-clandestino-hornos-colonia-la-piedrera-el-salto-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 188,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Jardines de Santa Anita",
    "victimas": 4,
    "año": 2025,
    "mes": "MARZO",
    "latitud": 20.55355945,
    "longitud": -103.4829756,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Hallan-fosa-clandestina-dentro-fraccionamiento-privado-en-Santa-Anita-20250303-0183.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 189,
    "municipio": "Teuchitlán",
    "colonia": "La Estanzuela",
    "victimas": 0,
    "año": 2025,
    "mes": "MARZO",
    "latitud": 20.66940886,
    "longitud": -103.8174983,
    "link": "https://contralacorrupcion.mx/desde-2019-la-guardia-nacional-encontro-cuerpos-incinerados-en-teuchitlan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 190,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Cofradía de la Luz",
    "victimas": 2,
    "año": 2025,
    "mes": "MARZO",
    "latitud": 20.47693246,
    "longitud": -103.5552121,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/colectivo-busqueda-localiza-dos-cuerpos-fosa-clandestina-la-cofradia-tlajomulco-zuniga/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 191,
    "municipio": "El Arenal",
    "colonia": "Santa Cruz del Astillero",
    "victimas": 1,
    "año": 2025,
    "mes": "MARZO",
    "latitud": 20.7408967,
    "longitud": -103.6353485,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/colectivo-busqueda-localiza-restos-humanos-santa-cruz-astillero/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 192,
    "municipio": "Ameca",
    "colonia": "Presa Tonchincalco",
    "victimas": 0,
    "año": 2025,
    "mes": "MARZO",
    "latitud": 20.48323483,
    "longitud": -103.9448642,
    "link": "https://t.me/c/2356919651/105142",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 193,
    "municipio": "Lagos de Moreno",
    "colonia": "Hacienda San Bernardo",
    "victimas": 13,
    "año": 2025,
    "mes": "MARZO",
    "latitud": 21.34811472,
    "longitud": -101.8454546,
    "link": "https://www.youtube.com/watch?v=r1wPMC9LKGQ",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 12,
    "municipio": "Guadalajara",
    "colonia": "Quinta Velarde",
    "victimas": 8,
    "año": 2019,
    "mes": "MAYO",
    "latitud": 20.65955951,
    "longitud": -103.3320312,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 13,
    "municipio": "Zapopan",
    "colonia": "El Campanario",
    "victimas": 30,
    "año": 2019,
    "mes": "MAYO",
    "latitud": 20.59322365,
    "longitud": -103.4353633,
    "link": "https://www.zonadocs.mx/2019/06/25/metropoli-con-terror-y-en-silencio-las-fosas-dentro-de-tu-casa/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 14,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Mirador",
    "victimas": 1,
    "año": 2019,
    "mes": "MAYO",
    "latitud": 20.50085198,
    "longitud": -103.3533973,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 15,
    "municipio": "Lagos de Moreno",
    "colonia": "Ladera Grande",
    "victimas": 5,
    "año": 2019,
    "mes": "MAYO",
    "latitud": 21.36910174,
    "longitud": -101.9534095,
    "link": "https://udgtv.com/noticias/lagos-de-moreno-la-ciudad-fuera-del-area-metropolitana-con-mayor-numero-de-inhumaciones-clandestinas/59276",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 16,
    "municipio": "Pihuamo",
    "colonia": "Pihuamo",
    "victimas": 1,
    "año": 2019,
    "mes": "MAYO",
    "latitud": 19.25470906,
    "longitud": -103.3815627,
    "link": "https://www.jornada.com.mx/2019/12/30/estados/020n1est",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 46,
    "municipio": "El Salto",
    "colonia": "La Pedrera",
    "victimas": 27,
    "año": 2020,
    "mes": "MAYO",
    "latitud": 20.54558545,
    "longitud": -103.3166109,
    "link": "https://oem.com.mx/elsoldemexico/mexico/hallan-fosa-clandestina-con-25-cuerpos-en-el-salto-jalisco-13096671",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 47,
    "municipio": "Zapopan",
    "colonia": "Agrícola",
    "victimas": 5,
    "año": 2020,
    "mes": "MAYO",
    "latitud": 20.61597287,
    "longitud": -103.4321224,
    "link": "https://jalisco.quadratin.com.mx/principal/van-215-cuerpos-hallados-en-fosas-de-jalisco-en-lo-que-va-del-2020/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 112,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 4,
    "año": 2022,
    "mes": "MAYO",
    "latitud": 20.49426723,
    "longitud": -103.3625434,
    "link": "https://ntrguadalajara.com/post.php?id_nota=180330",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 113,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "SEC 12122",
    "victimas": 2,
    "año": 2022,
    "mes": "MAYO",
    "latitud": 20.46855493,
    "longitud": -103.440392,
    "link": "https://www.meganoticias.mx/XALAPA/noticia/localizan-restos-humanos-en-fosa-de-las-huertas/523230",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 138,
    "municipio": "Zapopan",
    "colonia": "Lomas del Refugio",
    "victimas": 5,
    "año": 2023,
    "mes": "MAYO",
    "latitud": 20.74307875,
    "longitud": -103.3340087,
    "link": "https://www.notisistema.com/noticias/intervienen-durante-mayo-cuatro-fosas-clandestinas-recuperan-restos-de-37-personas/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 139,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas de San Agustín",
    "victimas": 57,
    "año": 2023,
    "mes": "MAYO",
    "latitud": 20.51902141,
    "longitud": -103.4706054,
    "link": "https://oem.com.mx/eloccidental/policiaca/tlajomulco-de-zuniga-lider-en-numero-de-fosas-clandestinas-15724370",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 140,
    "municipio": "Guadalajara",
    "colonia": "Colinas de Huentitan",
    "victimas": 3,
    "año": 2023,
    "mes": "MAYO",
    "latitud": 20.7283937,
    "longitud": -103.3027877,
    "link": "https://oem.com.mx/eloccidental/policiaca/fosas-clandestinas-encontradas-en-donde-menos-te-imaginas-15747421",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 141,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Volcán Santa Cruz",
    "victimas": 8,
    "año": 2023,
    "mes": "MAYO",
    "latitud": 20.52741506,
    "longitud": -103.5062077,
    "link": "https://oem.com.mx/eloccidental/policiaca/hallan-restos-humanos-en-patio-de-casa-en-santa-fe-tlajomulco-13153101",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 204,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Las Varitas",
    "victimas": 1,
    "año": 2025,
    "mes": "MAYO",
    "latitud": 20.54564384,
    "longitud": -103.4562487,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=230607",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 205,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Santa Cruz del Valle",
    "victimas": 1,
    "año": 2025,
    "mes": "MAYO",
    "latitud": 20.55149253,
    "longitud": -103.3448057,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=230607",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 32,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "El Zapote",
    "victimas": 31,
    "año": 2019,
    "mes": "NOVIEMBRE",
    "latitud": 20.48807687,
    "longitud": -103.4462614,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 33,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "El Mirador",
    "victimas": 54,
    "año": 2019,
    "mes": "NOVIEMBRE",
    "latitud": 20.48601986,
    "longitud": -103.3426426,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 34,
    "municipio": "Lagos de Moreno",
    "colonia": "Chipinque de Arriba",
    "victimas": 16,
    "año": 2019,
    "mes": "NOVIEMBRE",
    "latitud": 21.4310348,
    "longitud": -101.9082507,
    "link": "https://udgtv.com/noticias/lagos-de-moreno-la-ciudad-fuera-del-area-metropolitana-con-mayor-numero-de-inhumaciones-clandestinas/59276",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 35,
    "municipio": "Tonalá",
    "colonia": "Zalatitan",
    "victimas": 2,
    "año": 2019,
    "mes": "NOVIEMBRE",
    "latitud": 20.6582681,
    "longitud": -103.261917,
    "link": "http://www.especialistas.com.mx/genericas/detallenotaenlace.aspx?id=360253128&idc=2621&servicio=4&costo=8772",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 36,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Buenos Aires",
    "victimas": 2,
    "año": 2019,
    "mes": "NOVIEMBRE",
    "latitud": 20.60409165,
    "longitud": -103.3664521,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 61,
    "municipio": "Chapala",
    "colonia": "Jaltepec",
    "victimas": 5,
    "año": 2020,
    "mes": "NOVIEMBRE",
    "latitud": 20.29567414,
    "longitud": -103.3530274,
    "link": "https://udgtv.com/noticias/fiscalia-exhuma-cuerpos-de-fosa-clandestina-en-jocotepec/15892",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 62,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Mirador",
    "victimas": 2,
    "año": 2020,
    "mes": "NOVIEMBRE",
    "latitud": 20.49809489,
    "longitud": -103.3521993,
    "link": "https://jalisco.quadratin.com.mx/principal/van-215-cuerpos-hallados-en-fosas-de-jalisco-en-lo-que-va-del-2020/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 63,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Emiliano Zapata",
    "victimas": 2,
    "año": 2020,
    "mes": "NOVIEMBRE",
    "latitud": 20.59466086,
    "longitud": -103.272753,
    "link": "https://www.milenio.com/policia/tlaquepaque-localizan-craneo-humano-colonia-emiliano-zapata",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 85,
    "municipio": "Ojuelos",
    "colonia": "Matancillas",
    "victimas": 2,
    "año": 2021,
    "mes": "NOVIEMBRE",
    "latitud": 21.89103361,
    "longitud": -101.6492043,
    "link": "https://www.ntrguadalajara.com/post.php?id_nota=174134",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 86,
    "municipio": "San Juan de los Lagos",
    "colonia": "La Peña del Halcón",
    "victimas": 7,
    "año": 2021,
    "mes": "NOVIEMBRE",
    "latitud": 21.26986178,
    "longitud": -102.3544288,
    "link": "https://www.infobae.com/america/mexico/2021/04/14/encontraron-10-cadaveres-en-una-fosa-clandestina-en-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 87,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "Fco I Madero I",
    "victimas": 7,
    "año": 2021,
    "mes": "NOVIEMBRE",
    "latitud": 20.60502578,
    "longitud": -103.3725624,
    "link": "https://www.milenio.com/policia/tlaquepaque-continuan-los-trabajos-en-fosa",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 129,
    "municipio": "El Salto",
    "colonia": "San Jose del Quince",
    "victimas": 14,
    "año": 2022,
    "mes": "NOVIEMBRE",
    "latitud": 20.54066918,
    "longitud": -103.2873903,
    "link": "https://planoinformativo.com/918208/alan-lleva-5-meses-en-la-morgue-y-no-se-lo-dan-a-su-madre/amp/espectaculos/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 149,
    "municipio": "Zapopan",
    "colonia": "Emiliano Zapata",
    "victimas": 27,
    "año": 2023,
    "mes": "NOVIEMBRE",
    "latitud": 20.652001,
    "longitud": -103.4831954,
    "link": "https://oem.com.mx/eloccidental/policiaca/hallan-siete-fosas-clandestinas-en-un-predio-cercano-al-bosque-de-la-primavera-en-zapopan-15747360",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 150,
    "municipio": "Guadalajara",
    "colonia": "Las Conchas",
    "victimas": 3,
    "año": 2023,
    "mes": "NOVIEMBRE",
    "latitud": 20.66342134,
    "longitud": -103.3439244,
    "link": "https://www.nmas.com.mx/nmas-local/programas/las-noticias-guadalajara/videos/nuevamente-fueron-localizados-restos-humanos-la-colonia-las-conchas/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 170,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Lomas del Sur",
    "victimas": 6,
    "año": 2024,
    "mes": "NOVIEMBRE",
    "latitud": 20.48741335,
    "longitud": -103.4073155,
    "link": "https://www.informador.mx/jalisco/Seguridad-en-Jalisco-Hallan-colectivos-restos-humanos-en-Tlajomulco-20240615-0091.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 171,
    "municipio": "Zapopan",
    "colonia": "Lomas del Refugio",
    "victimas": 5,
    "año": 2024,
    "mes": "NOVIEMBRE",
    "latitud": 20.74661976,
    "longitud": -103.3369664,
    "link": "https://udgtv.com/noticias/autorizan-trabajo-en-la-fosa-de-la-colonia-lomas-del-refugio/254083",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 1,
    "municipio": "Lagos de Moreno",
    "colonia": "Buenavista",
    "victimas": 8,
    "año": 2018,
    "mes": "OCTUBRE",
    "latitud": 21.38951134,
    "longitud": -101.9659172,
    "link": "https://udgtv.com/noticias/lagos-de-moreno-la-ciudad-fuera-del-area-metropolitana-con-mayor-numero-de-inhumaciones-clandestinas/59276",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 30,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Chulavista",
    "victimas": 2,
    "año": 2019,
    "mes": "OCTUBRE",
    "latitud": 20.4926118,
    "longitud": -103.3534968,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 31,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Los Olivos",
    "victimas": 1,
    "año": 2019,
    "mes": "OCTUBRE",
    "latitud": 20.43843077,
    "longitud": -103.2306997,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 57,
    "municipio": "El Salto",
    "colonia": "La Santa Cruz",
    "victimas": 134,
    "año": 2020,
    "mes": "OCTUBRE",
    "latitud": 20.51922811,
    "longitud": -103.1996358,
    "link": "https://www.infobae.com/mexico/2025/03/15/los-sabinos-la-mayor-fosa-clandestina-de-jalisco-donde-rescataron-134-cuerpos/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 58,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "La Duraznera",
    "victimas": 12,
    "año": 2020,
    "mes": "OCTUBRE",
    "latitud": 20.59391599,
    "longitud": -103.3214685,
    "link": "https://www.ntv.com.mx/2020/10/26/localizan-100-cuerpos-humanos-en-3-fosas-clandestinas-en-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 59,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Fracc. Puertas del Angel",
    "victimas": 2,
    "año": 2020,
    "mes": "OCTUBRE",
    "latitud": 20.45226011,
    "longitud": -103.4407588,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 60,
    "municipio": "Chapala",
    "colonia": "Ajijic",
    "victimas": 6,
    "año": 2020,
    "mes": "OCTUBRE",
    "latitud": 20.30151059,
    "longitud": -103.285063,
    "link": "https://oem.com.mx/eloccidental/policiaca/noticias-descubren-nueva-fosa-en-chapala-han-encontrado-4-cuerpos-15748524.app.json",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 84,
    "municipio": "El Salto",
    "colonia": "Guadalupana",
    "victimas": 1,
    "año": 2021,
    "mes": "OCTUBRE",
    "latitud": 20.55686626,
    "longitud": -103.2892532,
    "link": "https://oem.com.mx/eloccidental/policiaca/cuatro-cuerpos-y-un-craneo-fueron-encontrados-este-domingo-en-la-zmg-15719864",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 125,
    "municipio": "Juanacatlán",
    "colonia": "San Antonio Juanacaxtle",
    "victimas": 2,
    "año": 2022,
    "mes": "OCTUBRE",
    "latitud": 20.53685383,
    "longitud": -103.1537176,
    "link": "https://m.facebook.com/JuanacatlanNews/photos/%EF%B8%8F-%C3%BAltimominutoencuentran-fosa-clandestina-en-juanacatl%C3%A1nde-manera-preliminar-rep/552003363592298/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 126,
    "municipio": "Tonalá",
    "colonia": "San Jose del Castillo",
    "victimas": 5,
    "año": 2022,
    "mes": "OCTUBRE",
    "latitud": 20.50840545,
    "longitud": -103.2385911,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 127,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "El Tapatio",
    "victimas": 8,
    "año": 2022,
    "mes": "OCTUBRE",
    "latitud": 20.6020626,
    "longitud": -103.3263933,
    "link": "Encontraron presunta fosa clandestina en colonia El Tapatío",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 128,
    "municipio": "Zapopan",
    "colonia": "Arroyo Hondo Seccion II",
    "victimas": 5,
    "año": 2022,
    "mes": "OCTUBRE",
    "latitud": 20.74223735,
    "longitud": -103.3418376,
    "link": "https://zmgnoticias.com/2022/10/21/suman-26-restos-humanos-localizados-en-fosa-clandestina/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 147,
    "municipio": "Zapopan",
    "colonia": "Arenales Tapatíos",
    "victimas": 2,
    "año": 2023,
    "mes": "OCTUBRE",
    "latitud": 20.63695058,
    "longitud": -103.4609685,
    "link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.milenio.com/policia/zapopan-suman-26-bolsas-restos-humanos-fosa-clandestina&ved=2ahUKEwjM56XUgLqNAxV_LEQIHd7fBTIQFnoECB0QAQ&usg=AOvVaw2y4jF7d5_4L27NIofNSXkO",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 148,
    "municipio": "Guadalajara",
    "colonia": "San Antonio",
    "victimas": 8,
    "año": 2023,
    "mes": "OCTUBRE",
    "latitud": 20.65812181,
    "longitud": -103.3107503,
    "link": "https://ntrguadalajara.com/post.php?id_nota=205984",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 169,
    "municipio": "Zapopan",
    "colonia": "Miguel Hidalgo",
    "victimas": 2,
    "año": 2024,
    "mes": "OCTUBRE",
    "latitud": 20.7472689,
    "longitud": -103.335124,
    "link": "https://www.milenio.com/policia/zapopan-localizan-nueve-bolsas-restos-humanos-miguel-hidalgo",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 83,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Los Abedules",
    "victimas": 2,
    "año": 2021,
    "mes": "SEPTIEMBRE",
    "latitud": 20.52356348,
    "longitud": -103.4496484,
    "link": "https://guardianocturna.mx/2021/06/localizan-los-restos-de-una-mujer-en-bolsas-de-plastico-en-acantilado-de-tlajomulco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 26,
    "municipio": "Zapopan",
    "colonia": "La Primavera",
    "victimas": 43,
    "año": 2019,
    "mes": "SEPTIEMBRE",
    "latitud": 20.71887377,
    "longitud": -103.5616469,
    "link": "https://www.zonadocs.mx/2019/09/11/el-pozo-de-los-horrores-en-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 27,
    "municipio": "Guadalajara",
    "colonia": "San Eugenio",
    "victimas": 1,
    "año": 2019,
    "mes": "SEPTIEMBRE",
    "latitud": 20.68067473,
    "longitud": -103.2901089,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 28,
    "municipio": "Zapopan",
    "colonia": "La Primavera",
    "victimas": 7,
    "año": 2019,
    "mes": "SEPTIEMBRE",
    "latitud": 20.71859122,
    "longitud": -103.5616361,
    "link": "https://www.zonadocs.mx/2019/09/11/el-pozo-de-los-horrores-en-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 29,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Hacienda Santa Fe",
    "victimas": 1,
    "año": 2019,
    "mes": "SEPTIEMBRE",
    "latitud": 20.51188533,
    "longitud": -103.3800441,
    "link": "",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 56,
    "municipio": "Ixtlahuacán de los Membrillos",
    "colonia": "Los Olivos",
    "victimas": 34,
    "año": 2020,
    "mes": "SEPTIEMBRE",
    "latitud": 20.43460456,
    "longitud": -103.2349387,
    "link": "https://oem.com.mx/eloccidental/policiaca/noticias-violencia-policiaca-suman-seis-victimas-localizadas-en-fosa-clandestina-de-ixtlahuacan-de-los-membrillos-13152115",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 122,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "Cerro del Cuatro",
    "victimas": 5,
    "año": 2022,
    "mes": "SEPTIEMBRE",
    "latitud": 20.60373126,
    "longitud": -103.3637691,
    "link": "https://oem.com.mx/eloccidental/policiaca/buscan-restos-humanos-en-posible-fosa-de-tlajomulco-15720439.app.json",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 123,
    "municipio": "San Pedro Tlaquepaque",
    "colonia": "San Miguel Cuyutlán",
    "victimas": 3,
    "año": 2022,
    "mes": "SEPTIEMBRE",
    "latitud": 20.40405083,
    "longitud": -103.3970297,
    "link": "https://www.informador.mx/jalisco/Desaparecidos-en-Jalisco-Hallan-tres-cuerpos-en-el-Cerro-del-Cuatro-20220920-0139.html",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 124,
    "municipio": "Tlajomulco de Zúñiga",
    "colonia": "San Antonio Juanacaxtle",
    "victimas": 2,
    "año": 2022,
    "mes": "SEPTIEMBRE",
    "latitud": 20.53685383,
    "longitud": -103.1537176,
    "link": "https://oneamexico.org/2023/07/06/descubren-madres-buscadoras-al-menos-10-fosas-clandestinas-en-tlajomulco-de-zuniga-jalisco/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 145,
    "municipio": "Zapopan",
    "colonia": "Miguel Hidalgo",
    "victimas": 7,
    "año": 2023,
    "mes": "SEPTIEMBRE",
    "latitud": 20.74760092,
    "longitud": -103.3338729,
    "link": "https://oem.com.mx/eloccidental/policiaca/fosa-de-lomas-del-refugio-en-zapopan-se-han-extraido-33-bolsas-con-restos-humanos-15728975",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 146,
    "municipio": "Zapopan",
    "colonia": "Santa Ana Tepetitlan",
    "victimas": 6,
    "año": 2023,
    "mes": "SEPTIEMBRE",
    "latitud": 20.61868792,
    "longitud": -103.4598685,
    "link": "https://oem.com.mx/eloccidental/policiaca/termina-busqueda-en-fosa-de-santa-ana-tepetitlan-hubo-19-bolsas-con-restos-oseos-13156444",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 167,
    "municipio": "Zapopan",
    "colonia": "Paraisos del Colli",
    "victimas": 2,
    "año": 2024,
    "mes": "SEPTIEMBRE",
    "latitud": 20.64579358,
    "longitud": -103.4528116,
    "link": "https://www.notisistema.com/noticias/recuperan-25-cadaveres-en-dos-fosas-clandestinas-en-zapopan/",
    "delito": "Fosa Clandestina"
  },
  {
    "referencia": 168,
    "municipio": "Zapopan",
    "colonia": "Mariano Otero",
    "victimas": 7,
    "año": 2024,
    "mes": "SEPTIEMBRE",
    "latitud": 20.63481572,
    "longitud": -103.4533898,
    "link": "https://www.milenio.com/policia/zapopan-localizan-fosa-clandestina-mariano-otero",
    "delito": "Fosa Clandestina"
  }
];

// ===== MÓDULO DE ACTUALIZACIÓN EN TIEMPO REAL DESDE GOOGLE SHEETS =====

class GoogleSheetsRealTime {
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        this.apiKey = config.apiKey;
        this.range = config.range || 'Sheet1!A:I';
        this.pollInterval = config.pollInterval || 30000; // 30 segundos
        this.csvUrl = config.csvUrl;
        this.onDataUpdate = config.onDataUpdate;
        this.onError = config.onError;
        
        this.isPolling = false;
        this.lastUpdateTime = null;
        this.lastDataHash = null;
        this.pollTimer = null;
        
        this.initializeUI();
    }
    
    // ===== INICIALIZACIÓN =====
    initializeUI() {
        // Crear indicador de estado en la interfaz
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'realtime-status';
        statusIndicator.innerHTML = `
            <div class="realtime-indicator">
                <span id="status-icon">🔄</span>
                <span id="status-text">Inicializando...</span>
                <button id="manual-refresh" title="Actualizar manualmente">🔄</button>
            </div>
        `;
        
        // Agregar al header de la aplicación
        const header = document.querySelector('.app-header .header-content');
        if (header) {
            header.appendChild(statusIndicator);
        }
        
        // Event listener para actualización manual
        document.getElementById('manual-refresh').addEventListener('click', () => {
            this.forceUpdate();
        });
    }
    
    // ===== MÉTODOS PRINCIPALES =====
    
    async startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.updateStatus('🟢', 'Monitoreo activo');
        
        // Primera carga
        await this.checkForUpdates();
        
        // Configurar polling automático
        this.pollTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.pollInterval);
        
        console.log(`✅ Polling iniciado cada ${this.pollInterval/1000} segundos`);
    }
    
    stopPolling() {
        if (!this.isPolling) return;
        
        this.isPolling = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        this.updateStatus('⏸️', 'Monitoreo pausado');
        console.log('⏸️ Polling detenido');
    }
    
    async checkForUpdates() {
        try {
            this.updateStatus('🔄', 'Verificando cambios...');
            
            let data;
            
            // Intentar primero con Google Sheets API
            if (this.apiKey) {
                data = await this.fetchFromAPI();
            } else {
                // Fallback a CSV público
                data = await this.fetchFromCSV();
            }
            
            if (data && data.length > 0) {
                const dataHash = this.generateDataHash(data);
                
                if (this.lastDataHash !== dataHash) {
                    console.log('📊 Nuevos datos detectados, actualizando...');
                    this.lastDataHash = dataHash;
                    this.lastUpdateTime = new Date();
                    
                    // Procesar y actualizar datos
                    const processedData = this.processRawData(data);
                    
                    // Llamar callback de actualización
                    if (this.onDataUpdate) {
                        this.onDataUpdate(processedData);
                    }
                    
                    this.updateStatus('✅', `Actualizado: ${this.formatTime(this.lastUpdateTime)}`);
                    this.showUpdateNotification(processedData.length);
                } else {
                    this.updateStatus('🟢', `Sin cambios: ${this.formatTime(new Date())}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error al verificar actualizaciones:', error);
            this.updateStatus('❌', 'Error de conexión');
            
            if (this.onError) {
                this.onError(error);
            }
        }
    }
    
    // ===== MÉTODOS DE OBTENCIÓN DE DATOS =====
    
    async fetchFromAPI() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.range}?key=${this.apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.values || [];
    }
    
    async fetchFromCSV() {
        if (!this.csvUrl) {
            throw new Error('No CSV URL configured');
        }
        
        const response = await fetch(this.csvUrl);
        if (!response.ok) {
            throw new Error(`CSV Error: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        return this.parseCSV(csvText);
    }
    
    // ===== MÉTODOS DE PROCESAMIENTO =====
    
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        return lines.map(line => {
            // Parser CSV simple - maneja comillas y comas
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current.trim());
            return result;
        }).filter(row => row.length > 0 && row[0] !== '');
    }
    
    processRawData(rawData) {
        // Saltar la primera fila si son encabezados
        const dataRows = rawData[0] && rawData[0][0] === 'Referencia' ? rawData.slice(1) : rawData;
        
        return dataRows.map(row => {
            if (row.length >= 9) {
                // Procesar coordenadas (convertir comas a puntos para decimales)
                const latitud = parseFloat(row[6].replace(/"/g, '').replace(',', '.'));
                const longitud = parseFloat(row[7].replace(/"/g, '').replace(',', '.'));
                
                return {
                    referencia: parseInt(row[0]) || row[0],
                    municipio: row[1].replace(/"/g, '').trim(),
                    colonia: row[2].replace(/"/g, '').trim(),
                    victimas: parseInt(row[3]) || 1,
                    año: parseInt(row[4]) || 2025,
                    mes: row[5].replace(/"/g, '').trim().toUpperCase(),
                    latitud: latitud,
                    longitud: longitud,
                    link: row[8].replace(/"/g, '').trim(),
                    delito: "Fosa Clandestina"
                };
            }
            return null;
        }).filter(item => item !== null);
    }
    
    generateDataHash(data) {
        // Generar hash simple de los datos para detectar cambios
        const dataString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        return hash.toString();
    }
    
    // ===== MÉTODOS DE INTERFAZ =====
    
    updateStatus(icon, text) {
        const statusIcon = document.getElementById('status-icon');
        const statusText = document.getElementById('status-text');
        
        if (statusIcon) statusIcon.textContent = icon;
        if (statusText) statusText.textContent = text;
    }
    
    showUpdateNotification(recordCount) {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span>📊 Datos actualizados: ${recordCount} registros</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    // ===== MÉTODOS PÚBLICOS =====
    
    async forceUpdate() {
        this.updateStatus('🔄', 'Actualizando...');
        await this.checkForUpdates();
    }
    
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        console.log('🔑 API Key configurada');
    }
    
    setPollInterval(interval) {
        this.pollInterval = interval;
        
        if (this.isPolling) {
            this.stopPolling();
            this.startPolling();
        }
        
        console.log(`⏱️ Intervalo de polling actualizado: ${interval/1000} segundos`);
    }
}

// ===== INICIALIZACIÓN DE TIEMPO REAL =====
let realTimeManager;

function initializeRealTime() {
    // Configuración del sistema de tiempo real
    const config = {
        spreadsheetId: '19QoQTxAgK9MEuRtcfsJAP66a1gMj22Md',
        apiKey: localStorage.getItem('googleSheetsApiKey') || null,
        csvUrl: 'https://docs.google.com/spreadsheets/d/19QoQTxAgK9MEuRtcfsJAP66a1gMj22Md/export?format=csv&gid=2076449079',
        range: 'Sheet1!A:I',
        pollInterval: 30000, // 30 segundos
        onDataUpdate: (newData) => {
            // Actualizar datos globales
            allData = newData;
            filteredData = [...allData];
            
            // Actualizar interfaz
            updateMapMarkers(allData);
            populateFilters();
            updateCharts();
            
            console.log(`✅ Datos actualizados: ${newData.length} registros`);
        },
        onError: (error) => {
            console.error('❌ Error en tiempo real:', error);
        }
    };
    
    realTimeManager = new GoogleSheetsRealTime(config);
    
    // Iniciar monitoreo automático
    realTimeManager.startPolling();
}

// Función para configurar API Key
function showApiKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'api-config-modal';
    modal.innerHTML = `
        <div class="api-config-content">
            <h3>🔑 Configurar Google Sheets API</h3>
            <div class="form-group">
                <label for="api-key-input">API Key de Google Sheets:</label>
                <input type="text" id="api-key-input" placeholder="Ingresa tu API Key de Google Sheets" 
                       value="${localStorage.getItem('googleSheetsApiKey') || ''}">
            </div>
            <div class="form-group">
                <small style="color: #666;">
                    Para obtener una API Key, visita: 
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a>
                </small>
            </div>
            <div class="api-config-buttons">
                <button class="btn-secondary" onclick="closeApiKeyModal()">Cancelar</button>
                <button class="btn-primary" onclick="saveApiKey()">Guardar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeApiKeyModal() {
    const modal = document.querySelector('.api-config-modal');
    if (modal) modal.remove();
}

function saveApiKey() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    
    if (apiKey) {
        localStorage.setItem('googleSheetsApiKey', apiKey);
        if (realTimeManager) {
            realTimeManager.setApiKey(apiKey);
        }
        console.log('🔑 API Key guardada');
    }
    
    closeApiKeyModal();
}

// Agregar botón de configuración al header
function addConfigButton() {
    const header = document.querySelector('.app-header .header-content');
    if (header) {
        const configBtn = document.createElement('button');
        configBtn.innerHTML = '⚙️';
        configBtn.title = 'Configurar API Key';
        configBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            color: white;
            cursor: pointer;
            margin-left: 10px;
            transition: all 0.3s ease;
        `;
        configBtn.addEventListener('click', showApiKeyModal);
        header.appendChild(configBtn);
    }
}

// ===== INTEGRACIÓN CON SISTEMA DE LOGIN =====
// Modificar la función handleLogin para incluir inicialización de tiempo real
const originalHandleLogin = handleLogin;

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (VALID_CREDENTIALS[username] === password) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('currentUser').textContent = username;
        
        // Inicializar aplicación
        initializeApp();
        
        // Inicializar tiempo real después del login exitoso
        setTimeout(() => {
            initializeRealTime();
            addConfigButton();
        }, 1000);
        
        console.log('Login exitoso para:', username);
    } else {
        alert('Credenciales incorrectas. Use: Usuario 007 / Swordfish123');
    }
}

