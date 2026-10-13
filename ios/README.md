# The Nullborn native iPhone shell (source)

This is a **real SwiftUI iOS app source project** with an embedded WKWebView, persistent website cookies, navigation, reload, and a secure game-server connection screen. It is **not** a compiled/signed IPA and is **not** App Store approved. It loads the existing game from a separately hosted HTTPS Node.js server; it is not an offline port.

## Build on a Mac

1. Install Xcode 16+ and XcodeGen (`brew install xcodegen`).
2. Open Terminal in this `ios` directory, run `xcodegen generate`, then `open TheNullborn.xcodeproj`.
3. Select the `TheNullborn` target, set your unique Bundle Identifier and Apple development team under Signing & Capabilities.
4. Select a connected iPhone or simulator and press Run. You must host the `game` directory's `server.mjs` behind a secure HTTPS origin, and enter that origin in the app's Connection settings.
5. For distribution, configure App Store Connect, privacy disclosures, screenshots, age rating, and TestFlight. Validate gameplay and account security on real devices before submission.

## Release blockers

- The current game backend uses local JSON storage, in-memory sessions and lacks production-grade account/data security. **Do not deploy the current backend to the public internet as-is.**
- Native wrapper alone may not satisfy App Review expectations for a distinct app experience. Additional native features and UX are advisable.
- No iOS signing/build or real-device test has been performed in this Linux environment.
- Requires a running HTTPS game server; gameplay does not work offline.
- Native in-app purchases, push notifications and Game Center are not implemented.
