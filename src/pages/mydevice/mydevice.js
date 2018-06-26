//device.js
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;

var count = 5;
var offset = 0;
function format(device) { //格式化设备列表显示
  var dev = JSON.parse(JSON.stringify(device));
  dev.modelName = g_data.model_id_to_name[dev.type_id][dev.model_id];
  dev.icon = g_data.model_id_to_icon[dev.model_id][dev.status];

  dev['iconSignal'] = '/images/common/equipment_icon_signal0@2x.png'; //默认无信号
  if(dev.RSSI) { //如果有信号信息，则转换图标
    dev['iconSignal'] = app.get_icon_signal(dev.RSSI);
  }
  var mnc2name = g_data.mnc2name;
  dev['operator'] = '';
  if(dev.cell && mnc2name[dev.cell.mcc] && mnc2name[dev.cell.mcc][dev.cell.mnc]) {
    dev['operator'] = mnc2name[dev.cell.mcc][dev.cell.mnc]; //运营商
  }

  dev['battery_color'] = ''; //默认
  if(dev.hasOwnProperty('battery_level')) { //如果有电量信息，则转换电量图标
    dev['battery_color'] = app.get_battery_color(dev.battery_level);
  }
  dev.battery_level = (dev.battery_level <= 100 ? (dev.battery_level+'%') : ''); //格式化电量显示

  dev['charging'] = '';
  if (dev.hasOwnProperty('battery_charging') && dev.battery_charging) {
    dev['charging'] = '/images/common/equipment_icon_charge.png';
  }
  return dev;
}

Page({
  data: {
    loaded: false,
    empty_show: false,
    list: []
  },
  do_show_devices: function() {
    if(this.data.loaded) {
      var that = this;
      var devices = JSON.parse(JSON.stringify(g_data.all_devices));
      if (!devices.length) { //没有设备
        that.setData({
          empty_show: true,
          list: []
        });
        return;
      }

      var show_device = [];
      var client_id = g_data.clientId;
      for (var i = 0; i < devices.length; ++i) {
        var origin_dev = devices[i];
        var formated_dev = format(devices[i]);
        var mark = '';
        var is_private = false;
        var limit_text = '';
        if (origin_dev.owner !== client_id) { //非己
          if (origin_dev.access_control === 'private') { //拥有者关闭共享
            is_private = true;
            limit_text = '没有权限';
          }
          mark = '/images/common/equipment_icon_share@2x.png';
        }
        show_device[i] = {
          device_id: origin_dev.device_id,
          icon: formated_dev.icon,
          name: formated_dev.name,
          status: origin_dev.status,
          iconSignal: formated_dev.iconSignal,
          operator: formated_dev.operator,
          battery_color: formated_dev.battery_color,
          battery_level: formated_dev.battery_level,
          charging: formated_dev.charging,
          is_private: is_private,
          limit_text: limit_text,
          mark: mark,
        };
      }

      this.setData({
        list: show_device,
        empty_show: false
      });
    }
  },
  /** 选择添加方式*/
  showAddMethod: function () {
      var that = this;
      wx.showActionSheet({
          itemList: ['扫一扫', '输入设备编号'],
          success: function (res) {
              if (res.tapIndex === 1) { //输入ID
                  wx.navigateTo({
                      url: '../adddevice/adddevice',
                      fail: function () {
                          app.showModal('跳转失败', '请检查你的网络设置');
                      }
                  });
              } else if (res.tapIndex === 0) { //扫码添加新的设备
                  that.scanCode();
              }
          },
          fail: function (res) {
          }
      });
  },
  checkDetail: function (e) { //查看设备详情
    var idx = e.currentTarget.dataset.index; //当前设备下标
    var device_id = e.currentTarget.id;
    wx.navigateTo({
        url: '../deviceinfo/deviceinfo?device_idx='+idx+'&device_id='+device_id,
        fail: function() {
            app.showModal('跳转失败','请检查你的网络设置');
        }
    });
  },
  scanCode: function () { //扫一扫
      var that = this;
      wx.scanCode({
          success: function (res) {
            var fields = res.result.split(',');
            if (fields.length !== 5 || (fields[0] !== 'device' && fields[0] !== 'http://weixin.qq.com/r/Tjq5oVzEzQGyrRjC929c?xcx=device' && fields[0] !== 'http://iot.xaircraft.com/?xcx=device') || fields[1] !== '1' || (fields[2] !== '2' && fields[2] !== '3')){ //非气象站,型号不为2,类型均为字符串
                  app.showModal('扫码失败', '无效条码');
                  return;
              }
              that.setData({
                  device_id: fields[3]  //需要添加的设备ID
              });
              var device_id = fields[3];

              var devices = g_data.all_devices;
              for (var i = 0; i < devices.length; ++i) {
                if (devices[i].device_id === device_id) { //地块中已经存在该设备
                  app.showSuccess('设备已添加');
                  return;
                }
              }

              wx.navigateTo({ //查看对应设备信息
                url: '../deviceinfo/deviceinfo?device_id=' + device_id + '&method_of_add=scancode&source_of_add=mydevice',
                fail: function () {
                  app.showModal('跳转失败', '请检查你的网络设置');
                }
              });
              
          },
          fail: function (err) {
              if (err.errMsg === "scanCode:fail cancel") { //取消扫码
                  return;
              } else if (err.errMsg === "scanCode:fail") {
                  app.showModal('扫码失败', '无法识别');
              } else {
                  app.showModal('扫码失败', '请检查你的网路设置');
              }
          }
      });
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
                                        for(var i = 0; i < length; ++i) { //避免分配重复的名字
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
                         app.showModal('添加失败', '请稍后重试');
                      }
                  }, fail: function (err) { //添加失败
                      app.showModal('添加失败', '请检查你的网路设置');
                  },
                  complete: function(res) { //设备添加完成
                      app.hideLoading();
                      if (res.statusCode === 201) {
                          app.showSuccess('添加成功');
                      }
                  }
              }); //设备添加调用结束
          }
      });
  },
  loadDevices: function(refresh) {
      var that = this;
      get_user_info(false, function (user) {
          if (user) {
            g_data.clientId = user.client_id;
            wx.request({ //重新获取全部设备
                url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
                method: "GET",
                success: function (res) {
                    if (refresh) {
                        wx.stopPullDownRefresh();
                    }
                    if (res.statusCode === 200) {
                        g_data.all_devices = res.data.devices;
                        g_data.devices_loaded = true;
                        that.setData({
                            loaded: true
                        });
                        that.do_show_devices();
                        if (refresh) {
                            app.showSuccess('更新成功');
                        } else {
                          app.hideLoading();
                        }
                    } else {
                        app.hideLoading();
                        wx.showModal({
                            title: '设备列表更新失败',
                            content: '请稍后再试',
                            showCancel: false
                        });
                    }
                },
                fail: function (err) {
                    app.hideLoading();
                    wx.showModal({
                        title: '设备列表更新失败',
                        content: '请检查你的网络设置',
                        showCancel: false
                    });
                }
            });
          }
      });
  },
  onLoad:function(options) {
    var that = this;
    app.showLoading('加载中');
    that.loadDevices();
  },
  onShow:function() {
    this.do_show_devices();
  },
  /*点击删除按钮事件*/
  deleteDevice: function(e) {
    var that = this;
    var list_idx = e.currentTarget.dataset.index;
    var devices = g_data.all_devices;
    
    wx.showActionSheet({
      itemList: ['删除'],
      itemColor: '#ff0000',
      success: function(res) {
        if(res.tapIndex === undefined) {
          return;
        }
        get_user_info(false, function(user) {
          if(user) {
            wx.request({ //删除设备
              url: "https://iot.xaircraft.com/weixin/devices/del?access_token="+user.accessToken,
              method: "POST",
              data: {
                  device_id: devices[list_idx].device_id
              },
              success: function(res) {
                if(res.statusCode === 204) {
                  devices.splice(list_idx,1);
                  that.do_show_devices();
                  app.showSuccess('删除成功');
                  wx.request({ //重新渲染场景(分组)
                      url: "https://iot.xaircraft.com/weixin/tags?access_token=" + user.accessToken,
                      method: "GET",
                      success: function (res) {
                          wx.hideToast();
                          if (res.statusCode === 200) {
                              g_data.scenes = res.data; //场景重新赋值
                          } else {
                              app.showModal('地块数据更新失败', '请稍后再试');
                          }
                      },
                      fail: function (err) {
                          wx.hideToast();
                          app.showModal('地块数据更新失败', '请检查你的网络设置');
                      }
                  });
                } else {
                  app.showModal('删除失败','请稍后再试');
                }
              },
              fail: function(err) {
                app.showModal('删除失败','请检查你的网络设置');
              }
            });
          }
        });
      },
      fail: function (err) {
          if (err.errMsg === 'showActionSheet:fail cancel') { //点击取消或蒙层
          return;
        }
        app.showModal('删除失败','请检查你的网络设置');
      }
    });
  },
  onPullDownRefresh: function() {
      app.showLoading('加载中');
      this.loadDevices(true);
  },
  onReachBottom: function () {
    this.loadDevices();
  }
});