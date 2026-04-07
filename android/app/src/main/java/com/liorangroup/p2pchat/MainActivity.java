package com.liorangroup.p2pchat;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            insetsController.hide(WindowInsetsCompat.Type.statusBars());
            insetsController.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }

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
