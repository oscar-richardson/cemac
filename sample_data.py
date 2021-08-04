# -*- coding: utf-8 -*-

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mpl_dates
import numpy as np
import json
import seaborn as sb


df = pd.read_csv('D21CE61CAC53_08_Jul_2021_10_33_31.csv', parse_dates=['Date'])


time_series = df[['Date', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3']]\
    .dropna(subset=['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3'])\
        .reset_index(drop=True)
        
plt.figure('Time series')
plt.style.use('seaborn')

plt.plot_date(time_series['Date'], time_series['PM1, ug/m3'], linestyle='solid', \
              marker='', label='PM1')
plt.plot_date(time_series['Date'], time_series['PM2.5, ug/m3'], linestyle='solid', \
              marker='', label='PM2.5')
plt.plot_date(time_series['Date'], time_series['PM10, ug/m3'], linestyle='solid', \
              marker='', label='PM10')

plt.gcf().autofmt_xdate()
date_format = mpl_dates.DateFormatter('%d %b %H:%M')
plt.gca().xaxis.set_major_formatter(date_format)
plt.title('Time series showing how density of particulates (ug/m3) varies with time')
plt.xlabel('Date and time')
plt.ylabel('Density of particulates, ug/m3')
plt.legend()

time_series['Date'] = time_series['Date'].astype(str)
time_series.to_json('timeseries.json')


heat_map = df[['Longitude', 'Latitude', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3', 'Date']]\
    .dropna(subset=['Longitude', 'Latitude', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3', 'Date'])\
        .reset_index(drop=True)

num_cuts = 20
cuts = pd.DataFrame({str(feature) + ' Bin' : pd.cut(heat_map[feature], num_cuts) \
                     for feature in ['Longitude', 'Latitude']}) #creates DF where Long and Lat columns are the bin each datapoint goes in
groups = heat_map.join(cuts).groupby(list(cuts)) #joins the DFs and divides into groups based on Long and Lat bins
means = groups.mean()
means_dropna = means.dropna()
print(means_dropna)
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
    sb.heatmap(means[dependent_var], annot = True, \
           xticklabels = means[dependent_var].columns.map(lambda x : x.left), \
           yticklabels = means[dependent_var].index.map(lambda x : x.left), \
               cmap = 'coolwarm')
    plt.title('Heat map showing how density of ' + dependent_var + ' varies with location')
    plt.tight_layout()
