let numDatasets = 4;
let timeSeriesData = [];
let features = ['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3'];
let objects = { 'PM1, ug/m3': [], 'PM2.5, ug/m3': [], 'PM10, ug/m3': [] };
let heatMapData;
var mymap;
let pm1 = [];
let pm2p5 = [];
let pm10 = [];
let ranges = [];
let colors = ['#93f2c9', '#31cdaa', '#2ab1a0', '#1f5d73', '#000000'];
let heatMapLayer = [];

document.addEventListener('DOMContentLoaded', async function() {

    async function fetchData(url) {
        let res = await fetch(url);
        let data = await res.json()
        return data;
    }

    for (let i = 1; i < numDatasets + 1; i++) {
        timeSeriesData.push(await fetchData('https://raw.githubusercontent.com/oscar-richardson/cemac/main/timeseriesatmotube' + i + '.json'));
    }

    features.forEach(function(feature) {
        for (let i = 0; i < timeSeriesData.length; i++) {
            objects[feature].push({
                type: "scatter",
                mode: "lines",
                name: 'Atmotube ' + (i + 1),
                x: Object.values(timeSeriesData[i]['Date']),
                y: Object.values(timeSeriesData[i][feature]),
            });
        }
    });

    let layout = {
        'PM1, ug/m3': {
            title: 'Time series showing how density of PM1, ug/m3 varies with time',
        },
        'PM2.5, ug/m3': {
            title: 'Time series showing how density of PM2.5, ug/m3 varies with time',
        },
        'PM10, ug/m3': {
            title: 'Time series showing how density of PM10, ug/m3 varies with time',
        }
    }

    let plot_config = {
        'showLink': false,
        'linkText': '',
        'displaylogo': false,
        'responsive': true
    };

    Plotly.newPlot('myDiv', objects['PM2.5, ug/m3'], layout['PM2.5, ug/m3'], plot_config);


    heatMapData = await fetchData('https://raw.githubusercontent.com/oscar-richardson/cemac/main/heatmap.json');

    mymap = L.map('mapid').setView([53.8063176, -1.800116], 18);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 25,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoib3NjYXItcmljaGFyZHNvbiIsImEiOiJja3MwMDJheWkwaWw0MndwanBtbzl3djNvIn0.1wg7WwvVPp3elm4fyOpVfA'
    }).addTo(mymap);


    heatMapData.forEach(function(dataPoint) {
        pm1.push(dataPoint['pm1']);
        pm2p5.push(dataPoint['pm2.5']);
        pm10.push(dataPoint['pm10']);
    });

    let max = Math.max(...pm2p5);

    for (let i = 0; i <= 5; i++) {
        ranges.push((max * 0.2 * i).toFixed(2));
    }

    let leafletLegend = document.querySelector('.leaflet-legend')

    for (let i = 0; i < 5; i++) {
        leafletLegend.innerHTML += '<i style="background: ' + colors[i] + '; opacity:0.6"></i> ' + (parseFloat(ranges[i]) + 0.01).toFixed(2) + ' - ' + ranges[i + 1] + ' ug/m3<br>'
    }

    heatMapData.forEach(function(dataPoint, index) {
        L.rectangle([
            [dataPoint['latBottom'], dataPoint['longLeft']],
            [dataPoint['latTop'], dataPoint['longRight']]
        ], { color: colors[Math.ceil(dataPoint['pm2.5'] / parseFloat(ranges[1])) - 1], weight: 0, fillOpacity: 0.6 }).bindPopup('Latitude: ' + String(dataPoint['latBottom']) + ' to ' + String(dataPoint['latTop']) + '<br>Longitude: ' + String(dataPoint['longLeft']) + ' to ' + String(dataPoint['longRight']) + '<br>Mean PM1 : ' + String(dataPoint['pm1']) + ' ug/m3<br>Mean PM2.5 : ' + String(dataPoint['pm2.5']) + ' ug/m3<br>Mean PM10 : ' + String(dataPoint['pm10']) + ' ug/m3<br>Number of observations: ' + String(dataPoint['observations'])).addTo(mymap);
    });

    var menu = document.getElementById("change_chart");
    menu.addEventListener("change", generateData);

    function generateData(event) {
        Plotly.newPlot('myDiv', objects[menu.value], layout[menu.value], plot_config);
    }


    /*
                    for (let i = 0; i < Object.keys(heatMapData["Latitude"]).length; i++) {
                        heatMapLayer.push([heatMapData["Latitude"][i], heatMapData["Longitude"][i], heatMapData["PM10, ug/m3"][i] / 6]);
                    }

                    var heat = L.heatLayer(heatMapLayer, { radius: 25 }).addTo(mymap);
    */
});