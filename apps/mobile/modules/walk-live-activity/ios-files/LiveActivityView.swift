import SwiftUI
import WidgetKit

#if canImport(ActivityKit)

  struct ConditionalForegroundViewModifier: ViewModifier {
    let color: String?

    func body(content: Content) -> some View {
      if let color = color {
        content.foregroundStyle(Color(hex: color))
      } else {
        content
      }
    }
  }

  struct DebugLog: View {
    #if DEBUG
      private let message: String
      init(_ message: String) {
        self.message = message
        print(message)
      }

      var body: some View {
        Text(message)
          .font(.caption2)
          .foregroundStyle(.red)
      }
    #else
      init(_: String) {}
      var body: some View { EmptyView() }
    #endif
  }

  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes

    private var progressViewTint: Color? {
      attributes.progressViewTint.map { Color(hex: $0) }
    }

    /// Subtitle uses `Paused · …` from the JS card copy when the walk is held.
    private var isPaused: Bool {
      (contentState.subtitle ?? "").hasPrefix("Paused")
    }

    /// Steps sessions pass a body that contains "steps"; GPS walks use km.
    private var isStepsCard: Bool {
      (contentState.subtitle ?? "").localizedCaseInsensitiveContains("steps")
    }

    private var eyebrow: String {
      if isPaused {
        return "PAUSED"
      }
      if isStepsCard {
        return "STEPS"
      }
      return "WALKING"
    }

    private var detailLine: String {
      let subtitle = contentState.subtitle ?? ""
      if subtitle.hasPrefix("Paused · ") {
        return String(subtitle.dropFirst("Paused · ".count))
      }
      return subtitle
    }

    private var controlURL: URL? {
      guard !isStepsCard else {
        return nil
      }
      return URL(string: isPaused ? "healthy://walk-control/resume" : "healthy://walk-control/pause")
    }

    var body: some View {
      let top = CGFloat(attributes.padding ?? 20)
      let bottom = CGFloat(attributes.padding ?? 20)
      let leading = CGFloat(attributes.padding ?? 20)
      let trailing = CGFloat(attributes.padding ?? 20)

      // Progress sits under the row so a Pause capsule is not stretched into a
      // tall green bar beside the text + track.
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .center, spacing: 12) {
          VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow)
              .font(.caption)
              .fontWeight(.semibold)
              .tracking(0.6)
              .modifier(
                ConditionalForegroundViewModifier(
                  color: attributes.progressViewTint ?? attributes.titleColor
                )
              )

            Text(contentState.title)
              .font(.system(size: 28, weight: .bold, design: .rounded))
              .modifier(ConditionalForegroundViewModifier(color: attributes.titleColor))

            if !detailLine.isEmpty {
              Text(detailLine)
                .font(.subheadline)
                .modifier(ConditionalForegroundViewModifier(color: attributes.subtitleColor))
            }
          }
          .layoutPriority(1)
          .applyWidgetURL(from: attributes.deepLinkUrl)

          Spacer(minLength: 8)

          if let controlURL {
            Link(destination: controlURL) {
              Text(isPaused ? "Resume" : "Pause")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(
                  Color(hex: attributes.progressViewLabelColor ?? "0B1220")
                )
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(hex: attributes.progressViewTint ?? "3DDC97"))
                .clipShape(Capsule())
            }
            .fixedSize()
          }
        }

        if let progress = contentState.progress {
          ProgressView(value: progress)
            .tint(progressViewTint)
        } else if let date = contentState.timerEndDateInMilliseconds {
          ProgressView(timerInterval: Date.toTimerInterval(miliseconds: date))
            .tint(progressViewTint)
        }
      }
      .padding(EdgeInsets(top: top, leading: leading, bottom: bottom, trailing: trailing))
    }
  }

#endif
