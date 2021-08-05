# -*- coding: utf-8 -*-

import datetime as dt
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mpl_dates
import json
import geopy.distance as gp
import numpy as np
import seaborn as sb


num_datasets = 4
parser = lambda x: dt.datetime.strptime(x, '%d/%m/%Y %H:%M')
df_list = []

for i in range(num_datasets):
    new_df = pd.read_csv('Atmotube ' + str(i+1) + ' Data.csv', parse_dates=['Date'], date_parser=parser)
    new_df = new_df[['Longitude', 'Latitude', 'Date', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3']]\
    .dropna(subset=['Date', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3'])\
        .reset_index(drop=True)
    df_list.append(new_df)

heat_map = pd.concat(df_list)
heat_map = heat_map.dropna(subset=['Longitude', 'Latitude'])\
        .reset_index(drop=True)


for df in df_list:
    df.drop(columns=['Longitude', 'Latitude'], inplace=True)

for feature in ['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3']:
    
    plt.figure('Time series ' + feature)
    plt.style.use('seaborn')

    for i in range(len(df_list)):
        plt.plot_date(df_list[i]['Date'], df_list[i][feature], 
                      linestyle='solid', marker='', label='Atmotube ' + str(i+1))

    plt.gcf().autofmt_xdate()
    date_format = mpl_dates.DateFormatter('%d %b %H:%M')
    plt.gca().xaxis.set_major_formatter(date_format)
    plt.title('Time series showing how density of ' + feature + ' varies with time')
    plt.xlabel('Date and time')
    plt.ylabel('Density of ' + feature)
    plt.legend()

for i in range(len(df_list)):
    df_list[i]['Date'] = df_list[i]['Date'].astype(str)
    df_list[i].to_json('timeseriesatmotube' + str(i+1) + '.json')


heat_map = heat_map[heat_map.Longitude < -1.7979444500000001]

long_min = heat_map['Longitude'].min()
long_max = heat_map['Longitude'].max()
long_mid = (long_min + long_max)/2
lat_min = heat_map['Latitude'].min()
lat_max = heat_map['Latitude'].max()
lat_mid = (lat_min + lat_max)/2
long_distance = gp.distance((lat_mid, long_max), ((lat_mid, long_min))).m
lat_distance = gp.distance((lat_max, long_mid), ((lat_min, long_mid))).m

grid_size = 1
num_cuts = {'Longitude': round(long_distance/grid_size), 'Latitude': round(lat_distance/grid_size)}
cuts = pd.DataFrame({str(feature) + ' Bin' : pd.cut(heat_map[feature], num_cuts[feature]) \
                     for feature in ['Longitude', 'Latitude']}) #creates DF where Long and Lat columns are the bin each datapoint goes in
groups = heat_map.join(cuts).groupby(list(cuts)) #joins the DFs and divides into groups based on Long and Lat bins
means = groups.mean()
means_dropna = means.dropna()
start = groups.Date.min().dropna()
end = groups.Date.max().dropna()
observations = groups.Date.count().replace(0, np.nan).dropna()

dict_list = []

for i in means_dropna.index:
    new_dict = {'longLeft': i[0].left, 
     'longRight': i[0].right, 
     'latBottom': i[1].left,
     'latTop': i[1].right,
     'pm1': means_dropna.loc[i]['PM1, ug/m3'],
     'pm2.5': means_dropna.loc[i]['PM2.5, ug/m3'],
     'pm10': means_dropna.loc[i]['PM10, ug/m3'],
     'start': str(start.loc[i]),
     'end': str(end.loc[i]),
     'observations': observations.loc[i]}
    dict_list.append(new_dict)

with open('heatmap.json', 'w') as fout:
    json.dump(dict_list, fout, separators=(',', ':'))

means = means.unstack(level = 0)
means = means.iloc[::-1]

for dependent_var in ['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3']:
    plt.figure('Heat map ' + dependent_var)
    sb.heatmap(means[dependent_var], \
           xticklabels = means[dependent_var].columns.map(lambda x : x.left), \
           yticklabels = means[dependent_var].index.map(lambda x : x.left), \
               cmap = 'coolwarm')
    plt.title('Heat map showing how density of ' + dependent_var + ' varies with location')
    plt.tight_layout()

"""
If Long/Lat columns of dataset are empty, we get:
    
    ValueError: Cannot cut empty array
    
so we need to add some error-checking!
"""
