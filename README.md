# 하루결

Expo SDK 54 기반의 로컬 우선 일일 일정 관리 앱입니다. 일정, 실행 기록, 분석, 템플릿, 알림, 선택형 OpenAI 피드백을 제공합니다.

## 실행

```bash
npm install
npx expo start
```

Expo Go에서 QR을 스캔해 실행합니다. 기본 포트가 사용 중이면 Expo CLI가 안내하는 대체 포트를 사용하면 됩니다.

Metro가 오래된 의존성 캐시를 들고 있어 SDK 호환 오류나 `Unable to resolve "expo-linking"` 같은 번들 오류가 반복되면 캐시를 비워 실행합니다.

```bash
npm run start:clear
```

현재 프로젝트는 Expo SDK 54 계열입니다.

## 검증

```bash
npm run typecheck
npm run test:core
```

의존성 호환성 점검이 필요할 때:

```bash
npx expo install --check
```

## 주요 범위

- 날짜별 계획 생성, 수정, 적용
- 실제 활동 시작, 종료, 기록 수정
- 계획 대비 실제 수행 분석
- 템플릿 생성, 수정, 복사, 삭제, 계획에 적용
- OS 로컬 예약 알림
- SecureStore 기반 OpenAI API 키 저장
- API 키가 있을 때만 OpenAI 피드백 호출

## 로컬 데이터 정책

- 별도 백엔드 서버를 사용하지 않습니다.
- 계획, 기록, 분석, 템플릿, 카테고리, 피드백은 SQLite에 저장합니다.
- OpenAI API 키는 SQLite가 아니라 `expo-secure-store`에 저장합니다.
- API 키가 없으면 AI 호출은 수행하지 않습니다.
