// ==UserScript==
// @name         Bilibili视频观看历史记录
// @namespace    Bilibili-video-History
// @version      1.0
// @require      https://code.jquery.com/jquery-3.5.1.min.js#sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=
// @description  记录并提示Bilibili已观看或已访问但未观看视频记录
// @author       DreamNya
// @downloadURL	 https://github.com/DreamNya/Bilibili-video-History/raw/main/Bilibili-video-History.user.js
// @updateURL	 https://github.com/DreamNya/Bilibili-video-History/raw/main/Bilibili-video-History.user.js
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/v/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://www.bilibili.com
// @match        https://www.bilibili.com/?*
// @match        https://www.bilibili.com/account/history
// @match        https://www.bilibili.com/watchlater/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-end
/* globals jQuery, $ */
// ==/UserScript==
/*
前言：
1、本脚本纯原创，编写之前已尽全力搜索但未找到相似功能脚本，求人不如求自己，故自己动手编写此脚本。
2、作者本人非码农纯小白，没有系统学习过代码，所有代码纯靠baidu自学，此脚本代码可能存在诸多不合理之处。
2.5、由于懒得想变量名、函数名、故直接使用中文为主、英文为辅的变量名、函数名（随心所欲，气死不负责）
3、本脚本使用了Tampermonkey（油猴）内置函数，完全依赖Tampermonkey，仅在Chromium+Tampermonkey v4.13版本测试正常使用，其余环境均未进行测试。
4、如发现各种问题或BUG欢迎与作者联系。
5、本脚本仅记录普通视频观看记录，番剧、直播、漫画等不在脚本记录对象范围内。
6、本脚本主要是自用，其次是练手写写JS，最后才是发布分享，不保证后续更新。

免责声明：
本脚本完全免费、开源。作者不保证脚本不存在bug。如使用本脚本时因bug、使用不当等原因引起的任何损失、纠纷需用户自行承担，否则请勿使用本脚本。

原理：
通过Tampermonkey内置函数记录观看信息；使用jQuery每秒读取页面元素比对已记录观看信息返回观看记录结果。
（就这么简单，但我从来没见其他人做过。）
所有存储信息均保存在本地（准确来说是Tampermonkey存储目录），如换浏览器、换电脑后仍想保留之前观看记录需要自行备份导出导入存储信息（Tampermonkey自带的云同步似乎也可以自动做到）。

功能：
1、记录Bilibili已观看或已访问记录（包括观看类型、观看时长、观看百分比、观看时间、视频标题）
2、在视频页提示详细观看记录（第一次访问不会提示，仅在第二次访问后在视频页左下角进行提示）
2.5、左下角提示标签右键单击则直接删除本条观看记录，左键单击则直接跳转播放上次观看进度（已访问则无效果）
3、在首页、分区、UP主视频空间内实时提示简略观看记录（仅提示已观看+观看百分比或已访问。为防止页面长时间放置崩溃，仅实时提示600秒）
(4)、如配合【Bilibili Evolved】亦可在关注动态中提示简略观看记录

已知问题：
水平有限，至今未弄懂bilibili视频页内相关视频跳转是怎么做到的"无损"跳转的，故通过相关视频跳转后的页面不刷新脚本直接记录可能存在bug
(未公开的初版脚本仅记录了观看类型并未记录观看百分比等其他内容，由于数据过多，作者不想放弃，为了兼容旧版数据，故存在一些公开发布版本用不到的代码，以后有空再优化。)

更新计划：
增加脚本可视化操作面板，开放部分自定义设置功能，开放历史记录列表（目前仅能从Tampermonkey脚本-存储中手动查看）
优化顶部导航栏中收藏、历史

更新记录：
v1.0(2021-8-28):
a.首次公开发布
*/


(function() {
    'use strict';
    main()
    function main(){
        let BV
        let BV记录
        let BV类型
        let BV时间
        let 页面类型
        let 观看时长
        let 总时长
        let 观看百分比
        let mark=false

        获取当前页面()
        if (页面类型=="video"){
            if(BV类型){
                views(BV类型,观看时长,观看百分比,BV时间)
            }else{
                GM_setValue(BV,["已访问",,,time(),document.title])
            }

            let 播放绑定计时器=setInterval(()=>{
                if($("bwp-video").length>0){
                    clearInterval(播放绑定计时器)
                    $("bwp-video").on('play',()=>{
                        记录观看()
                    })
                }
                if($("video").length>0){
                    clearInterval(播放绑定计时器)
                    $("video").on('play',()=>{
                        记录观看()
                    })
                }
            },100)

            //$("a[href]").filter(function(){return $(this).attr("href").indexOf("/video/BV")==0}).on("click",()=>{window.location=window.location})

            window.onbeforeunload = function () {
                switch(BV类型){
                    case "已观看":
                        if(mark==true){
                            记录观看()
                        }
                        break
                    case "已访问":
                        GM_setValue(BV,["已访问",,,time(),document.title])
                }
            }
        }

        if (true){
            let times=0
            let timer=setInterval(()=>{
                $("a[href]").filter(
                    function(){
                        let href=$(this).attr("href")
                        if(href.indexOf("BV")>-1 || href.indexOf("av")>-1){
                            return $(this).find("img").length>0
                        }
                    }).each(
                    function(){
                        if($(this).prev().css("z-index")==108){
                            $(this).prev().remove()
                        }else if($(this).find(".video-preview").children().eq(0).css("z-index")==108){
                            $(this).find(".video-preview").children().eq(0).remove()
                        }
                        let href=$(this).attr("href").split("?")[0].split("/")
                        let i
                        for(i=0; i<href.length;i++){
                            if(href[i].indexOf("BV")>-1 || href[i].indexOf("av")>-1){
                                break
                            }
                        }
                        let text=GM_getValue(href[i])
                        if(text){
                            let 状态=text[0]
                            let 百分比=text[2]
                            if($(this).parents(".van-popper").length==0){
                                $(this).before(小标签(百分比?状态+百分比:状态)) //Bilibili Evolved
                            }else{
                                $(this).find(".video-preview").prepend(小标签(百分比?状态+百分比:状态)) //原版
                            }
                        }
                    })
                times++
                if(times>=600){
                    clearInterval(timer)
                }
            },1000)
            }

        function 记录观看(){
            获取当前页面()
            获取观看百分比()
            mark=true
            BV类型="已观看"
            GM_setValue(BV,[BV类型,观看时长,观看百分比,time(),document.title])
        }
        function 获取当前页面(){
            BV=getBV(window.location.pathname,2)
            BV记录=GM_getValue(BV)
            if(BV记录){
                BV类型=BV记录[0]
                观看时长=BV记录[1]
                观看百分比=BV记录[2]
                BV时间=BV记录[3]
            }
            页面类型=getBV(window.location.pathname,1)
        }

        function 获取观看百分比(){
            观看时长=$(".bilibili-player-video-time-now").text()
            总时长=$(".bilibili-player-video-time-total").text()
            观看百分比=Math.round((观看时长.split(":")[0]*60+观看时长.split(":")[1]*1)/(总时长.split(":")[0]*60+总时长.split(":")[1]*1)*100)+"%"
            return 观看百分比
        }

        function getBV(path,num){
            return path.split("/")[num]
        }

        function 小标签(text,line_height=19){
            return `<div style="position: absolute;margin: .5em;padding: 0 5px;height: 20px;line-height: ${line_height}px;border-radius: 4px;color: #fff;font-style: normal;background-color: rgb(122 134 234 / 70%);z-index:108;">
            ${text}
            </div>`
        }

        function views(BV类型_,观看时长,观看百分比,BV时间){
            let 时长
            if (观看时长){
                时长=`<br>${观看时长}(${观看百分比})`
        }else{
            时长=``
        }
            if (BV时间){
                BV时间=`<p style="margin:0 10px 5px 10px">${BV时间.split(" ")[0]}<br>${BV时间.split(" ")[1]}</p>`
        }else{
            BV时间=``
        }
            $("body").append(`<div id="view" style="position:fixed;bottom:15px;left:15px;text-align:center;border-left:6px solid #2196F3;background-color: #aeffff;font-family:'Segoe UI','Segoe','Segoe WP','Helvetica','Tahoma','Microsoft YaHei','sans-serif';font-weight:666">
        <p style="margin:5px 10px 5px 10px">${BV类型_}${时长}</p>
        ${BV时间}
        </div>`)
            if (观看时长){
                $("#view").on("click",()=>{
                    if($("bwp-video").length>0){
                        $("bwp-video")[0].currentTime=观看时长.split(":")[0]*60+观看时长.split(":")[1]*1
                        $("bwp-video")[0].play()
                    }
                    if($("video").length>0){
                        $("video")[0].currentTime=观看时长.split(":")[0]*60+观看时长.split(":")[1]*1
                        $("video")[0].play()
                    }
                })
            }
            $("#view").bind("contextmenu", ()=>{
                return false
            })
            $("#view").mousedown((e)=>{
                if(e.which==3){
                    GM_deleteValue(BV)
                    BV类型="已删除"
                }
            })
        }
    }

    function time(){
        let d=new Date()
        return [d.getFullYear(),check(d.getMonth()+1),check(d.getDate())].join('-')+' '+[check(d.getHours()),check(d.getMinutes()),check(d.getSeconds())].join(':')
    }

    function check(val) {
        if (val < 10) {
            return ("0" + val)
        }else{
            return (val)
        }
    }
})();
