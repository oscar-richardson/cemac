let numDatasets = 4,
    timeSeriesData = [],
    initialData = [],
    features = ['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3'],
    layout = {},
    update = {},
    binSizes = ['1', '5'],
    heatMapData = {},
    minMaxData = {},
    min = {},
    max = {},
    range = {},
    ranges = {},
    layers = {},
    colors = {},
    currentLayer = 'PM2.5, ug/m3',
    currentBinSize = '1',
    layersControl;


document.addEventListener('DOMContentLoaded', async function() {

    async function fetchData(url) {
        let res = await fetch(url);
        let data = await res.json();
        return data;
    }


    for (let i = 1; i < numDatasets + 1; i++) {
        timeSeriesData.push(await fetchData('https://raw.githubusercontent.com/oscar-richardson/cemac/main/timeseriesatmotube' + i + '.json'));
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
            title: 'Time series showing how density of ' + feature + ' varies with time'
        };
        update[feature] = [];
    });

    let initialLayout = JSON.parse(JSON.stringify(layout['PM2.5, ug/m3']));

    let plot_config = {
        'showLink': false,
        'linkText': '',
        'displaylogo': false,
        'responsive': true
    };

    Plotly.newPlot('plotid', initialData, initialLayout, plot_config);

    let dropDown = document.getElementById('drop-down');
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
        Plotly.update('plotid', update[dropDown.value], layout[dropDown.value], [0, 1, 2, 3]);
    }


    map = L.map('mapid').setView([53.8063176, -1.800116], 19);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 25,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoib3NjYXItcmljaGFyZHNvbiIsImEiOiJja3MwMDJheWkwaWw0MndwanBtbzl3djNvIn0.1wg7WwvVPp3elm4fyOpVfA'
    }).addTo(map);

    L.control.scale().addTo(map);

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

        heatMapData[binSize] = await fetchData('/heatmap' + binSize + '.json');

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
                        fillOpacity: 0.6
                    })
                    .bindTooltip(tooltip));
                if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
                    layers[binSize][feature + ' (DAQI)'].addLayer(L.rectangle(rectangle, {
                            color: colors[feature + ' (DAQI)'][getIndex(
                                parseFloat(bin[feature].toFixed(2)), ranges[binSize][feature + ' (DAQI)'])],
                            weight: 0,
                            fillOpacity: 0.6
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

        map.on('baselayerchange', onBaseLayerChange);

        let leafletLegend = document.querySelector('.leaflet-legend');

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
            if (currentBinSize !== '1') {
                unsetBinSize();
                setBinSize('1');
            }
        }
        if (zoomLevel < 18) {
            if (currentBinSize !== '5') {
                unsetBinSize();
                setBinSize('5');
            }
        }
    });

    setBinSize('1');
});