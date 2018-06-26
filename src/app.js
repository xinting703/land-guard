App({
  onLaunch: function () {
    var that = this;
    wx.getSystemInfo({ //获取设备高度
      success: function(res) {
        that.globalData.screenWidth = res.windowWidth || res.screenWidth;
        that.globalData.screenHeight = res.windowHeight || res.screenHeight;
      }
    });
  },
  showTip: function(t) {
    wx.showToast({
      title: t,
      duration: 10000,
      mask: true //显示透明蒙层，防止触摸穿透
    });
  },
  showSuccess: function(t) {
    wx.showToast({
      title: t,
      icon: 'success',
      duration: 1500
    });
  },
  showLoading: function(t) {
    wx.showToast({
      title: t,
      icon: 'loading',
      duration: 20000,
      mask: true //显示透明蒙层，防止触摸穿透
    });
  },
  hideLoading: function () {
      wx.hideToast();
  },
  closeLoading: function () {
      wx.hideToast();
  },
  showModal: function(title, content) {
    wx.showModal({
      title: title ? title : '',
      content: content,
      showCancel: false,
      confirmColor: "#09c264"
    });
  },
  format_number: function(num) {
    var result = Number(num).toFixed(1).split('.'); //拆分成整数与小数
    if(result[1] === '0') { //小数部分为0
      result = result[0];
    } else {
      result = result[0] + '.' + result[1];
    }
    return result;
  },
  tem_grading: function(tem) { //温度等级
    var desc = '炎热';
    var label_color = '#fa3211';
    if(tem < -20) {
      desc = '严寒';
      label_color = '#cbdee7';
    } else if(tem < -10) {
      desc = '大寒';
      label_color = '#bdd9fb';
    } else if(tem < 5) {
      desc = '寒';
      label_color = '#a2d5fe';
    } else if(tem < 14) {
      desc = '凉';
      label_color = '#70c3ff';
    } else if(tem < 18) {
      desc = '温';
      label_color = '#29b58c';
    } else if(tem < 28) {
      desc = '暖';
      label_color = '#edcd7f';
    } else if(tem < 35) {
      desc = '热';
      label_color = '#fa6911';
    }
    return [desc, label_color];
  },
  hum_grading: function(hum) { //湿度等级
    var desc = '潮湿';
    if(hum < 30) {
      desc = '干燥';
    } else if(hum < 65) {
      desc = '适宜';
    }
    return desc;
  },
  im_grading: function(im) { //光强等级
    var desc = '无';
    if(im > 10000) {
      desc = '强';
    } else if(im > 300) {
      desc = '中';
    } else if(im > 0) {
      desc = '弱';
    }
    return desc;
  },
  /**风速等级 */
  speed_grading: function (speed) {
    var desc = '无';
    if(speed >= 61.3 ) {
      desc = '17级以上';
    } else if (speed >= 56) {
      desc = '17级';
    } else if (speed >= 50.9) {
      desc = '16级';
    } else if (speed >= 46.1) {
      desc = '15级';
    } else if (speed >= 41.4) {
      desc = '14级';
    } else if (speed >= 37.0) {
      desc = '13级';
    } else if (speed >= 32.6) {
      desc = '12级';
    } else if (speed >= 28.5) {
      desc = '11级';
    } else if (speed >= 24.5) {
      desc = '10级';
    } else if (speed >= 20.8) {
      desc = '9级';
    } else if (speed >= 17.2) {
      desc = '8级';
    } else if (speed >= 13.9) {
      desc = '7级';
    } else if (speed >= 10.8) {
      desc = '6级';
    } else if (speed >= 8.0) {
      desc = '5级';
    } else if (speed >= 5.5) {
      desc = '4级';
    } else if (speed >= 3.4) {
      desc = '3级';
    } else if (speed >= 1.6) {
      desc = '2级';
    } else if (speed >= 0.2) {
      desc = '1级';
    }
    return desc;
  },
  /**风向 */
  speed_direction: function (direction) {
    var desc = '北风';
    if(direction > 270) {
      desc = '西北风';
    } else if (direction === 270) {
      desc = '西风';
    } else if (direction > 180) {
      desc = '西南风';
    } else if (direction === 180) {
      desc = '南风';
    } else if (direction > 90) {
      desc = '东南风';
    } else if (direction === 90) {
      desc = '东风';
    } else if (direction > 0) {
      desc = '东北风';
    }
    return desc;
  },
  /**降雨量等级 */
  rainfall_grading: function (rainfall) {
    var desc = '无';
    if(rainfall > 15) {
      desc = '暴雨';
    } else if (rainfall > 8) {
      desc = '大雨';
    } else if (rainfall > 2.5) {
      desc = '中雨';
    } else if (rainfall > 0.5) {
      desc = '小雨';
    }
    return desc;
  },
  moistureGrading: function (moisture) {
    if (moisture > 20) {
      return '偏湿'
    } else if (moisture > 15) {
      return '适宜'
    } else if (moisture > 12) {
      return '轻旱'
    } else if (moisture > 5) {
      return '中旱'
    } else {
      return '重旱'
    }
  },
  /*转换信号强度*/
  get_icon_signal: function (RSSI) {
    if (RSSI >= -65) {
        return '/images/common/equipment_icon_signal4@2x.png';
    } else if (RSSI >= -75) {
        return '/images/common/equipment_icon_signal3@2x.png';
    } else if (RSSI >= -88) {
        return '/images/common/equipment_icon_signal2@2x.png';
    } else if (RSSI >= -105) {
        return '/images/common/equipment_icon_signal1@2x.png';
    } else {
        return '/images/common/equipment_icon_signal0@2x.png';
    }
  },
  /*转换电池电量*/
  get_battery_color: function (battery_level) {
    if (battery_level >= 75) {
      return '#75ca85';
    } else if (battery_level >= 50) {
      return '#f1a63b';
    } else if (battery_level >= 25) {
      return '#f1415a';
    } else {
      return '#ff0000';
    }
  },
  globalData:{
    userInfo: null,
    type_id_to_name: {
        "1": "气象站"
    },
    model_id_to_name: {
      "1": {
          "1": "W1",
          "2": "FM1",
          "3": "FM2",
      },
    },
    model_id_to_icon: {
        "2": {
            "online": "/images/common/equipment_icon@2x.png",
            "upgrade": "/images/common/equipment_icon@2x.png",
            "offline": "/images/common/equipment_icon_offline@2x.png",
            "unused": "/images/common/equipment_icon_offline@2x.png",
        },
        "3": {
          "online": "/images/common/equipment_icon2.png",
          "upgrade": "/images/common/equipment_icon2.png",
          "offline": "/images/common/equipment_icon2_offline.png",
          "unused": "/images/common/equipment_icon2_offline.png",
        },
    },
    mnc2name: {
      460: {
        0: "中国移动",
        1: "中国联通",
        2: "中国移动",
        3: "中国电信",
        5: "中国电信",
        6: "中国联通",
        7: "中国移动",
        11: "中国电信",
        20: "中国铁通"
      },
      505: {
        1: "Telstra",
        2: " Optus",
        3: " Vodafone",
        8: "One.Tel",
      }
    },
    convertDevices: [], //位置页已转换gps之后的设备（包括图标及名称等）
    sign: false,
    scenes: [], //全局场景列表
    sceneIdx: 0, //全局场景标识
    markers: [],
    all_devices: [],
    devices_loaded: false,
    lines: [],
    x_position: [{}, {}, {}, {}, {}, {}],
    y_position: [{}, {}, {}, {}, {}, {}],
    trend_position: {
      xAxis: {},
      yAxis: {}
    }
  }
})