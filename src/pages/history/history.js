// pages/history/history.js
var moment = require('../../dist/moment.min.js');
var util = require('../../dist/zh-cn.js');
var get_user_info = require('../../dist/user.js').get_user_info;
var myChart = require("../../dist/mycharts.js");

var app = getApp();
var g_data = app.globalData;
var DATA_VERSION = '1';
var DATA_VERSION_2 = '2';
var DATA_FM1_LENGTH = 5;
var DATA_FM1_LENGTH_2 = 6;
var DATA_FM2_LENGTH = 7;
var DATA_FM2_LENGTH_2 = 5;
var first_count = 5;
var per_count = 10;
var items = [];
var item_list = ['温度', '湿度', '气压', '光强'];
moment.locale('zh-cn');

function week_format(idx) { //星期格式化
  var day = '';
  switch(idx) {
    case 0: 
      day = '一';
      break;
    case 1: 
      day = '二';
      break;
    case 2: 
      day = '三';
      break;
    case 3: 
      day = '四';
      break;
    case 4: 
      day = '五';
      break;
    case 5: 
      day = '六';
      break;
    case 6: 
      day = '日';
      break;
  }
  return day;
}
function sortNumber(a, b) {
  return a - b; //从小到大排
} 

function compute_mean(arr) { //计算平均值
  var sort_data = arr.sort(sortNumber);
  var sum = 0;
  var valid_length = sort_data.length;
  for (var i = 0; i < sort_data.length; ++i) {
      if (sort_data[i] !== '') {
          sum += sort_data[i];
      } else {
          valid_length--;
      }
  }
  return sum / valid_length;
}

Page({
    data:{
        has_no_device: false,
        tabIndex: 2,
        typeIndex: 1,
        opacity: 0,
        hide_no_more: true,
        canvasHeight: 160
    },
    /**查看视频 */
    checkVideo: function (e) {
      var that = this;
      var device_id = e.currentTarget.dataset.deviceid;
      var date_idx = that.data.tabIndex;
      var photos = that.data.photos;
      var COUNT = 28; //统计数据的正常长度
      get_user_info(false, function (user) {
        if (user) {
          wx.request({ //取图片
            url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "/datapoints?data_type_id=12&since=" + photos[date_idx].since + "&until=" + photos[date_idx].until + "&encoding=ascii&access_token=" + user.accessToken,
            method: "GET",
            success: function (res) {
              if (res.statusCode === 200) {
                var data_arr = res.data.datapoints[0].data.split(','); //最近一天的统计数据
                if (data_arr.length >= COUNT) { //统计数据中有图片及视频
                  var img_src = data_arr[COUNT - 6];
                  var video_src = data_arr[COUNT-3];
                  var scale = Number(data_arr[COUNT - 1]) / Number(data_arr[COUNT - 2]);
                  var video_width = g_data.screenWidth;
                  wx.navigateTo({
                    url: '../video/video?video_src=' + video_src + '&img_src=' + img_src + '&video_width=' + video_width + '&scale=' + scale,
                    fail: function() {
                    },
                  });
                }
              }
            },
            fail: function(err) {

            }
          });
        }
      });
    },
    preview: function(e) { //预览
      var device_idx = e.currentTarget.dataset.deviceindex;
      var photo_idx = e.currentTarget.dataset.photoindex;
      
      var urls = [];
      var list = this.data.photos[this.data.tabIndex].list[device_idx].imgs;
      for(var i = 0; i < list.length; ++i) {
          urls.push(list[i].originSrc);
      }
      wx.previewImage({
          current: list[photo_idx].originSrc, // 当前显示图片的http链接
          urls: urls, // 需要预览的图片http链接列表
      });
    },
    loadChartsData: function () { //获取图表数据
      app.showLoading('正在加载');
      var that = this;
      that.setData({
        fullWidth: g_data.screenWidth,
        fullHeight: g_data.screenHeight
      });

      var day_idx = that.data.tabIndex;
      var offset = that.data.photos[day_idx].offset;
      var since = that.data.photos[day_idx].since;
      var until = that.data.photos[day_idx].until;
      var week_charts = that.data.week_charts;
      var devices = g_data.scenes[g_data.sceneIdx].devices;
      var fm1 = [];
      var fm2 = [];
      for(var i = 0; i < devices.length; ++i) {
        if (devices[i].model_id === 2) {
          fm1.push(devices[i]);
        } else if (devices[i].model_id === 3) {
          fm2.push(devices[i]);
        }
      }
      var flag_count = 0;
      var day_charts = []; //单天数据
      week_charts[day_idx].list = day_charts;
      get_user_info(false, function (user) {
          if (user) {
              fm1.forEach(function (device, each_index) { //循环设备
                  wx.request({ //取对应数据
                      url: "https://iot.xaircraft.com/weixin/devices/" + device.device_id + "/datapoints?data_type_id=1&count=400&since=" + since + "&until=" + until + "&order=asc&encoding=ascii&access_token=" + user.accessToken,
                      method: "GET",
                      success: function (res) {
                        app.hideLoading();
                          if (res.statusCode === 200) { //获取数据成功
                              week_charts[day_idx].loaded = true;
                              flag_count++;
                              var data_points = res.data.datapoints;
                              if (!data_points.length) { //没有数据
                                  if (flag_count === devices.length) {
                                      app.hideLoading();
                                      that.draw();
                                  }
                                  return;
                              }

                              var valid_time = []; //有数据的时间
                              var valid_values = [[], [], [], [], []]; //有效数据（全部类型）
                              for (var i = 0; i < data_points.length; ++i) {
                                  var data = data_points[i].data.split(',');
                                  if ((data.length === DATA_FM1_LENGTH && data[0] === DATA_VERSION) || (data.length === DATA_FM1_LENGTH_2 && data[0] === DATA_VERSION_2)) { //数据长度为5，版本为1
                                      valid_time.push(moment(1000 * data_points[i].created_at).format('HH'));
                                      for (var j = 1; j < data.length; ++j) { //k表示datapoint中分类的下标，1温度2湿度
                                          if (data[j] !== '') {
                                              valid_values[j-1].push(Number(data[j]));
                                          } else {
                                              valid_values[j - 1].push(''); //确保各个类型数据长度与时间数组长短一致
                                          }
                                      }
                                  }
                              }
                              
                              var type_length = 4;
                              var show_time = []; //图表上的时间
                              var show_charts = [[], [], [], []]; //图表显示数组(全部类型)
                              for (var i = 0; i < 24; ++i) { //显示时间格式化
                                  if(i < 10) {
                                      show_time.push('0'+i+':00');
                                  } else {
                                      show_time.push(i + ':00');
                                  }
                              } //初始化图表时间显示

                              for (var i = 0; i < type_length; ++i) { //初始化单台设备各个类型图表的初始显示数据
                                  for (var j = 0; j < show_time.length; ++j) {
                                      show_charts[i].push([]);
                                  }
                              }

                              for (var i = 0; i < type_length; ++i) { //整合相同时间段的数据（有效时间段数<=24）
                                  for (var j = 0; j < valid_time.length; ++j) {
                                      var valid_idx = Number(valid_time[j]); //有效时段下标
                                      if (valid_values[i][j] !== '') { //该时间点valid_values[j]数据存在且不为空
                                          show_charts[i][valid_idx].push(valid_values[i][j]); //各个类型各个时段的数据组
                                      }
                                  }
                              }
                              var computed_charts = [[], [], [], []]; //时间段计算值（平均值）
                              for(var i = 0; i < type_length; ++i) {
                                  var cpted_chart = computed_charts[i];
                                  for (var j = 0; j < show_time.length; ++j) {
                                      var closet_values = show_charts[i][j]; //相同时间段数据组
                                      if (!closet_values.length) { //没有数据
                                          cpted_chart.push('');
                                      } else if (closet_values.length === 1) { //该小时只有一条数据
                                          cpted_chart.push(Number(closet_values[0].toFixed(1)));
                                      } else {
                                          cpted_chart.push(Number(compute_mean(closet_values).toFixed(1))); //按时计算的温度
                                      }
                                  }
                              }
                              
                              var device_charts = {
                                  name: device.name ? device.name : device.device_id,
                                  canvas_id: day_idx + '_fm1_' + each_index, //（下标）日期，设备
                                  radios: [{
                                      idx: 0,
                                      name: '温度',
                                      checked: true,
                                      color: '#75ca85',
                                  }, {
                                      idx: 1,
                                      name: '湿度',
                                      checked: false,
                                      color: '#ffbb78',
                                  }, {
                                      idx: 2,
                                      name: '气压',
                                      checked: false,
                                      color: '#9f8ef8',
                                  }, {
                                      idx: 3,
                                      name: '光强',
                                      checked: false,
                                      color: '#ff5674',
                                  }],
                                  show_type: 0,
                                  data: [{}, {}, {}, {}]
                              };
                              for (var i = 0; i < type_length; ++i) {
                                  var unit = '℃';
                                  var chart_name = '温度';
                                  var color = '#75ca85';
                                  if (i === 1) {
                                      unit = '%';
                                      chart_name = '湿度';
                                      color = '#ffbb78';
                                  } else if (i === 2) {
                                      unit = 'hPa';
                                      chart_name = '气压';
                                      color = '#9f8ef8';
                                  } else if (i === 3) {
                                      unit = 'Lux';
                                      chart_name = '光强';
                                      color = '#ff5674';
                                  }
                                  if (computed_charts[i].length) {
                                      device_charts.data[i] = {
                                          unit: unit,
                                          chart_name: chart_name,
                                          xAxis: show_time,
                                          value: computed_charts[i],
                                          color: color,
                                          desc: {
                                              hidden: true,
                                              value: '',
                                              left: 0,
                                              top: 0,
                                              x: ''
                                          }
                                      };
                                  }
                              }
                              day_charts.push(device_charts); //当天数据
                              
                              if (flag_count === devices.length) {
                                  app.hideLoading();
                                  that.setData({
                                      week_charts: week_charts
                                  });
                                  that.draw();
                              }
                          } else {
                            flag_count++;
                            app.hideLoading();
                            app.showModal('加载失败', '历史数据加载失败，请稍后再试');
                          }
                      },
                      fail: function () {
                          flag_count++;
                          app.hideLoading();
                          app.showModal('加载失败', '请检查你的网络设置');
                      }
                  });
              });
              var fm2_since = moment.unix(since).add(-1, 'hours').unix(); // 往前取一小时，保证第一个点有基准值可以比对
              fm2.forEach(function (device, each_index) { //循环设备
                wx.request({ //取对应数据
                  url: "https://iot.xaircraft.com/weixin/devices/" + device.device_id + "/datapoints?data_type_id=3&count=400&since=" + fm2_since + "&until=" + until + "&order=asc&encoding=ascii&access_token=" + user.accessToken,
                  method: "GET",
                  success: function (res) {
                    if (res.statusCode === 200) { //获取数据成功
                      week_charts[day_idx].loaded = true;
                      flag_count++;
                      var data_points = res.data.datapoints;
                      if (!data_points.length) { //没有数据
                        if (flag_count === devices.length) {
                          app.hideLoading();
                          that.draw();
                        }
                        return;
                      }

                      var valid_time = []; //有数据的时间
                      var valid_values = [[], [], [], [], [], []]; //有效数据（全部类型）
                      var primay_rainfall = [];
                      
                      for (var i = 0; i < data_points.length; ++i) {
                        var data = data_points[i].data.split(',');
                        if (data.length === DATA_FM2_LENGTH && data[0] === DATA_VERSION) { //数据长度为7，版本为1
                          if (data_points[i].created_at >= since) {
                            valid_time.push(moment(1000 * data_points[i].created_at).format('HH'));
                            for (var j = 1; j < data.length; ++j) { /*valid_values下标，1降雨量2风速,*/
                              valid_values[j - 1].push(data[j] !== '' && Number(data[j]) >= 0 ? Number(data[j]) : '');
                              /*push空串的作用是确保各个类型数据长度与时间数组长短一致*/
                            }
                          } else { /*额外放置头一天的降雨总量备用*/
                            if (data[1] !== '' && Number(data[1]) >= 0) {
                              primay_rainfall.push(Number(data[1]));
                            }
                          }
                        }
                      }
// console.log(valid_values)
                      var type_length = 5;
                      var show_time = []; //图表上的时间
                      var show_charts = [[], [], [], [], []]; //图表显示数组(全部类型)
                      for (var i = 0; i < 24; ++i) { //显示时间格式化
                        if (i < 10) {
                          show_time.push('0' + i + ':00');
                        } else {
                          show_time.push(i + ':00');
                        }
                      } //初始化图表时间显示

                      for (var i = 0; i < type_length; ++i) { //初始化单台设备各个类型图表的初始显示数据
                        for (var j = 0; j < show_time.length; ++j) {
                          show_charts[i].push([]);
                        }
                      }

                      for (var i = 0; i < type_length; ++i) { //整合相同时间段的数据（有效时间段数<=24）
                        for (var j = 0; j < valid_time.length; ++j) {
                          var valid_idx = Number(valid_time[j]); //有效时段下标
                          if (valid_values[i][j] !== '') { //该时间点valid_values[j]数据存在且不为空
                            show_charts[i][valid_idx].push(valid_values[i][j]); //各个类型各个时段的数据组
                          }
                        }
                      }
                      // console.log('show_charts**************')
                      // console.log(show_charts)
                      var computed_charts = [[], [], [], [], []]; //时间段计算值（平均值）
                      for (var i = 1; i < type_length; ++i) { //从1开始，降雨量下面单独计算
                        var cpted_chart = computed_charts[i];
                        for (var j = 0; j < show_time.length; ++j) {
                          var closet_values = show_charts[i][j]; //相同时间段数据组
                          if (!closet_values.length) { //没有数据
                            cpted_chart.push('');
                          } else if (closet_values.length === 1) { //该小时只有一条数据
                            cpted_chart.push(Number(closet_values[0].toFixed(1)));
                          } else {
                            cpted_chart.push(Number(compute_mean(closet_values).toFixed(1))); //按时计算
                          }
                        }
                      }

                      var hours_rainfall = show_charts[0];
                      var start_points = []; /*每个小时的起始降雨总量*/
                      start_points.push(primay_rainfall.length ? primay_rainfall[0] : ''); /*插入初始降雨总量*/
                      for (var i = 0; i < hours_rainfall.length; ++i) {
                        start_points.push(hours_rainfall[i].length ? hours_rainfall[i][0] : '');
                      }
                      // console.log(start_points)

                      for (var i = 1; i < start_points.length; ++i) {
                        if (start_points[i] !== '' && start_points[i - 1] !== '') {
                          var cur_hour_rainfall = start_points[i] - start_points[i - 1] >= 0 ? Number((start_points[i] - start_points[i - 1]).toFixed(1)) : 0;
                          computed_charts[0].push(cur_hour_rainfall);
                        } else {
                          computed_charts[0].push('');
                        }
                      }
                      // console.log('computed_charts*************')
                      // console.log(computed_charts)
                      var device_charts = {
                        name: device.name ? device.name : device.device_id,
                        canvas_id: day_idx + '_fm2_' + each_index, //（下标）日期，设备
                        radios: [
                          {
                            idx: 0,
                            name: '降雨量',
                            checked: true,
                            color: '#91c8f6',
                          },
                          {
                            idx: 1,
                            name: '风速',
                            checked: false,
                            color: '#fba786',
                          },
                          {
                            idx: 2,
                            name: '风向',
                            checked: false,
                            color: '#fba786',
                          },
                          {
                            idx: 3,
                            name: '土壤温度',
                            checked: false,
                            color: '#9f8ef8',
                          },
                          {
                            idx: 4,
                            name: '土壤含水量',
                            checked: false,
                            color: '#ff5674',
                          }
                        ],
                        show_type: 0,
                        data: [{}, {}, {}]
                      };
                      for (var i = 0; i < type_length; ++i) {
                        var unit = 'mm';
                        var chart_name = '降雨量';
                        var color = '#91c8f6';
                        if (i === 1) {
                          unit = 'm/s';
                          chart_name = '风速';
                          color = '#fba786';
                        } else if (i === 3) {
                          unit = '℃';
                          chart_name = '土壤温度';
                          color = '#ff5674';
                        } else if (i === 4) {
                          unit = '%';
                          chart_name = '土壤含水量';
                          color = '#9f8ef8';
                        }

                        if (computed_charts[i].length) {
                          device_charts.data[i] = {
                            unit: unit,
                            chart_name: chart_name,
                            xAxis: show_time,
                            value: computed_charts[i],
                            color: color,
                            desc: {
                              hidden: true,
                              value: '',
                              left: 0,
                              top: 0,
                              x: ''
                            }
                          };
                        }
                      }
                      day_charts.push(device_charts); //当天数据

                      if (flag_count === devices.length) {
                        app.hideLoading();
                        that.setData({
                          week_charts: week_charts
                        });
                        that.draw();
                      }
                    } else {
                      flag_count++;
                      app.hideLoading();
                      app.showModal('加载失败', '历史数据加载失败，请稍后再试');
                    }
                  },
                  fail: function () {
                    flag_count++;
                    app.hideLoading();
                    app.showModal('加载失败', '请检查你的网络设置');
                  }
                });
              });
          }
      });        
    },
    draw: function() { //赋值canvas
        var that = this;
        var week_charts = that.data.week_charts;
        var day_idx = that.data.tabIndex;
        var chart_type_idx = that.data.chart_type_idx;
        var devices = that.data.week_charts[day_idx].list;
        for (var i = 0; i < devices.length; i++) {
          var radios = devices[i].radios;
          var checked_chart = {};
          for(var j = 0; j < radios.length; ++j) {
            if(radios[j].checked) {
              checked_chart = devices[i].data[j];
              var data_value = checked_chart.value;
              var last_idx = -1;
              for (var k = 0; k < data_value.length; ++k) {
                if(data_value[k] !== '') {
                  last_idx = k;
                }
              }
              break;
            }
          }

          new myChart({
              day_idx: day_idx,
              device_idx: i,
              canvasId: devices[i].canvas_id,
              unit: checked_chart.unit,
              type: "line",
              canvasHeight: that.data.canvasHeight,
              style: {
                lineColor: checked_chart.color,
                pointColor: checked_chart.color,
              },
              showYAxis: true,
              data: {
                  xAxis: checked_chart.xAxis,
                  yAxis: checked_chart.value
              },
              title: {
                  xAxis: '',
                  yAxis: ''
              }
          });

          if (last_idx >= 0) {
            checked_chart.desc = {
              hidden: false,
              value: checked_chart.value[last_idx], //坐标Y值
              left: g_data.x_position[day_idx][i][last_idx] + 9.5, //新的坐标辅助线
              x: checked_chart.xAxis[last_idx], //坐标X值
            };
          } else {
            checked_chart.desc = {
              hidden: true,
              value: checked_chart.value[0], //坐标Y值
              left: g_data.x_position[day_idx][i][0] + 9.5, //新的坐标辅助线
              x: checked_chart.xAxis[0], //坐标X值
            };
          }
        }
        
        that.setData({
          week_charts: week_charts
        });
    },
    touchMove: function (e) { //移动触摸
        var that = this;
        var week_charts = that.data.week_charts;
        var day_idx = that.data.tabIndex;
        var chart_type_idx = that.data.chart_type_idx;
        var devices = that.data.week_charts[day_idx].list;
        //图表下标
        var device_idx = e.target.target || e.target.id; //手机 || 开发工具
        
        function closest(arr, num) {
            var idx = -1;
            var distance = 0;
            for (var i = 0; i < arr.length; i++) {
              if (isNaN(arr[i])) { //不能判断空串或空格,所以g_data.x_position中空串用'9999'代替
                continue;
              } else {
                idx = i;
                distance = Math.abs(arr[i] - num);
              }
            }
            
            for (var i = 0; i < arr.length; i++) {
                if (isNaN(arr[i])) {
                    continue;
                }
                var newDistance = Math.abs(arr[i] - num);
                if (newDistance < distance) {
                    distance = newDistance;
                    idx = i;
                }
            }
            return idx;
        }

        var res = closest(g_data.x_position[day_idx][device_idx], e.changedTouches[0].x); //数据值的下标

        if(res < 0) {
          return
        }
        
        var device = devices[device_idx];
        var show_chart = device.data[device.show_type];
        for (var i = 0; i < devices.length; i++) {
            var dev = devices[i];
            var chart = dev.data[dev.show_type];
            // chart.desc.hidden = true;
        }
        
        show_chart.desc = {
            hidden: false,
            value: show_chart.value[res], //坐标Y值
            left: g_data.x_position[day_idx][device_idx][res] + 9.5, //新的坐标辅助线
            x: show_chart.xAxis[res] //坐标X值
        };
        
        if (Number(res) <= 12) {
            var left = show_chart.desc.left + 10;
            show_chart.desc['style'] = 'left: ' + left + 'px;';
        } else {
            var right = that.data.fullWidth - show_chart.desc.left + 10;
            show_chart.desc['style'] = 'right: ' + right + 'px;';
        }
        that.setData({
            week_charts: week_charts
        });
    },
    loadPhotosData: function() { //加载更多图片
        app.showLoading('正在加载');
        var that = this;
        var day_idx = that.data.tabIndex;
        var offset = that.data.photos[day_idx].offset;
        var since = that.data.photos[day_idx].since;
        var until = that.data.photos[day_idx].until;
        var devices = g_data.scenes[g_data.sceneIdx].devices;
        var photos = that.data.photos;

        var empty_flag = 0;
        get_user_info(false, function(user) {
            if(user) {
                devices.forEach(function(device) { //循环设备
                    var device_name = device.name;
                    var device_id = device.device_id;
                    wx.request({ //取图片
                        url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "/datapoints?data_type_id=2&offset=" + offset + "&count=" + first_count+"&since="+since+"&until="+until+"&encoding=ascii&access_token="+user.accessToken,
                        method: "GET",
                        success: function(res) {
                            app.hideLoading();
                            if(res.statusCode === 200) { //获取成功
                                let photo_points = res.data.datapoints;
                                photos[day_idx].loaded = true;
                                var cur_device = {
                                    device_id: device_id,
                                    name: device_name,
                                    scroll_height: 0,
                                    offset: 0,
                                    count: 0,
                                    empty: false,
                                    full: false,
                                    imgs: []
                                };

                                if(!photo_points.length) { //该天该设备无图片
                                    empty_flag++;
                                    cur_device.empty = true;
                                    if(empty_flag === devices.length) { //每台设备都没有图片
                                        that.setData({
                                            photos: photos
                                        });
                                    }
                                    return;
                                }

                                for(var i = 0; i < photo_points.length; ++i) { //一组per_count张
                                    var created_at = photo_points[i].created_at;
                                    var interval = moment().diff(moment(1000*created_at), 'seconds');
                                    if(interval < 60) { //1分钟内
                                        interval = '刚刚';
                                    } else {
                                        interval = moment().diff(moment(1000*created_at), 'days');
                                        interval = interval ? (interval+'天') : moment(1000*created_at).fromNow(true);
                                    }
                                    var photo_data = photo_points[i].data.split(',');
                                    var scale = 148/338;
                                    if(photo_data[1] && photo_data[2]) {
                                        scale = photo_data[2]/photo_data[1]; // 宽在前,高在后,高/宽
                                    }
                                    cur_device.scroll_height = scale * (that.data.fullWidth - 15) * 0.8 + 30; //包括图片高度和文字高度,0.8为所占比例

                                    cur_device.imgs.push({
                                        date: moment(1000*created_at).format('YYYY-MM-DD HH:mm:ss'),
                                        interval: interval,
                                        src: photo_data[0] + '?x-oss-process=image/resize,w_507',
                                        height: scale*(that.data.fullWidth - 15)*0.8,
                                        originSrc: photo_data[0],
                                        data: {
                                            tem: {
                                            val: '--',
                                            desc: ''
                                            },
                                            hum: {
                                            val: '--',
                                            desc: ''
                                            },
                                            press: {
                                            val: '--',
                                            desc: ''
                                            },
                                            im: {
                                            val: '--',
                                            desc: ''
                                            }
                                        }
                                    });
                                }
                                
                                if(photo_points.length) {
                                    cur_device.count = photo_points.length;
                                    cur_device.offset = first_count;
                                }
                                
                                var total = res.data.total;
                                if (total <= cur_device.count || photo_points.length < first_count) { //取完
                                    cur_device.full = true;
                                }
                                photos[day_idx].list.push(cur_device);
                                
                                that.setData({
                                    photos: photos
                                });
                            } else {
                                app.showModal('获取失败','获取历史图像失败，请稍后再试');
                            }
                        },
                        fail: function(err) {
                            app.hideLoading();
                            // app.showModal('获取失败','请检查你的网络设置');
                        }
                    });
                });
            }
        }); //获取结束
    },
    tabClick: function (e) { //tab切换(日期)
        var that = this;
        var devices = g_data.scenes[g_data.sceneIdx].devices;
        
        var day_idx = Number(e.currentTarget.id);
        that.setData({
            tabIndex: day_idx,
            opacity: 0,
            hide_no_more: true
        });
               
        if (!devices.length) { //该场景没有设备
            that.setData({
                has_no_device: true
            });
            return;
        }
        var type_idx = that.data.typeIndex;
        if(type_idx == 2) { //图表
            var week_charts = that.data.week_charts;
            if (!week_charts[day_idx].loaded) { //未获取过则获取一次
                that.loadChartsData();
            } else {
                that.draw();
            }
        } else {
            var photos = that.data.photos;
            if (!photos[day_idx].loaded) { //未获取过则获取一次
                that.loadPhotosData();
            }
        }
    },
    selectType: function (e) { //数据类型切换
        var that = this;
        var idx = e.currentTarget.id;
        var devices = g_data.scenes[g_data.sceneIdx].devices;
        that.setData({
            typeIndex: idx
        });
        if (!devices.length) { //该场景没有设备
          that.setData({
            has_no_device: true
          });
          return;
        }
        var day_idx = that.data.tabIndex;
        if (idx == 2) { //图表
            var week_charts = that.data.week_charts;
            if (!week_charts[day_idx].loaded) { //未获取过则获取一次
                that.loadChartsData();
            } else {
                that.draw();
            }
        } else { //图像
            var photos = that.data.photos;
            if (!photos[day_idx].loaded) { //未获取过则获取一次
                that.loadPhotosData();
            }
        }
    },
    radioChange: function(e) { //图表类型切换
        var that = this;
        var week_charts = that.data.week_charts;
        var new_type = Number(e.detail.value); //当前所选类型
        var device_idx = e.currentTarget.dataset.deviceidx;
        var day_idx = that.data.tabIndex; //当前日期

        var device = week_charts[day_idx].list[device_idx]; //当前设备
        
        var radios = device.radios;
        for (var i = 0; i < radios.length; ++i) {
            radios[i].checked = false;
        }
        radios[new_type].checked = true;
        device.show_type = new_type;
        that.setData({
            week_charts: week_charts
        });
        that.draw();
    },
    onLoad: function(options) { //页面加载
        var that = this;
        var scene_idx = options.scene_idx;
        var week = [
          { //tab初始化
            idx: 0,
            name: week_format(moment().add(-5, 'days').weekday()),
            date: moment().add(-5, 'days').format('YYYY-MM-DD'),
            showDate: moment().add(-5, 'days').format('MM/DD')
          },
          {
              idx: 1,
              name: week_format(moment().add(-4, 'days').weekday()),
              date: moment().add(-4, 'days').format('YYYY-MM-DD'),
              showDate: moment().add(-4, 'days').format('MM/DD')
          },
          {
              idx: 2,
              name: week_format(moment().add(-3, 'days').weekday()),
              date: moment().add(-3, 'days').format('YYYY-MM-DD'),
              showDate: moment().add(-3, 'days').format('MM/DD')
          },
          {
              idx: 3,
              name: week_format(moment().add(-2, 'days').weekday()),
              date: moment().add(-2, 'days').format('YYYY-MM-DD'),
              showDate: moment().add(-2, 'days').format('MM/DD')
          },
          {
              idx: 4,
              name: week_format(moment().add(-1, 'days').weekday()),
              date: moment().add(-1, 'days').format('YYYY-MM-DD'),
              showDate: moment().add(-1, 'days').format('MM/DD')
          },
          {
              idx: 5,
              name: week_format(moment().weekday()),
              date: moment().format('YYYY-MM-DD'),
              showDate: moment().format('MM/DD')
          }
        ];
        var current_tab = 5;
        
        var photos = [
          {
            list: [],
            offset: 0,
            loaded: false,
            since: moment(moment().add(-5, 'days').format('YYYY-MM-DD') + ' 00:00:00').unix(),
            until: moment(moment().add(-5, 'days').format('YYYY-MM-DD') + ' 23:59:59').unix()
          },
          {
              list: [],
              offset: 0,
              loaded: false,
              since: moment(moment().add(-4, 'days').format('YYYY-MM-DD') + ' 00:00:00').unix(),
              until: moment(moment().add(-4, 'days').format('YYYY-MM-DD') + ' 23:59:59').unix()
          },
          {
              list: [],
              offset: 0,
              loaded: false,
              since: moment(moment().add(-3, 'days').format('YYYY-MM-DD') + ' 00:00:00').unix(),
              until: moment(moment().add(-3, 'days').format('YYYY-MM-DD') + ' 23:59:59').unix()
          },
          {
              list: [],
              offset: 0,
              loaded: false,
              since: moment(moment().add(-2, 'days').format('YYYY-MM-DD') + ' 00:00:00').unix(),
              until: moment(moment().add(-2, 'days').format('YYYY-MM-DD') + ' 23:59:59').unix()
          },
          {
              list: [],
              offset: 0,
              loaded: false,
              since: moment(moment().add(-1, 'days').format('YYYY-MM-DD') + ' 00:00:00').unix(),
              until: moment(moment().add(-1, 'days').format('YYYY-MM-DD') + ' 23:59:59').unix()
          },
          {
              list: [],
              offset: 0,
              loaded: false,
              since: moment(moment().format('YYYY-MM-DD') + ' 00:00:00').unix(),
              until: moment().unix()
          }
        ];

        var has_video = (photos[photos.length - 1].until - photos[photos.length - 1].since) / 3600 > 1; /*是否到达video合成的时间 */

        var week_charts = [
          {
            list: [],
            loaded: false
          },
          {
              list: [],
              loaded: false
          },
          {
              list: [],
              loaded: false
          },
          {
              list: [],
              loaded: false
          },
          {
              list: [],
              loaded: false
          },
          {
              list: [],
              loaded: false
          }
        ];

        var chart_types = [
          {
            idx: 0,
            name: '温度',
            checked: true
          },
          {
              idx: 1,
              name: '湿度',
              checked: false
          },
          {
              idx: 2,
              name: '气压',
              checked: false
          },
          {
              idx: 3,
              name: '光强',
              checked: false
          }
        ];

        that.setData({
            fullWidth: g_data.screenWidth,
            fullHeight: g_data.screenHeight,
            photo_width: 0.8*(g_data.screenWidth - 30),
            week: week,
            name: g_data.scenes[scene_idx].name, //地块名
            tabIndex: current_tab, //当前日期
            photos: photos,
            week_charts: week_charts,
            chart_type_idx: 0,
            chart_types: chart_types,
            has_video: has_video,
        });

        var devices = g_data.scenes[g_data.sceneIdx].devices;

        if (!devices.length) { //该场景没有设备
            that.setData({
                has_no_device: true
            });
            return;
        }
        that.loadPhotosData();
    },
    loadMore: function(e) { //加载更多照片
        var that = this;
        var day_idx = that.data.tabIndex; //日期
        var device_idx = e.currentTarget.dataset.index;
        var device_id = e.currentTarget.id; //设备
        if (that.data.photos[day_idx].list[device_idx].empty) { //无图片
            return;
        }
        
        if (that.data.photos[day_idx].list[device_idx].full) { //取完
            that.setData({
                opacity: 0.6,
                hide_no_more: false
            });
            setTimeout(function () {
                that.setData({
                    opacity: 0
                });
            }, 1000);
            setTimeout(function () {
                that.setData({
                    hide_no_more: true
                });
            }, 2000);
            return;
        }

        // 加载更多图片
        var device = that.data.photos[day_idx].list[device_idx];
        var since = that.data.photos[day_idx].since;
        var until = that.data.photos[day_idx].until;
        app.showLoading('获取中');
        get_user_info(false, function (user) {
            if (user) {
                wx.request({ //取图片
                    url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "/datapoints?data_type_id=2&offset=" + device.offset + "&count=" + per_count + "&since=" + since + "&until=" + until + "&encoding=ascii&access_token=" + user.accessToken,
                    method: "GET",
                    success: function (res) {
                        app.hideLoading();
                        if (res.statusCode === 200) { //获取成功
                            let photo_points = res.data.datapoints;
                            var photos = that.data.photos;

                            for (var i = 0; i < photo_points.length; ++i) { //一组per_count张
                                var created_at = photo_points[i].created_at;
                                var interval = moment().diff(moment(1000 * created_at), 'seconds');
                                if (interval < 60) { //1分钟内
                                    interval = '刚刚';
                                } else {
                                    interval = moment().diff(moment(1000 * created_at), 'days');
                                    interval = interval ? (interval + '天') : moment(1000 * created_at).fromNow(true);
                                }
                                var photo_data = photo_points[i].data.split(',');
                                var scale = 148 / 338;
                                if (photo_data[1] && photo_data[2]) {
                                    scale = photo_data[2] / photo_data[1]; // 宽在前,高在后,高/宽
                                }
                                device.imgs.push({
                                    date: moment(1000 * created_at).format('YYYY-MM-DD HH:mm:ss'),
                                    interval: interval,
                                    src: photo_data[0] + '?x-oss-process=image/resize,w_507',
                                    height: scale * (that.data.fullWidth - 15) * 0.8,
                                    originSrc: photo_data[0],
                                    data: {
                                        tem: {
                                            val: '--',
                                            desc: ''
                                        },
                                        hum: {
                                            val: '--',
                                            desc: ''
                                        },
                                        press: {
                                            val: '--',
                                            desc: ''
                                        },
                                        im: {
                                            val: '--',
                                            desc: ''
                                        }
                                    }
                                });
                            }

                            if (photo_points.length) {
                                device.count += photo_points.length;
                                device.offset += per_count;
                            }
                            var total = res.data.total;
                            if (total <= device.count || photo_points.length < per_count) { //取完
                                device.full = true;
                            }
                            
                            that.setData({
                                photos: photos
                            });
                        } else {
                            app.showModal('获取失败', '获取历史图像失败，请稍后再试');
                        }
                    },
                    fail: function () {
                        app.hideLoading();
                        app.showModal('获取失败', '请检查你的网络设置');
                    }
                });
            }
        }); //获取结束
    },
    onReachBottom: function () {
    }
});