//scenedata.js
var moment = require('../../dist/moment.min.js');
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
function sortNumber(a, b) {
  return a - b; //从小到大排
}

function compute_mean(arr) { //计算平均值
  var sort_data = arr.sort(sortNumber);
  if(sort_data.length > 3) {
    sort_data.splice(0, 1);
    sort_data.splice(-1, 1);
  }
  var sum = 0;
  for(var i = 0; i < sort_data.length; ++i) {
    sum += sort_data[i];
  }
  
  return sum / sort_data.length;
}
var DATA_VERSION = '1';
var DATA_VERSION_2 = '2';
var DATA_FM1_LENGTH = 5;
var DATA_FM1_LENGTH_2 = 6;
var DATA_FM2_LENGTH = 7;
var DATA_FM2_VERSION = '1';
var DATA33_LENGTH = 10;
var DATA33_RAINFALL_IDX = 2;
Page({
  data: {
    indicatorDots: true,
    duration: 300,
    current_type: 0,
    scenes: [],
    currentIndex: 0,
    hideEmptyShow: true,
    show_tip: false,
  },
  /* 格式化场景数据显示 */
  do_show_scenes: function() {
    var that = this;
    var show_scenes = [];
    var origin_scene = g_data.scenes[g_data.sceneIdx];
    var devices = origin_scene.devices;
    var fm1 = [];
    var fm2 = [];

    /**分离FM1 FM2 */
    if(devices.length) {
      for (var i = 0; i < devices.length; ++i) { //遍历相同场景中各个设备
        if (devices[i].model_id === 2) {
          fm1.push(devices[i]);
        } else if (devices[i].model_id === 3) {
          fm2.push(devices[i]);
        }
      }
    }

    var current_type = fm2.length ? that.data.current_type : 0; //当前显示的面板类型

    /**处理fm1显示数据 */
    var photos = [];
    var photo_width = that.data.fullWidth; //照片宽度
    var photos_height = 0; //照片集总高度
    var wrapper_photo_height = that.data.fullHeight - 50 - 220;
    var data_fm1_arr = new Array(DATA_FM1_LENGTH_2);
    for (var i = 0; i < DATA_FM1_LENGTH_2; ++i) {
      data_fm1_arr[i] = [];
    }
    var panel_fm1 = { //初始化场景默认显示
      tem: {
        value: '--',
        decimal: '',
        unit: ''
      },
      dataList: [
        {
          name: '湿度',
          value: '--',
          decimal: '',
          unit: '%',
          desc: ''
        },
        {
          name: '光强',
          value: '--',
          decimal: '',
          unit: 'Lux',
          desc: ''
        },
        {
          name: '气压',
          value: '--',
          decimal: '',
          unit: 'hPa',
          desc: ''
        }
      ],
      photos: photos,
      photos_height: photos_height
    };
    for (var i = 0; i < fm1.length && fm1[i].datapoints; ++i) {
      var device = fm1[i];
      var datapoints = device.datapoints;
      if (datapoints['1'] && datapoints['1'].length) { //data数据
        var data = datapoints['1'][0].data.split(','); //温湿度
        //有效数据(温湿度)data长度为5且版本为1
        if (device.status === 'online' && ((data.length === DATA_FM1_LENGTH && data[0] === DATA_VERSION) || (data.length === DATA_FM1_LENGTH_2 && data[0] === DATA_VERSION_2))) {
          for (var k = 1; k < data.length; ++k) { //k表示datapoint中分类的下标，1温度2湿度
            if (data[k] !== '') { //有数据
              data_fm1_arr[k].push(Number(data[k])); //单个设备各数据集
            }
          }
        }
      }
      var scale = 148 / 338; //默认比例
      if (datapoints['2'] && datapoints['2'].length && device.status !== 'offline' && device.status !== 'unused') { //data图像(只取在线)
        var data = datapoints['2'][0].data.split(',');
        var created_at = datapoints['2'][0].created_at;
        var date = moment(1000 * created_at).format('YYYY-MM-DD');
        var interval = moment().diff(moment(1000 * created_at), 'seconds');
        if (interval < 60) { //1分钟内
          interval = '刚刚';
        } else {
          interval = moment().diff(moment(1000 * created_at), 'days');
          interval = interval ? (interval + '天') : moment(1000 * created_at).fromNow(true);
        }
        photos.push({ //设备照片集
          idx: i,
          deviceId: device.device_id,
          name: device.name,
          interval: interval,
          date: date,
          src: data[0] + '?x-oss-process=image/resize,w_507',
          original_src: data[0]
        }); //设备照片
        if (data[1] && data[2]) {
          scale = data[2] / data[1]; // 宽在前,高在后,高/宽
        }
        photos_height += scale * photo_width + 50 + 15;
      }
    }
    if (data_fm1_arr[1].length) {
      var origin_tem = compute_mean(data_fm1_arr[1]).toFixed(1);
      var tem = origin_tem.split('.');
      panel_fm1.tem = { //温度
        value: tem[0],
        decimal: (tem[1] === '0') ? '' : ('.' + tem[1]),
        unit: '°',
        label: app.tem_grading(origin_tem)[0],
        labelColor: app.tem_grading(origin_tem)[1]
      };
    }
    if (data_fm1_arr[2].length) {
      var origin_hum = compute_mean(data_fm1_arr[2]).toFixed(1);
      var hum = origin_hum.split('.');
      panel_fm1.dataList[0].value = hum[0]; //湿度
      panel_fm1.dataList[0].desc = app.hum_grading(origin_hum); //湿度描述
      panel_fm1.dataList[0].decimal = (hum[1] === '0') ? '' : ('.' + hum[1]);
    }
    if (data_fm1_arr[3].length) {
      var origin_press = compute_mean(data_fm1_arr[3]).toFixed(1);
      var press = origin_press.split('.');
      panel_fm1.dataList[2].value = press[0]; //气压
      panel_fm1.dataList[2].decimal = (press[1] === '0') ? '' : ('.' + press[1]);
    }
    if (data_fm1_arr[4].length) {
      var origin_im = compute_mean(data_fm1_arr[4]).toFixed(1);
      var im = origin_im.split('.');
      panel_fm1.dataList[1].value = im[0]; //光强
      panel_fm1.dataList[1].desc = app.im_grading(origin_im); //湿度描述
      panel_fm1.dataList[1].decimal = (im[1] === '0') ? '' : ('.' + im[1]);
    }

    /**处理fm2显示数据 */
    var panel_fm2 = {
      dayRainfall: {
        value: '--',
        unit: 'mm'
      },
      dataList: [
        {
          name: '降雨量',
          value: '--',
          decimal: '',
          unit: 'mm/h',
          desc: '',
        },
        {
          name: '风速',
          value: '--',
          decimal: '',
          unit: 'm/s',
          desc: '',
        },
        {
          name: '土壤含水量',
          value: '--',
          decimal: '',
          unit: '%',
          desc: '',
        },
        {
          name: '土壤温度',
          value: '--',
          decimal: '',
          unit: '℃',
          desc: '',
        }
      ],
    };
    var data_fm2_arr = new Array(DATA_FM2_LENGTH);
    for (var i = 0; i < DATA_FM2_LENGTH; ++i) {
      data_fm2_arr[i] = [];
    }
    var final_rainfall = []; //最后用于平均的雨量值集合

    var fm2_computed_count = 0; //已经处理过雨量数据的设备数
    var fm2_online_length = 0; //有效的设备数（在线的）

    let promisesDayRainfall = []
    let promisesHourRainfall = []

    const now = moment().unix()
    const dayStart = moment(moment().format('YYYY-MM-DD') + ' 00:00:00').unix()
    // console.log(moment(dayStart * 1000).format('YYYY-MM-DD HH:mm:ss'))
    // console.log(moment(now * 1000).format('YYYY-MM-DD HH:mm:ss'))
    for (var i = 0; i < fm2.length && fm2[i].datapoints && fm2[i].status === 'online'; ++i) { // 在线且有数据
      var device = fm2[i];
      fm2_online_length++;

      var datapoints = device.datapoints;
      if (datapoints['3'] && datapoints['3'].length && datapoints['3'][0].data) { //data数据,3降雨量风速数据
        let dataTime = datapoints['3'][0].created_at
        // console.log('小时数据' + device.device_id)
        // console.log(moment(dataTime * 1000).format('YYYY-MM-DD HH:mm:ss'))
        if (now - dataTime <= 30 * 60) { // 数据是最近半小时内的
          var data = datapoints['3'][0].data.split(',');
          //有效数据(温湿度)data长度为4且版本为1
          if (data[0] === DATA_FM2_VERSION && data.length === DATA_FM2_LENGTH) {
            for (var k = 2; k < data.length; ++k) { //k是datapoint中分类的下标，1降雨量2风速3风向,从2开始，降雨量下面统一处理
              if (data[k] !== '' && Number(data[k]) >= 0) { //有数据
                data_fm2_arr[k].push(Number(data[k])); // 单个设备各数据集，k代表数据类型（风速还是土壤温湿度等）
              }
            }
            data_fm2_arr[1].push(data[1])

            let oneHourBefore = moment(dataTime * 1000).add(-1, 'hours').unix()
            promisesHourRainfall.push(requestDatapoints(device.device_id, oneHourBefore, dataTime))
            promisesDayRainfall.push(requestDatapoints(device.device_id, dayStart, dataTime))
          }
        }
      }

      /**处理风速平均值及显示 */
      if (data_fm2_arr[2].length) {
        var origin_speed = compute_mean(data_fm2_arr[2]).toFixed(1);
        var speed = origin_speed.split('.');
        panel_fm2.dataList[1].value = speed[0]; //风速
        panel_fm2.dataList[1].desc = app.speed_grading(origin_speed); //风速描述
        panel_fm2.dataList[1].decimal = (speed[1] === '0') ? '' : ('.' + speed[1]);
        if (origin_speed >= 0.2 && data_fm2_arr[3].length) {
          var origin_direction = compute_mean(data_fm2_arr[3]);
          panel_fm2.dataList[1].desc += ' ' + app.speed_direction(origin_direction);
        }
      }
      if (data_fm2_arr[4].length) {
        var origin_soil_tem = compute_mean(data_fm2_arr[4]).toFixed(1);
        var soil_tem = origin_soil_tem.split('.');
        panel_fm2.dataList[3].value = soil_tem[0]; // 土壤温度
        panel_fm2.dataList[3].decimal = (soil_tem[1] === '0') ? '' : ('.' + soil_tem[1]);
      }
      if (data_fm2_arr[5].length) {
        var origin_moisture = compute_mean(data_fm2_arr[5]).toFixed(1);
        var moisture = origin_moisture.split('.');
        panel_fm2.dataList[2].value = moisture[0]; // 土壤含水量
        panel_fm2.dataList[2].desc = app.moistureGrading(origin_moisture);
        panel_fm2.dataList[2].decimal = (moisture[1] === '0') ? '' : ('.' + moisture[1]);
      }
      // 获取基准值
      function requestDatapoints(device_id, since, until) {
        return new Promise(function (resolve, reject) {
          get_user_info(false, function (user) {
            if (user) {
              wx.request({ //取对应数据
                url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "/datapoints?data_type_id=3&since=" + since + "&until=" + until + "&order=asc&encoding=ascii&access_token=" + user.accessToken,
                method: "GET",
                success: function (res) {
                  if (res.statusCode === 200 && res.data.datapoints.length && res.data.datapoints[0].data) {
                    var data_point = res.data.datapoints[0].data.split(',');
                    if (data_point.length >= DATA_FM2_LENGTH && data_point[0] === DATA_VERSION && data_point[1] !== '') {
                      resolve(data_point[1]) // 基准雨量值
                    }
                  }
                },
                complete: function() {
                  reject() // promise如果resolve之后reject不会再有效，一旦状态改变，就不会再变
                }
              })
            }
          })
        }).catch((err) => { //失败返回''，非正常数据占位
          return ''
        })
      }
    }
    
    // 有效降雨量差值集合
    function getFinalValue(nowData, primaryData) {
      // console.log(nowData)
      // console.log(primaryData)
      let finalValue = []
      for (var i = 0; i < primaryData.length; ++i) {
        if (data_fm2_arr[1][i] !== '') { // 有降雨量值的第m台设备
          var now_data = Number(data_fm2_arr[1][i]);
          var primary = primaryData[i] !== '' ? Number(primaryData[i]) : now_data;
          if (now_data >= 0 && primary >= 0) { // 值都有效
            finalValue.push(now_data - primary > 0 ? now_data - primary : 0); // 允许有偏差
          }
        }
      }
      // console.log(finalValue)
      return finalValue
    }

    Promise.all(promisesHourRainfall).then((hourPrimary) => {
      const finalValue = getFinalValue(data_fm2_arr[1], hourPrimary)
      if (finalValue.length) {
        let originValue = compute_mean(finalValue) > 0 ? compute_mean(finalValue).toFixed(1) : '0.0';
        let rainfall = originValue.split('.');
        panel_fm2.dataList[0].value = rainfall[0]; //雨量
        panel_fm2.dataList[0].desc = app.rainfall_grading(originValue);
        panel_fm2.dataList[0].decimal = (rainfall[1] === '0') ? '' : ('.' + rainfall[1]);
      }
      that.setData({ panel_fm2: panel_fm2 })
    }).catch((err) => {
      // console.error(err)
    })

    Promise.all(promisesDayRainfall).then((dayPrimary) => {
      // console.log('当天降雨量')
      const finalValue = getFinalValue(data_fm2_arr[1], dayPrimary)
      if (finalValue.length) {
        let originValue = compute_mean(finalValue) > 0 ? compute_mean(finalValue).toFixed(1) : '0.0';
        let rainfall = originValue.split('.');
        panel_fm2.dayRainfall.value = rainfall[0]
        panel_fm2.dayRainfall.decimal = (rainfall[1] === '0') ? '' : ('.' + rainfall[1])
      }
      that.setData({ panel_fm2: panel_fm2 })
    }).catch((err) => {
      // console.error(err)
    })

    if (!fm2_online_length) { //保证没在线FM2时面板不会为空
      that.setData({
        panel_fm2: panel_fm2,
      });
    }
    
    that.setData({ //先设置数据等FM2处理完再设置fm2
      scene_name: origin_scene.name,
      has_fm1: fm1.length ? true : false,
      has_fm2: fm2.length ? true : false,
      panel_fm1: panel_fm1,
      current_type: current_type,
      currentIndex: g_data.sceneIdx,
      wrapper_photo_height: wrapper_photo_height,
    });
  },
  /**切换数据类型fm1 fm2 */
  changeType: function(e) {
    var current = e.detail.current;
    this.setData({
      current_type: e.detail.current,
    });
  },
  /*查看场景信息*/
  checkScene: function (options) {
      wx.navigateTo({
          url: '../sceneinfo/sceneinfo?scene_idx=' + g_data.sceneIdx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网路设置');
          }
      });
  },
  /**预览图片 */
  preview: function(e) {
    var that = this;
    var idx = e.currentTarget.dataset.index;
    var preview = [];
    var photos = that.data.panel_fm1.photos;
    for(var i = 0; i < photos.length; ++i) {
        preview.push(photos[i].original_src);
    }
    
    wx.previewImage({
      current: photos[idx].original_src,
      urls: preview // 需要预览的图片http链接列表
    });
  },
  /** 查看历史数据 */
  checkHistory: function (e) {
      wx.navigateTo({
          url: '../history/history?scene_idx=' + g_data.sceneIdx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网络设置');
          }
      });
  },
  /** 查看数据分析（走势） */
  checkTrend: function (e) {
      wx.navigateTo({
          url: '../trend/trend?scene_idx=' + g_data.sceneIdx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网络设置');
          }
      });
  },
  /* 选择添加方式 */
  showAddMethod: function () {
      var that = this;
      wx.showActionSheet({
        itemList: ['扫一扫', '选取已有设备'],
          success: function (res) {
            if (res.tapIndex === 0) { //扫码添加新的设备
              that.scanCode();
            } else if (res.tapIndex === 1) { //选择现有设备
              that.SelectExistingDevice();
            }
          },
          fail: function (res) {
          }
      });
  },
  /* 检测是否有设备存在 */
  SelectExistingDevice: function () {
    var that = this;
    var all_devices = []; //全部设备
    if (g_data.devices_loaded) {
      all_devices = JSON.parse(JSON.stringify(g_data.all_devices));
      if(!all_devices.length) { //无设备存在
        that.setData({
          show_tip: true
        });
        setTimeout(function () {
          that.setData({
            show_tip: false
          });
        }, 1500);
      } else {
        that.navigateToExistingDevice();
      }
      return;
    }
    get_user_info(false, function (user) {
      if (user) {
        wx.request({ //获取全部设备
          url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              g_data.devices_loaded = true; //加载过全部设备
              g_data.all_devices = res.data.devices;
              all_devices = JSON.parse(JSON.stringify(g_data.all_devices));
              if (!all_devices.length) { //无设备存在
                that.setData({
                  show_tip: true
                });
                setTimeout(function() {
                  that.setData({
                    show_tip: false
                  });
                },1500);
              } else {
                that.navigateToExistingDevice();
              }
            } else {
              app.showModal('获取设备失败', '请稍后再试');
            }
          },
          fail: function (err) {
            app.showModal('获取设备失败', '请检查你的网络设置');
          }
        });
      }
    });
  },
  /**跳转至选择页面 */
  navigateToExistingDevice: function () {
    wx.navigateTo({
      url: '../selectdevice/selectdevice?scene_idx=' + g_data.sceneIdx,
      fail: function () {
        app.showModal('跳转失败', '请检查你的网络设置');
      }
    });
  },
  /*扫一扫*/
  scanCode: function () {
      var that = this;
      var scene_idx = g_data.sceneIdx;
      wx.scanCode({
          success: function (res) {
              var fields = res.result.split(',');
              if (fields.length !== 5 || (fields[0] !== 'device' && fields[0] !== 'http://weixin.qq.com/r/Tjq5oVzEzQGyrRjC929c?xcx=device' && fields[0] !== 'http://iot.xaircraft.com/?xcx=device') || fields[1] !== '1' || (fields[2] !== '2' && fields[2] !== '3')) { //非气象站,型号不为2或3,类型均为字符串
                  app.showModal('扫码失败', '无效条码');
                  return;
              }
              var device_id = fields[3];
              
              var devices = JSON.parse(JSON.stringify(g_data.scenes[scene_idx].devices));
              for (var i = 0; i < devices.length; ++i) {
                if (devices[i].device_id === device_id) { //地块中已经存在该设备
                      app.showSuccess('设备已添加');
                      return;
                  }
              }

              wx.navigateTo({ //查看对应设备信息
                url: '../deviceinfo/deviceinfo?device_id=' + device_id +'&method_of_add=scancode&source_of_add=scenedevice',
                fail: function () {
                  app.showModal('跳转失败', '请检查你的网络设置');
                }
              });
          },
          fail: function (err) {
              if (err.errMsg === "scanCode:fail cancel") { //取消扫码
                  return;
              } else if (err.errMsg === "scanCode:fail") {
                  app.showModal('扫码失败', '无法识别');
              } else {
                  app.showModal('扫码失败', '请检查你的网路设置');
              }
          },
      });
  },
  onLoad: function(options) {
    var that = this;
    that.setData({ //初始化各容器宽高
      fullWidth: g_data.screenWidth,
      fullHeight: g_data.screenHeight,
      bgHeight: 0.4*(g_data.screenHeight-50)
    });
  },
  onShow: function() {
    this.do_show_scenes();
  },
  onPullDownRefresh: function() {
    var that = this;
    get_user_info(false, function(user) {
      if(user) {
        wx.request({ //渲染场景(分组)
          url: "https://iot.xaircraft.com/weixin/tags?access_token="+user.accessToken,
          method: "GET",
          success: function (res) {
            wx.stopPullDownRefresh();
            if(res.statusCode === 200) {
              g_data.scenes = res.data;
              that.do_show_scenes();

              if(!g_data.scenes.length) {
                app.showSuccess('无数据显示');
              } else {
                app.showSuccess('数据更新成功');
              }
            } else {
              app.showModal('数据更新失败','请稍后再试');
            }
          },
          fail: function(err) {
            wx.stopPullDownRefresh();
            app.showModal('数据更新失败','请检查你的网络设置');
          }
        });
      }
    });
  },
  onReachBottom: function () {
  }
});
