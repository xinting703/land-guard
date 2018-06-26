var app = getApp();

var get_user_info = function(require_new, callback) {
  var user = app.globalData.user_info || wx.getStorageSync('user_info');
  if(require_new || !user || user.expires_in * 1000 < Date.now() || !user.client_id) {
    // token不存在或token已过期
    wx.login({
      success: function(res) {
        var code = res.code;
        if(!code) {
          wx.hideToast();
          app.showModal('登录失败','获取微信用户登录态失败，请稍后重试');
          callback(null);
        } else {
          wx.getUserInfo({
            success: function(res) {
              var user = res.userInfo;
              wx.request({
                url: 'https://iot.xaircraft.com/weixin/access_token',
                method: 'POST',
                data: {
                  code: code,
                  encryptedData: res.encryptedData,
                  iv: res.iv,
                  app2: true
                },
                success: function(res) {
                  if(res.statusCode == '201') {
                    user.accessToken = res.data.access_token;
                    user.expires_in = res.data.expires_in + Math.round(Date.now() / 1000) - 60;
                    user.client_id = res.data.client_id;
                    wx.setStorage({
                        key: "user_info",
                        data: user
                    });
                    app.globalData.user_info = user;
                    callback(user);
                  } else {
                    wx.hideToast();
                    app.showModal('授权失败', '获取服务器授权失败，请稍后重试');
                    callback(null);
                  }
                },
                fail: function(err) {
                  wx.hideToast();
                  app.showModal('登录失败', '获取用户信息失败，请稍后重试');
                  callback(null);
                }
              });
            },
            fail: function(err) {
              wx.hideToast();
              if(err.errMsg === 'getUserInfo:fail auth deny') {
                app.showModal('授权失败','获取用户信息失败，请删除当前应用后重新进入并同意授权');
              } else {
                app.showModal('登录失败','获取用户信息失败，请稍后重试');
              }
              callback(null);
            }
          });
        }
      },
      fail: function() {
        wx.hideToast();
        app.showModal('登录失败','获取微信用户登录态失败，请稍后重试');
        callback(null);
      }
    });
  } else {
    callback(user);
  }
}

module.exports = {
    get_user_info: get_user_info
}