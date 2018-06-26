//addscene.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var scene_type = ['作物监控'];

Page({
  data: {
    sceneType: scene_type[0],
    inputValue: '',
  },
  showList: function() {
    var that = this;
    wx.showActionSheet({
      itemList: scene_type,
      success: function(res) {
        that.setData({
          sceneType: scene_type[res.tapIndex]
        });
      },
      fail: function(res) {
        if(res.errMsg === 'showActionSheet:fail cancel') { //点击取消或蒙层
          return;
        }
        app.showModal('场景类型获取失败','请检查你的网络设置');
      }
    });
  },
  inputFocus: function () {
      this.setData({
          hideClear: false
      });
  },
  inputBlur: function () {
    this.setData({
      hideClear: true,
    });
  },
  getInput: function(e) {
    this.setData({
      inputValue: e.detail.value.replace(/(^\s*)|(\s*$)/g, "")
    });
  },
  clearInput: function () {
    this.setData({
      inputValue: '',
    });
  },
  confirmAddScene: function() {
    var that = this;
    if(that.data.inputValue) {
      if(that.data.inputValue.length > 15) {
        app.showModal('添加失败','不能超过15个字');
        return;
      }
      get_user_info(false, function(user) {
        if(user) {
          wx.request({ //添加场景(分组)
            url: "https://iot.xaircraft.com/weixin/devices/tags?access_token="+user.accessToken,
            method: "POST",
            data: {
              name: that.data.inputValue 
            },
            success: function (res) {
              if(res.statusCode === 201) {
                  g_data.scenes.push({
                    name: that.data.inputValue,
                    devices: [],
                    member_count: 0,
                  });
                  app.showSuccess('添加成功');
                  wx.navigateBack({
                    delta: 1,
                    fail: function() {
                      app.showModal('跳转失败','请检查你的网络设置');
                    }
                  });
              } else if(res.statusCode === 400) {
                app.showModal('添加失败','已存在相同地块名');
              } else {
                app.showModal('添加失败','请稍后再试');
              }
            },fail: function(err) {
              app.showModal('添加失败','请检查你的网络设置');
            }
          });
        }
      });
    } else {
      wx.navigateBack({
        delta: 1,
        fail: function() {
          app.showModal('跳转失败','请检查你的网络设置');
        }
      });
    }
  },
  onReachBottom: function () {

  }
});
