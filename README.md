# 하루결

**하루결**은 Expo SDK 54 기반의 로컬 우선 일일 계획·기록·분석 앱입니다. 하루 계획을 시간 블록으로 만들고, 실제 수행한 활동을 기록한 뒤, 계획과 실제 수행 내역을 비교해 자신의 시간 사용 패턴을 분석할 수 있습니다.

## 주요 기능

- 날짜별 하루 계획 생성, 수정, 적용
- 반복 루틴을 저장하고 재사용하는 템플릿 관리
- 실제 활동 시작·종료 기록
- 계획 대비 실제 수행 분석
- OS 로컬 예약 알림
- 로컬 SQLite 기반 데이터 저장
- SecureStore 기반 OpenAI API 키 저장
- API 키가 있을 때만 동작하는 선택형 AI 피드백
- 로컬 데이터 백업 및 복원

## 문서

프로젝트를 이해하기 위한 문서는 다음 위치에 있습니다.

| 문서 | 설명 |
| --- | --- |
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | 프로젝트 전체 목적, 기능, 데이터 정책, 기술 스택 설명 |
| [`docs/DIRECTORY_STRUCTURE.md`](docs/DIRECTORY_STRUCTURE.md) | 폴더와 주요 파일의 역할 설명 |
| [`BUILD.md`](BUILD.md) | EAS Build를 이용한 Android APK 빌드 가이드 |
| [`PLAN.md`](PLAN.md) | 프로젝트 초기 계획서와 기능 설계 |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 앱 프레임워크 | Expo SDK 54, React Native |
| 라우팅 | Expo Router |
| 언어 | TypeScript |
| 상태 관리 | Zustand |
| 로컬 DB | expo-sqlite |
| 보안 저장소 | expo-secure-store |
| 알림 | expo-notifications |
| 날짜/시간 | dayjs 및 자체 유틸리티 |
| 검증 | zod |
| AI 연동 | OpenAI Chat Completions API |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run start
```

또는 Expo CLI를 직접 실행합니다.

```bash
npx expo start
```

Expo Go에서 QR 코드를 스캔해 앱을 실행할 수 있습니다. 기본 포트가 사용 중이면 Expo CLI가 안내하는 대체 포트를 사용하면 됩니다.

### 3. 캐시 초기화 실행

Metro가 오래된 의존성 캐시를 들고 있어 SDK 호환 오류나 `Unable to resolve "expo-linking"` 같은 번들 오류가 반복되면 캐시를 비워 실행합니다.

```bash
npm run start:clear
```

## 검증

타입 검사는 다음 명령으로 실행합니다.

```bash
npm run typecheck
```

핵심 로직 테스트는 다음 명령으로 실행합니다.

```bash
npm run test:core
```

Expo 의존성 호환성 점검이 필요하면 다음 명령을 사용할 수 있습니다.

```bash
npx expo install --check
```

## 프로젝트 구조 요약

```text
.
├── app/             # Expo Router 화면과 탭 라우팅
├── components/      # 재사용 UI 컴포넌트
├── constants/       # 디자인 토큰과 전역 상수
├── docs/            # 프로젝트 설명 문서
├── lib/             # DB, 분석, 알림, AI, 시간 유틸리티 등 핵심 로직
├── scripts/         # 핵심 로직 테스트
├── store/           # Zustand 전역 상태
├── assets/          # 앱 아이콘 및 이미지 리소스
├── BUILD.md         # 빌드 가이드
├── PLAN.md          # 프로젝트 계획서
└── README.md        # 프로젝트 소개와 빠른 시작
```

자세한 구조는 [`docs/DIRECTORY_STRUCTURE.md`](docs/DIRECTORY_STRUCTURE.md)를 참고하세요.

## 로컬 데이터 정책

- 별도 백엔드 서버를 사용하지 않습니다.
- 계획, 기록, 분석, 템플릿, 카테고리, 피드백은 앱 내부 SQLite에 저장합니다.
- OpenAI API 키는 SQLite가 아니라 `expo-secure-store`에 저장합니다.
- API 키가 없으면 AI 호출은 수행하지 않습니다.
- 핵심 계획·기록·분석 기능은 네트워크 없이도 사용할 수 있도록 설계되어 있습니다.

## AI 피드백 정책

AI 피드백은 필수 기능이 아닙니다. 사용자가 설정 화면에서 OpenAI API 키를 직접 저장한 경우에만 활성화됩니다. 앱은 하루 분석 요약을 기반으로 한국어 JSON 피드백을 요청하고, 결과를 로컬 DB에 저장합니다.

## Android APK 빌드

Android APK 빌드는 EAS Build를 사용합니다. 자세한 절차는 [`BUILD.md`](BUILD.md)를 참고하세요.

```bash
eas build -p android --profile preview
```
