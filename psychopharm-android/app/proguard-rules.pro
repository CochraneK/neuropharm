# 原型阶段不混淆；保留 WebView 相关类即可
-keep class com.example.psychopharm.** { *; }
-dontwarn android.webkit.**
