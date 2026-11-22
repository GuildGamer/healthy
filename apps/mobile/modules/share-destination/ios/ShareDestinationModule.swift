import ExpoModulesCore
import UIKit

public class ShareDestinationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ShareDestination")

    AsyncFunction("shareToInstagramStories") { (input: [String: Any?], promise: Promise) in
      guard let appId = input["appId"] as? String, !appId.isEmpty else {
        promise.resolve(false)
        return
      }

      let imageUri = input["backgroundImageUri"] as? String
      let videoUri = input["backgroundVideoUri"] as? String

      var pasteboardItems: [String: Any] = [:]

      if let imageUri, let data = Self.imagePasteboardData(from: imageUri) {
        pasteboardItems["com.instagram.sharedSticker.backgroundImage"] = data
      } else if let videoUri, let data = Self.fileData(from: videoUri) {
        pasteboardItems["com.instagram.sharedSticker.backgroundVideo"] = data
      } else {
        promise.resolve(false)
        return
      }

      guard let url = URL(string: "instagram-stories://share?source_application=\(appId)") else {
        promise.resolve(false)
        return
      }

      // Pasteboard + openURL must run on the main thread (UIKit requirement).
      DispatchQueue.main.async {
        guard UIApplication.shared.canOpenURL(url) else {
          promise.resolve(false)
          return
        }

        let options: [UIPasteboard.OptionsKey: Any] = [
          .expirationDate: Date().addingTimeInterval(60 * 5)
        ]
        UIPasteboard.general.setItems([pasteboardItems], options: options)

        UIApplication.shared.open(url, options: [:]) { opened in
          promise.resolve(opened)
        }
      }
    }

    AsyncFunction("shareToWhatsApp") { (_: [String: Any?]) -> Bool in
      // WhatsApp Status has no public iOS deep link; JS falls back to the share sheet.
      return false
    }
  }

  /// Meta expects PNG/JPEG bytes under the Stories UTI. Re-encode via UIImage so
  /// tmpfile paths from view-shot always land as valid image data.
  private static func imagePasteboardData(from uri: String) -> Data? {
    guard let data = fileData(from: uri) else {
      return nil
    }
    if let image = UIImage(data: data), let png = image.pngData() {
      return png
    }
    return data
  }

  private static func fileData(from uri: String) -> Data? {
    let path: String
    if uri.hasPrefix("file://") {
      guard let url = URL(string: uri) else {
        return nil
      }
      path = url.path
    } else {
      path = uri
    }
    return try? Data(contentsOf: URL(fileURLWithPath: path))
  }
}
