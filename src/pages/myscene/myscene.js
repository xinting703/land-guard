//scene.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var loaded = false; //此页面为第一个页面，loaded可以定义为全局变量，实则只使用一次
var threshold = 30; //低电量检验标准

Page({
  data: {
    empty_show: false,
    show_notice: false,
  },
  do_show_name: function () { //显示地块名称
    var that = this;
    if (loaded) {
      var scenes = g_data.scenes;
      if (!scenes.length) { //没有设备
        that.setData({
          empty_show: true,
          list: []
        });
        return;
      }
      var list = [];
      for(var i = 0; i < scenes.length; ++i) {
          list.push({
              idx: i,
              name: scenes[i].name,
              device_num: scenes[i].member_count,
              txtStyle: '',
              iconWeather: '/images/scene/img_atmosphere@2x.png'
          });
      }

      that.setData({
          list: list,
          empty_show: false
      });
    }
  },
  /* 添加场景 */
  addScene: function() {
    wx.navigateTo({
      url: '../addscene/addscene',
      fail: function() {
        app.showModal('跳转失败','请检查你的网络设置');
      }
    });
  },
  /* 查看对应场景数据 */
  checkScene: function(e) {
    g_data.sceneIdx = e.target.dataset.index || e.currentTarget.dataset.index || 0;
    wx.navigateTo({
        url: '../scenedata/scenedata',
        fail: function() {
            app.showModal('跳转失败','请检查你的网络设置');
        }
    });
  },
  /* 查看设备提示信息 */
  checkNotice: function(e) {
    wx.navigateTo({
      url: '../notice/notice',
      fail: function () {
        app.showModal('跳转失败', '请检查你的网络设置');
      }
    });
  },
  loadDevices: function() {
    var that = this;
    var dev_notice = [];
    get_user_info(false, function (user) {
      if (user) {
        wx.request({ //重新获取全部设备
          url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              var devices = res.data.devices;
              for(var i = 0; i < devices.length; ++i) {
                if (devices[i].hasOwnProperty('battery_level') && devices[i].battery_level <= threshold) {
                  dev_notice.push(devices[i]);
                }
              }
              if(dev_notice.length) {
                that.setData({
                  show_notice: true,
                });
              } else {
                that.setData({
                  show_notice: false,
                });
              }
            } else { //不处理
            }
          },
          fail: function (err) { //不处理
          },
          complete: function() {
            g_data.dev_notice = dev_notice;
          }
        });
      }
    });
  },
  onLoad:function(options) {
      var that = this;
      app.showLoading('正在加载');
      get_user_info(false, function (user) {
          if (user) {
              g_data.clientId = user.client_id;
              wx.request({ //渲染场景(分组)
                  url: "https://iot.xaircraft.com/weixin/tags?access_token=" + user.accessToken,
                  method: "GET",
                  success: function (res) {
                      app.hideLoading();
                      if (res.statusCode === 200) {
                          g_data.scenes = res.data;
                          loaded = true;
                          that.do_show_name();
                      } else {
                          app.showModal('数据加载失败', '请稍后再试');
                      }
                  },
                  fail: function (err) {
                      app.hideLoading();
                      app.showModal('数据加载失败', '请检查你的网络设置');
                  },
                  complete: function(res) {
                  },
              });
          }
      });
      that.loadDevices();
  },
  onShow:function() {
    this.do_show_name();
  },
  onReachBottom: function () {
  },
  onPullDownRefresh: function() {
    var that = this;
    get_user_info(false, function (user) {
      if (user) {
        g_data.clientId = user.client_id;
        wx.request({ //渲染场景(分组)
          url: "https://iot.xaircraft.com/weixin/tags?access_token=" + user.accessToken,
          method: "GET",
          success: function (res) {
            if (res.statusCode === 200) {
              g_data.scenes = res.data;
              loaded = true;
              app.showSuccess('数据更新成功');
              that.do_show_name();
            } else {
              app.showModal('数据更新失败', '请稍后再试');
            }
          },
          fail: function (err) {
            app.showModal('数据更新失败', '请检查你的网络设置');
          },
          complete: function(res) {
            wx.stopPullDownRefresh();
          }
        });
      }
    });
    that.loadDevices();
  }
})
