# -*- coding: utf-8 -*-

import datetime as dt
import glob
import pandas as pd
import geopy.distance as gp
import numpy as np
import json


schools = ['st_stephens', 'dixons', 'barkerend', 'whetley', 'st_johns', 'brackenhill', 'st_barnabas', 'beckfoot_heaton', 'beckfoot_allerton', 'home_farm']
parser = lambda x: dt.datetime.strptime(x, '%d/%m/%Y %H:%M:%S')
timeseries = {}
heatmap = {}

for school in schools:
    heatmap_dfs = []
    for i in range(1, 6):
        timeseries_dfs = []
        for file in glob.glob(('daily_data/' + school + str(i) + '*.csv')):
            df = pd.read_csv(file, parse_dates=['Date'], date_parser=parser)[['Date', 'VOC, ppm', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3', 'Latitude', 'Longitude']].dropna(subset=['Date', 'VOC, ppm', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3'])
            wb = []
            day = []
            for j in range(len(df)):
                datetime_value = df.iloc[j]['Date']
                wb.append(datetime_value.date() - dt.timedelta(days = datetime_value.weekday()))
                day.append(datetime_value.date())
            df['W/b']  = wb
            df['Day']  = day
            timeseries_dfs.append(df.drop(columns=['Longitude', 'Latitude']).set_index('Date'))
            df['Atmotube no.'] = i
            heatmap_dfs.append(df.dropna(subset=['Latitude', 'Longitude']))
        timeseries[school + str(i)] = pd.concat(timeseries_dfs).sort_values(by='Date')
    heatmap[school] = pd.concat(heatmap_dfs).sort_values(by='Date').reset_index(drop=True)

def min_1(x):
    if x < 1:
        return 1
    else:
        return x


def bin_data(df, multiple_atmotubes, sensor, period):

    lat_min = df['Latitude'].min()
    lat_max = df['Latitude'].max()
    lat_mid = (lat_min + lat_max)/2
    long_min = df['Longitude'].min()
    long_max = df['Longitude'].max()
    long_mid = (long_min + long_max)/2
    lat_distance = gp.distance((lat_max, long_mid), ((lat_min, long_mid))).m
    long_distance = gp.distance((lat_mid, long_max), ((lat_mid, long_min))).m
    bin_sizes = [5, 10, 50]

    for bin_size in bin_sizes:
        num_cuts = {'Longitude': min_1(round(long_distance/bin_size)), 'Latitude': min_1(round(lat_distance/bin_size))}
        cuts = pd.DataFrame({str(feature) + ' Bin' : pd.cut(df[feature], num_cuts[feature], precision=100) for feature in ['Longitude', 'Latitude']}) #creates DF where Long and Lat columns are the bin each datapoint goes in
        groups = df.join(cuts).groupby(list(cuts)) #joins the DFs and divides into groups based on Long and Lat bins
        means = groups.mean()
        means_dropna = means.dropna()
        start = groups.Date.min().dropna()
        end = groups.Date.max().dropna()
        observations = groups.Date.count().replace(0, np.nan).dropna()
        if multiple_atmotubes:
            atmotubes = groups['Atmotube no.'].nunique().replace(0, np.nan).dropna()

        dicts = []

        for i in means_dropna.index:

            new_dict = {'longLeft': i[0].left, 
             'longRight': i[0].right, 
             'latBottom': i[1].left,
             'latTop': i[1].right,
             'PM1, ug/m3': means_dropna.loc[i]['PM1, ug/m3'],
             'PM2.5, ug/m3': means_dropna.loc[i]['PM2.5, ug/m3'],
             'PM10, ug/m3': means_dropna.loc[i]['PM10, ug/m3'],
             'VOC, ppm': means_dropna.loc[i]['VOC, ppm'],
             'start': str(start.loc[i]),
             'end': str(end.loc[i]),
             'observations': float(observations.loc[i])}

            if multiple_atmotubes:
                new_dict['atmotubes'] = float(atmotubes.loc[i])

            dicts.append(new_dict)

        with open(sensor + '_heatmap_' + period + '_binsize=' + str(bin_size) + '.json', 'w') as fout:
            json.dump(dicts, fout, separators=(',', ':'))


for school in heatmap:
    heatmap_alltime = heatmap[school]
    if not heatmap_alltime.empty:

        bin_data(heatmap_alltime, True, school, 'alltime') #heatmap alltime per school
    
        for i in heatmap_alltime['Atmotube no.'].unique():
            bin_data(heatmap_alltime.loc[heatmap_alltime['Atmotube no.'] == i].reset_index(drop=True), False, school + str(i), 'alltime') #heatmap alltime per sensor

        for week in heatmap_alltime['W/b'].unique():
            heatmap_week = heatmap_alltime.loc[heatmap_alltime['W/b'] == week].reset_index(drop=True)
            bin_data(heatmap_week, True, school, 'wb_' + str(week.day) + '-' + str(week.month) + '-' + str(week.year)) #heatmap week per school
            for i in heatmap_week['Atmotube no.'].unique():
                bin_data(heatmap_week.loc[heatmap_week['Atmotube no.'] == i].reset_index(drop=True), False, school + str(i), 'wb_' + str(week.day) + '-' + str(week.month) + '-' + str(week.year)) #heatmap week per school

        for day in heatmap_alltime['Day'].unique():
            heatmap_day = heatmap_alltime.loc[heatmap_alltime['Day'] == day].reset_index(drop=True)
            bin_data(heatmap_day, True, school, str(day.day) + '-' + str(day.month) + '-' + str(day.year)) #heatmap day per school
            for i in heatmap_day['Atmotube no.'].unique():
                heatmap_day_atmotube = heatmap_day.loc[heatmap_day['Atmotube no.'] == i].drop(columns=['W/b', 'Day', 'Atmotube no.']).reset_index(drop=True)
                heatmap_day_atmotube['Date'] = heatmap_day_atmotube['Date'].astype(str)
                heatmap_day_atmotube.to_json(school + str(i) + '_heatmap_' + str(day.day) + '-' + str(day.month) + '-' + str(day.year) + '.json') #heatmap day per sensor


for sensor in timeseries:
    timeseries_alltime = timeseries[sensor]
    if not timeseries_alltime.empty:
        for week in timeseries_alltime['W/b'].unique():
            timeseries_week = timeseries_alltime.loc[timeseries_alltime['W/b'] == week].resample('10T').mean()
            timeseries_week.index = timeseries_week.index.astype(str)
            pd.concat([timeseries_week, timeseries_week.describe()]).to_json(sensor + '_timeseries_wb_' + str(week.day) + '-' + str(week.month) + '-' + str(week.year) + '.json') #timeseries week per sensor

        for day in timeseries_alltime['Day'].unique():
            timeseries_day = timeseries_alltime.loc[timeseries_alltime['Day'] == day].drop(columns=['W/b', 'Day'])
            timeseries_day.index = timeseries_day.index.astype(str)
            pd.concat([timeseries_day, timeseries_day.describe()]).to_json(sensor + '_timeseries_' + str(day.day) + '-' + str(day.month) + '-' + str(day.year) + '.json') #timeseries day per sensor

        timeseries_alltime = timeseries_alltime.resample('30T').mean()
        timeseries_alltime.index = timeseries_alltime.index.astype(str)
        pd.concat([timeseries_alltime, timeseries_alltime.describe()]).to_json(sensor + '_timeseries_alltime.json') #timeseries alltime per sensor
