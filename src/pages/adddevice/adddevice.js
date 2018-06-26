//adddevice.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var scene_idx = 0;

Page({
  data: {
    device_id: '',
    hideClear: true
  },
  inputFocus: function() {
    this.setData({
      hideClear: false
    });
  },
  inputBlur: function() {
    this.setData({
      hideClear: true
    });
  },
  getInput: function(e) {
    this.setData({
        device_id: e.detail.value.replace(/(^\s*)|(\s*$)/g,"")
    });
  },
  clearInput: function() { //清除输入
    this.setData({
        device_id: ''
    });
  },
  confirmAddDevice: function () { //添加设备确认
    var that = this;
    var devices = g_data.all_devices;
    var device_id = that.data.device_id;
    if(!device_id) { //输入为空
      wx.navigateBack({ //返回设备页
        delta: 1,
        fail: function() {
          app.showModal('跳转失败','请检查你的网络设置');
        }
      });
      return;
    }
    
    for(var i = 0; i < devices.length; ++i) {
      if(devices[i].device_id === device_id) { //分组中存在相同设备
        wx.navigateBack({ //返回设备页
          delta: 1,
          fail: function() {
              app.showModal('添加失败','分组中存在相同设备');
          }
        });
        return;
      }
    }
    that.addDevice(device_id);
  },
  addDevice: function (device_id) { //添加设备操作
      var that = this;
      app.showLoading('添加中');
      get_user_info(false, function (user) {
          if (user) {
              wx.request({
                  url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
                  method: "POST",
                  data: {
                      device_id: device_id
                  },
                  success: function (res) {
                      if (res.statusCode === 201) { //添加成功
                          var device = res.data;
                          if (device.owner === g_data.clientId) { //只能更改自己设备的信息
                              wx.request({ //更改空设备名
                                  url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "?access_token=" + user.accessToken,
                                  method: "GET",
                                  success: function (res) {
                                      var device = res.data;
                                      if (res.statusCode === 200) { //获取设备信息成功
                                          if (res.data.name) { //有名字
                                              that.loadDevices();
                                              return;
                                          }
                                          var length = g_data.all_devices.length;
                                          var all_devices = g_data.all_devices;
                                          var max_num = 0;
                                          for (var i = 0; i < length; ++i) { //避免分配重复的名字
                                              if (all_devices[i].name.split('我的设备').length > 1) {
                                                  var num = Number(all_devices[i].name.split('我的设备')[1]);
                                                  if (!isNaN(num) && num > max_num) { //是数字,取最大下标
                                                      max_num = num;
                                                  }
                                              }
                                          }
                                          var default_idx = max_num > length ? max_num + 1 : length + 1; //要比最大加1，或者原本长度加1
                                          var name = res.data.name ? res.data.name : '我的设备' + default_idx;
                                          var dev = {
                                              "device_id": device_id,
                                              "name": name
                                          };
                                          wx.request({ //分配默认名称
                                              url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
                                              data: dev,
                                              method: "PUT",
                                              success: function (res) {
                                                  if (res.statusCode === 201) { //分配默认名称成功
                                                      that.loadDevices();
                                                  } else { //默认设备名分配失败
                                                      that.loadDevices();
                                                  }
                                              }, fail: function (err) { //默认设备名分配失败
                                                  that.loadDevices();
                                              }
                                          });
                                      } else { //获取设备信息失败
                                          that.loadDevices();
                                      }
                                  },
                                  fail: function (err) { //获取设备信息失败
                                      that.loadDevices();
                                  }
                              });
                          } else {
                              that.loadDevices();
                          }
                      } else { //添加失败
                          if (res.statusCode === 400) {
                              app.showModal('添加失败', '请检查设备ID是否正确');
                          } else {
                              app.showModal('添加失败', '请稍后重试');
                          }
                      }
                  }, fail: function (err) { //添加失败
                      app.showModal('添加失败', '请检查你的网路设置');
                  },
                  complete: function(res) {
                    if (res.statusCode === 201) {
                      app.showSuccess('添加成功');
                    }
                    app.hideLoading();
                  }
               }); //加入分组调用结束
          }
      });
  },
  loadDevices: function () {
      var that = this;
      get_user_info(false, function (user) {
          if (user) {
              wx.request({ //重新获取全部设备
                  url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
                  method: "GET",
                  success: function (res) {
                      if (res.statusCode === 200) {
                          g_data.all_devices = res.data.devices;
                          wx.navigateBack({ //返回设备页
                              delta: 1
                          });
                      } else {
                          wx.showModal({
                              title: '设备列表更新失败',
                              content: '请稍后再试',
                              showCancel: false,
                              success: function (res) {
                                  if (res.confirm) { //用户点击确定
                                      g_data.all_devices.push(res.data);  //添加到全部设备中去
                                      that.historyBack();
                                  }
                              }
                          });
                      }
                  },
                  fail: function (err) {
                      wx.showModal({
                          title: '设备列表更新失败',
                          content: '请检查你的网络设置',
                          showCancel: false,
                          success: function (res) {
                              if (res.confirm) { //用户点击确定
                                  g_data.all_devices.push(res.data);  //添加到全部设备中去
                                  that.historyBack();
                              }
                          }
                      });
                  }
              });
          }
      });
  },
  historyBack: function () {
      wx.navigateBack({ //返回设备页
          delta: 1
      });
  },
  onLoad: function (options) {
  },
  onReachBottom: function () {

  }
})
