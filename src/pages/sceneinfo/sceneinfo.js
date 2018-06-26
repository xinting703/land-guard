// pages/setscene/setscene.js
var get_user_info = require('../../dist/user.js').get_user_info;
var app = getApp();
var g_data = app.globalData;
Page({
  data: {
  },
  setSceneName: function (e) { //跳页修改场景名
      var that = this;
      var idx = that.data.scene_idx;
      wx.navigateTo({
          url: '../setscenename/setscenename?idx=' + idx + '&scene_name=' + g_data.scenes[idx].name,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网络设置');
          }
      });
  },
  checkDevice: function () { //查看已安装的设备
      var that = this;
      wx.navigateTo({
          url: '../scenedevice/scenedevice?idx=' + g_data.sceneIdx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网路设置');
          }
      })
  },
  checkHistory: function (e) { //查看历史数据
      wx.navigateTo({
          url: '../history/history?scene_idx=' + g_data.sceneIdx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网络设置');
          }
      });
  },
  checkTrend: function (e) { //查看数据分析（走势）
      wx.navigateTo({
          url: '../trend/trend?scene_idx=' + g_data.sceneIdx,
          fail: function () {
              app.showModal('跳转失败', '请检查你的网络设置');
          }
      });
  },
  /*删除确认框*/
  showConfirmModal: function (e) {
    var that = this;
    var list_idx = e.target.dataset.index;
    wx.showModal({
      title: '提示',
      content: '确认删除此地块？',
      showCancel: true,
      success: function (res) {
        if (res.confirm) { //用户点击确定
          that.deleteScene();
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
  /*确认删除地块事件*/
  deleteScene: function () {
    var that = this;
    var index = g_data.sceneIdx;
    var scenes = g_data.scenes;
    get_user_info(false, function (user) {
      if (user) {
        wx.request({
          url: "https://iot.xaircraft.com/weixin/devices/tags/" + encodeURI(scenes[index].name) + "?access_token=" + user.accessToken,
          method: "POST",
          success: function (res) {
            if (res.statusCode === 204) {
              scenes.splice(index, 1); //更新全局场景列表
              app.showSuccess('删除成功');
              wx.navigateBack({
                delta: 2
              });
            } else {
              app.showModal('删除失败', '请稍后再试');
            }
          }, fail: function (err) {
            app.showModal('删除失败', '请检查你的网络设置');
          }
        });
      }
    });
  },
  onLoad: function (options) {
  },
  onShow: function () {
      var idx = g_data.sceneIdx;
      this.setData({
          scene_idx: idx,
          name: g_data.scenes[g_data.sceneIdx].name,
          device_length: g_data.scenes[idx].devices.length
      });
  },
  onReachBottom: function() {
    
  }
})