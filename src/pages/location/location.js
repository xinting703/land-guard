// pages/location/location.js
var geoconvertor = require('../../dist/geoconvertor.js');
var moment = require('../../dist/moment.min.js');
var get_user_info = require('../../dist/user.js').get_user_info;

var app = getApp();
var g_data = app.globalData;
var top = (g_data.screenHeight - 100)/2 - 50;
var left = (g_data.screenWidth)/2 - 25;
var p_markers = [];
var convertDevice = {};
moment.locale('zh-cn');

var selected_marker = { //定义地图上的标记点图标类型，对应设备类型
  "1": "/images/location/equlocation_icon_map.png",
  "2": "/images/location/equlocation_icon_map.png",
  "3":  "/images/location/equlocation_icon_map.png",
};
var loc_icon = [{
  "online": "/images/location/equlocation_icon_gps@2x.png",
  "upgrade": "/images/location/equlocation_icon_gps@2x.png",
  "offline": "/images/location/equlocation_icon_gps2@2xx.png",
  "unused": "/images/location/equlocation_icon_gps2@2x.png"
},{
    "online": "/images/location/equlocation_icon_station@2x.png",
    "upgrade": "/images/location/equlocation_icon_station@2x.png",
    "offline": "/images/location/equlocation_icon_station2@2x.png",
    "unused": "/images/location/equlocation_icon_station2@2x.png"
  }
];

function check_location(lon, lat) {
  if (lon < -180 || lon > 180)
      return false;
  if (lat < -90 || lat > 90)
      return false;
  return true;
}


Page({
  data:{
    noPosition: false,
    scale: 12
  },
  showEmptyMap: function() { //设置空地图数据
    this.setData({
      noPosition: true
    });
    wx.hideToast();
  },
  translate: function(point) { //参数为已经转换完成的坐标集合
    var that = this;
    if(!check_location(point.lng,point.lat)) { //位置无效
        that.showEmptyMap();
        return;
    }
    //生成腾讯地图转换的queryString
    var result = geoconvertor.GPS2gcj(point.lat, point.lng);
    p_markers = [{ //标记点信息
        id: 0,
        iconPath: convertDevice.icon_marker,
        latitude: result.lat,
        longitude: result.lng,
        width: 32,
        height: 40
    }];

    if(!p_markers.length) { //无有效标记点
      wx.hideToast();
      that.showEmptyMap();
      return;
    }

    var center_id = 0;
    
    p_markers[center_id].iconPath = convertDevice.selected_marker; //设置当前点定位图标
    that.setData({
      centerLongitude: p_markers[center_id].longitude, //中心点位置
      centerLatitude: p_markers[center_id].latitude,
      markers: p_markers,
      mapHeight: g_data.screenHeight - 100 + 48
    });
    var dev = convertDevice;
    that.setData({
      singlePoint: { //设置地图显示初态
        devId: dev.dev_id,
        name: dev.name,
        tags: dev.tags,
        typeIcon: dev.icon_type,
        locIcon: dev.loc_type_icon,
        longitude: dev.lng,
        latitude: dev.lat
      }
    });
    
    wx.request({ //使用腾讯坐标转换成地理位置,纬度前经度后,coord_type=1为使用GPS坐标转换5为使用腾讯、高德或Google,get_poi=0不返回周边POI列表
　　　   url: 'https://apis.map.qq.com/ws/geocoder/v1/?location=' + p_markers[center_id].latitude + ',' + p_markers[center_id].longitude + '&coord_type=5&get_poi=0&key=35UBZ-RJ7H5-OFHI4-Q4327-ITX2H-PAFOW',
　　　   header: {
            'Content-Type': 'application/json'
        },
        success: function(res) {
            if(res.statusCode === 200) {
                that.setData({
                    address: res.data.result.address
                });
            } else {
                that.setData({
                    address: '无'
                });
            }
            wx.hideToast();
        },
        fail: function() {
            that.setData({
                address: '无'
            });
            wx.hideToast();
            app.showModal('地理位置获取失败','请检查你的网络设置');
        }
    });
  }, //结束转换函数(原始坐标到腾讯坐标的转换)
  init_point: function (device) { //初始化设备(原始定位信息->GPS)
      var that = this;
      var point = {}; //地图点
      var location = device.location;
      var cell = device.cell;
      var name = device.name;
      if (location && location.longitude && location.latitude && (device.voiced_at - location.timestamp < 60 || !cell)) { //GPS定位
        point = { //地图点集
          lng: location.longitude,
          lat: location.latitude
        };
        convertDevice = {
          dev_id: device.device_id,
          name: name,
          tags: device.tags,
          selected_marker: selected_marker[device.model_id],
          icon_type: g_data.model_id_to_icon[device.model_id][device.status], //类型图标
          loc_type_icon: loc_icon[0][device.status],
          lng: location.longitude.toFixed(6),
          lat: location.latitude.toFixed(6)
        }; //设置已转设备集合(地图取点数据)
        that.translate(point);
      } else if(cell) { //基站定位
          var query_str = 'mcc='+cell.mcc+'&mnc='+cell.mnc+'&lac='+cell.lac+'&ci='+cell.cell_id;
          var cell_info = {
            mcc: cell.mcc,
            mnc: cell.mnc,
            lac: cell.lac,
            ci: cell.cell_id
          };

          get_user_info(false, function(user) {
            if(user) {
              wx.request({ //基站信息转转GPS信息
          　　　 url: 'https://iot.xaircraft.com/weixin/devices/cell/location?' + query_str+'&access_token='+user.accessToken,
                method: 'GET',
                success: function(res) {
                  if(!res.data.errcode) { //errcode=0 即为转换成功
                    var transl_lng = res.data.lon; //GPS坐标
                    var transl_lat = res.data.lat;
                    point = { //地图点集
                      lng: Number(transl_lng),
                      lat: Number(transl_lat)
                    };
                    convertDevice = {
                      dev_id: device.device_id,
                      name: name,
                      tags: device.tags,
                      selected_marker: selected_marker[device.model_id],
                      icon_type: g_data.model_id_to_icon[device.model_id][device.status], //类型图标
                      loc_type_icon: loc_icon[1][device.status],
                      lng: Number(transl_lng).toFixed(6),
                      lat: Number(transl_lat).toFixed(6)
                    }; //设置全局设备集合(地图取点数据)
                    that.translate(point);
                  } else { //(包括基站失败和无有效点)，不能显示地图
                    that.showEmptyMap();
                  }
                },
                fail: function(err) { //基站信息转换失败
                  that.showEmptyMap();
                }
              });
            }
          });
      } else { //没有定位信息
          that.showEmptyMap();
      }//结束所有定位判断
  },
  onLoad: function(options) {
    var that = this;
    var request = true;
    wx.getNetworkType({
      success: function(res) {
        if(res.networkType === 'none') {
          app.showModal('获取失败', '请检查你的网络设置');
          return;
        }
      }
    });
    app.showLoading('加载中');
    
    that.setData({ //初始化页面高宽
        screenWiidth: g_data.screenWidth,
        mapHeight: g_data.screenHeight - 100 + 48
    });
    that.init_point(g_data.all_devices[options.device_idx]);
  },
  onReachBottom: function () {

  }
});