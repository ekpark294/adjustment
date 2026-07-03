# 한입정산 모바일

기존 웹 앱을 React Native와 Expo로 옮긴 Android 앱입니다.

## 개발 실행

Node.js 20.19.4 이상이 필요합니다.

```powershell
npm install
npm run android
```

실기기에서는 Expo Go 앱으로 터미널의 QR 코드를 스캔할 수 있습니다.

## Play Store용 AAB 빌드

```powershell
npx eas-cli login
npx eas-cli build:configure
npm run build:android
```

완성된 AAB를 Play Console의 내부 테스트 트랙에 먼저 등록합니다. EAS에서 직접 제출하려면 Google Play 서비스 계정 키를 설정한 뒤 아래 명령을 실행합니다.

```powershell
npm run submit:android
```

출시 전에 `app.json`의 Android package ID, 앱 아이콘, 개인정보처리방침 URL과 스토어 이미지를 최종 확정해야 합니다.
