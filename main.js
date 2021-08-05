let numDatasets = 4;
let timeSeriesData = [];
let objects = [];

document.addEventListener('DOMContentLoaded', async function() {

    async function fetchData(url) {
        let res = await fetch(url);
        let data = await res.json()
        return data;
    }

    for (let i = 1; i < numDatasets + 1; i++) {
        timeSeriesData.push(await fetchData('/timeseriesatmotube' + i + '.json'));
    }

    for (let i = 0; i < timeSeriesData.length; i++) {
        objects.push({
            type: "scatter",
            mode: "lines",
            name: 'Atmotube ' + (i + 1),
            x: Object.values(timeSeriesData[i]['Date']),
            y: Object.values(timeSeriesData[i]['PM10, ug/m3']),
            /* line: { color: '#17BECF' } */
        });
    }

    let layout = {
        title: 'Basic Time Series',
    };

    Plotly.newPlot('myDiv', objects, layout);

});