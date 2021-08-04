let timeSeriesData = {};
let heatMapData = {};

document.addEventListener('DOMContentLoaded', function() {

    fetch('/timeseries.json')
        .then(response => response.json())
        .then(data => {
            timeSeriesData = data;
        })

    fetch('/heatmap.json')
        .then(response => response.json())
        .then(data => {
            heatMapData = data;
        })

});