import SwiftUI
import WebKit

@main
struct TheNullbornApp: App {
    var body: some Scene {
        WindowGroup { GameShellView() }
    }
}

@MainActor final class GameModel: ObservableObject {
    @Published var address: String = UserDefaults.standard.string(forKey: "serverURL") ?? ""
    @Published var showSettings = false
    @Published var errorMessage: String? = nil
    @Published var loading = false
    @Published var canGoBack = false
    weak var webView: WKWebView?

    var verifiedURL: URL? {
        guard let url = URL(string: address.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme?.lowercased() == "https", url.host != nil,
              url.user == nil, url.password == nil else { return nil }
        return url.appending(path: "adventure.html")
    }
    func saveAddress() {
        guard verifiedURL != nil else {
            errorMessage = "Enter the HTTPS address of your game server, such as https://game.example.com"
            return
        }
        UserDefaults.standard.set(address, forKey: "serverURL")
        errorMessage = nil
        showSettings = false
        webView?.load(URLRequest(url: verifiedURL!, cachePolicy: .reloadIgnoringLocalCacheData))
    }
}

struct GameShellView: View {
    @StateObject private var model = GameModel()
    var body: some View {
        ZStack {
            Color(red: 0.035, green: 0.055, blue: 0.11).ignoresSafeArea()
            VStack(spacing: 0) {
                HStack(spacing: 14) {
                    Button { model.webView?.goBack() } label: { Image(systemName: "chevron.left") }
                        .disabled(!model.canGoBack)
                    Text("THE NULLBORN").font(.system(size: 15, weight: .bold, design: .serif)).tracking(2)
                    Spacer()
                    if model.loading { ProgressView().tint(.yellow) }
                    Button { model.webView?.reload() } label: { Image(systemName: "arrow.clockwise") }
                    Button { model.showSettings = true } label: { Image(systemName: "gearshape") }
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 18).padding(.vertical, 12)
                if model.verifiedURL != nil {
                    GameWebView(model: model).ignoresSafeArea(edges: .bottom)
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "shield.lefthalf.filled").font(.system(size: 64)).foregroundStyle(.yellow)
                        Text("Rise of the Forgotten").font(.title2).foregroundStyle(.white)
                        Text("Connect to your private game server to start your adventure. Your progress is saved on that server.")
                            .multilineTextAlignment(.center).foregroundStyle(.gray)
                        Button("Connect Server") { model.showSettings = true }.buttonStyle(.borderedProminent)
                    }.padding(30)
                    Spacer()
                }
            }
        }
        .sheet(isPresented: $model.showSettings) {
            NavigationStack {
                Form {
                    Section("Game server") {
                        TextField("https://game.example.com", text: $model.address)
                            .keyboardType(.URL).textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Text("An HTTPS server is required. localhost on your iPhone is not your computer's server.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Button("Save and Connect") { model.saveAddress() }
                    if let error = model.errorMessage { Text(error).foregroundStyle(.red) }
                }
                .navigationTitle("Connection")
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { model.showSettings = false } } }
            }
        }
        .onAppear { if model.verifiedURL == nil { model.showSettings = true } }
    }
}

struct GameWebView: UIViewRepresentable {
    @ObservedObject var model: GameModel
    func makeCoordinator() -> Coordinator { Coordinator(model: model) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 0.035, green: 0.055, blue: 0.11, alpha: 1)
        view.scrollView.contentInsetAdjustmentBehavior = .never
        model.webView = view
        if let url = model.verifiedURL { view.load(URLRequest(url: url)) }
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    final class Coordinator: NSObject, WKNavigationDelegate {
        let model: GameModel
        init(model: GameModel) { self.model = model }
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.loading = true; model.errorMessage = nil
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.loading = false; model.canGoBack = webView.canGoBack
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            model.loading = false; model.errorMessage = "Cannot reach game server: \(error.localizedDescription)"
            model.showSettings = true
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            // Only game-server pages remain in the embedded browser.
            if let base = model.verifiedURL, url.scheme == "https", url.host == base.host,
               url.port == base.port { decisionHandler(.allow); return }
            if url.scheme == "https" { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        }
    }
}
