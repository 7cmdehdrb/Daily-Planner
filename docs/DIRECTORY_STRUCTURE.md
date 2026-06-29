# 디렉토리 구조 설명

이 문서는 하루결 프로젝트의 주요 폴더와 파일 역할을 설명합니다.

## 전체 구조

```text
.
├── app/                  # Expo Router 기반 화면과 라우팅
│   ├── _layout.tsx       # 앱 최상위 레이아웃 및 초기화 진입점
│   └── (tabs)/           # 하단 탭 네비게이션에 속한 화면
├── assets/               # 앱 아이콘, 스플래시, 브랜드 이미지
├── components/           # 재사용 UI 컴포넌트
├── constants/            # 디자인 토큰 등 전역 상수
├── docs/                 # 프로젝트 문서
├── lib/                  # 도메인 로직, DB, 분석, 알림, AI, 유틸리티
├── scripts/              # Node 환경에서 실행하는 테스트 스크립트
├── store/                # Zustand 전역 상태 저장소
├── app.json              # Expo 앱 설정
├── babel.config.js       # Babel 설정
├── eas.json              # EAS Build 설정
├── package.json          # npm 스크립트와 의존성
├── tsconfig.json         # 앱 TypeScript 설정
└── tsconfig.test.json    # 테스트 빌드용 TypeScript 설정
```

## `app/`

Expo Router의 파일 기반 라우팅을 담당합니다.

| 경로 | 역할 |
| --- | --- |
| `app/_layout.tsx` | 앱 최상위 레이아웃입니다. DB 초기화와 전역 준비 상태를 처리합니다. |
| `app/(tabs)/_layout.tsx` | 하단 탭 네비게이션을 정의합니다. 홈, 계획, 기록, 리뷰, AI, 설정 탭을 구성합니다. |
| `app/(tabs)/index.tsx` | 홈 화면입니다. 오늘 상태, 진행 중인 활동, 다음 일정, 수동 활동 시작을 제공합니다. |
| `app/(tabs)/plan.tsx` | 날짜별 계획 작성·수정·적용 화면입니다. |
| `app/(tabs)/logger.tsx` | 실제 활동 기록과 로그 관리를 담당합니다. |
| `app/(tabs)/review.tsx` | 계획 대비 실제 수행 분석 결과를 보여줍니다. |
| `app/(tabs)/ai.tsx` | OpenAI 피드백 생성과 피드백 목록 관리를 담당합니다. |
| `app/(tabs)/settings.tsx` | API 키, 카테고리, 데이터 백업 등 설정 기능을 제공합니다. |
| `app/(tabs)/templates.tsx` | 템플릿 목록과 편집 기능을 제공합니다. 탭 바에서는 숨겨진 화면입니다. |

## `components/`

화면에서 반복적으로 사용하는 UI 컴포넌트가 모여 있습니다.

| 파일 | 역할 |
| --- | --- |
| `Button.tsx` | 공통 버튼 컴포넌트입니다. |
| `Card.tsx` | 카드 형태의 콘텐츠 컨테이너입니다. |
| `DateNavigator.tsx` | 날짜 이동 UI입니다. |
| `Field.tsx` | 입력 필드 또는 폼 영역 UI입니다. |
| `Meter.tsx` | 진행률·비율을 표시하는 미터 UI입니다. |
| `Screen.tsx` | 화면 공통 레이아웃입니다. |
| `TextRow.tsx` | 라벨과 값을 한 줄로 보여주는 컴포넌트입니다. |
| `TimeField.tsx` | 시간 입력용 컴포넌트입니다. |
| `TimeTableEditor.tsx` | 시간 블록 기반 계획·템플릿 편집 UI입니다. |

## `constants/`

전역 상수와 디자인 토큰을 보관합니다.

| 파일 | 역할 |
| --- | --- |
| `theme.ts` | 색상, 간격, 라운드 값 등 UI 스타일 토큰을 정의합니다. |

## `lib/`

앱의 핵심 도메인 로직이 들어 있는 폴더입니다.

| 파일 | 역할 |
| --- | --- |
| `ai.ts` | OpenAI API 호출, 응답 검증, AI 피드백 저장을 처리합니다. |
| `analysis.ts` | 분석 계산을 실행하고 DB에 저장하는 래퍼 역할을 합니다. |
| `analysisCore.ts` | 순수 함수 형태의 하루 분석 계산 로직입니다. |
| `backup.ts` | 로컬 데이터 내보내기·가져오기 기능을 담당합니다. |
| `db.ts` | SQLite 연결, 테이블 생성, 마이그레이션, 기본 데이터 시드를 담당합니다. |
| `labels.ts` | 앱 이름, 상태, 카테고리 등 표시용 라벨 유틸리티입니다. |
| `notifications.ts` | 진행 중인 활동 알림을 처리합니다. |
| `planNotifications.ts` | 계획 블록의 시작 전·시작·종료 알림 예약과 취소를 처리합니다. |
| `repository.ts` | DB CRUD와 도메인 규칙을 모은 저장소 계층입니다. |
| `secureKey.ts` | OpenAI API 키를 SecureStore에 저장·조회·삭제합니다. |
| `time.ts` | 날짜, 시간, 시간 범위, 충돌 검사 유틸리티입니다. |
| `types.ts` | 앱 전역 TypeScript 타입을 정의합니다. |
| `validation.ts` | zod 기반 입력 검증 스키마와 오류 메시지를 정의합니다. |

## `store/`

| 파일 | 역할 |
| --- | --- |
| `appStore.ts` | Zustand 기반 전역 상태입니다. DB 초기화, 날짜별 데이터 새로고침, 분석 재계산 진입점을 제공합니다. |

## `scripts/`

Node 환경에서 실행할 수 있는 테스트 스크립트입니다.

| 파일 | 역할 |
| --- | --- |
| `analysisCore.test.ts` | 하루 분석 핵심 로직 테스트입니다. |
| `time.test.ts` | 시간 계산 및 충돌 검사 유틸리티 테스트입니다. |

## 설정 파일

| 파일 | 역할 |
| --- | --- |
| `app.json` | Expo 앱 이름, slug, 아이콘, 플랫폼 설정을 정의합니다. |
| `eas.json` | EAS Build 프로필을 정의합니다. |
| `package.json` | 실행, 타입 검사, 테스트 스크립트와 의존성을 관리합니다. |
| `tsconfig.json` | 앱 TypeScript 컴파일 설정입니다. |
| `tsconfig.test.json` | 테스트용 TypeScript 컴파일 설정입니다. |
| `BUILD.md` | APK/EAS 빌드 방법을 설명합니다. |
| `PLAN.md` | 초기 프로젝트 계획과 기능 설계를 설명합니다. |
| `README.md` | 프로젝트 소개와 빠른 시작 문서입니다. |

## 책임 분리 요약

```text
화면 UI: app/, components/
상태 관리: store/
도메인 로직: lib/
테스트: scripts/
문서: README.md, docs/, BUILD.md, PLAN.md
설정: app.json, eas.json, tsconfig*.json, package.json
```
