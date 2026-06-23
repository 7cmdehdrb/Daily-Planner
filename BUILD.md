Expo에서는 **EAS Build로 APK를 만드는 방식**이 정석입니다. 기본 Android 빌드는 보통 Google Play용 **AAB**가 나오기 때문에, 휴대폰에 직접 설치할 **APK**가 필요하면 `eas.json`에서 `buildType: "apk"`를 지정해야 합니다. Expo 공식 문서도 EAS Build의 기본 Android 산출물은 AAB이며, 직접 설치용은 APK로 빌드해야 한다고 설명합니다. ([Expo Documentation][1])

## 1. EAS CLI 설치

프로젝트 폴더에서:

```bash
npm install -g eas-cli
```

로그인:

```bash
eas login
```

Expo 계정이 없으면 먼저 만들어야 합니다.

---

## 2. EAS 설정 초기화

프로젝트 루트에서:

```bash
eas build:configure
```

그러면 `eas.json`이 생성됩니다.

---

## 3. APK 빌드용 eas.json 설정

`eas.json`을 아래처럼 수정합니다.

```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

핵심은 이 부분입니다.

```json
"android": {
  "buildType": "apk"
}
```

---

## 4. Android package 이름 확인

`app.json` 또는 `app.config.js`에 Android package가 있어야 합니다.

예:

```json
{
  "expo": {
    "name": "Daily Planner",
    "slug": "daily-planner",
    "android": {
      "package": "com.yourname.dailyplanner"
    }
  }
}
```

`package`는 전 세계에서 고유해야 합니다. 보통 이런 식으로 씁니다.

```text
com.본인명.앱이름
```

예:

```text
com.dgmin.dailyplanner
```

---

## 5. APK 빌드 실행

```bash
eas build -p android --profile preview
```

또는:

```bash
eas build --platform android --profile preview
```

빌드가 끝나면 Expo 대시보드 링크가 나오고, 거기서 `.apk` 파일을 다운로드할 수 있습니다. Expo의 EAS Build는 Android/iOS용 앱 바이너리를 빌드하는 공식 빌드 시스템입니다. ([Expo Documentation][2])

---

## 6. APK 설치

다운로드한 APK를 Android 폰에 넣고 설치하면 됩니다.

또는 USB 디버깅이 켜져 있다면:

```bash
adb install app-release.apk
```

기존 앱이 있으면:

```bash
adb install -r app-release.apk
```

---

## 7. 자주 나는 문제

### 1) AAB가 나오는 경우

`eas.json`에 `buildType: "apk"`가 없어서 그렇습니다.

```json
"preview": {
  "android": {
    "buildType": "apk"
  }
}
```

반드시 넣고:

```bash
eas build -p android --profile preview
```

로 빌드하세요.

---

### 2) Expo Go에서는 되는데 APK에서 안 되는 경우

`expo-secure-store`, `expo-notifications`, SQLite, 네이티브 권한 관련 설정 문제일 수 있습니다.

특히 알림을 쓴다면 `app.json`의 권한 및 플러그인 설정을 확인해야 합니다.

---

### 3) package name 오류

Android package 이름은 한 번 정하면 나중에 Play Store 배포 시 중요합니다.

나쁜 예:

```text
dailyplanner
```

좋은 예:

```text
com.dgmin.dailyplanner
```

---

## 가장 짧은 절차

```bash
npm install -g eas-cli
eas login
eas build:configure
```

`eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

빌드:

```bash
eas build -p android --profile preview
```

결과물에서 `.apk` 다운로드 후 설치하면 됩니다.

[1]: https://docs.expo.dev/build-reference/apk/?utm_source=chatgpt.com "Build APKs for Android Emulators and devices"
[2]: https://docs.expo.dev/build/setup/?utm_source=chatgpt.com "Create your first build"
