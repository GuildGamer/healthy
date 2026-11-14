const {
  injectStaleLocationTaskReset,
  RESET_LINE,
} = require('./with-stale-location-task-reset');

const SAMPLE_MAIN_APPLICATION = `class MainApplication : Application(), ReactApplication {

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }
}
`;

describe('injectStaleLocationTaskReset', () => {
  it('inserts the wipe after super.onCreate() and before loadReactNative', () => {
    const result = injectStaleLocationTaskReset(SAMPLE_MAIN_APPLICATION);

    expect(result).toContain(`super.onCreate()\n    ${RESET_LINE}\n    DefaultNewArchitecture`);
    expect(result.indexOf(RESET_LINE)).toBeGreaterThan(result.indexOf('super.onCreate()'));
    expect(result.indexOf(RESET_LINE)).toBeLessThan(result.indexOf('loadReactNative(this)'));
  });

  it('leaves exactly one wipe when applied twice', () => {
    const once = injectStaleLocationTaskReset(SAMPLE_MAIN_APPLICATION);
    const twice = injectStaleLocationTaskReset(once);

    expect(twice).toBe(once);
    expect(twice.split(RESET_LINE)).toHaveLength(2);
  });

  it('throws when super.onCreate() is missing', () => {
    expect(() => injectStaleLocationTaskReset('class MainApplication {}')).toThrow(
      /Expected "super\.onCreate\(\)"/,
    );
  });
});
