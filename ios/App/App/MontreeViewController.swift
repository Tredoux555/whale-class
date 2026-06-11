//
//  MontreeViewController.swift
//  App
//
//  Capacitor bridge subclass that shows the bundled offline page when the
//  remote site (server.url = https://montree.xyz) can't be reached, instead
//  of a white screen. Apple Guideline 4.2 / quality. The page auto-retries
//  on reconnect (see public/offline.html).
//
//  ⚠️ NEEDS A SIMULATOR/DEVICE TEST: launch with Airplane Mode ON and confirm
//  the Montree offline page appears (not a blank WebView), then turn the
//  network back on and confirm it reloads montree.xyz.
//
import UIKit
import Capacitor
import WebKit

class MontreeViewController: CAPBridgeViewController {

    private func loadOfflinePage() {
        // offline.html ships in the app bundle's public/ folder (it lives in
        // the web project's public/, so the Capacitor copy step bundles it).
        if let url = Bundle.main.url(forResource: "offline", withExtension: "html", subdirectory: "public") {
            webView?.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    override func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        super.webView(webView, didFail: navigation, withError: error)
        loadOfflinePage()
    }

    override func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        super.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
        loadOfflinePage()
    }
}
