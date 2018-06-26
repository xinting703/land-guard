// pages/editdevice/editdevice.js
var get_user_info = require('../../dist/user.js').get_user_info;
var app = getApp();
var g_data = app.globalData;

var method_of_add = '';

Page({
  data: {
    inputValue: '',
    hideClear: false
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
      inputValue: e.detail.value.replace(/(^\s*)|(\s*$)/g,"")
    });
  },
  clearInput: function() {
    this.setData({
      inputValue: ''
    });
  },
  confirmChange: function() { //确认修改
    var that = this;
    var new_name = that.data.inputValue;
    if(!new_name || new_name === that.data.old_name) { //输入为空或未做修改
      wx.navigateBack({
        delta: 1, // 返回设备页
        fail: function() {
          app.showModal('跳转失败','请检查你的网络设置');
        }
      });
      return;
    }
    if(new_name.length > 15) {
      app.showModal('修改失败','不能超过15个字');
      return;
    }

    if (method_of_add === 'scancode') { //扫码进入（添加确认）
      g_data.tmp_dev_name = new_name;
      wx.navigateBack({
        delta: 1 // 返回设备页
      });
      return;
    }

/**查看设备信息时修改，非添加时 */
    app.showLoading('正在修改');
    var device_id = that.data.device_id;
    get_user_info(false, function(user) {
      if(user) {
        var dev = {
          "device_id": device_id,
          "name": new_name
        };
        wx.request({
          url: "https://iot.xaircraft.com/weixin/devices?access_token="+user.accessToken,
          data: dev,
          method: "PUT",
          success: function (res) {
            app.hideLoading();
            if(res.statusCode === 201) {
              that.loadDevices();
            } else {
              app.showModal('修改失败','请稍后再试');
            }
          }, fail: function (err) {
            app.hideLoading();
            app.showModal('修改失败','请检查你的网络设置');
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
            app.hideLoading();
            if (res.statusCode === 200) {
              g_data.all_devices = res.data.devices;
            } else {
            }
          },
          fail: function (err) {
          },
          complete: function () {
            that.reloadScenes();
          }
        });
      }
    });
  },
  /**重新获取地块数据 */
  reloadScenes: function () {
    var that = this;
    get_user_info(false, function (user) {
      if (user) {
        wx.request({ //渲染场景(分组)
          url: "https://iot.xaircraft.com/weixin/tags?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              g_data.scenes = res.data;
            } else {
              app.showModal('数据更新失败', '请稍后刷新首页查看');
            }
          },
          fail: function (err) {
            app.showModal('数据更新失败', '请检查你的网络设置');
          },
          complete: function () {
            wx.navigateBack({
              delta: 1 // 返回设备列表
            });
          }
        });
      }
    });
  },
  onLoad: function (options) {
    var that = this;
    var old_name = options.old_name;
    method_of_add = options.method_of_add;
    that.setData({
      old_name: old_name,
      inputValue: g_data.tmp_dev_name || old_name,
      device_id: options.device_id,
      device_idx: options.device_idx
    });
  },
  onReachBottom: function () {

  }
});
