package com.example.psychopharm;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

/**
 * 药枢 · 精神药理学习助手
 * 原生 Android 外壳：用 WebView 加载本地 assets/psychopharm-app.html（单文件 H5 原型）。
 * 全部业务逻辑在 HTML 内，本类只负责：沉浸式状态栏、WebView 配置、返回键。
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 沉浸式状态栏：浅色背景 + 深色图标（API 23+）；旧系统回退到品牌色
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().setStatusBarColor(Color.parseColor("#F5F6F8"));
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        } else {
            getWindow().setStatusBarColor(Color.parseColor("#0E8C7F"));
        }

        webView = findViewById(R.id.webview);
        WebSettings ws = webView.getSettings();

        // 必须开启：H5 用了内联 JS、onclick、localStorage 持久化
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);          // localStorage 存档（积分/打卡/等级）
        ws.setAllowFileAccess(true);            // 允许加载 assets 内文件
        ws.setAllowContentAccess(true);

        // 移动端体验：禁缩放、按设备宽度排版
        ws.setBuiltInZoomControls(false);
        ws.setDisplayZoomControls(false);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);

        // 拦截所有跳转，留在 App 内（不拉起系统浏览器）
        webView.setWebViewClient(new WebViewClient());

        // 资源在 app/src/main/assets/，路径固定为 file:///android_asset/...
        webView.loadUrl("file:///android_asset/psychopharm-app.html");
    }

    /**
     * 返回键：H5 是单页应用（JS 切换界面，不改变 URL 历史），
     * 因此 WebView 无可后退历史时直接退出 Activity。
     */
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
