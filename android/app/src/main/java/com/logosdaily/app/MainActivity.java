package com.logosdaily.app;

import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin;
import com.capacitorjs.plugins.app.AppPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(LocalNotificationsPlugin.class);
        registerPlugin(AppPlugin.class);

        // Handle deep link if app was opened via URL
        handleDeepLink(getIntent());

    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle deep link when app is already running
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri data = intent.getData();
            if (data != null) {
                String url = data.toString();
                System.out.println("🔗 Deep link received: " + url);
                // Capacitor's App plugin will handle this automatically
            }
        }
    }
}