# 26-0001 한입정산 모바일 앱 전환 및 배포 준비

- 작업일: 2026-07-03
- 대상: 한입정산 웹 애플리케이션 및 React Native 모바일 앱
- 목표: 기존 웹 기능을 Android 앱으로 이전하고 Google Play 배포 기반 구성

## 1. 모바일 성능 진단

Lighthouse 모바일 성능 점수 78점의 원인을 검토했다.

확인된 주요 항목:

- Google Fonts CSS가 초기 렌더링을 차단
- `DM Serif Display`, `Noto Sans KR`의 여러 굵기로 인해 다수의 폰트 파일 요청 발생
- Lighthouse 기준 렌더링 차단 리소스의 예상 절감 시간이 약 3.09초로 표시됨
- 초기 렌더링 과정에서 강제 리플로우 약 104ms 감지
- 네트워크 의존 항목 트리에 Google Fonts 요청이 포함됨
- Vite 프로덕션 CSS는 이미 축소되어 있으며 gzip 기준 약 3KB 수준
- 미사용 CSS 경고는 단일 페이지 앱에서 2단계와 3단계 스타일을 첫 화면에서도 함께 내려받는 구조의 영향

Google Fonts 제거를 검토했으나 디자인 유지를 위해 최종적으로 폰트는 유지하기로 결정했다. 단계별 JavaScript 및 CSS 분리는 추가 최적화 후보로 남겼다.

## 2. 검색엔진 등록 검토

네이버 서치어드바이저의 RSS 제출 용도를 확인했다.

- RSS는 뉴스나 블로그처럼 새 게시물이 계속 발행되는 서비스에 적합
- 한입정산은 게시글이 없는 단일 웹 도구이므로 RSS 제출 필요성이 낮음
- 현재 구조에서는 `public/sitemap.xml` 제출을 우선 적용

## 3. React Native 앱 생성

기존 웹 프로젝트는 유지하고 `mobile/` 하위에 Expo 기반 React Native 프로젝트를 생성했다.

기술 구성:

- Expo SDK 57
- React 19.2.3
- React Native 0.86.0
- AsyncStorage 2.2.0
- Expo Haptics
- EAS Build

Node.js 최소 요구 버전은 `20.19.4`로 지정했다. 현재 개발 환경의 Node.js 20.11.1에서는 경고가 발생하므로 모바일 개발 및 배포 전에 Node.js 업그레이드가 필요하다.

## 4. 모바일 앱 구현 기능

### 참여자 입력

- 참여자 이름 추가 및 삭제
- 중복 이름 입력 방지
- 최소 2명 이상일 때 다음 단계 진행
- 참여자를 삭제하면 메뉴별 참여 목록에서도 함께 제거

### 주문 내역

- 메뉴 이름, 가격, 수량 입력
- 메뉴 추가 및 삭제
- 메뉴별 참여자 선택 및 해제
- 전체 선택 및 전체 해제
- 유효한 주문이 있을 때 정산 결과 화면으로 이동

### 임시 저장

- AsyncStorage에 참여자와 메뉴 정보 저장
- 기존 임시 저장 내역 불러오기
- 임시 저장 내역 삭제
- 기존 내역을 불러온 후 다시 저장하면 같은 항목 갱신

### 정산 결과

- 총 주문 금액 계산
- 메뉴별 1인 분배 금액 표시
- 인원별 최종 정산 금액 표시
- Android 네이티브 공유 시트를 통한 정산 결과 공유
- 주요 선택 및 저장 동작에 햅틱 피드백 적용

웹의 DOM 캡처 기반 PNG 저장은 React Native에서 직접 사용할 수 없어 모바일 초기 버전에서는 네이티브 텍스트 공유로 대체했다.

## 5. Android 및 EAS 설정

`mobile/app.json`에 다음 설정을 추가했다.

```text
앱 이름: 한입정산
Slug: hanip-settlement
Android package: com.hanip.settlement
Version code: 1
URL scheme: hanip-settlement
```

`mobile/eas.json`에는 다음 프로필을 구성했다.

- `development`: 개발 클라이언트 내부 배포
- `preview`: APK 내부 테스트
- `production`: Google Play 제출용 AAB 생성 및 버전 자동 증가

실행 명령:

```powershell
cd mobile
npm install
npm run android
```

Play Store용 빌드:

```powershell
npx eas-cli login
npx eas-cli build:configure
npm run build:android
```

## 6. 앱 아이콘과 웹 파비콘

웹 헤더의 라임색 원형 `÷` 로고를 기준으로 앱 아이콘을 제작했다.

디자인 요소:

- 배경: `#F5F4EE`
- 원형 배지: 라임 옐로
- 중앙 기호: 짙은 차콜 `÷`
- Android 적응형 아이콘 마스킹을 고려한 중앙 안전 여백

생성 파일:

- `mobile/assets/hanip-icon.png`: 모바일 앱 및 Android 적응형 아이콘
- `public/favicon.ico`: 웹 브라우저 파비콘

웹의 `index.html`에는 다음 파비콘 링크를 연결했다.

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
```

## 7. Git 추적 정책

루트 및 모바일 `.gitignore`를 검토했다.

Git에 포함하는 파일:

- `mobile/App.js`
- `mobile/app.json`
- `mobile/eas.json`
- `mobile/index.js`
- `mobile/package.json`
- `mobile/package-lock.json`
- `mobile/README.md`
- `mobile/LICENSE`
- 실제 사용하는 앱 아이콘과 파비콘

Git에서 제외하는 파일:

- `node_modules/`
- `.expo/`
- `dist/`, `web-build/`
- 생성된 `android/`, `ios/` 네이티브 폴더
- `.env` 계열 로컬 환경 파일
- Android 서명키와 Apple 인증서
- Google Play 서비스 계정 및 Firebase 설정 파일
- 로컬 에이전트 지침 파일
- 사용하지 않는 Expo 템플릿 이미지

서명키, 서비스 계정 JSON, 환경 변수는 저장소에 커밋하지 않는다.

## 8. 검증 결과

- 모바일 `App.js` JSX 문법 검사 통과
- `app.json`, `eas.json` JSON 파싱 통과
- Expo 공개 설정 해석 성공
- Metro Android 번들 생성 성공
- 웹 `npm run build` 성공
- 빌드 결과에 `favicon.ico` 포함 확인

## 9. 출시 전 남은 작업

1. Node.js를 20.19.4 이상으로 업그레이드
2. 실제 Android 기기에서 입력, 저장, 공유 기능 테스트
3. `com.hanip.settlement` 패키지 ID 최종 확정
4. Google Play Console 개발자 계정 생성 및 본인 인증
5. 개인정보처리방침 URL 준비
6. 스토어 설명, 스크린샷, 대표 이미지 준비
7. EAS production 프로필로 AAB 생성
8. Play Console 내부 테스트 트랙에 첫 빌드 등록
9. 신규 개인 개발자 계정의 테스트 요구사항 확인 및 충족

Android package ID는 Play Console에 처음 등록한 뒤 변경하기 어렵기 때문에 첫 업로드 전에 반드시 최종 확인한다.
