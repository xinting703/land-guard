//adddevice.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var scene_idx = 0;

var online_status = 'online,upgrade,offline,unused';
var query_type = 1;
function format(device) { //格式化设备列表显示
    var dev = JSON.parse(JSON.stringify(device));
    dev.icon = g_data.model_id_to_icon[dev.model_id][dev.status];
    return dev;
}

Page({
  data: {
      dis_btn_add: true,
      select_info: '全选',
      select_all: false,
      selected_devices: [],
      show_tip: false,
  },
  do_show_devices: function () {
    var that = this;
    var devices = JSON.parse(JSON.stringify(g_data.all_devices)); //全部设备
    var scene_devices = g_data.scenes[scene_idx].devices; //地块设备
    var available_devices = JSON.parse(JSON.stringify(g_data.all_devices));

    var show_devices = [];
    var client_id = g_data.clientId;
    for (var i = devices.length - 1; i >= 0 ; --i) {
      var origin_dev = devices[i];
      var mark = '';
      if (origin_dev.owner !== client_id) { //非己
        mark = '/images/common/equipment_icon_share@2x.png';
      }
      show_devices[i] = {
        device_id: origin_dev.device_id,
        name: format(origin_dev).name,
        icon: format(origin_dev).icon,
        mark: mark,
        checked: false
      };
      
      for (var j = 0; j < scene_devices.length; ++j) { //禁用地块中已有的设备
          if(devices[i].device_id === scene_devices[j].device_id) {
              show_devices[i]['checked'] = true;
              show_devices[i]['disabled'] = true;
              available_devices.splice(i, 1);
          }
      }
    }
    this.setData({
        list: show_devices,
        disabled_devices: scene_devices,
        available_devices: available_devices
    });
  },
  /* 改变单个checkbox状态 */
  checkboxChange: function(e) {
    var selected_devices = e.detail.value;  //选中的设备
    var flag = selected_devices.length === g_data.all_devices.length;  //全部选中

    var disabled_devices = this.data.disabled_devices; //不可用的设备
    for (var i = selected_devices.length - 1; i >= 0; --i) {
        for (var j = 0; j < disabled_devices.length; ++j) { //不可用的设备
            if (selected_devices[i] === disabled_devices[j].device_id) {
                selected_devices.splice(i, 1); //选中的可用的设备
            }
        }
    }
    
    this.setData({
        select_all: flag ? true : false,
        select_info: flag ? '全不选' : '全选',
        selected_devices: selected_devices, //选中的可用的设备
        dis_btn_add: selected_devices.length ? false : true  //添加按钮状态(是否有可用设备被选中)
    });
  },
  /**全选选项 */
  selectAll: function(e) {
    var select_all = e.currentTarget.dataset.select_all; //选择以前的状态
    var devices = JSON.parse(JSON.stringify(this.data.list));  //列表中全部设备

    var disabled_devices = this.data.disabled_devices; //不可用的设备

    var available_devices = this.data.available_devices; //可用设备
    var selected_devices = select_all ? [] : available_devices; // 选中的设备

    var simplified_devices = []; //简化选择的设备，只有设备ID
    for (var i = 0; i < devices.length; ++i) { //全部设备
      for (var j = 0; j < available_devices.length; ++j) {
          if (available_devices[j].device_id === devices[i].device_id) {
              devices[i].checked = !select_all; //只改变可用设备的选中状态

              if (selected_devices.length) {
                simplified_devices.push(devices[i].device_id);
              }
          }
      }
    }

    this.setData({
        select_all: !select_all,
        select_info: select_all ? '全选' : '全不选',
        list: devices, //重置列表各项选中状态
        selected_devices: simplified_devices,
        dis_btn_add: selected_devices.length ? false : true  //添加按钮disabled状态
    });
  },
  /** 添加设备到分组 */
  joinTag: function() {
    var that = this;
    var scene = g_data.scenes[scene_idx];
    var tag_name = scene.name;
    var devices = that.data.selected_devices;
    if(devices.length > 5) {
      that.setData({
          show_tip: true
        });
        setTimeout(function () {
          that.setData({
            show_tip: false
          });
        }, 1500);
      return;
    }
    if (scene.devices.length === 50) {
      app.showModal('添加失败','单个地块不能添加超过50台设备');
      return;
    }

    app.showLoading('正在添加');
    var count = 0;
    var success = 0;
    var fail = 0;
    
    get_user_info(false, function(user) {
      if(user) {
        devices.forEach(function (device) {
            wx.request({ //加入分组
                url: "https://iot.xaircraft.com/weixin/devices/" +device+"/tags?access_token="+user.accessToken,
                method: "POST",
                data: {
                    name: tag_name
                },
                success: function(res) {
                    if(res.statusCode === 201) { //加入分组成功
                        success++;
                        count++;
                        if (count === devices.length) { //所有设备添加请求完成
                            if(fail) { //有失败的
                                that.showResModal(success, fail);
                            } else {
                                // app.hideLoading();
                                app.showSuccess('添加成功');
                                that.reloadScenes();
                            }
                        }
                    } else { //加入分组失败(已经存在于该分组或设备不存在)--已判断过，不再做处理
                        fail++;
                        count++;
                        if (count === devices.length) { //所有设备添加请求完成
                            that.showResModal(success, fail);
                        }
                    }
                }, fail: function (err) { //加入分组失败
                    fail++;
                    count++;
                    if (count === devices.length) { //所有设备添加请求完成
                        that.showResModal(success, fail);
                    }
                }
            }); //加入分组调用结束
        });
      }
    });
  },
  /* 显示结果modal(有失败时调用) */
  showResModal: function (success, fail) {
      app.hideLoading();
      var that = this;
      wx.showModal({
          title: '提示',
          content: '成功' + success + '台，失败' + fail + '台',
          showCancel: false,
          confirmText: '返回',
          success: function (res) {
              if (res.confirm) { //用户点击确定
                  that.reloadScenes();
              }
          }
      });
  },
  reloadScenes: function() {
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
                    app.showModal('数据更新失败', '请稍后刷新查看');
                  }
                },
                fail: function (err) {
                    app.showModal('数据更新失败', '请检查你的网络设置');
                },
                complete: function() {
                  app.hideLoading();
                    wx.navigateBack({ //返回地块数据
                        delta: 1
                    });
                }
            });
          }
      });
  },
  onLoad: function (options) {
    scene_idx = options.scene_idx;
    var that = this;
    if (g_data.devices_loaded) { //已经加载过全部设备列表
        that.do_show_devices();
    }
  },
})
