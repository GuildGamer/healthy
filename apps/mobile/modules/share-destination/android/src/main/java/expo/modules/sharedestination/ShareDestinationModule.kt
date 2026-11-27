package expo.modules.sharedestination

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.Locale

class ShareDestinationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShareDestination")

    AsyncFunction("shareToInstagramStories") { input: Map<String, Any?> ->
      val appId = (input["appId"] as? String)?.trim().orEmpty()
      if (appId.isEmpty()) {
        return@AsyncFunction false
      }

      val imageUri = input["backgroundImageUri"] as? String
      val videoUri = input["backgroundVideoUri"] as? String
      val backgroundPath = when {
        !imageUri.isNullOrBlank() -> imageUri
        !videoUri.isNullOrBlank() -> videoUri
        else -> return@AsyncFunction false
      }
      val mimeType = when {
        !imageUri.isNullOrBlank() -> mimeTypeFor(backgroundPath, fallback = "image/png")
        else -> mimeTypeFor(backgroundPath, fallback = "video/mp4")
      }

      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val contentUri = contentUriFor(backgroundPath) ?: return@AsyncFunction false

      return@AsyncFunction try {
        val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
          putExtra("source_application", appId)
          setDataAndType(contentUri, mimeType)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          setPackage("com.instagram.android")
        }

        activity.grantUriPermission(
          "com.instagram.android",
          contentUri,
          Intent.FLAG_GRANT_READ_URI_PERMISSION,
        )

        if (intent.resolveActivity(activity.packageManager) == null) {
          false
        } else {
          activity.startActivity(intent)
          true
        }
      } catch (_: Exception) {
        false
      }
    }

    AsyncFunction("shareToWhatsApp") { input: Map<String, Any?> ->
      val fileUri = (input["fileUri"] as? String)?.trim().orEmpty()
      if (fileUri.isEmpty()) {
        return@AsyncFunction false
      }
      val mimeType = (input["mimeType"] as? String)?.trim().orEmpty().ifEmpty {
        mimeTypeFor(fileUri, fallback = "*/*")
      }
      val caption = (input["caption"] as? String)?.trim()

      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val contentUri = contentUriFor(fileUri) ?: return@AsyncFunction false

      if (!isPackageInstalled("com.whatsapp")) {
        return@AsyncFunction false
      }

      return@AsyncFunction try {
        val intent = Intent(Intent.ACTION_SEND).apply {
          setPackage("com.whatsapp")
          setType(mimeType)
          putExtra(Intent.EXTRA_STREAM, contentUri)
          if (!caption.isNullOrEmpty()) {
            putExtra(Intent.EXTRA_TEXT, caption)
          }
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        activity.grantUriPermission(
          "com.whatsapp",
          contentUri,
          Intent.FLAG_GRANT_READ_URI_PERMISSION,
        )

        if (intent.resolveActivity(activity.packageManager) == null) {
          false
        } else {
          activity.startActivity(intent)
          true
        }
      } catch (_: Exception) {
        false
      }
    }
  }

  private fun contentUriFor(fileUri: String): Uri? {
    val context = appContext.reactContext ?: return null
    val path = when {
      fileUri.startsWith("file://") -> Uri.parse(fileUri).path
      else -> fileUri
    } ?: return null
    val file = File(path)
    if (!file.exists()) {
      return null
    }
    val authority = "${context.packageName}.ShareDestinationFileProvider"
    return try {
      FileProvider.getUriForFile(context, authority, file)
    } catch (_: IllegalArgumentException) {
      null
    }
  }

  private fun mimeTypeFor(fileUri: String, fallback: String): String {
    val lower = fileUri.lowercase(Locale.US)
    return when {
      lower.endsWith(".png") -> "image/png"
      lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
      lower.endsWith(".webp") -> "image/webp"
      lower.endsWith(".mp4") || lower.endsWith(".m4v") -> "video/mp4"
      lower.endsWith(".mov") -> "video/quicktime"
      else -> fallback
    }
  }

  private fun isPackageInstalled(packageName: String): Boolean {
    val context = appContext.reactContext ?: return false
    return try {
      context.packageManager.getPackageInfo(packageName, 0)
      true
    } catch (_: PackageManager.NameNotFoundException) {
      false
    }
  }
}
