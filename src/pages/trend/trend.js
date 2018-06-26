// pages/trend/trend.js
var moment = require('../../dist/moment.min.js');
var util = require('../../dist/zh-cn.js');
var get_user_info = require('../../dist/user.js').get_user_info;
var myChart = require("../../dist/mycharts.js");

var app = getApp();
var g_data = app.globalData;
var DOS_IDX = 21; //日照时间的下标
var RAINFALL_IDX = 1;

Page({
    data: {
        month_idx: 12,
        canvasHeight: 160,
        right_m: ''
    },
    bindPickerChange: function (e) {
        var that = this;
        var month_idx = e.detail.value;
        that.setData({
            month_idx: month_idx
        });
        var month_charts = that.data.month_charts;
        if (!month_charts[month_idx].loaded) { //没加载过
            that.loadData();
        } else {
            that.draw();
        }
    },
    bindSelectMonth: function (e) {
      var that = this;
      var idx = e.currentTarget.dataset.idx;
      that.setData({
        month_idx: idx,
        right_m: ''
      });
      var month_charts = that.data.month_charts;
      if (!month_charts[idx].loaded) { //没加载过
        that.loadData();
      } else {
        that.draw();
      }
    },
    loadData: function(){ //加载对应日期的数据
        var that = this;
        var devices = g_data.scenes[g_data.sceneIdx].devices;
        if (!devices.length) { //该场景没有设备
          that.setData({
            has_no_device: true
          });
          return;
        }
        app.showLoading('正在加载');
        var fm1 = [];
        var fm2 = [];
        for(var i = 0; i < devices.length; ++i) {
          if(devices[i].model_id === 2) {
            fm1.push(devices[i]);
          } else if (devices[i].model_id === 3) {
            fm2.push(devices[i]);
          }
        }

        var month_charts = that.data.month_charts; //月表集合
        var month_idx = that.data.month_idx; //当前月份下标
        var since = month_charts[month_idx].since;
        var until = month_charts[month_idx].until;
        var month_chart = month_charts[month_idx].list; //单月数据
        var flag_count = 0; // 请求成功的标识
        get_user_info(false, function (user) {
          if (user) {
            fm1.forEach(function (device, each_index) { //循环设备
                wx.request({ //取对应数据
                  url: "https://iot.xaircraft.com/weixin/devices/" + device.device_id + "/datapoints?data_type_id=12&count=200&since=" + since + "&until=" + until + "&order=asc&encoding=ascii&access_token=" + user.accessToken,
                  method: "GET",
                  success: function (res) {
                    flag_count++;
                    if (res.statusCode === 200) { //获取数据成功
                      var count = res.data.count;
                      var data_points = res.data.datapoints;
                      if(!data_points.length) {
                        if (flag_count === devices.length) { //最后一台设备当月无数据
                          month_charts[month_idx].loaded = true;
                          app.hideLoading();
                          that.setData({
                            month_charts: month_charts
                          });
                          that.draw();
                        }
                        return;
                      }
                        
                      var data = data_points.data;
                      var valid_days = []; //有数据的日期
                      var valid_dos = []; //日照时间
                      for(var i = 0; i < data_points.length; ++i) { //给有效数据组赋值
                        var point = data_points[i];
                        valid_days.push(moment(1000 * point.created_at).get('date'));
                        var data_array = point.data.split(',');
                        var dos = Number((data_array[DOS_IDX] / 3600).toFixed(1)); //秒转小时
                        valid_dos.push(dos);
                      }
                      
                      var chart_dates = []; //图表上的时间
                      var month_days = month_charts[month_idx].days;
                      var chart_data_list = []; //图表数据列表
                      var cur_month = month_charts[month_idx].simple_date;
                      for (var i = 1; i <= month_days; ++i) { //显示时间格式化(天数从1开始)
                        if (i < 10) {
                          chart_dates.push(cur_month + '.0' + i);
                        } else {
                          chart_dates.push(cur_month + '.' + i + '');
                        }
                        chart_data_list.push(''); //默认无数据
                      } //初始化图表日期显示
                      
                      for (var i = 0; i < valid_days.length; ++i) {
                        var valid_idx = Number(valid_days[i])- 1; //有效时段下标
                        if (valid_dos[i] !== '') { //该时间点valid_dos存在且不为空
                          chart_data_list[valid_idx] = valid_dos[i]; //各个类型各个时段的数据组
                        }
                      }
                        
                      var device_chart = {
                        name: device.name ? device.name : device.device_id,
                        chart_name: '日照时间',
                        y_type: 'fixed_marker',
                        canvas_id: month_idx + '_' + each_index, //（下标）日期，设备
                        data: {}
                      };
                      if (valid_dos.length) { //有有效数据的设备
                        device_chart.data = {
                          unit: '小时',
                          xAxis: chart_dates,
                          value: chart_data_list,
                          color: '#75ca85',
                          desc: {
                            hidden: true,
                            value: '',
                            left: 0,
                            top: 0,
                            x: ''
                          },
                        };
                        month_chart.push(device_chart);
                      }
                      
                      if (flag_count === devices.length) {
                        month_charts[month_idx].loaded = true;
                        app.hideLoading();
                        that.setData({
                          month_charts: month_charts
                        });
                        that.draw();
                      }
                    } else { //一台失败则不渲染
                      app.hideLoading();
                      app.showModal('获取失败', '请检查你的网络设置');
                    }
                  },
                  fail: function () {
                    flag_count++;
                    app.hideLoading();
                    app.showModal('获取失败', '请检查你的网络设置');
                  },
                });
            });
            fm2.forEach(function (device, each_index) { //循环设备
              var last_rainfall = {};
              var day_requests = 0;
              wx.request({ //取对应数据
                url: "https://iot.xaircraft.com/weixin/devices/" + device.device_id + "/datapoints?data_type_id=33&count=200&since=" + since + "&until=" + until + "&order=desc&encoding=ascii&access_token=" + user.accessToken,
                method: "GET",
                success: function (res) {
                  flag_count++;
                  if(res.statusCode === 200) {
                    var data_points = res.data.datapoints;
                    if (!data_points.length) {
                      if (flag_count === devices.length) { //最后一台设备当月无数据
                        month_charts[month_idx].loaded = true;
                        app.hideLoading();
                        that.setData({
                          month_charts: month_charts
                        });
                        that.draw();
                      }
                      return;
                    }

                    var data = data_points.data;
                    var valid_days = []; //有数据的日期
                    var valid_rainfall = []; //日照时间
                    for (var i = 0; i < data_points.length; ++i) { //给有效数据组赋值
                      var point = data_points[i];
                      valid_days.push(moment(1000 * point.created_at).get('date'));
                      var data_array = point.data.split(',');
                      if (data_array[RAINFALL_IDX] !== '') {
                        var rainfall = Number(data_array[RAINFALL_IDX]); //秒转小时
                        valid_rainfall.push(rainfall > 0 ? Number(rainfall.toFixed(1)) : 0);
                      }
                    }

                    var chart_dates = []; //图表上的时间
                    var month_days = month_charts[month_idx].days;
                    var chart_data_list = []; //图表数据列表
                    var cur_month = month_charts[month_idx].simple_date;
                    for (var i = 1; i <= month_days; ++i) { //显示时间格式化(天数从1开始)
                      if (i < 10) {
                        chart_dates.push(cur_month + '.0' + i);
                      } else {
                        chart_dates.push(cur_month + '.' + i + '');
                      }
                      chart_data_list.push(''); //默认无数据
                    } //初始化图表日期显示

                    for (var i = 0; i < valid_days.length; ++i) {
                      var valid_idx = Number(valid_days[i]) - 1; //有效时段下标
                      if (valid_rainfall[i] !== '') { //该时间点valid_dos存在且不为空
                        chart_data_list[valid_idx] = valid_rainfall[i]; //各个类型各个时段的数据组
                      }
                    }
                    
                    var device_chart = {
                      name: device.name ? device.name : device.device_id,
                      chart_name: '降雨量',
                      y_type: 'auto',
                      canvas_id: month_idx + '_fm2_' + each_index, //（下标）日期，设备
                      data: {}
                    };
                    if (valid_rainfall.length) { //有有效数据的设备
                      device_chart.data = {
                        unit: 'mm',
                        xAxis: chart_dates,
                        value: chart_data_list,
                        color: '#91c8f6',
                        desc: {
                          hidden: true,
                          value: '',
                          left: 0,
                          top: 0,
                          x: ''
                        },
                      };
                      month_chart.push(device_chart);
                    }

                    if (flag_count === devices.length) {
                      month_charts[month_idx].loaded = true;
                      app.hideLoading();
                      that.setData({
                        month_charts: month_charts
                      });
                      that.draw();
                    }
                  } else {
                    app.hideLoading();
                    app.showModal('获取失败', '请检查你的网络设置');
                  }
                },
                fail: function () {
                  app.hideLoading();
                  app.showModal('获取失败', '请检查你的网络设置');
                },
              });
            });
          }
        });
    },
    draw: function () { //赋值canvas
        var that = this;
        var month_charts = that.data.month_charts;
        var month_idx = that.data.month_idx; //日期下标
        var charts = that.data.month_charts[month_idx].list;
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            var data_value = chart.data.value;
            var last_idx = 0;
            for (var k = 0; k < data_value.length; ++k) {
              if (data_value[k] !== '') {
                last_idx = k;
              }
            }
            new myChart({
                month_idx: month_idx,
                y_type: chart.y_type,
                device_idx: i,
                canvasId: chart.canvas_id,
                unit: chart.data.unit,
                type: "line",
                canvasHeight: that.data.canvasHeight,
                style: {
                  lineColor: chart.data.color,
                  pointColor: chart.data.color,
                },
                showYAxis: true,
                data: {
                    xAxis: chart.data.xAxis,
                    yAxis: chart.data.value
                },
                title: {
                    xAxis: '',
                    yAxis: ''
                }
            });
            chart.data.desc = {
              hidden: false,
              value: chart.data.value[last_idx], //坐标Y值
              left: g_data.trend_position.xAxis[i][last_idx] + 9.5, //新的坐标辅助线
              x: chart.data.xAxis[last_idx], //坐标X值
            };
        }
        that.setData({
            month_charts: month_charts
        });
    },
    touchMove: function (e) { //移动触摸
        var that = this;
        var month_charts = that.data.month_charts;
        var month_idx = that.data.month_idx;
        var devices = that.data.month_charts[month_idx].list;
        //图表下标
        var device_idx = e.target.target || e.target.id; //手机 || 开发工具

        function closest(arr, num) {
            var idx = 0;
            var distance = 0;
            for (var i = 0; i < arr.length; i++) {
                if (isNaN(arr[i])) { //不能判断空串或空格
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

        var res = closest(g_data.trend_position.xAxis[device_idx], e.changedTouches[0].x); //数据值的下标

        var device = devices[device_idx];
        var show_chart = device.data;

        var months = that.data.months;
        show_chart.desc = {
            hidden: false,
            value: show_chart.value[res], //坐标Y值
            left: g_data.trend_position.xAxis[device_idx][res] + 9.5, //新的坐标辅助线
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
            month_charts: month_charts
        });
    },
    onLoad: function (options) { //页面加载
        var that = this;
        var scene_idx = options.scene_idx;
        var month_charts = [
          { //tab初始化
            show_month: moment().add(-12, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-11, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-10, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-9, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-8, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-7, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-6, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-5, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-4, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-3, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-2, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().add(-1, 'months').format('YYYY.MM')
          },
          {
              show_month: moment().format('YYYY.MM')
          }
        ];
        
        var picker_array = []; //picker数组
        for(var i = 0; i < month_charts.length; ++i) {
            var obj = month_charts[i];
            obj['idx'] = i;
            obj['loaded'] = false;
            obj['list'] = [];
            picker_array.push({
              time: obj.show_month,
              idx: 'm'+i,
            });
            var dur_idx = i - 12; //距离现在的天数
            var origin_time = moment().add(dur_idx, 'months');
            obj['simple_date'] = origin_time.set('date', 1).format('MM');
            var days = moment(origin_time).daysInMonth();
            obj['days'] = days;
            obj['since'] = moment(origin_time.set('date', 1).format('YYYY-MM-DD') + ' 00:00:00').unix();
            obj['until'] = moment(origin_time.set('date', days).format('YYYY-MM-DD') + ' 23:59:59').unix();
        }
        
        that.setData({
            months: picker_array,
            month_charts: month_charts,
            fullWidth: g_data.screenWidth,
            fullHeight: g_data.screenHeight
        });
        that.loadData();
        that.setData({
          right_m: 'm12'
        });
    },
    onReachBottom: function () {

    }
});