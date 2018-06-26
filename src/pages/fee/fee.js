// pages/fee/fee.js
var get_user_info = require('../../dist/user.js').get_user_info;
var moment = require('../../dist/moment.min.js');

var app = getApp();
var g_data = app.globalData;
Page({
  data: {
  },
  pay: function() { //确认支付
    var that = this;
    var device = that.data.device;
    var since = parseInt(moment(device.start_time).unix());
    var until = parseInt(moment(device.end_time).unix());
    get_user_info(false, function (user) {
        if (user) {
            wx.request({
                url: 'https://iot.xaircraft.com/weixin/pay/order?access_token='+user.accessToken,
                method: "POST",
                data: {
                    device_id: device.device_id,
                    since: since,
                    until: until
                },
                success: function (res) {
                    if (res.statusCode === 201) {
                        var data = res.data;
                        wx.requestPayment({
                            'timeStamp': data.timeStamp,
                            'nonceStr': data.nonceStr,
                            'package': data.package,
                            'signType': data.signType,
                            'paySign': data.paySign,
                            'success': function (res) { //调用支付成功
                                var device_idx = device.device_idx;
                                //更改生效到期时间
                                g_data.all_devices[device_idx].reserved2 = until.toString();
                                app.showSuccess('续费成功');
                                setTimeout(function() {
                                    wx.navigateBack({
                                        delta: 2
                                    });
                                }, 1000);
                            },
                            'fail': function (res) { //requestPayment失败
                                if (res.errMsg !== 'requestPayment:fail cancel') {
                                    wx.showModal({
                                        title: '支付失败',
                                        content: '请稍后再试'
                                    });
                                }
                            }
                        });
                    } else {
                        wx.showModal({
                            title: '请求失败',
                            content: '请稍后再试'
                        });
                    }
                },
                fail: function(res) {
                    wx.showModal({
                        title: '请求失败',
                        content: '请检查你的网络设置'
                    });
                }
            });
        }
    });
  },
  onLoad: function (options) {
      var device_idx = options.device_idx;
      var show_device = JSON.parse(JSON.stringify(g_data.all_devices[device_idx]));
      if (show_device.status !== 'unused') {
          if (show_device.reserved1) {
              show_device['start_time'] = moment(1000 * Number(show_device.reserved1)).add(1, 'years').format('YYYY-MM-DD'); show_device['end_time'] = moment(1000 * Number(show_device.reserved1)).add(2, 'years').add(-1, 'days').format('YYYY-MM-DD');
          }
          if (show_device.reserved2) {
              show_device['start_time'] = moment(1000 * Number(show_device.reserved2)).add(1, 'days').format('YYYY-MM-DD');
              show_device['end_time'] = moment(1000 * Number(show_device.reserved2)).add(1, 'years').format('YYYY-MM-DD');
          }
      }
      show_device['device_idx'] = device_idx;
    this.setData({
        device: show_device
    });
  },
  onReachBottom: function () {

  }
});