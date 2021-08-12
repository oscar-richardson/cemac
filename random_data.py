# -*- coding: utf-8 -*-

import pandas as pd
import datetime
import random
import geopy.distance as gp
import numpy as np
import math
from time import perf_counter

columns = ['Date', 'VOC, ppm', 'AQS', 'Temperature, °C', 'Humidity, %', 
           'Pressure, mbar', 'PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3',
           'Latitude', 'Longitude']

weeks = {
    '04_10' : [3, 10]
    }

schools = {
    'st_stephens' : (53.77875400063466, -1.7551848715634326),
    'dixons' : (53.787186364739355, -1.7624239022540404),
    'barkerend' : (53.79842726568868, -1.7364155273805402),
    'whetley' : (53.801537543801786, -1.7832542310897233),
    'st_johns' : (53.76680095549655, -1.7208751022550544),
    'brackenhill' : (53.77905210236545, -1.7904848776356355),
    'st_barnabas' : (53.81745267846675, -1.7864735273796086),
    'beckfoot_heaton' : (53.81555273363125, -1.807735698543326),
    'beckfoot_allerton' : (53.804676808473715, -1.8225839022531742),
    'home_farm' : (53.76550022814875, -1.8090675989165224)
}

for week in list(weeks.keys()):
    for school in list(schools.keys()):
        for atmotube in range(1,6):
            
            start_time = perf_counter()
            
            df = pd.DataFrame(columns=columns)
            
            date = datetime.datetime(2021, weeks[week][1], weeks[week][0], 23, 59, 0)
            date_delta = datetime.timedelta(minutes=1)
            
            voc = 0.25
            aqs = 85
            vocaqs_nan = []
            for i in range([0, 0, random.randint(1, 3)][random.randint(0, 2)]):
                random_index = random.randint(0, 7199)
                while random_index in vocaqs_nan:
                    random_index = random.randint(0, 7199)
                vocaqs_nan.append(random_index)
            
            temp = 10
            hum = 45
            temphum_nan = []
            start_index = random.randint(0, 7199)
            end_index = start_index + random.randint(150, 300)
            if end_index > 7199:
                end_index = 7199
            for i in range(start_index, end_index + 1):
                temphum_nan.append(i)
            
            press = 990
            
            pm1 = 0.7
            pm2p5 = 0.55
            pm10 = 2
            pm_112 = []
            num_clusters = random.randint(200, 1800)
            clusters = []
            while num_clusters > 0:
                cluster_size = random.randint(1, num_clusters)
                clusters.append(cluster_size)
                num_clusters -= cluster_size
            for cluster in clusters:
                random_num = random.randint(0,27)
                if random_num == 0:
                    start_index = 0
                elif random_num > 0 and random_num < 5:
                    start_index = 7199 - cluster
                else:
                    start_index = random.randint(0, 7199)
                end_index = start_index + cluster
                if end_index > 7199:
                    end_index = 7199
                for i in range(start_index, end_index + 1):
                    pm_112.append(i)
            pm_nan = []
            for i in range(random.randint(0, 300)):
                random_index = random.randint(0, 7199)
                while random_index in pm_nan:
                    random_index = random.randint(0, 7199)
                pm_nan.append(random_index)
            
            origin = schools[school]
            lat = schools[school][0]
            long = schools[school][1]
            lat_scale = (gp.distance(origin, (lat + 1, long)).m + 
                         gp.distance(origin, (lat - 1, long)).m)/2
            long_scale = gp.distance(origin, (lat, long + 1)).m
            latlong_nan = []
            if random.randint(0, 3) == 0:
                start_index = 0
                end_index = 7199
            else:
                start_index = [0, 0, random.randint(0, 7199)][random.randint(0, 2)]
                end_index = start_index + random.randint(200, 2600)
                if end_index > 7199:
                    end_index = 7199
            for i in range(start_index, end_index + 1):
                latlong_nan.append(i)
            
            for i in range(7200):
                
                date += date_delta
                
                voc_delta = np.random.normal(loc=0, scale=0.05)
                if voc + voc_delta > 2 or voc + voc_delta < 0:
                    voc_delta = -voc_delta
                voc += voc_delta
                
                temp_delta = np.random.normal(loc=0, scale=0.1)
                if temp + temp_delta > 15 or temp + temp_delta < 5:
                    temp_delta = -temp_delta
                temp += temp_delta
                
                hum_delta = np.random.normal(loc=0, scale=0.75)
                if hum + hum_delta > 70 or hum + hum_delta < 30:
                    hum_delta = -hum_delta
                hum += hum_delta
                
                press_delta = np.random.normal(loc=0, scale=0.25)
                if press + press_delta > 1020 or press + press_delta < 980:
                    press_delta = -press_delta
                press += press_delta
                
                pm1_delta = np.random.normal(loc=0, scale=0.05)
                if pm1 + pm1_delta > 0.85 or pm1 + pm1_delta < 0.125:
                    pm1_delta = -pm1_delta
                pm1 += pm1_delta
                
                pm2p5_delta = np.random.normal(loc=0, scale=0.05)
                if pm2p5 + pm2p5_delta > 0.85 or pm2p5 + pm2p5_delta < 0.25:
                    pm2p5_delta = -pm2p5_delta
                pm2p5 += pm2p5_delta
                
                pm10_delta = np.random.normal(loc=0, scale=0.7)
                if pm10 + pm10_delta > 70 or pm10 + pm10_delta < 1:
                    pm10_delta = -pm10_delta
                pm10 += pm10_delta
                
                distance = random.uniform(0, 50)
                angle = random.uniform(0, 2*np.pi)
                vector = [distance*math.cos(angle), distance*math.sin(angle)]
                lat_delta = vector[0]/lat_scale
                long_delta = vector[1]/long_scale
                if gp.distance(origin, (lat + lat_delta, long + long_delta)).miles > 1:
                    lat_delta = -lat_delta
                    long_delta = -long_delta
                lat += lat_delta
                long += long_delta
                
                if i in vocaqs_nan:
                    voc_value = np.nan
                    aqs_value = np.nan
                else:
                    voc_value = round(voc, 3)
                    aqs_value = int(100-voc*37.5)
                    
                if i in temphum_nan:
                    temp_value = np.nan
                    hum_value = np.nan
                else:
                    temp_value = round(temp, 1)
                    hum_value = int(hum)
                    
                if i in pm_nan:
                    pm1_value = np.nan
                    pm2p5_value = np.nan
                    pm10_value = np.nan
                elif i in pm_112:
                    pm1_value = 1
                    pm2p5_value = 1
                    pm10_value = 2
                else:
                    pm10_value = int(pm10)
                    pm1_value = math.ceil(pm1*pm2p5*pm10_value)
                    pm2p5_value = math.ceil(pm2p5*pm10_value)
                    
                if i in latlong_nan:
                    lat_value = np.nan
                    long_value = np.nan
                else:
                    lat_value = lat
                    long_value = long
                    
                df.loc[i] = [date.strftime('%d/%m/%Y %H:%M:%S'), voc_value, 
                             aqs_value, temp_value, hum_value, round(press, 2), 
                             pm1_value, pm2p5_value, pm10_value, lat_value, long_value]
                
            df.to_csv('/data/' + school + str(atmotube) + '__' + week + '.csv', index=False)
            print('Saved ' + school + str(atmotube) + '__' + week + '.csv')
            end_time = perf_counter()
            print('Completed in ' + str(end_time - start_time) + ' seconds')
            print('')
