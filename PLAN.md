# 데일리 스케줄 관리 앱 프로젝트 계획서

## 1. 프로젝트 개요

본 프로젝트는 Node.js 기반 개발 환경과 Expo 기반 React Native를 사용하여 개인용 데일리 스케줄 관리 앱을 제작하는 것을 목표로 한다.

앱의 핵심 목적은 사용자가 하루 24시간의 계획을 미리 수립하고, 실제로 수행한 활동을 기록한 뒤, 계획과 실제 수행 내역을 비교하여 자신의 시간 사용 패턴을 분석할 수 있도록 하는 것이다.

본 앱은 별도의 백엔드 서버를 두지 않는다. 모든 핵심 데이터는 앱 내부 로컬 저장소에 저장한다. AI 피드백 기능은 선택 기능으로 제공하며, 사용자가 직접 OpenAI API Key를 입력한 경우에만 활성화된다. API Key가 입력되지 않은 경우 AI 피드백 기능은 비활성화 상태로 유지되며, 앱은 계획·기록·분석 기능만으로 정상 동작한다.

## 2. 핵심 목표

본 앱의 핵심 목표는 다음과 같다.

1. 사용자가 하루 계획을 시간 블록 단위로 구성할 수 있게 한다.
2. 자주 사용하는 하루 시간표를 템플릿으로 저장하고 재사용할 수 있게 한다.
3. 계획된 일정에 대해 로컬 알림을 제공한다.
4. 사용자가 실제 수행한 활동을 시작/종료 방식으로 기록할 수 있게 한다.
5. 계획된 시간과 실제 수행 시간을 비교하여 일치율, 계획 외 시간, 미기록 시간 등을 계산한다.
6. 사용자가 직접 OpenAI API Key를 입력한 경우, 하루 분석 결과를 바탕으로 AI 피드백을 받을 수 있게 한다.

## 3. 시스템 구조

본 프로젝트는 백엔드 서버 없이 앱 단독 구조로 설계한다.

```text
[Expo React Native App]
  ├── Template Manager
  ├── Daily Plan Manager
  ├── Local Notification Scheduler
  ├── Activity Logger
  ├── Analysis Engine
  ├── AI Feedback Client
  ├── Secure Key Storage
  └── Local SQLite DB

[OpenAI API]
  └── 사용자가 API Key를 입력한 경우에만 직접 호출
```

기본 기능은 모두 로컬에서 동작한다. OpenAI API는 사용자가 API Key를 등록한 경우에만 호출된다.

## 4. 기술 스택

| 영역       | 기술                                       |
| -------- | ---------------------------------------- |
| 앱 프레임워크  | Expo + React Native                      |
| 언어       | TypeScript                               |
| 라우팅      | Expo Router                              |
| 상태 관리    | Zustand                                  |
| 로컬 DB    | Expo SQLite                              |
| 보안 저장소   | expo-secure-store                        |
| 알림       | expo-notifications                       |
| 날짜/시간 처리 | dayjs 또는 date-fns                        |
| 폼 관리     | React Hook Form + Zod                    |
| 차트       | react-native-svg 기반 차트 또는 victory-native |
| AI 연동    | OpenAI API 직접 호출                         |

Node.js는 별도 서버용이 아니라 개발 환경, 패키지 관리, Expo 실행 환경으로만 사용한다.

## 5. 주요 기능

## 5.1 템플릿 기능

템플릿은 반복적으로 사용하는 하루 시간표를 저장하는 기능이다.

주요 기능은 다음과 같다.

* 기본 템플릿 제공
* 사용자 템플릿 생성
* 템플릿 수정
* 템플릿 삭제
* 템플릿 복사
* 템플릿을 오늘 계획으로 불러오기
* 템플릿에서 불러온 뒤 오늘 상황에 맞게 수정

템플릿은 여러 개의 시간 블록으로 구성된다. 각 시간 블록은 시작 시간, 종료 시간, 제목, 카테고리, 메모를 가진다.

## 5.2 오늘 계획 설정 기능

오늘 계획은 특정 날짜에 적용되는 실제 계획이다.

생성 방식은 다음 두 가지다.

1. 템플릿에서 불러오기
2. 빈 계획에서 직접 생성하기

오늘 계획에서는 다음 기능을 제공한다.

* 시간 블록 추가
* 시간 블록 수정
* 시간 블록 삭제
* 시간 충돌 검사
* 24시간 중 계획된 시간과 비어 있는 시간 표시
* 오늘 계획 적용
* 적용된 계획의 알림 예약

오늘 계획이 적용되면 해당 날짜의 DailyPlan 상태를 active로 변경한다.

## 5.3 로컬 알림 기능

알림은 서버 없이 OS 로컬 알림으로 처리한다.

각 계획 블록에 대해 다음 알림을 예약한다.

* 시작 10분 전 알림
* 시작 시각 알림
* 종료 시각 알림

계획이 수정되면 기존 알림을 취소하고 다시 예약한다.

중요한 설계 원칙은 다음과 같다.

* 백그라운드에서 JavaScript를 계속 실행하는 방식으로 구현하지 않는다.
* 계획 적용 시점에 OS에 알림을 예약한다.
* 앱이 다시 열리면 현재 시각 기준으로 진행 상태를 재계산한다.

## 5.4 실제 활동 기록 기능

사용자는 실제로 수행한 활동을 시작/종료 방식으로 기록한다.

기록 방식은 두 가지다.

1. 오늘 계획에 있는 항목을 선택해서 시작
2. 계획에 없는 활동을 직접 입력해서 시작

활동 시작 시 현재 시각을 startDateTime으로 저장한다. 활동 종료 시 현재 시각을 endDateTime으로 저장한다.

동시에 여러 활동은 진행하지 않는다. 이미 진행 중인 활동이 있는 상태에서 새 활동을 시작하면 기존 활동은 현재 시각으로 자동 종료하고 새 활동을 시작한다.

## 5.5 비교 및 분석 기능

앱은 계획된 시간과 실제 수행 시간을 비교하여 하루 사용 패턴을 분석한다.

주요 지표는 다음과 같다.

* 전체 계획 시간
* 전체 기록 시간
* 계획과 실제가 일치한 시간
* 계획 일치율
* 계획 외 활동 시간
* 미기록 시간
* 카테고리별 계획 시간
* 카테고리별 실제 수행 시간
* 자기계발 시간
* 집중 시간
* 휴식 시간
* 낭비 시간

계획 일치율은 다음 방식으로 계산한다.

```text
계획 일치율 = 계획과 실제가 일치한 총 시간 / 전체 계획 시간
```

일치 여부는 우선 plannedBlockId 기준으로 판단한다. plannedBlockId가 없는 자유 입력 활동의 경우 categoryId가 같으면 부분 일치로 처리할 수 있다.

## 5.6 AI 피드백 기능

AI 피드백은 선택 기능이다.

사용자가 Settings 화면에서 OpenAI API Key를 입력한 경우에만 AI 피드백 기능을 활성화한다.

API Key가 없는 경우:

* AI 피드백 버튼 비활성화
* AI 피드백 화면 접근 제한
* “OpenAI API Key를 입력하면 AI 피드백을 사용할 수 있습니다.” 안내 표시
* API 호출 수행하지 않음

API Key가 있는 경우:

* 하루 분석 결과를 요약 JSON으로 구성
* 앱에서 OpenAI API를 직접 호출
* 응답을 JSON 형태로 파싱
* 피드백 결과를 로컬 DB에 저장
* Daily Review 화면에서 결과 표시

AI에게 전달하는 데이터는 원본 로그 전체가 아니라 앱 내부에서 계산한 요약 데이터로 제한한다.

## 6. API Key 관리 정책

OpenAI API Key는 사용자가 직접 입력한다.

보안 정책은 다음과 같다.

1. API Key를 앱 코드에 하드코딩하지 않는다.
2. API Key를 SQLite에 저장하지 않는다.
3. API Key는 expo-secure-store에 저장한다.
4. Settings 화면에서 API Key 등록, 수정, 삭제 기능을 제공한다.
5. API Key 미입력 시 AI 피드백 기능은 완전히 비활성화한다.
6. API 호출 실패 시 Key 오류, 네트워크 오류, 사용량 초과 오류를 구분해 표시한다.
7. 사용자의 API Key는 외부 서버로 전송하지 않는다. 단, OpenAI API 호출을 위해 OpenAI 서버로는 전송된다.

## 7. 데이터 모델

## 7.1 Template

```ts
type Template = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 7.2 TemplateBlock

```ts
type TemplateBlock = {
  id: string;
  templateId: string;
  startTime: string;
  endTime: string;
  title: string;
  categoryId: string;
  memo?: string;
  orderIndex: number;
};
```

## 7.3 DailyPlan

```ts
type DailyPlan = {
  id: string;
  date: string;
  sourceTemplateId?: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
};
```

## 7.4 PlannedBlock

```ts
type PlannedBlock = {
  id: string;
  dailyPlanId: string;
  startDateTime: string;
  endDateTime: string;
  title: string;
  categoryId: string;
  memo?: string;
  notificationEnabled: boolean;
};
```

## 7.5 ActivityLog

```ts
type ActivityLog = {
  id: string;
  date: string;
  plannedBlockId?: string;
  title: string;
  categoryId?: string;
  startDateTime: string;
  endDateTime?: string;
  source: "planned" | "manual";
  memo?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 7.6 Category

```ts
type Category = {
  id: string;
  name: string;
  type:
    | "deep_work"
    | "study"
    | "work"
    | "exercise"
    | "meal"
    | "rest"
    | "sleep"
    | "leisure"
    | "admin"
    | "waste"
    | "other";
  isSelfInvestment: boolean;
};
```

## 7.7 DailyAnalysis

```ts
type DailyAnalysis = {
  id: string;
  date: string;
  totalPlannedMinutes: number;
  totalRecordedMinutes: number;
  matchedMinutes: number;
  planMatchRate: number;
  selfInvestmentMinutes: number;
  unplannedMinutes: number;
  unrecordedMinutes: number;
  createdAt: string;
};
```

## 7.8 AIFeedback

```ts
type AIFeedback = {
  id: string;
  date: string;
  inputSummaryJson: string;
  outputJson: string;
  createdAt: string;
};
```

## 8. 화면 구성

## 8.1 Home

Home 화면은 오늘의 상태를 보여주는 메인 화면이다.

표시 항목:

* 오늘 날짜
* 오늘 계획 적용 여부
* 현재 진행 중 활동
* 다음 일정
* 빠른 시작 버튼
* 종료 버튼
* 오늘 리뷰 이동 버튼
* AI 피드백 사용 가능 여부

## 8.2 Today Plan

오늘 계획을 생성하고 편집하는 화면이다.

기능:

* 템플릿 불러오기
* 빈 계획 생성
* 시간 블록 추가
* 시간 블록 수정
* 시간 블록 삭제
* 시간 충돌 검사
* 오늘 계획 적용
* 알림 예약

## 8.3 Templates

템플릿 목록과 편집 기능을 제공한다.

기능:

* 템플릿 목록 조회
* 템플릿 생성
* 템플릿 수정
* 템플릿 삭제
* 템플릿 복사
* 오늘 계획으로 불러오기

## 8.4 Activity Logger

실제 활동을 기록하는 화면이다.

기능:

* 계획된 활동 선택
* 직접 입력 활동 시작
* 진행 중 활동 종료
* 기록 수정
* 기록 삭제

## 8.5 Daily Review

하루 분석 결과를 보여주는 화면이다.

표시 항목:

* 계획 대비 실제 타임라인
* 계획 일치율
* 카테고리별 시간 사용
* 계획 외 활동 시간
* 미기록 시간
* 자기계발 시간
* 집중 시간
* AI 피드백 버튼

## 8.6 AI Feedback

AI 피드백 결과를 보여주는 화면이다.

API Key가 없으면 다음 상태를 보여준다.

```text
AI 피드백을 사용하려면 OpenAI API Key를 설정하세요.
```

API Key가 있으면 다음 기능을 제공한다.

* 오늘 피드백 생성
* 이전 피드백 조회
* 피드백 재생성
* 피드백 삭제

## 8.7 Settings

설정 화면이다.

기능:

* 알림 설정
* 카테고리 관리
* OpenAI API Key 등록
* OpenAI API Key 삭제
* 하루 시작 기준 설정
* 데이터 초기화

## 9. 핵심 로직

## 9.1 오늘 계획 적용 로직

```text
1. DailyPlan을 active 상태로 변경한다.
2. 기존 오늘 알림을 모두 취소한다.
3. PlannedBlock 목록을 조회한다.
4. 각 PlannedBlock에 대해 로컬 알림을 예약한다.
5. 알림 ID를 로컬 DB에 저장한다.
6. Home 화면 상태를 갱신한다.
```

## 9.2 활동 시작 로직

```text
1. 현재 진행 중인 ActivityLog가 있는지 확인한다.
2. 진행 중인 활동이 있으면 현재 시각으로 종료 처리한다.
3. 새 ActivityLog를 생성한다.
4. startDateTime은 현재 시각으로 저장한다.
5. Home 화면에 현재 진행 중 활동을 표시한다.
```

## 9.3 활동 종료 로직

```text
1. 진행 중인 ActivityLog를 찾는다.
2. endDateTime을 현재 시각으로 저장한다.
3. 해당 활동을 종료 상태로 변경한다.
4. Home 화면 상태를 갱신한다.
```

## 9.4 분석 로직

```text
1. 해당 날짜의 PlannedBlock 목록을 조회한다.
2. 해당 날짜의 ActivityLog 목록을 조회한다.
3. 각 계획 블록과 실제 기록의 시간 겹침을 계산한다.
4. matchedMinutes를 계산한다.
5. totalPlannedMinutes를 계산한다.
6. totalRecordedMinutes를 계산한다.
7. planMatchRate를 계산한다.
8. 카테고리별 계획/실제 시간을 계산한다.
9. unplannedMinutes를 계산한다.
10. unrecordedMinutes를 계산한다.
11. DailyAnalysis에 저장한다.
```

## 9.5 AI 피드백 로직

```text
1. SecureStore에서 OpenAI API Key 존재 여부를 확인한다.
2. API Key가 없으면 AI 피드백 기능을 중단한다.
3. DailyAnalysis를 조회한다.
4. PlannedBlock과 ActivityLog를 요약한다.
5. OpenAI API 요청용 JSON을 생성한다.
6. OpenAI API를 직접 호출한다.
7. 응답 JSON을 파싱한다.
8. AIFeedback 테이블에 저장한다.
9. AI Feedback 화면에 표시한다.
```

## 10. 개발 단계

## Phase 1. 프로젝트 초기 설정

* Expo 프로젝트 생성
* TypeScript 설정
* Expo Router 설정
* Zustand 설정
* SQLite 설정
* SecureStore 설정
* 기본 폴더 구조 생성

## Phase 2. 로컬 DB 설계

* Category 테이블 생성
* Template 테이블 생성
* TemplateBlock 테이블 생성
* DailyPlan 테이블 생성
* PlannedBlock 테이블 생성
* ActivityLog 테이블 생성
* DailyAnalysis 테이블 생성
* AIFeedback 테이블 생성

## Phase 3. 오늘 계획 기능 구현

* 오늘 계획 생성
* 시간 블록 추가/수정/삭제
* 시간 충돌 검사
* 오늘 계획 적용
* active 상태 관리

## Phase 4. 실제 기록 기능 구현

* 계획된 활동 시작
* 직접 입력 활동 시작
* 진행 중 활동 표시
* 활동 종료
* 기록 수정/삭제

## Phase 5. 분석 기능 구현

* 시간 겹침 계산
* 계획 일치율 계산
* 카테고리별 시간 계산
* 계획 외 시간 계산
* 미기록 시간 계산
* Daily Review 화면 구현

## Phase 6. 템플릿 기능 구현

* 템플릿 목록
* 템플릿 생성
* 템플릿 수정
* 템플릿 삭제
* 템플릿을 오늘 계획으로 불러오기

## Phase 7. 알림 기능 구현

* 알림 권한 요청
* 시작 10분 전 알림 예약
* 시작 시각 알림 예약
* 종료 시각 알림 예약
* 계획 수정 시 알림 재예약
* 실기기 테스트

## Phase 8. OpenAI API Key 설정 기능 구현

* Settings 화면에 API Key 입력 UI 추가
* SecureStore에 API Key 저장
* API Key 삭제 기능 구현
* API Key 존재 여부에 따른 AI 기능 활성/비활성 처리

## Phase 9. AI 피드백 기능 구현

* DailyAnalysis 요약 JSON 생성
* OpenAI API 직접 호출
* 응답 JSON 파싱
* AIFeedback 저장
* AI Feedback 화면 구현
* API 오류 처리

## Phase 10. 테스트 및 개선

* iOS/Android 실기기 테스트
* 알림 테스트
* 날짜/시간 경계 테스트
* 자정 넘는 일정 테스트
* API Key 미입력 상태 테스트
* API Key 오류 상태 테스트
* 데이터 초기화 테스트

## 11. MVP 범위

MVP에 포함할 기능은 다음과 같다.

* 오늘 계획 생성/수정/적용
* 실제 활동 시작/종료 기록
* 계획 대비 실제 분석
* 템플릿 생성/불러오기
* 로컬 알림
* OpenAI API Key 입력
* API Key가 있을 경우 AI 피드백
* API Key가 없을 경우 AI 피드백 비활성화

MVP에서 제외할 기능은 다음과 같다.

* 별도 백엔드 서버
* 로그인
* 클라우드 동기화
* 친구 공유
* 캘린더 연동
* 위젯
* 웨어러블 연동
* 자동 활동 인식
* 위치 기반 기록

## 12. 개발 우선순위

가장 먼저 구현해야 할 것은 AI 기능이 아니다.

개발 우선순위는 다음과 같다.

```text
1. 로컬 DB
2. 오늘 계획
3. 실제 기록
4. 분석 로직
5. Daily Review
6. 템플릿
7. 알림
8. API Key 설정
9. AI 피드백
```

AI 피드백은 분석 기능이 완성된 뒤 붙여야 한다. 앱 내부에서 분석 결과를 먼저 계산해야 GPT 피드백의 품질이 안정된다.

## 13. 주요 리스크

## 13.1 API Key 보안

사용자가 직접 입력한 API Key는 SecureStore에 저장한다. SQLite, AsyncStorage, 코드 상수에 저장하지 않는다.

앱 개발자가 자신의 API Key를 앱에 넣어 배포하는 방식은 사용하지 않는다.

## 13.2 알림 동작

앱이 백그라운드에서 계속 실행된다고 가정하지 않는다. 알림은 OS 예약 알림으로 처리한다.

## 13.3 날짜/시간 처리

모든 시간 데이터는 ISO datetime으로 저장한다. 화면에는 로컬 시간 기준으로 표시한다. 자정을 넘는 일정과 하루 시작 기준 설정을 고려한다.

## 13.4 AI 응답 실패

OpenAI API 호출은 실패할 수 있다. 다음 오류를 처리해야 한다.

* API Key 없음
* 잘못된 API Key
* 네트워크 오류
* 사용량 초과
* 응답 JSON 파싱 실패
* 모델 응답 지연

## 14. 최종 설계 방향

본 앱은 백엔드 없는 로컬 중심 앱으로 개발한다.

핵심 가치는 다음 세 가지다.

```text
오늘 계획
실제 기록
계획 대비 분석
```

AI 피드백은 선택 기능이다. 사용자가 OpenAI API Key를 입력하지 않으면 AI 피드백은 제공하지 않는다. 따라서 앱은 AI 기능이 없어도 완전한 시간관리 앱으로 동작해야 한다.

최종 MVP의 정의는 다음과 같다.

```text
사용자가 하루 계획을 만들고, 실제 활동을 기록하며, 계획 대비 실행률을 확인할 수 있는 로컬 중심 데일리 시간관리 앱. 사용자가 OpenAI API Key를 입력한 경우에 한해 AI 피드백을 추가로 제공한다.
```
