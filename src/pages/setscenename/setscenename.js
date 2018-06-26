// pages/changeSceneName/changeSceneName.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var scene_type = ['农业气象'];
var idx = 0;
var old_name = '';

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
    if(!new_name || new_name === old_name) { //输入为空或未做修改
      wx.navigateBack({
        delta: 1, // 返回场景页
        fail: function() {
          app.showModal('跳转失败','请检查你的网络设置');
        }
      });
      return;
    }
    if(new_name.length > 15) {
      app.showModal('不能超过15个字','修改失败');
      return;
    }
    
    app.showLoading('正在修改');
    get_user_info(false, function(user) {
      if(user) {
        wx.request({
          url: "https://iot.xaircraft.com/weixin/devices/tags/"+encodeURI(old_name)+"?access_token="+user.accessToken,
          method: "PUT",
          data: {
            name: new_name
          },
          success: function(res) {
            if(res.statusCode === 201) {
              g_data.scenes[idx].name = new_name; //更新当前场景名
              wx.navigateBack({
                delta: 1, // 返回场景页
                fail: function() {
                  app.showModal('跳转失败','请检查你的网络设置');
                }
              });
            } else {
              app.showModal('修改失败','请稍后再试');
            }
          },fail: function() {
            app.showModal('修改失败','请检查你的网络设置');
          },
          complete: function() {
              app.hideLoading();
          }
        });
      }
    });
  },
  onLoad: function (options) {
    var that = this;
    idx = options.idx;
    old_name = options.scene_name;
    that.setData({
      inputValue: old_name
    });
  },
  onReachBottom: function () {

  }
});
