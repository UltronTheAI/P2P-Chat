package com.liorangroup.p2pchat;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Enable JS (already enabled usually, but safe)
        settings.setJavaScriptEnabled(true);

        // Important for WebRTC media autoplay
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Improve storage + caching
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Allow mixed content if needed (for dev/testing)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}