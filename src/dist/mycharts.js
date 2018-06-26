var app = getApp();
var g_data = app.globalData;
var screenWidth = g_data.screenWidth;
var canvas_width = screenWidth- 20;
function mesureText(text) { //获取字符串占用宽度
    text = String(text);
    var text = text.split('');
    var width = 0;
    text.forEach(function (item) {
        if (/[a-zA-Z]/.test(item)) {
            width += 7;
        } else if (/[0-9]/.test(item)) {
            width += 5.5;
        } else if (/\./.test(item)) {
            width += 10;
        } else if (/-/.test(item)) {
            width += 3.25;
        } else if (/[\u4e00-\u9fa5]/.test(item)) {
            width += 10;
        } else if (/\(|\)/.test(item)) {
            width += 3.73;
        } else if (/\s/.test(item)) {
            width += 2.5;
        } else if (/%/.test(item)) {
            width += 8;
        } else {
            width += 10;
        }
    });
    return width;
}

var myCharts = function (opts) {
    var yAxis_width = 2, xAxis_height = 20; //y轴宽度,x轴高度
    var top_space = 50; //顶部留白
    var chart_type = opts.type,
        day_idx = 0,
        month_idx = 0,
        y_type = 'auto',
        device_idx = opts.device_idx,
        canvas_id = opts.canvasId,
        unit = opts.unit,
        data_x = opts.data.xAxis,
        data_y = opts.data.yAxis,
        show_yAxis = opts.showYAxis, //是否显示Y轴
        // bg_color = opts.style.bgColor || "#fb999a", //填充色
        line_color = opts.style.lineColor, //线条颜色
        point_color = opts.style.pointColor, //线条颜色
        canvas_height = opts.canvasHeight, //图表高度
        xAxis_title = opts.title.xAxis || '', //x轴底部说明文字
        yAxis_title = opts.title.yAxis || ''; //y轴底部说明文字
    if (opts.hasOwnProperty("day_idx")) {
        day_idx = opts.day_idx;
    } else if (opts.hasOwnProperty("month_idx")) {
        month_idx = opts.month_idx;
        y_type = opts.y_type;
    }
    
    var ctx = wx.createCanvasContext(canvas_id); //上下文
    var data_length = data_x.length; //数据长度
    var y_marker_length = 4; //y轴标记点个数
    var x_marker_skip = 1;  //X轴标记点间隔数
    var subline_skip = 2;  //辅助线间隔数
    if(data_length >= 16) { // 数据长度
        subline_skip = 4;
        x_marker_skip = 6;
    }
    if(yAxis_title) {
        top_space = 30; //顶部留白
        ctx.fillText(yAxis_title, 10, 20); // y轴名称
    }
    if(xAxis_title) {
        top_space = 30;
        ctx.fillText(xAxis_title, canvas_width-mesureText(xAxis_title)-15, 20); // x轴名称
    }
    var data_y_max = -Infinity;  //value最大值
    var data_y_min = Infinity;  //value最小值
    var origin = {}, xAxis_end = {}, yAxis_end = {};
    var xAxis_width, xAxis_space; //X轴宽度及各刻度值间间隙
    var yAxis_height, yAxis_space; //Y轴高度及各刻度值间间隙
    var y_markers = []; //Y轴刻度值
    var y_marker_space, y_marker_max, y_top_marker;
    
    function chartSet() { //设置图表参数
        ctx.setFontSize(12); //设置显示字号
        ctx.setFillStyle('#666666'); //设置字体颜色
        for (var i = 0; i < data_length; i++) {
            if (data_y[i] !== '') {
                if (data_y[i] > data_y_max) {
                    data_y_max = data_y[i]; //获取数据最大值
                }
                if (data_y[i] < data_y_min) {
                    data_y_min = data_y[i]; //获取数据最大值
                }
            }
        }
        var text_max_width = 20; //y轴标记点值最长宽度
        for( var m = 0; m < data_length; m++) {
            // var computed_length = mesureText(data_y[m] + unit);
            var computed_length = mesureText(data_y[m]);
            if (computed_length > text_max_width) {
                text_max_width = computed_length + 10;//获取最大值
            }
        }

        if(show_yAxis) {
            yAxis_width = Math.max(yAxis_width, text_max_width + 10);  //y轴左边宽度
        }

        //画布左上角为(0,0)
        origin = { //原点
            x: yAxis_width,
            y: canvas_height - xAxis_height
        };
        
        xAxis_end = { //X轴终点
            x: canvas_width - 15,
            y: canvas_height - xAxis_height
        };
        yAxis_end = { //y轴终点
            x: yAxis_width,
            y: top_space
        };
        xAxis_width = xAxis_end.x - origin.x; //x轴宽度
        g_data.lines.push({
            width: xAxis_width,
            left: origin.x
        });
        xAxis_space = xAxis_width / (data_length - 1); //x轴各坐标间隙
        
        yAxis_height = origin.y - yAxis_end.y; //Y轴高度
        var equal_num = 0;//用于保存相同的个数
        var valid_num = 0;  //有效数据个数
        var equal = data_y[0]; //有效数据相同的测试值
        var empty_count = 0;
        for (var i = 0; i < data_y.length; ++i) {
            if (data_y[i] !== '') {
                valid_num++;
                equal = data_y[i];
            } else {
                empty_count++;
            }
        }
        
        for (var i = 0; i < data_y.length; ++i) {
            if (data_y[i] === equal) { //值相同（计算个数需要包括本身）
                equal_num++;  //值相同的个数
            }
        }
        
        if (opts.hasOwnProperty("month_idx") && y_type === 'fixed_marker') { //月份数据统计（日照y轴固定为0-24）
          yAxis_space = yAxis_height / (y_marker_length - 1); //Y轴坐标间隙
          y_markers = [0, 6, 12, 18];
          y_marker_max = 18;
          data_y_min = 0;
          y_top_marker = 24;
        } else { //每天数据统计
            if (empty_count === data_y.length) {
                yAxis_space = yAxis_height / (y_marker_length - 1); //Y轴坐标间隙
                y_markers = [0, 1, 2, 3];
                y_marker_max = 3;
                data_y_min = 0;
                y_top_marker = 4;
            } else {
                if (equal_num === valid_num) { //每个有效值都相同
                    yAxis_space = yAxis_height / (y_marker_length - 1); //Y轴坐标间隙
                    var equal_data = Math.floor(equal);
                    y_markers = [equal_data, equal_data + 1, equal_data + 2, equal_data + 3];
                    y_marker_max = y_markers[3];
                    data_y_min = y_markers[0];
                    y_top_marker = equal_data + 4;
                } else {
                    var max_min_space = data_y_max - data_y_min; //最大最小间隔
                    y_marker_space = Math.ceil(max_min_space / (y_marker_length - 1)); //(Y轴标记点数据间隔)向上取整
                    
                    y_marker_max = data_y_max; //y轴最大值
                    yAxis_space = yAxis_height / (y_marker_length - 1); //Y轴坐标间隙
                    for (var i = 0; i < y_marker_length; ++i) {
                        y_markers.push(i * y_marker_space + Math.floor(data_y_min)); //y轴标记点数值
                    }
                    for (var i = 1; i < y_marker_length; ++i) {
                        if (y_markers[i] > y_marker_max) {
                            y_marker_max = y_markers[i];
                        }
                    }
                    
                    y_top_marker = 4 * y_marker_space + Math.floor(data_y_min);
                }
            }
        }
    }

    function drawAxisLabelMarkers() { //画坐标轴线及数值
        //x轴与y轴水平距离,x与y垂直距离，x轴宽度
        drawAxis(origin.x, origin.y, xAxis_end.x, xAxis_end.y); //x轴
        // drawAxis(origin.x, origin.y, yAxis_end.x, yAxis_end.y); //y轴
        for(var i = 1; i < y_marker_length; ++i) { //画横线
            drawAxis(origin.x, yAxis_height - i*yAxis_space + top_space, xAxis_end.x, yAxis_height - i*yAxis_space + top_space);
        }
        drawAxis(origin.x, yAxis_height - 4 * yAxis_space + top_space, xAxis_end.x, yAxis_height - 4 * yAxis_space + top_space);
        drawMarkers();
    } //画坐标轴及刻度值

    function drawAxis(x, y, X, Y) { //画轴
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(X,Y);
        ctx.setStrokeStyle("#e5e5e5");//坐标轴颜色
        ctx.closePath();
        ctx.stroke();
    } //画坐标轴

    function drawMarkers() { //画坐标轴标识(x和y值)
        if(show_yAxis) {
            for (var i = 0; i < y_marker_length; ++i ) { //y轴
                // fillText(文本,x,y) Y轴数值以及y轴的x坐标 根据Y轴最大数值长度决定
                var text = y_markers[i];
                // var text = y_markers[i] + unit;
                ctx.fillText(text, 10, yAxis_height - i*yAxis_space + top_space +4); //4是文字高度一半，偏移量
                //10为离画布左边距离，即y值开始书写位置;top_space为画布顶端空白高度
            }
            
            ctx.fillText(y_top_marker, 10, yAxis_height - y_marker_length * yAxis_space + top_space + 4); //4是文字高度一半，偏移量
        }

        var last_normal_marker_idx = 0; //最后一个常规marker点下标
        for (var j = 0; j < data_length; j += x_marker_skip) { //X轴
          var offset = mesureText(data_x[j]) / 2; //偏移量(文字一半长度)
          var text = data_x[j];
          ctx.fillText(text, origin.x + xAxis_space * j - offset, origin.y + xAxis_height);//x轴底部文字
          last_normal_marker_idx = j;
        }

        if (data_length - (last_normal_marker_idx + 1) >= 3) {
          var x_end_before_last = origin.x + xAxis_space * last_normal_marker_idx + mesureText(data_x[data_length - 1]) / 2; //倒数第2个坐标值的终止坐标
          var last_x_origin = origin.x + xAxis_space * (data_length - 1) - mesureText(data_x[data_length - 1]) / 2; //最后一个坐标值的起始坐标
          if (Math.floor(last_x_origin) - Math.ceil(x_end_before_last) >= 5) { //最后两个坐标距离差值大于5
            ctx.fillText(data_x[data_length - 1], origin.x + xAxis_space * (data_length - 1) - mesureText(data_x[data_length - 1]) / 2, origin.y + xAxis_height);//x轴最后一个标记点
          }
        }      
        ctx.save();
        ctx.restore();
    } //画坐标轴上刻度值
    
    function drawChart() { //数据点展示
        ctx.beginPath();
        ctx.setLineWidth(1);
        var array_x = [], array_y = [], array_val = [];  //单个图表的坐标值和位置(无则设置为'empty')
        var second_idx = 0;
        for (var i = 0; i < data_length; i++) { //找到线条起始点
            if (data_y[i] !== '') {
                var start_x = xAxis_space * i + origin.x;
                var start_y = yAxis_height - (data_y[i] - Math.floor(data_y_min)) / (y_marker_max - Math.floor(data_y_min)) * yAxis_height + top_space; //起点的y值
                ctx.moveTo(start_x, start_y); //线条起始点
                array_x.push(start_x);
                array_y.push(start_y);
                second_idx = i + 1;
                break;
            } else {
                array_x.push('empty');
                array_y.push('empty');
            }
        }
        
        for (var i = second_idx; i < data_length && second_idx; i++) {
            if (data_y[i] !== '') { //该数据点有值
                var next_y = yAxis_height - (data_y[i] - Math.floor(data_y_min)) / (y_marker_max - Math.floor(data_y_min)) * yAxis_height + top_space; //各个点的y值
                var next_x = xAxis_space * i + origin.x;
                ctx.setStrokeStyle(line_color); //线条颜色
                ctx.lineTo(next_x, next_y);
                array_x.push(next_x);
                array_y.push(next_y);
                array_val.push(data_y[i]);
            } else {
                array_x.push('empty');
                array_y.push('empty');
            }
            if (i === data_length - 1) {
                ctx.stroke(); //画折线
            }
        }
        if (opts.hasOwnProperty("day_idx")) { //历史数据曲线
            g_data.x_position[day_idx][device_idx] = array_x;
            g_data.y_position[day_idx][device_idx] = array_y;
        } else if (opts.hasOwnProperty("month_idx")) {
            g_data.trend_position.xAxis[device_idx] = array_x;
            g_data.trend_position.yAxis[device_idx] = array_y;
        }

        for (var i = 0; i < data_length; i++) { //连接点
            if (data_y[i] !== '') { //该数据点有值
                ctx.beginPath();
                var x = xAxis_space*i + origin.x;
                var y = yAxis_height - (data_y[i] - Math.floor(data_y_min)) / (y_marker_max - Math.floor(data_y_min)) * yAxis_height + top_space; //各个点的y值
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.setFillStyle(point_color);
                ctx.fill();
                ctx.setStrokeStyle(point_color);
                ctx.stroke();//画空心圆
            }
        }
    }
    
    chartSet();
    drawAxisLabelMarkers();
    drawChart();
    ctx.stroke();
    ctx.draw();
};
module.exports = myCharts;
