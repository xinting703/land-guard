// pages/setting/setting.js
var get_user_info = require('../../dist/user.js').get_user_info;
var app = getApp();
var g_data = app.globalData;

var other_backdoor = '';
var camera_config = {};
var cam_cfg_copy = {};
Page({
  data: {

  },
  brightChange: function (e) {
    var val = Number(e.detail.value);
    this.requestChange('bright', val);
  },
  balanceChange: function (e) {
    var val = Number(e.detail.value);
    this.requestChange('balance', val);
  },
  qualityChange: function (e) {
    var val = Number(e.detail.value);
    this.requestChange('quality', val);
  },
  modeChange: function (e) {
    var val = Number(e.detail.value);
    this.requestChange('mode', val);
  },
  requestChange: function(name, val) {
    var that = this;
    if(name === 'mode') {
      var tmp_fix = 0;
      var tmp_restitch = 0;
      switch (val) {
        case 0:
          tmp_fix = 0;
          tmp_restitch = 0;
          break;
        case 1:
          tmp_fix = 0;
          tmp_restitch = 1;
          break;
        case 2:
          tmp_fix = 1;
          tmp_restitch = 0;
          break;
        default:
          tmp_fix = 1;
          tmp_restitch = 1;
          break;
      }
      cam_cfg_copy['fix'] = tmp_fix;
      cam_cfg_copy['reStitch'] = tmp_restitch;
    } else if(name === 'balance') {
      cam_cfg_copy['evRatio'] = val;
    } else{
      cam_cfg_copy[name] = val;
    }
    
    var cam_str = 'camcfg='; //图像参数串
    for(var key in cam_cfg_copy) {
      cam_str += key + ':' + cam_cfg_copy[key] + ',';
    }
    cam_str = cam_str.substring(0, cam_str.length - 1) + ';';
    var backdoor = cam_str + other_backdoor;
    var dev = {
      device_id: that.data.device_id,
      config: {
        backdoor: backdoor,
      },
    };

    get_user_info(false, function (user) {
      if (user) {
        wx.request({
          url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
          data: dev,
          method: "PUT",
          success: function (res) {
            if (res.statusCode === 201) {
              that.loadDevices();
              app.showSuccess('设置成功');
            } else {
              app.showModal('修改失败', '请稍后再试');
            }
          }, fail: function (err) {
            app.showModal('修改失败', '请检查你的网络设置');
          }
        });
      }
    });
  },
  /**重新获取全部设备 */
  loadDevices: function () {
    var that = this;
    get_user_info(false, function (user) {
      if (user) {
        g_data.clientId = user.client_id;
        wx.request({ //重新获取全部设备
          url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              g_data.all_devices = res.data.devices;
              var all_devices = g_data.all_devices;
              for(var i = 0; i < all_devices.length; ++i) { 
                if(that.data.device_id === all_devices[i].device_id) { //更新该设备的下标，刷新数据候可能有变化
                  g_data.check_idx = i;
                  break;
                }
              }
            } else {
            }
          },
          fail: function (err) {
          }
        });
      }
    });
  },
  onLoad: function (options) {
    var that = this;
    var idx = g_data.check_idx !== '' ? g_data.check_idx : options.device_idx;
    var device_id = options.device_id;
    var all_devices = g_data.all_devices;
    var device = all_devices[idx];
    
    /**初始化 */
    camera_config = {};
    other_backdoor = '';
    
    if(device.config && device.config.backdoor) {
      var backdoor = device.config.backdoor.split(';');
      
      for(var i = 0; i < backdoor.length; ++i) {
        var item = backdoor[i]; //各个配置项
        var cfgs = item.split('='); //配置项键值分离
        if (cfgs[0] === 'camcfg') {
          var key_val_arr = cfgs[1].split(',');
          for (var j = 0; j < key_val_arr.length; ++j) {
            var key_val = key_val_arr[j].split(':');
            camera_config[key_val[0]] = Number(key_val[1]);
          }
        } else if (item.length) { //不是空串
          other_backdoor += item + ';';
        }
      }
    }
    
    cam_cfg_copy = JSON.parse(JSON.stringify(camera_config));

    var bright = camera_config.bright || 0; //亮度
    var balance = camera_config.evRatio || 0; //亮度平衡
    var quality = camera_config.quality || 75; //质量
    var fix = camera_config.fix !== undefined ? camera_config.fix : 0;
    var reStitch = camera_config.reStitch !== undefined ? camera_config.reStitch : 0;
    
    var mode_val = 0; //拼接模式
    if (fix) {
      mode_val = 2; //保持1,(0/1)
    } else {
      if (reStitch) {
        mode_val = 1; //连续0,1
      } else {
        mode_val = 0; //自动0,0
      }
    }

    var mode = [{
      name: '自动',
      checked: false,
    }, {
      name: '连续',
      checked: false,
    }, {
      name: '保持',
      checked: false,
    }];
    mode[mode_val].checked = true;

    that.setData({
      bright: bright,
      balance: balance,
      quality: quality,
      mode: mode,
      device_id: device_id,
    });
  },
  onShow: function () {
  
  },
  onReachBottom: function () {
  
  },
})