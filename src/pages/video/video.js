// pages/video/video.js
var app = getApp();
var g_data = app.globalData;
Page({
  data: {
    display: false,
    fit: 'fill',
    downloading: false,
  },
  /**转发 */
  shareFile: function() {

  },
  /**下载视频 */
  saveFile: function() {
    var that = this;    
    var video_src = that.data.video_src;
    wx.getSetting({
      success: function(res) {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: function(res) {
              // 用户已经同意小程序使用视频保存功能，后续调用不会再弹窗询问
              that.download_file();
            },
            fail: function (err) {
              if (err.errMsg === 'authorize:fail auth deny') {
                app.showModal('视频保存失败', '请允许授权保存图片或视频到你的相册');
              } else {
                app.showModal('视频保存失败', '请检查你的网络设置');
              }
            },
          });
        } else {
          that.download_file();
        }
      },
      fail: function(err) {
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: function (res) {
            that.download_file();
          },
          fail: function (err) {
            if (err.errMsg === 'authorize:fail auth deny') {
              app.showModal('视频保存失败', '请允许授权保存图片或视频到你的相册');
            } else {
              app.showModal('视频保存失败', '请检查你的网络设置');
            }
          },
        })
      },
    });
  },
  /**下载文件 */
  download_file: function() {
    var that = this;
    that.setData({
      downloading: true,
    });
    var video_src = this.data.video_src;
    var valid_src = video_src.split(':')[0] + 's:' + video_src.split(':')[1];

    wx.downloadFile({
      url: valid_src,
      success: function (res) {
        wx.saveVideoToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function (res) {
            app.showSuccess('已保存');
            that.setData({
              downloading: false,
            });
          },
          fail: function (err) {
            that.setData({
              downloading: false,
            });
            if (err.errMsg === 'saveVideoToPhotosAlbum:fail cancel') { //取消选择存放地址（PC端）
              return;
            }
            app.showModal('视频保存失败', JSON.stringify(err));
          }
        });
      },
      fail: function (err) {
        that.setData({
          downloading: false,
        });
        app.showModal('视频下载失败', JSON.stringify(err));
      },
    });
  },
  fullscreenchange: function(e) {
    this.setData({
      fit: e.detail.fullScreen ? 'contain' : 'fill',
    });
  },
  onLoad: function (options) {
    var that = this;
    var screen_width = options.video_width;
    wx.getSystemInfo({ //获取设备高度
      success: function (res) {
        screen_width = res.windowWidth || res.screenWidth;
      },
      complete: function () {
        that.setData({
          video_src: options.video_src,
          img_src: options.img_src + '?x-oss-process=image/resize,w_'+screen_width,
          video_width: screen_width,
          video_height: screen_width * Number(options.scale),
          scale: Number(options.scale),
          display: true,
        });
      },
    });
  },
  onShareAppMessage: function(res) {
    var data = this.data;
    return {
      title: '全天时景',
      path: '/pages/video/video?video_src=' + data.video_src + '&scale=' + data.scale + '&video_width=' + data.video_width,
      imageUrl: data.img_src,
      success: function (res) {
      },
      fail: function (err) { // 转发失败
        if (err.errMsg !== 'shareAppMessage:fail cancel') {
          app.showModal('转发失败', JSON.stringify(err));
        }
      },
    }
  },
})