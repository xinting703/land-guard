// pages/qrcode/qrcode.js
var QR = require("../../dist/qrcode.js");
var g_data = getApp().globalData;
Page({
  data:{
  },
  onLoad: function(options) {
    var size = 240; //动态设置画布大小
    var qrcode_text = decodeURI(options.qrcode_text);
    qrcode_text = 'http://weixin.qq.com/r/Tjq5oVzEzQGyrRjC929c?xcx=' + qrcode_text;
    this.createQrCode(qrcode_text,"mycanvas",size,size);
    this.setData({
      canvas_size: size,
      deviceId: qrcode_text.split(',')[3]
    });
  },
  createQrCode: function(url,canvasId,cavW,cavH) {
    QR.qrApi.draw(url,canvasId,cavW,cavH);
  },
  onReachBottom: function () {

  }
})