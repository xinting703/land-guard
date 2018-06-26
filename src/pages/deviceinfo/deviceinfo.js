// pages/deviceinfo/deviceinfo.js
var get_user_info = require('../../dist/user.js').get_user_info;
var moment = require('../../dist/moment.min.js');
var app = getApp();
var g_data = app.globalData;
var source_of_add = '';

var online_status = 'online,upgrade,offline,unused';
var query_type = 1;
var scene_idx = 0; //当前场景下标
function format(dev) { //格式化设备列表显示
  dev.modelName = g_data.model_id_to_name[dev.type_id][dev.model_id];
}

var TABLE = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823, 0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067, 0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a, 0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
];
var crc16_ccitt = function (str) {
    var crc = 0xffff;
    for (var index = 0; index < str.length; index++) {
        var byte = str.charCodeAt(index);
        crc = (TABLE[(crc >> 8 ^ byte) & 0xff] ^ (crc << 8)) & 0xffff;
    }
    return (~crc) & 0xffff;
};

Page({
    data:{
        loaded: false,
        show_all: false,
        xa_card: false,
    },
    do_show_device: function (dev) {
      var device = JSON.parse(JSON.stringify(dev));
        if(this.data.loaded) {
            var show_device = {};
            var client_id = g_data.clientId;
            var owner = device.owner;
            format(device);  //格式化
            if (owner !== client_id) { //非己
                if (owner === '') { //无拥有者设备
                    show_device = {
                        device_id: device.device_id,
                        sn: device.sn,
                        name: device.name,
                        modelName: device.modelName,
                        version: device.software && device.software.version ? device.software.version : '未知',
                        status: device.status,
                        owner: 'empty'
                    };
                } else if (device.access_control === 'private') { //拥有者关闭共享
                    device.status = 'offline'; //取消实际在线状态
                    show_device = {
                      device_id: device.device_id,
                      name: device.name,
                    };
                } else { //非己public
                    show_device = {
                        device_id: device.device_id,
                        sn: device.sn,
                        name: device.name,
                        modelName: device.modelName,
                        version: device.software && device.software.version ? device.software.version : '未知',
                        status: device.status
                    };
                }
                show_device['mark'] = '/images/public/img_sharing01_equipment_management@2x.png';
                show_device['is_own'] = false;
            } else { //自己的设备
                show_device = {
                    device_id: device.device_id,
                    sn: device.sn,
                    name: device.name,
                    modelName: device.modelName,
                    version: device.software && device.software.version ? device.software.version : '未知',
                    status: device.status,
                    mark: ''
                };
                show_device['is_own'] = true;
                show_device['public'] = device.access_control === 'public' ? true : false;
            }
            show_device['tags'] = device.tags;
            if(device.status !== 'unused') {
                if (device.reserved2) {
                    show_device['end_time'] = moment(1000 * Number(device.reserved2)).format('YYYY-MM-DD');
                } else if (device.reserved1) {
                    show_device['end_time'] = moment(1000 * Number(device.reserved1)).add(1, 'years').add(-1, 'days').format('YYYY-MM-DD');
                }
            }
            this.setData({
                device: show_device,
                name: show_device.name,
                tmp_name: g_data.tmp_dev_name
            });
        }
    },
    /* 跳页修改设备名 */
    setName: function (e) {
        var that = this;
        var method_of_add = that.data.method_of_add || '';
        var device = that.data.device;
        wx.navigateTo({
            url: '../setdevice/setdevice?old_name=' + device.name + '&device_id=' + device.device_id + '&device_idx=' + that.data.device_idx+'&method_of_add='+method_of_add,
            fail: function () {
                app.showModal('跳转失败', '请检查你的网络设置');
            }
        });
    },
    /**参数设置 */
    setArgument: function () {
      var that = this;
      var device = that.data.device;
      wx.navigateTo({
        url: '../setting/setting?device_id=' + device.device_id + '&device_idx=' + that.data.device_idx,
        fail: function () {
          app.showModal('跳转失败', '请检查你的网络设置');
        }
      });
    },
    /** 查看二维码 */
    checkQrcode: function (e) {
        var device = this.data.original_device;
        var qrcode_text = 'device,' + device.type_id + ',' + device.model_id + ',' + device.device_id + ',';
        qrcode_text += crc16_ccitt(qrcode_text + '9641c8e0a48811e6a750d575346e4606').toString(16);
        wx.navigateTo({
            url: '../qrcode/qrcode?qrcode_text=' + qrcode_text,
            fail: function (err) {
                app.showModal('跳转失败', '请检查你的网络设置');
            }
        });
    },
    /** 查看到期详情 */
    showPayInfo: function(e) {
        var that = this;
        var device = that.data.device;
        wx.navigateTo({
            url: '../description/description?device_idx=' + that.data.device_idx,
            fail: function () {
                app.showModal('跳转失败', '请检查你的网络设置');
            }
        });
    },
    checkLocation: function () { //设备位置
        var that = this;
        wx.navigateTo({
            url: '../location/location?device_idx=' + that.data.device_idx,
            fail: function () {
                app.showModal('跳转失败', '请检查你的网络设置');
            }
        });
    },
    switchChange: function (e) { //共享
        var that = this;
        var device = that.data.device;
        var device_id = device.device_id;
        var checked = e.detail.value;
        get_user_info(false, function (user) {
            if (user) {
                var dev = {
                    "device_id": device_id,
                    "access_control": checked ? 'public' : 'private'
                };
                wx.request({
                  url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
                  data: dev,
                  method: "PUT",
                  success: function (res) {
                    if (res.statusCode === 201) {
                      wx.showToast({
                        title: '修改成功',
                        duration: 1500,
                      });
                      that.loadDevices(false);
                    } else {
                      wx.showModal({
                        title: '修改失败',
                        content: '请稍后再试',
                        showCancel: false,
                        complete: function () {
                            device.public = !checked;
                            that.setData({
                                device: device
                            });
                        }
                      });
                    }
                  }, fail: function () {
                    wx.showModal({
                      title: '修改失败',
                      content: '请稍后再试',
                      showCancel: false,
                      complete: function () {
                        device.public = !checked;
                        that.setData({
                          device: device
                        });
                      }
                    });
                  }
                });
            }
        });
    },
    cleardata: function() {
      wx.navigateTo({
        url: '/pages/cleardata/cleardata?deviceId=' + this.data.device.device_id,
      })
    },
    /*删除确认框*/
    showConfirmModal: function() {
        var that = this;
        wx.showModal({
            title: '提示',
            content: '确认删除该设备？',
            showCancel: true,
            success: function(res) {
                if (res.confirm) { //用户点击确定
                    that.deleteDevice();
                }
            },
            fail: function() {
                wx.showToast({
                    title: '网络异常',
                    image: '/images/public/img_error@2x.png',
                    duration: 2000
                });
            }
        })
    },
    deleteDevice: function() { //删除设备
        app.showLoading('正在删除');
        var that = this;
        var device_id = that.data.device.device_id;
        get_user_info(false, function (user) {
            if (user) {
                wx.request({ //删除设备
                    url: "https://iot.xaircraft.com/weixin/devices/del?access_token=" + user.accessToken,
                    method: "POST",
                    data: {
                        device_id: device_id
                    },
                    success: function (res) {
                      if (res.statusCode === 204) { //删除成功
                          app.showSuccess('删除成功');
                          that.loadDevices();
                      } else {
                          app.showModal('删除失败', '请稍后再试');
                      }
                      wx.hideToast();
                    },
                    fail: function (err) {
                        wx.hideToast();
                        app.showModal('删除失败', '请检查你的网络设置');
                    }
                });
            }
        });
    },
    /**添加设备 */
    addDevice: function () {
      var that = this;
      var device = that.data.device;
      if ((device.owner === 'empty' || device.is_own) && !device.name && !g_data.tmp_dev_name ) { //未命名设备
        that.setData({
          show_tip: true
        });
        setTimeout(function () {
          that.setData({
            show_tip: false
          });
        }, 1500);
        return;
      }
  
      app.showLoading('正在添加');
      var device_id = device.device_id;
      get_user_info(false, function (user) {
        if (user) {
          wx.request({ //添加设备
            url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
            method: "POST",
            data: {
              device_id: device_id
            },
            success: function (res) {
              if (res.statusCode === 201) { //添加成功
                var device = res.data;
                if (device.owner === g_data.clientId && g_data.tmp_dev_name) { //只能更改自己设备的信息
                  var dev = {
                    "device_id": device_id,
                    "name": g_data.tmp_dev_name
                  };
                  wx.request({ //更改设备名
                    url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
                    data: dev,
                    method: "PUT",
                    success: function (res) {
                      if (res.statusCode === 201) { //修改成功       
                      } else {                        
                      }
                    }, fail: function (err) {        
                    },
                    complete: function (err) { //更改设备名完成
                      if(source_of_add === 'scenedevice') {
                        that.joinTag(); //加入地块
                      } else {
                        app.showSuccess('添加成功');
                        that.loadDevices();
                      }
                    }
                  });
                } else { //不修改设备名
                  if (source_of_add === 'scenedevice') {
                    that.joinTag(); //加入地块
                  } else {
                    app.showSuccess('添加成功');
                    that.loadDevices();
                  }
                }
              } else { //添加失败
                app.showModal('添加失败', '请稍后重试');
              }
            }, fail: function (err) { //添加失败
              app.hideLoading();
              app.showModal('添加失败', '请检查你的网路设置');
            }
          }); //设备添加调用结束
        }
      });
    },
    /* 把设备加到分组中 */
    joinTag: function () {
      var that = this;
      var scene = g_data.scenes[g_data.sceneIdx];
      var tag_name = scene.name;
      var device_id = that.data.device.device_id;

      if (scene.devices.length === 50) {
        app.showModal('添加失败', '单个地块不能添加超过50台设备');
        return;
      }
      get_user_info(false, function (user) {
        if (user) {
          wx.request({ //加入分组
            url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "/tags?access_token=" + user.accessToken,
            method: "POST",
            data: {
              name: tag_name
            },
            success: function (res) {
              if (res.statusCode === 201) { //加入分组成功
                app.showSuccess('添加成功');
                that.loadDevices();
              } else { //加入分组失败(已经存在于该分组或设备不存在)--已判断过，不再做处理
              }
              app.hideLoading();
            }, fail: function (err) { //加入分组失败
              app.hideLoading();
              app.showModal('添加失败', '请检查您的网络设置');
            }
          }); //加入分组调用结束
        }
      });
    },
    /**重新获取全部设备 */
    loadDevices: function (go_back) {
      var that = this;
      get_user_info(false, function (user) {
        if (user) {
          g_data.clientId = user.client_id;
          wx.request({ //重新获取全部设备
            url: "https://iot.xaircraft.com/weixin/devices?access_token=" + user.accessToken,
            method: "GET",
            success: function (res) {
              if (res.statusCode === 200) {
                g_data.all_devices = res.data.devices;
              } else {
              }
            },
            fail: function (err) {
            },
            complete: function () {
              if (go_back !== false) {
                app.hideLoading();
                that.reloadScenes();
              }
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
                for (var i = 0; i < res.data.length; ++i) {
                  if (res.data[i].name === g_data.scenes[g_data.sceneIdx].name) {
                    g_data.sceneIdx = i; //找到当前地块
                    break;
                  }
                }
                g_data.scenes = res.data;
              } else {
                app.showModal('数据更新失败', '请稍后刷新首页查看');
              }
            },
            fail: function (err) {
              app.showModal('数据更新失败', '请检查你的网络设置');
            },
            complete: function () {
              that.goBack();
            }
          });
        }
      });
    },
    /**取消添加设备 */
    goBack: function() {
      wx.navigateBack({
        delta: 1 // 返回数据页
      });
    },
    onLoad: function(options) {
      var that = this;
      g_data.tmp_dev_name = ''; //还原临时设备名
      g_data.check_idx = '';
      var all_devices = g_data.all_devices || [];
      var device = {};
      var device_id = options.device_id;
      source_of_add = options.source_of_add || '';

      if (options.device_idx) { //有设备下标，即为全部设备列表进入
        var device_idx = options.device_idx;
        device = all_devices[device_idx];
        that.setData({
          original_device: device,
          device_idx: device_idx,
          loaded: true,
          show_all: true
        });
        
        that.do_show_device(device);
        return;
      }

      /**地块设备进入、扫码进入或url（获取设备信息填入） */
      app.showLoading('正在加载');
      var device_idx = options.device_idx;
      get_user_info(false, function (user) {
        if (user) {
          wx.request({ //获取设备信息
            url: "https://iot.xaircraft.com/weixin/devices/" + device_id + "?access_token=" + user.accessToken,
            method: "GET",
            success: function (res) {
              if (res.statusCode === 200) { //获取设备信息成功
                device = res.data;
                that.setData({
                  original_device: device,
                  device_idx: device_idx,
                  loaded: true,
                  method_of_add: 'scancode',
                  show_all: false
                });

                that.do_show_device(device);
              } else { //获取设备信息失败
                app.showModal('获取失败', '请稍后再试');
              }
              app.hideLoading();
            },
            fail: function () {
              app.hideLoading();
              app.showModal('加载失败', '请检查你的网路设置');
            }
          });
        }
      });
    },
    onShow: function() {
      var that = this;
      if (that.data.device_idx) {
        var idx = g_data.check_idx !== '' ? g_data.check_idx : that.data.device_idx;
        var device = g_data.all_devices[idx];
        that.do_show_device(device);
        if (device.owner === g_data.clientId) {
          get_user_info(false, function (user) {
            if (user) {
              wx.request({ //渲染场景(分组)
                url: "https://iot.xaircraft.com/weixin/telephone?iccid="+device.ICCID+"&access_token=" + user.accessToken,
                method: "GET",
                success: function (res) {
                  if (res.statusCode === 200) {
                    that.setData({
                      xa_card: true,
                    });
                  } else {
                  }
                },
                fail: function (err) {
                },
                complete: function () {
                  that.setData({
                    get_tel: true, //保证删除按钮最后显示页面不跳动
                  });
                }
              });
            }
          });
        }
      }

      if (g_data.tmp_dev_name) {
        that.setData({
          name: g_data.tmp_dev_name,
          tmp_name: g_data.tmp_dev_name
        });
      }
    },
    onReachBottom: function () {

    }
});