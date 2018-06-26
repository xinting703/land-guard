// pages/cleardata/cleardata.js
const get_user_info = require('../../dist/user.js').get_user_info
const globalData = getApp().globalData

let deviceId = ''
Page({
  data: {
    viewed: false
  },
  onLoad: function (options) {
    deviceId = options.deviceId
  },
  checkboxChange: function(e) {
    const self = this
    self.setData({ viewed: !self.data.viewed})
  },
  confirmClear: function () {
    const self = this
    wx.showLoading({ title: '正在清除' })
    let success = false
    get_user_info(false, function (user) {
      if (user) {
        wx.request({ //渲染场景(分组)
          url: 'https://iot.xaircraft.com/weixin/devices/' + deviceId + '/datapoints/del?access_token=' + user.accessToken,
          method: 'POST',
          success: function (res) {
            if (res.statusCode === 204) {
              success = true
            }
          },
          fail: function (err) {
          },
          complete: function () {
            wx.hideLoading()
            if (!success) {
              return wx.navigateBack({ delta: 1 })
            }
            wx.showToast({
              title: '已清空'
            })
            self.reloadScenes()
          }
        })
      }
    })
    // self.reloadScenes()
  },
  /**重新获取地块数据 */
  reloadScenes: function () {
    get_user_info(false, function (user) {
      if (user) {
        wx.request({
          url: "https://iot.xaircraft.com/weixin/tags?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              globalData.scenes = res.data
            }
          },
          complete: function () {
            wx.navigateBack({ delta: 1 })
          }
        })
      }
    })
  }
})