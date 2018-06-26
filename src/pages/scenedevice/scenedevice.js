//device.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var key, startX, startY, endX, endY; //滑动删除参数

var online_status = 'online,upgrade,offline,unused';
var query_type = 1;
var scene_idx = 0; //当前场景下标
function format(device) { //格式化设备列表显示
  var dev = JSON.parse(JSON.stringify(device));
  dev.modelName = g_data.model_id_to_name[dev.type_id][dev.model_id];
  dev.icon = g_data.model_id_to_icon[dev.model_id][dev.status];

  dev['iconSignal'] = '/images/common/equipment_icon_signal0@2x.png'; //默认无信号
  if (dev.RSSI) { //如果有信号信息，则转换图标
    dev['iconSignal'] = app.get_icon_signal(dev.RSSI);
  }
  var mnc2name = g_data.mnc2name;
  dev['operator'] = '';
  if (dev.cell && mnc2name[dev.cell.mcc] && mnc2name[dev.cell.mcc][dev.cell.mnc]) {
    dev['operator'] = mnc2name[dev.cell.mcc][dev.cell.mnc]; //运营商
  }

  dev['battery_color'] = ''; //默认
  if (dev.hasOwnProperty('battery_level')) { //如果有电量信息，则转换电量图标
    dev['battery_color'] = app.get_battery_color(dev.battery_level);
  }
  dev.battery_level = (dev.battery_level <= 100 ? (dev.battery_level + '%') : ''); //格式化电量显示

  dev['charging'] = '';
  if (dev.hasOwnProperty('battery_charging') && dev.battery_charging) {
    dev['charging'] = '/images/common/equipment_icon_charge.png';
  }
  return dev;
}

Page({
  data: {
    show_delete: false,
    empty_show: false
  },
  do_show_devices: function() {
    var that = this;
    var tag_name = g_data.scenes[scene_idx].name;
    var devices = JSON.parse(JSON.stringify(g_data.scenes[scene_idx].devices));
    if(!devices.length) { //地块没有设备
      that.setData({
        empty_show: true,
        list: []
      });
      return;
    }
    var show_device = [];
    var client_id = g_data.clientId;
    for(var i = 0; i < devices.length; ++i) {
      var origin_dev = devices[i];
      var formated_dev = format(devices[i]);
      var mark = '';
      var is_private = false;
      var limit_text = '';
      if (origin_dev.owner !== client_id) { //非己
        if (origin_dev.access_control === 'private') { //拥有者关闭共享
          is_private = true;
          limit_text = '没有权限';
        }
        mark = '/images/common/equipment_icon_share@2x.png';
      }
      show_device[i] = {
        device_id: origin_dev.device_id,
        icon: formated_dev.icon,
        name: formated_dev.name,
        status: origin_dev.status,
        iconSignal: formated_dev.iconSignal,
        operator: formated_dev.operator,
        battery_color: formated_dev.battery_color,
        battery_level: formated_dev.battery_level,
        charging: formated_dev.charging,
        is_private: is_private,
        limit_text: limit_text,
        mark: mark,
      };
    }
    this.setData({
      list: show_device,
      empty_show: false
    });
  },
  /* 显示删除按钮 */
  showDelelte: function () {
      var show_delete = !this.data.show_delete;
      this.setData({
          show_delete: show_delete
      });
  },
  /*删除确认框*/
  showConfirmModal: function (e) {
    var that = this;
    var list_idx = e.target.dataset.index;
    wx.showModal({
      title: '提示',
      content: '确认从该地块中移除此设备？',
      showCancel: true,
      success: function (res) {
        if (res.confirm) { //用户点击确定
          that.removeDevice(list_idx);
        }
      },
      fail: function () {
        wx.showToast({
          title: '网络异常',
          image: '/images/public/img_error@2x.png',
          duration: 2000
        });
      }
    })
  },
  /*确认删除按钮事件*/
  removeDevice: function (list_idx) {
    var that = this;
    var scene = g_data.scenes[scene_idx];
    get_user_info(false, function (user) {
      if (user) {
        wx.request({ //移出分组
          url: "https://iot.xaircraft.com/weixin/devices/" + scene.devices[list_idx].device_id + "/tags/" + encodeURI(scene.name) + "?access_token=" + user.accessToken,
          method: "POST",
          success: function (res) {
            if (res.statusCode === 204) {
              that.reloadScenes();
              scene.devices.splice(list_idx, 1);
              app.showSuccess('移除成功');
              that.do_show_devices();
            } else {
              app.showModal('移除失败', '请稍后再试');
            }
          },
          fail: function (err) {
            app.showModal('移除失败', '请检查你的网络设置');
          }
        });
      }
    });
  },
  onLoad:function(options) {
    scene_idx = options.idx;
  },
  onShow: function () {
    this.do_show_devices();
  },
  onPullDownRefresh: function() {
      var that = this;
      that.setData({
          show_delete: false
      });
    get_user_info(false, function(user) {
      if(user) {
        wx.request({ //刷新设备
          url: "https://iot.xaircraft.com/weixin/tags?access_token="+user.accessToken,
          method: "GET",
          success: function (res) {
            wx.stopPullDownRefresh();
            if(res.statusCode === 200) {
              g_data.scenes = res.data;
              that.do_show_devices();
              app.showSuccess('数据更新成功');
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
  /**重新获取地块数据 */
  reloadScenes: function () {
    get_user_info(false, function (user) {
      if (user) {
        wx.request({ //渲染场景(分组)
          url: "https://iot.xaircraft.com/weixin/tags?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              for (var i = 0; i < res.data.length; ++i) {
                if (res.data[i].name === g_data.scenes[g_data.sceneIdx].name) {
                  g_data.sceneIdx = i; //找到当前地块
                  break;
                }
              }
              g_data.scenes = res.data;
            } else {
            }
          }, //异常情况不作处理，本身有处理地块数据的移出设备后的对应情况，这里只是处理首页地块设备数的显示问题
          fail: function (err) {
          },
        });
      }
    });
  },
})