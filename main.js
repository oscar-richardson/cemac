const numDatasets = 1,
    features = ['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3'],
    binSizes = ['5', '10', '50'];

let timeSeriesData = [],
    initialData = [],
    layout = {},
    update = {},
    heatMapData = {},
    minMaxData = {},
    min = {},
    max = {},
    range = {},
    ranges = {},
    layers = {},
    colors = {},
    currentLayer = 'PM2.5, ug/m3',
    currentBinSize = '5',
    layersControl;


document.addEventListener('DOMContentLoaded', async function() {

    async function fetchData(url) {
        let res = await fetch(url);
        let data = await res.json();
        return data;
    }


    for (let i = 1; i < numDatasets + 1; i++) {
        timeSeriesData.push(await fetchData('https://drive.google.com/uc?export=download&id=1k0nn6rgQY5AbuA_WSU9qE05uH4JxDKyt'));
    }

    for (let i = 0; i < timeSeriesData.length; i++) {
        initialData.push({
            type: 'scatter',
            mode: 'lines',
            name: 'Atmotube ' + (i + 1),
            x: Object.values(timeSeriesData[i]['Date']),
            y: Object.values(timeSeriesData[i]['PM2.5, ug/m3'])
        });
    }

    features.forEach(function(feature) {
        layout[feature] = {
            title: {
                text: 'Time series showing how density of ' + feature + ' varies with time',
                font: {
                    family: 'Arial, Helvetica, sans-serif',
                    size: 18,
                    color: '#555'
                }
            }
        };
        update[feature] = [];
    });

    const initialLayout = JSON.parse(JSON.stringify(layout['PM2.5, ug/m3']));

    const plot_config = {
        'showLink': false,
        'linkText': '',
        'displaylogo': false,
        'responsive': true
    };

    Plotly.newPlot('plotid', initialData, initialLayout, plot_config);

    const dropDown = document.getElementById('drop-down');
    dropDown.addEventListener("change", updateTimeSeries);

    features.forEach(function(feature) {
        let x = [];
        let y = [];
        for (let i = 0; i < timeSeriesData.length; i++) {
            x.push(Object.values(timeSeriesData[i]['Date']));
            y.push(Object.values(timeSeriesData[i][feature]));
        }
        update[feature] = {
            x: x,
            y: y
        }
    });

    function updateTimeSeries(event) {
        Plotly.update('plotid', update[dropDown.value], layout[dropDown.value], [0, 1, 2, 3, 4]);
    }


    map = L.map('mapid', { attributionControl: false, zoomControl: false }).setView([53.77875400063466, -1.7551848715634326], 14);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        maxZoom: 20,
        minZoom: 12,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoib3NjYXItcmljaGFyZHNvbiIsImEiOiJja3MwMDJheWkwaWw0MndwanBtbzl3djNvIn0.1wg7WwvVPp3elm4fyOpVfA'
    }).addTo(map);

    const attributionControl = L.control.attribution({ prefix: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>' })
    attributionControl.addTo(map);
    L.DomUtil.addClass(attributionControl.getContainer(), 'attribution-control');

    const zoomControl = L.control.zoom();
    zoomControl.addTo(map);
    L.DomUtil.addClass(zoomControl.getContainer(), 'zoom-control');

    L.control.scale().addTo(map);

    const printer = L.easyPrint({
        exportOnly: true,
        hidden: true,
        hideControlContainer: false,
        hideClasses: ['attribution-control', 'zoom-control', 'layers-control']
    }).addTo(map);

    const btn = document.querySelector('.button');

    btn.addEventListener('click', function() {
        btn.classList.add("button--loading");
        setTimeout(function() {
            printer.printMap('CurrentSize');
        }, 10);
    });

    map.on('easyPrint-finished', function(ev) {
        btn.classList.toggle("button--loading");
    });

    function getIndex(value, array) {
        for (let i = 1; i < array.length; i++) {
            if (value <= array[i]) {
                return i - 1;
            }
        }
        return array.length - 1;
    }

    for (const binSize of binSizes) {
        minMaxData[binSize] = {};
        min[binSize] = {};
        max[binSize] = {};
        range[binSize] = {};
        ranges[binSize] = {};
        layers[binSize] = {};
        features.forEach(function(feature) {
            minMaxData[binSize][feature] = [];
            ranges[binSize][feature] = [];
            layers[binSize][feature] = L.layerGroup();
            colors[feature] = ['#93f2c9', '#31cdaa', '#2ab1a0', '#1f5d73', '#000000'];
            if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
                layers[binSize][feature + ' (DAQI)'] = L.layerGroup();
                colors[feature + ' (DAQI)'] = ['green', 'orange', 'red', 'purple'];
            }
        });

        ranges[binSize]['PM2.5, ug/m3 (DAQI)'] = ['0.00', '35.49', '53.49', '70.49'];
        ranges[binSize]['PM10, ug/m3 (DAQI)'] = ['0.00', '50.49', '75.49', '100.49'];

        heatMapData[binSize] = await fetchData('https://raw.githubusercontent.com/oscar-richardson/cemac/main/heatmap' + binSize + '.json');

        heatMapData[binSize].forEach(function(bin) {
            features.forEach(function(feature) {
                minMaxData[binSize][feature].push(bin[feature]);
            });
        });

        features.forEach(function(feature) {
            min[binSize][feature] = Math.min(...minMaxData[binSize][feature]);
            max[binSize][feature] = Math.max(...minMaxData[binSize][feature]);
            range[binSize][feature] = max[binSize][feature] - min[binSize][feature];

            for (let i = 0; i <= 5; i++) {
                ranges[binSize][feature].push((min[binSize][feature] + range[binSize][feature] * 0.2 * i).toFixed(2));
            }
        });

        heatMapData[binSize].forEach(function(bin) {
            features.forEach(function(feature) {
                let rectangle = [
                    [bin['latBottom'], bin['longLeft']],
                    [bin['latTop'], bin['longRight']]
                ];
                let tooltip = 'Latitude: ' + bin['latBottom'].toFixed(6) + ' to ' + bin['latTop'].toFixed(6) +
                    '<br>Longitude: ' + bin['longLeft'].toFixed(5) + ' to ' + bin['longRight'].toFixed(5) +
                    '<br>Mean PM1 : ' + bin['PM1, ug/m3'].toFixed(2) +
                    ' ug/m3<br>Mean PM2.5 : ' + bin['PM2.5, ug/m3'].toFixed(2) +
                    ' ug/m3<br>Mean PM10 : ' + bin['PM10, ug/m3'].toFixed(2) +
                    ' ug/m3<br>Number of observations: ' + bin['observations'] +
                    '<br>First observation: ' + new Date(bin['start']).toUTCString() +
                    '<br>Last observation: ' + new Date(bin['end']).toUTCString() +
                    '<br>Number of Atmotubes: ' + bin['atmotubes'];
                layers[binSize][feature].addLayer(L.rectangle(rectangle, {
                        color: colors[feature][getIndex(
                            parseFloat(bin[feature].toFixed(2)), ranges[binSize][feature])],
                        weight: 0,
                        fillOpacity: 0.8
                    })
                    .bindTooltip(tooltip));
                if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
                    layers[binSize][feature + ' (DAQI)'].addLayer(L.rectangle(rectangle, {
                            color: colors[feature + ' (DAQI)'][getIndex(
                                parseFloat(bin[feature].toFixed(2)), ranges[binSize][feature + ' (DAQI)'])],
                            weight: 0,
                            fillOpacity: 0.4
                        })
                        .bindTooltip(tooltip));
                }
            });
        });
    }

    function unsetBinSize() {
        map.eachLayer(function(layer) {
            if (!layer.hasOwnProperty('_tiles')) {
                map.removeLayer(layer);
            }
        });
        map.removeControl(layersControl);
    }

    function setBinSize(binSize) {
        layersControl = L.control.layers(layers[binSize]);
        layersControl.addTo(map);
        L.DomUtil.addClass(layersControl.getContainer(), 'layers-control');

        map.on('baselayerchange', onBaseLayerChange);

        const leafletLegend = document.querySelector('.leaflet-legend');

        function onBaseLayerChange(e) {
            currentLayer = e.name;
            leafletLegend.innerHTML = '<div class="leaflet-legend-header">Mean ' + currentLayer + ' per square</div>';
            for (let i = 0; i < colors[currentLayer].length; i++) {
                leafletLegend.innerHTML += '<i style="background: ' + colors[currentLayer][i] + '; opacity:0.6"></i> ';
                if (i != 0) {
                    leafletLegend.innerHTML += (parseFloat(ranges[binSize][currentLayer][i]) + 0.01).toFixed(2);
                } else {
                    leafletLegend.innerHTML += parseFloat(ranges[binSize][currentLayer][i]).toFixed(2);
                }
                if (ranges[binSize][currentLayer][i + 1]) {
                    leafletLegend.innerHTML += ' - ' + ranges[binSize][currentLayer][i + 1] + ' ug/m3<br>';
                } else {
                    leafletLegend.innerHTML += ' ug/m3 or more<br>';
                }
            }
        }

        layers[binSize][currentLayer].addTo(map);

        currentBinSize = binSize;
    }

    map.on('zoomend', function() {
        let zoomLevel = map.getZoom();
        if (zoomLevel >= 18) {
            if (currentBinSize !== '5') {
                unsetBinSize();
                setBinSize('5');
            }
        }
        if (zoomLevel < 18 && zoomLevel >= 14) {
            if (currentBinSize !== '10') {
                unsetBinSize();
                setBinSize('10');
            }
        }
        if (zoomLevel < 14) {
            if (currentBinSize !== '50') {
                unsetBinSize();
                setBinSize('50');
            }
        }
    });

    setBinSize('10');
});