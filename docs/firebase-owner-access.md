# 개인 Firebase 데이터 접근

이 앱은 기존 `on3257` 개인 다이어리 하나를 사용하는 앱이다. 이 변경은 기존 데이터 경로, 암호화 키, 암호문, ETag 조건부 저장, 미전송 내역을 유지하고 Firebase Authentication만 추가한다. 여러 사용자에게 데이터베이스 전체를 허용하는 규칙이 아니다. 추후 다중 사용자 서비스로 바꾸려면 UID별 저장 경로와 소유권 규칙을 별도로 설계해야 한다.

## 적용

1. Authentication의 Google 제공업체를 활성화하고 승인된 도메인에 `herbsmile-code.github.io`를 등록한다.
2. 앱의 Google 로그인으로 소유자 본인이 로그인한다. 기존 암호화 비밀번호는 변경하지 않는다.
3. Authentication 사용자 화면에서 해당 본인 계정의 Firebase UID를 확인한다.
4. `database.rules.json`과 `js/services/firebase-auth.js`의 `createAuth` 기본 `ownerUid`에 같은 UID를 설정한다. 현재 값은 2026-10-07에 소유자가 Google 로그인한 뒤 Firebase 콘솔에서 확인한 UID다. 다른 프로젝트에 복사할 경우 두 파일을 함께 수정한다. 미설정 감지 문자열을 UID 대신 사용하면 모든 접근을 거부한다.
5. 규칙 플레이그라운드에서 미인증/다른 UID/이메일 미확인/다른 로그인 제공업체를 거부하고, 본인 Google UID만 읽기·쓰기를 허용하는지 확인한 후 게시한다.
6. 최신 앱에서 기존 아이디·비밀번호로 실제 동기화를 확인한다. 예전 앱은 인증을 보내지 않으므로 업데이트 전까지 클라우드 접근이 거부된다. 로컬 원문은 유지된다.

규칙은 GitHub Pages 배포와 별개다. 규칙 적용 후 구버전 앱으로만 되돌리면 저장이 거부된다. 복구 시에도 공개 규칙으로 되돌리지 말고, 이 인증 모듈을 유지한 채 필요한 앱 코드를 수정한다.

## 구현 및 검증

- `js/services/firebase-auth.js`: 공식 Firebase Auth SDK, 로그인 복원·갱신·로그아웃. 서비스 계정/관리자 키/ID 토큰/암호화 비밀번호는 코드에 포함하지 않는다. Firebase 웹 설정의 API 키는 공개 앱 식별자이며 서버 권한을 부여하지 않는다. [Firebase API 키 설명](https://firebase.google.com/docs/projects/api-keys)
- 모든 REST와 SSE 요청에 Firebase ID 토큰을 붙인다. 토큰은 지정된 HTTPS 데이터베이스에만 전송하고, fetch 리디렉션은 거부한다. [REST 인증](https://firebase.google.com/docs/database/rest/auth)
- 인증 실패, 계정 변경, 잘못된 서버 주소, SDK 로드 실패 시 미인증 요청으로 되돌아가지 않는다. 요청 URL 및 토큰을 로그에 출력하지 않는다.
- `node --test tests/firebase-auth.test.cjs tests/ai-sync.test.cjs tests/automatic-sync.test.cjs tests/object-sync.test.cjs tests/sync-stability.test.cjs tests/sync-storage-recovery.test.cjs tests/full-sync.test.cjs`

## 기존 암호화의 제한

이전 버전은 비밀번호를 데이터 경로에 포함했다. 당시 공개 규칙으로 노출되었을 가능성을 새 규칙이 소급해 해결하지는 않는다. 이 변경에서는 기존 데이터의 유실을 막기 위해 경로와 암호화 키를 바꾸지 않는다. 비밀번호 회전 및 경로 이전은 별도 백업·기기별 미전송 자료 보존·복구 계획을 갖추고 수행해야 한다.
