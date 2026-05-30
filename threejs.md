Tommoroc continue from the below :


ensure to be under the below paths directory:


GATARA-BJTU@JD-Work MINGW64 ~/academe/android (main)
$ export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export PATH="$JAVA_HOME/bin:$PATH"

GATARA-BJTU@JD-Work MINGW64 ~/academe/android (main)
$ java --version
openjdk 17.0.19 2026-04-21
OpenJDK Runtime Environment Temurin-17.0.19+10 (build 17.0.19+10)
OpenJDK 64-Bit Server VM Temurin-17.0.19+10 (build 17.0.19+10, mixed mode, sharing)

GATARA-BJTU@JD-Work MINGW64 ~/academe/android (main)
$ ./gradlew.bat assembleDebug
Downloading https://services.gradle.org/distributions/gradle-7.5-bin.zip
...........10%............20%...........30%............40%...........50%............60%...........70%............80%...........90%............100%

Welcome to Gradle 7.5!

Here are the highlights of this release:
 - Support for Java 18
 - Support for building with Groovy 4
 - Much more responsive continuous builds
 - Improved diagnostics for dependency resolution

For more details see https://docs.gradle.org/7.5/release-notes.html

Starting a Gradle Daemon (subsequent builds will be faster)

> Configure project :app
WARNING:Using flatDir should be avoided because it doesn't support any meta-data formats.

FAILURE: Build failed with an exception.

* Where:
Script 'C:\Users\GATARA-BJTU\academe\android\app\capacitor.build.gradle' line: 5

* What went wrong:
A problem occurred evaluating script.
> No such property: VERSION_21 for class: org.gradle.api.JavaVersion

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.

* Get more help at https://help.gradle.org

BUILD FAILED in 2m 29s

GATARA-BJTU@JD-Work MINGW64 ~/academe/android (main)
$ 






The Gradle build error `No such property: VERSION_21` means that the Capacitor plugin is trying to use Java 21, but your Gradle version (7.5) and JDK (17) do not support that constant. You need to **force Java 17 compatibility** in the Android project.

## ✅ Fix – Change Java compatibility to version 17

Open the file:
```
C:\Users\GATARA-BJTU\academe\android\app\capacitor.build.gradle
```

Find the line that contains `JavaVersion.VERSION_21` and change it to `JavaVersion.VERSION_17`. Typically it looks like:

```gradle
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }
}
```

Change to:

```gradle
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

If the file does not exist or the error persists, also check `android/app/build.gradle` for similar lines and change them to `VERSION_17`.

## 🚀 After saving the file, rebuild

From the `android` directory:

```bash
./gradlew.bat clean
./gradlew.bat assembleDebug
```

The build should now succeed because it targets Java 17 (which your JDK supports). The APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

If you still encounter issues, you can also update Gradle wrapper to a newer version (e.g., 8.6) and the Android Gradle plugin to 8.0.0+, but the simpler fix is to downgrade the Java version target as above.