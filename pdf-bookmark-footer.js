/**
 * PDF书签页脚工具
 * 用于在PDF文档中为书签页面添加页脚注释
 * 
 * @copyright Copyright (c) 2025 yhh
 * @license MIT
 * @version 1.0.0
 * @tested Foxit PDF Editor 13.0.1.21693
 */

// 全局配置
var CONFIG = {
    annotation: {
        rect: [30, 15, 570, 35],
        textSize: 9,
        font: "SimSun",
        textColor: ["RGB", 0, 0, 0],
        strokeColor: ["RGB", 1, 1, 1],
        fillColor: ["RGB", 1, 1, 1]
    }
};

// 创建注释函数
function createAnnotation(doc, page, text) {
    try {
        console.println("  正在创建页脚注释...");
        console.println("  - 页码: " + page);
        console.println("  - 文本: " + text);
        
        var annot = doc.addAnnot({
            // 基本属性
            page: page,
            type: "FreeText",
            intent: "FreeTextTypewriter",
            rect: CONFIG.annotation.rect,
            contents: text,
            alignment: 1,
            
            // 文本样式
            textSize: CONFIG.annotation.textSize,
            richText: true,
            defaultStyle: {
                font: CONFIG.annotation.font,
                textSize: CONFIG.annotation.textSize
            },
            
            // 颜色设置 [类型, R, G, B]
            textColor: CONFIG.annotation.textColor,
            strokeColor: CONFIG.annotation.strokeColor,
            fillColor: CONFIG.annotation.fillColor,
            
            // 外观控制
            opacity: 1,
            rotation: 0,
            AP: "N",
            noView: false,
            
            // 权限控制
            readOnly: true,
            print: true,
            locked: true
        });

        if (annot) {
            annot.setProps({
                strokeWidth: 0,
                borderStyle: "S",
                lineEndingStyle: "None"
            });
            console.println("  ✓ 页脚注释创建成功");
        } else {
            throw new Error("注释创建失败");
        }

        return annot;
    } catch (e) {
        console.println("  ! 创建注释时出错: " + e);
        throw e;
    }
}

// 全局变量
var gDoc;
var gBookmarks;
var gOriginalPage;
var gPreviewAnnot;

// 确认对话框函数（全局）
function showConfirmDialog() {
    var response = app.alert({
        cMsg: "请查看当前页面的预览效果\n是否继续处理所有书签？",
        cTitle: "确认继续",
        nIcon: 2,
        nType: 2
    });

    if (gPreviewAnnot) {
        gPreviewAnnot.destroy();
    }
    
    if (response !== 4) {
        console.println("用户取消操作");
        return;
    }
    
    console.println("开始处理所有书签...");
    console.println("总书签数量: " + gBookmarks.length);
    
    var results = {success: 0, fail: 0, failedBookmarks: []};
    var errorLog = "";

    for (var i = 0; i < gBookmarks.length; i++) {
        var bookmark = gBookmarks[i];
        try {
            console.println("\n处理书签 [" + (i + 1) + "/" + gBookmarks.length + "]: " + bookmark.name);
            bookmark.execute();
            var annot = createAnnotation(gDoc, gDoc.pageNum, bookmark.name);
            if (annot) {
                results.success++;
                console.println("✓ 成功添加页脚注释");
            }
        } catch(error) {
            results.fail++;
            var errorInfo = {
                index: i + 1,
                name: bookmark.name,
                error: error.toString()
            };
            results.failedBookmarks.push(errorInfo);
            
            // 记录错误日志
            errorLog += "\n书签处理失败 #" + (i + 1) + ":\n";
            errorLog += "书签名称: " + bookmark.name + "\n";
            errorLog += "错误信息: " + error.toString() + "\n";
            console.println("✗ 处理失败: " + error.toString());
        }
    }
    
    gDoc.pageNum = gOriginalPage;
    
    // 打印最终处理结果
    console.println("\n=== 处理完成 ===");
    console.println("成功数量: " + results.success);
    console.println("失败数量: " + results.fail);
    
    if (results.failedBookmarks.length > 0) {
        console.println("\n=== 失败详情 ===");
        console.println(errorLog);
        
        var failureMessage = "处理失败的书签:\n\n";
        for (var j = 0; j < results.failedBookmarks.length; j++) {
            var failed = results.failedBookmarks[j];
            failureMessage += "序号 " + failed.index + ":\n名称: " + failed.name + "\n错误: " + failed.error + "\n\n";
        }
        
        app.alert({
            cMsg: "处理完成！\n成功: " + results.success + " 个\n失败: " + results.fail + " 个\n\n" + failureMessage,
            cTitle: "添加页脚注释 - 包含失败信息",
            nIcon: 2,
            nType: 0
        });
    } else {
        console.println("\n全部处理成功！");
        app.alert({
            cMsg: "处理完成！\n所有 " + results.success + " 个书签都已成功处理！",
            cTitle: "添加页脚注释",
            nIcon: 3,
            nType: 0
        });
    }
}

// 主函数
function addBookmarkFooters() {
    try {
        console.println("=== 开始执行脚本 ===");
        console.println("时间: " + new Date().toLocaleString());
        
        gDoc = app.activeDocs[0];
        if (!gDoc) {
            throw new Error("未找到活动文档");
        }
        console.println("文档名称: " + gDoc.documentFileName);
        
        var root = gDoc.bookmarkRoot;
        gBookmarks = root.children;
        if (!gBookmarks || gBookmarks.length === 0) {
            throw new Error("文档中未找到书签");
        }
        console.println("检测到书签数量: " + gBookmarks.length);
        
        gOriginalPage = gDoc.pageNum;
        var previewBookmark = gBookmarks[0];
        previewBookmark.execute();
        
        // 先显示提示，让用户知道预览将要添加
        app.alert({
            cMsg: "即将在第一个书签页面添加预览页脚\n\n" +
                  "位置：距底部 " + CONFIG.annotation.rect[1] + "-" + CONFIG.annotation.rect[3] + " 点\n" +
                  "字体：" + CONFIG.annotation.font + "，" + CONFIG.annotation.textSize + "号\n" +
                  "对齐：居中\n" +
                  "示例文本：" + previewBookmark.name,
            cTitle: "页脚注释预览准备",
            nIcon: 3,
            nType: 0
        });
        
        // 添加预览注释
        gPreviewAnnot = createAnnotation(gDoc, gDoc.pageNum, previewBookmark.name);
        
        // 延迟显示确认对话框
        app.setTimeOut("showConfirmDialog()", 5000);
        
    } catch(e) {
        console.println("\n=== 发生错误 ===");
        console.println("错误详情: " + e);
        app.alert("发生错误: " + e);
    }
}

addBookmarkFooters();