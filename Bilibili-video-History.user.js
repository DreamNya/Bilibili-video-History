// ==UserScript==
// @name         Bilibili视频观看历史记录
// @namespace    Bilibili-video-History
// @version      1.3
// @require      https://cdn.jsdelivr.net/npm/jquery@latest/dist/jquery.min.js
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
// @match        https://search.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==
/* globals jQuery, $ */

/*
前言：
1、本脚本纯原创，编写之前已尽全力搜索但未找到相似功能脚本，求人不如求自己，故自己动手编写此脚本。
2、作者本人非码农纯小白，没有系统学习过代码，所有代码纯靠baidu自学，此脚本代码可能存在诸多不合理之处。
2.5、由于懒得想变量名、函数名、故直接使用中文为主、英文为辅的变量名、函数名（随心所欲，气死不负责）
3、本脚本使用了Tampermonkey（油猴）内置函数，完全依赖Tampermonkey，仅在Chromium+Tampermonkey v4.14版本测试正常使用，其余环境均未进行测试。
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
3、在首页、分区、UP主视频空间内实时提示简略观看记录（仅提示已观看+观看百分比或已访问。）
(4)、如配合【Bilibili Evolved】亦可在关注动态中提示简略观看记录

已知问题：
暂无

更新计划：
增加脚本可视化操作面板，开放部分自定义设置功能，开放历史记录列表（目前仅能从Tampermonkey脚本-存储中手动查看）（计划下个版本更新）

更新记录：
V1.3(2022-2-19):
a.重写大量代码（原本准备发布的代码丢失 被迫重写…… 写着写着发现 咦 这里竟然可以重新改进），优化逻辑
    setInterval改写为setTimeout嵌套，取消原600秒显示限制，现无显示上限
    优化小标签代码、CSS（计划下个版本可自定义小标签内容）
    优化MutationObserver代码，现在能准确判断及记录单页内跳转后的观看信息
    将原先1000ms判断一次小标签改为3000ms（计划下个版本可自定义判断间隔），防止原先偶尔出现无法加载评论区与视频推荐bug（经查明本脚本与官方stardust.js冲突，具体原因未查明（stardust.js被混淆了 懒得逆向=-=））
b.适配发布时新版UI、Bilibili Evolved V2.1.4

V1.2(2021-10-5):
a.脚本现在支持搜索页面
b.优化小标签代码
c.新增多P小标签信息提示（现在悬浮在小标签上会显示所有分P观看信息）
d.修复观看百分比计算bug及观看时间跳转bug
e.修复偶尔不记录观看信息bug（可能仍存在问题）
f.若干细小优化

V1.1(2021-9-4):
a.修复视频选集bug
b.增加视频选集多P独立观看信息记录
c.现在bilibili视频页内点击相关视频跳转页面也能正常记录观看信息了（*感谢DevSplash大佬提供的方法）
d.若干细小优化
e.更换jQuery CDN

v1.0(2021-8-28):
a.首次公开发布
*/

const debug=false;
GM_addStyle (`
.BvH-tag{position: absolute;margin: .5em;padding: 0 5px;height: 20px;line-height: 20px;border-radius: 4px;color: #fff;font-style: normal;font-size: 12px;background-color: rgb(122 134 234 / 70%);z-index:108;}
.BvH-tag-small{position: absolute;margin: .2em;padding: 0 4px;height: 18px;line-height: 18px;border-radius: 4px;color: #fff;font-style: normal;font-size: 10px;background-color: rgb(122 134 234 / 70%);z-index:108;}
`);
(function() {
    'use strict';
    let record_p=GM_listValues().filter(i=>i.indexOf("?p=")>-1)
    main()
    function main(init=true){
        let BV,BV记录,BV类型,BV时间,页面类型,观看时长,总时长,观看百分比,标题
        let mark=$("[class='bilibili-player-iconfont']").attr("aria-label")=="暂停"?true:false
        let 当前页面=window.location.href
        let 跳转标记=true
        let temp=0
        let uuid=function (){ //随机标识符 debug用
            let random_string="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
            let result=""
            for (let i=0;i<5;++i){
                result += random_string.charAt(Math.floor(Math.random() * random_string.length))
            }
            return result
        }()

        获取当前页面()
        if(debug){
            console.log("BvH debug:"+window.location)
        }

        if (页面类型=="video" && BV){
            if(BV类型){
                views(BV类型,观看时长,观看百分比,BV时间,BV)
            }else{
                GM_setValue(BV,["已访问",,,time(),标题])
            }

            let 播放绑定计时器=setInterval(()=>{
                if($("bwp-video[src]").length>0){
                    console.log("BvH log:已绑定bwp-video")
                    clearInterval(播放绑定计时器)
                    if($("bwp-video[src]")[0].currentTime>"0.001" && mark==false){
                        console.log("BvH Error:"+$("bwp-video[src]")[0].currentTime+" "+mark.toString)
                        mark=true
                    }
                    $("bwp-video[src]").on('play',()=>{
                        记录观看("bwp-video[src]")
                    })
                }
                if($("video[src]").length>0){
                    console.log("BvH log:已绑定video")
                    clearInterval(播放绑定计时器)
                    if($("video[src]")[0].currentTime>"0.001" && mark==false){
                        console.log("BvH Error:"+$("video[src]")[0].currentTime+" "+mark.toString)
                        mark=true
                    }
                    $("video[src]").on('play',()=>{
                        记录观看("video[src]")
                    })
                }
            },100)

            if(mark){
                记录观看("if(mark)")
            }

            window.onbeforeunload = function () {
                console.log("BvH log:onbeforeunload"+BV类型)
                switch(BV类型){
                    case "已观看":
                        mark && 记录观看("onbeforeunload",true)
                        break
                    case "已访问":
                        BV && GM_setValue(BV,["已访问",,,time(),标题])
                        break
                    case "已删除":
                        break
                    default:
                        console.log("BvH onbeforeunload Error:"+BV类型)
                }
            }

            let observer = new MutationObserver(function (m) {
                m.forEach(function(e){
                    e.removedNodes.forEach(function(ee){
                        let x=$(ee).find(".bilibili-player-video-time-now")
                        let y=$(ee).find(".bilibili-player-video-time-total")
                        if(x.length>0 && y.length>0){
                            if(BV类型=="已观看" && mark==true && BV){
                                观看时长=x.text()
                                总时长=y.text()
                                观看百分比=Math.round(观看时长.split(":").reverse().map((item,index)=>(item*=Math.pow(60,index))).reduce((total,item)=>(total+=item))/总时长.split(":").reverse().map((item,index)=>(item*=Math.pow(60,index))).reduce((total,item)=>(total+=item))*100)+"%"
                                GM_setValue(BV,[BV类型,观看时长,观看百分比,time(),标题])
                            }

                            console.log("BvH log:LINK START")
                            $("#view").remove()
                            跳转标记=false
                            observer.disconnect()

                            !function 跳转判断(旧页面){
                                if(window.location.href==旧页面){
                                    setTimeout(()=>{
                                        跳转判断(当前页面)
                                    },100)
                                    console.log("BvH log:link link")
                                }else{
                                    console.log("BvH log:LINK END")
                                    main(false)
                                }
                            }()
                        }

                    })
                })
            })

            observer.observe($("#bilibili-player")[0], {
                childList: true,
                subtree: true
            })
        }

        setTimeout(BV对比,3000)

        function BV对比(){
            $("a[href]").filter(function(){
                let href=$(this).attr("href")
                if((href.indexOf("BV")>-1 || href.indexOf("av")>-1)){
                    return $(this).find("img").length>0 && $(this).parents(".list-box").length==0
                }
            }).each(function(){
                let href=$(this).attr("href").split("?")[0].split("/")
                let i
                for(i=0; i<href.length;i++){
                    if(href[i].indexOf("BV")>-1 || href[i].indexOf("av")>-1){
                        break
                    }
                }
                let text=GM_getValue(href[i])
                let href_p=record_p.filter(item=>(item.indexOf(href[i])>-1))
                if(text){
                    href_p.unshift(href[i])
                }else if(href_p.length>0){
                    text=GM_getValue(href_p[0])
                }

                let 状态,百分比,时间,文本

                if(text){
                    状态=text[0]
                    百分比=text[2] || ""
                    时间=text[3]
                    文本=href_p.length>1 ? "已记录 多P" : 状态+百分比
                }

                if($(this).prev().hasClass("BvH-tag")==true){ //Bilibili Evolved、空间
                    if($(this).prev().text()!=文本){
                        $(this).prev().remove()
                    }else{
                        return
                    }
                }else if($(this).find(".BvH-tag").length>0){ //原版 旧版
                    if($(this).find(".BvH-tag").text()!=文本){
                        $(this).find(".BvH-tag").remove()
                    }else{
                        return
                    }
                }else if($(this).find(".BvH-tag-small").length>0){ //Bilibili Evolved 历史
                    if($(this).find(".BvH-tag-small").text()!=文本){
                        $(this).find(".BvH-tag-small").remove()
                    }else{
                        return
                    }
                }

                if(!text){
                    return
                }

                if(href_p.length>1){ //多P
                    时间+=(href_p[0].indexOf("?")>-1?" "+href_p[0].split("?")[1].replace("=","").replace("p","P")+" ":" P1 ")+状态+百分比
                    href_p.splice(0,1)
                    href_p.forEach(item=>{
                        let item_value=GM_getValue(item)
                        item_value[2]=item_value[2] || ""
                        时间+=("&#10;"+item_value[3]+" "+item.split("?")[1].replace("=","").replace("p","P")+" "+item_value[0]+item_value[2])
                    })
                }


                if($(this).parents(".van-popper").length>0){
                    $(this).find(".video-preview").prepend(小标签(文本,时间)) //原版 旧版
                }else if($(this).parents("v-popover").length>0){
                    $(this).find("picture").before(小标签(文本,时间))
                }else if($(this).parents(".custom-navbar-items").length>0){
                    if($(".time-group-name").length>0){ //优化Bilibili Evolved 播放历史CSS
                        if($(".time-group-name").css("z-index")==1){
                            $(".time-group-name").css("z-index",109)
                        }
                    }
                    if($(this).parents(".time-group-item").length>0){
                        $(this).prepend(小标签(文本,时间,"BvH-tag-small")) //Bilibili Evolved历史
                    }else{
                        $(this).prepend(小标签(文本,时间)) //Bilibili Evolved非历史
                    }
                }else{
                    $(this).before(小标签(文本,时间)) //Bilibili Evolved、空间
                }
            })

            if(跳转标记==true){
                if(debug){
                    temp++
                    //console.log("BvH debug:"+temp+" "+uuid)
                }
                setTimeout(BV对比,3000)
            }
        }

        function 记录观看(来源,final=false){
            获取当前页面()
            获取观看百分比()
            mark=true
            BV类型="已观看"
            console.log("BvH log:已观看"+来源+mark.toString())
            if(final && BV){
                GM_setValue(BV,[BV类型,观看时长,观看百分比,time(),标题])
            }
        }
        function 获取当前页面(){
            try {
                BV=/((BV|bv)[A-Za-z0-9]+(\?p=[0-9]+)?)|(av\d+(\?p=[0-9]+)?)/g.exec(当前页面)[0].replace("?p=1","")
            }catch(e){

            }
            BV记录=GM_getValue(BV)
            if(BV记录){
                BV类型=BV记录[0]
                观看时长=BV记录[1]
                观看百分比=BV记录[2]
                BV时间=BV记录[3]
            }
            页面类型=getBV(当前页面,3)
            标题=document.title
        }

        function 获取观看百分比(){
            观看时长=$(".bilibili-player-video-time-now").text()
            总时长=$(".bilibili-player-video-time-total").text()
            观看百分比=Math.round(观看时长.split(":").reverse().map((item,index)=>(item*=Math.pow(60,index))).reduce((total,item)=>(total+=item))/总时长.split(":").reverse().map((item,index)=>(item*=Math.pow(60,index))).reduce((total,item)=>(total+=item))*100)+"%"
            return 观看百分比
        }

        function getBV(path,num){
            return path.split("/")[num]
        }

        function 小标签(text,time,_class="BvH-tag"){
            return `<div title="${time}" class="${_class}">${text}</div>`
        }

        function views(BV类型_,观看时长,观看百分比,BV时间,BV号){
            let 时长
            if (观看时长){
                时长=`<br>${观看时长}(${观看百分比})`
                BV号=BV号+"&#10;左键单击跳转视频播放进度&#10;右键单击删除视频记录信息"
            }else{
                时长=``
            BV号=BV号+"&#10;右键单击删除视频记录信息"
            }
            $("body").append(`<div id="view" title=${BV号} style="position:fixed;bottom:15px;left:15px;text-align:center;border-left:6px solid #2196F3;background-color: #aeffff;font-family:'Segoe UI','Segoe','Segoe WP','Helvetica','Tahoma','Microsoft YaHei','sans-serif';font-weight:666">
        <p style="margin:5px 10px 5px 10px">${BV类型_}${时长}</p>
        <p style="margin:0 10px 5px 10px">${BV时间.split(" ")[0]}<br>${BV时间.split(" ")[1]}</p>
        </div>`)
            if (观看时长){
                $("#view").on("click",()=>{
                    if($("bwp-video[src]").length>0){
                        $("bwp-video[src]")[0].currentTime=观看时长.split(":").reverse().map((item,index)=>(item*=Math.pow(60,index))).reduce((total,item)=>(total+=item))
                        $("bwp-video[src]")[0].play()
                    }
                    if($("video[src]").length>0){
                        $("video[src]")[0].currentTime=观看时长.split(":").reverse().map((item,index)=>(item*=Math.pow(60,index))).reduce((total,item)=>(total+=item))
                        $("video[src]")[0].play()
                    }
                })
            }
            $("#view").bind("contextmenu", ()=>{
                return false
            })
            $("#view").mousedown(function(e){
                if(e.which==3){
                    GM_deleteValue(BV)
                    BV类型="已删除"
                    $(this).html($(this).html().replace(/已访问|已观看/,"已删除"))
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