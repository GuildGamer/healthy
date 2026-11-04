# Required when the app enables R8/ProGuard (enableMinifyInReleaseBuilds).
# Without these, MediaPipe Graph init dies on release APKs (Flogger / JNI strip).
# Verify on a fresh production-apk rebuild — OTA cannot apply these rules.
# Source: https://github.com/quickpose/quickpose-android-sdk README Proguard section.

-keep public interface com.google.mediapipe.framework.* {
  public *;
}

-keep public class com.google.mediapipe.framework.Packet {
  public static *** create(***);
  public long getNativeHandle();
  public void release();
}

-keep public class com.google.mediapipe.framework.PacketCreator {
  *** releaseWithSyncToken(...);
}

-keep public class com.google.mediapipe.framework.MediaPipeException {
  <init>(int, byte[]);
}

-keep class com.google.mediapipe.framework.ProtoUtil$SerializedMessage { *; }

-keep public class * extends com.google.protobuf.GeneratedMessageLite { *; }

-keepclassmembers class com.google.common.flogger.** { *; }
-keep class ai.quickpose.core.Status$* { *; }
