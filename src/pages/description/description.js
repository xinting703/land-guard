// pages/description/description.js
var get_user_info = require('../../dist/user.js').get_user_info;
var moment = require('../../dist/moment.min.js');

var app = getApp();
var g_data = app.globalData;
Page({
  data: {
  },
  pay: function() {
      var that = this;
      var device = that.data.device;
      wx.navigateTo({
          url: '../fee/fee?device_idx=' + device.device_idx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网络设置');
          }
      });
  },
  onLoad: function (options) {
      var device_idx = options.device_idx;
      var show_device = JSON.parse(JSON.stringify(g_data.all_devices[device_idx]));
      show_device['device_idx'] = options.device_idx;
      if (show_device.status !== 'unused') {
          if (show_device.reserved1) {
              show_device['end_time'] = moment(1000 * Number(show_device.reserved1)).add(1, 'years').add(-1, 'days').format('YYYY-MM-DD');
          }
          if (show_device.reserved2) {
              show_device['end_time'] = moment(1000 * Number(show_device.reserved2)).format('YYYY-MM-DD');
          }
      }
    this.setData({
        device: show_device
    });
  },
  onReachBottom: function () {

  }
});