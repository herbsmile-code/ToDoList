# 6차 취미활동 분리 결과

## 복구 지점과 범위

- 시작점: 5차 완료 커밋 `63bb91bd0d91b25fce01311f95c9210704582191`.
- GitHub 브랜치 `codex/refactor-phase-5`와 고정 주석 태그 `codex/phase-5-reviewed-20260919`를 원자적으로 업로드했다. 원격 브랜치와 태그가 가리키는 커밋을 모두 위 SHA로 확인했다. 당시 `main`은 `b60a3c68a1b09f92ed0453953f61fb6bc0ec9f6b`로 유지됐다.
- 작업 브랜치: `codex/refactor-phase-6`. 소스 복구 지점은 브라우저·Firebase·IndexedDB 개인 자료의 백업과 다르다.
- 범위: 취미 기록과 폴더의 저장 안전성, 일괄 작업 대상, 취미 화면 5개 메서드 분리. 건강관리·첨부파일의 분리는 다음 단계다.

## 수정한 동작

1. 취미 기록/폴더 등록·수정·삭제와 일괄 이동·삭제는 단일 Store의 `commitHobbyChanges()`에서 후보를 만든다. 기존 중앙 저장·읽기 확인·미전송 기록 경로가 성공한 뒤 메모리에 반영한다. 다른 저장소나 업로드 타이머는 만들지 않았다.
2. 읽기 실패, 손상된 미전송 상태, 다른 쓰기 창, 저장 용량 부족, 저장 후 읽기 실패 시 성공으로 처리하지 않는다. 입력창과 선택 상태를 유지한다. 저장 후 읽기 확인만 실패했을 때 이미 저장된 후보와 미전송 기록은 재실행으로 복구할 수 있다.
3. 폴더 전환 시 선택을 해제하고, 일괄 작업 직전에도 현재 보이는 기록과 선택 ID의 교집합만 사용한다. 보이지 않는 선택 ID가 남아 있어도 처리하지 않는다. Store는 중복 ID를 한 번만 처리하고, 없는 기록이나 목적지가 섞이면 부분 처리하지 않는다.
4. 폴더 삭제·내부 기록의 `general` 이동·`hobby-folder:<id>` 삭제 표식을 한 후보로 저장한다. 기존 유효 모달의 기본 폴더 보호 정책(`all`, `general`, `workout`, `piano`, `drawing`, `reading`)을 Store에도 적용했다. 이동 대상이 없는 과거 자료는 명시적 폴더 삭제 시에만 `general`을 함께 만든다.
5. 중앙 병합에서 취미 기록/폴더의 삭제 표식을 적용한다. 삭제 확인 후 같은 ID의 원격 행이 다시 나타나면 원문을 충돌 기록에 보존하고 자동 복원하지 않는다. 폴더 표식은 건강·파일보관함의 같은 ID와 구별된다.
6. 빈 폴더 목록이나 사라진 활성 폴더는 임시 전체보기로 표시한다. 저장된 폴더를 다시 채우거나 화면 조회만으로 저장하지 않는다. 목록에 없는 폴더의 기존 기록은 원래 폴더를 표시하며 편집할 수 있고, 새 기록·새 이동의 목적지는 실제 존재하는 폴더로 제한한다.

## 화면 분리

`js/features/hobby/view.js`의 `createHobbyView()`가 아래 메서드를 제공한다.

- `openHobbyNoteModal`, `closeHobbyNoteModal`
- `openHobbyFolderModal`, `closeHobbyFolderModal`
- `renderHobby`

폴더 모달의 이전 중복 선언 2개를 먼저 제거했다. 뒤쪽 선언이 실제로 사용되던 버전이므로 그 구현을 기준으로 유지했다. 이후 기록 모달 → 폴더 모달 → 목록 순으로 별도 커밋에서 이동했다. 안전성 수정 커밋 이후 5개 유효 메서드의 본문이 동일함을 후행 공백을 제외해 비교했다. `app.js`는 13,266줄에서 12,965줄로 줄었고 취미 화면 파일은 287줄이다.

두 HTML에서 취미 팩토리를 `app.js`보다 먼저 읽는다. 공통 클릭·폼·체크박스 이벤트와 CRUD는 `app.js`의 기존 UI/Store에 남기며, `window.UI`, `window.store`, 기존 인라인 호출과 `file://` 실행을 유지한다. 기존 저장 키·기록 ID·암호화 형식은 바꾸지 않았다.

| 커밋 | 내용 |
|---|---|
| `0c92f02` | 저장·삭제·일괄 대상·과거 자료 안전성 수정과 재현 검사 |
| `7b70d93` | 사용되지 않는 중복 폴더 모달 선언 제거 |
| `1fb454b` | 기록 입력/닫기 모달 분리와 실제 스크립트 로딩 검사 연결 |
| `580465f` | 폴더 입력/닫기 모달 분리 |
| `2b93f9c` | 목록 분리와 화면 밖 선택 ID가 남은 경우의 브라우저 검사 보강 |

## 검증

- 수정 전 가상 저장소 검사 31개 중 18개가 실패했다. 브라우저에서도 저장 실패 후 입력창이 닫히는 기존 동작을 재현했다.
- 정상 화면 기준은 수정 전에 수집한 56개 DOM/치수 스냅샷이다. 두 HTML × PC/모바일 × 밝은/어두운 테마에서 목록, 기록 작성/수정, 폴더 작성/수정, 빈 목록, 선택 화면을 비교한다. 스크린샷 픽셀 비교는 아니다.
- 취미 Node 검사: 8개 변경 경로의 저장 실패·다른 자료 보존, 읽기/미전송 오류·다른 창, 삭제 표식·기본 폴더, 잘못된 일괄 대상·목적지, 과거 자료, 저장 후 읽기 실패, 업로드 실패→재실행→오래된 수신→재시도, 기록/폴더/이동 충돌, 삭제 재유입.
- 취미 브라우저 검사: 실제 HTML의 스크립트 순서, 저장 실패 시 입력/선택/원문 유지와 성공 안내 억제, CRUD·재실행·복사·이모지, 폴더 삭제와 이동, 화면 밖 선택의 일괄 처리 제외, 빈 폴더·과거 기록, 중복 이벤트 방지, `file://`, 가상 두 기기의 실제 암호화 동기화.
- 최종 통합 Node 검사 **213개 통과**(취미 신규 31개 포함). 취미 브라우저 검사를 전체 모드로 통과했고 56개 기존 화면 기준이 일치했다. 연차 48개·사이트 40개·AI 스터디 32개 화면 기준도 유지됐다.
- 개발기록 전체 메뉴/파일 실행/메모 동기화, AI 수신/로그인 실패/충돌 화면, 가계부 20개 화면, UI·동기화 성능 회귀 검사도 통과했다. 성능 스크립트의 비교 대상은 과거 성능 수정 이전 커밋이므로 그 수치를 이번 취미 분리의 개선 효과로 해석하지 않는다.

```powershell
node --test tests/hobby-safety.test.cjs tests/vacation-safety.test.cjs tests/sites-safety.test.cjs tests/local-load-safety.test.cjs tests/outbox.test.cjs tests/ai-sync.test.cjs tests/ledger-conflict-sync.test.cjs tests/ledger-safety.test.cjs tests/memo-transfer.test.cjs
$env:HOBBY_BASELINE_PATH='scratch/hobby-before-safety.json'
node tests/hobby-ui.cjs
node tests/vacation-ui.cjs
node tests/sites-ui.cjs
node tests/ai-study-ui.cjs
node tests/devlog-ui.cjs
node tests/ai-sync-ui.cjs
node tests/ledger-view-ui.cjs
node tests/ui-performance.cjs
node tests/sync-performance.cjs
```

브라우저 검사는 설치된 Playwright/Edge를 사용한다. `AI_TEST_PLAYWRIGHT_PATH`와 `LEDGER_TEST_PLAYWRIGHT_PATH`가 필요한 환경에서는 해당 설치 위치를 지정한다. `HOBBY_BASELINE_PATH`의 기존 파일은 비교에 쓰고, 경로가 없으면 검사 성공 후 기준을 만든다. `HOBBY_VIEWS_ONLY=1`은 정상 화면 기록용이고 최종 검사는 이 옵션 없이 실행한다. 기준 및 상세 로그는 커밋에서 제외한 `scratch/hobby-before-safety.json`, `scratch/phase6-*`에 둔다.

## 한계와 복구

- 검사는 가상 자료·가상 서버·분리된 브라우저 컨텍스트로 수행한다. 실제 사용자 프로필, 개인 복구 파일, 운영 Firebase, 첨부파일 원문은 열거나 수정하지 않는다. 실제 기기와 구버전 코드 전부에 대한 무손실 보장이나 운영 배포 확인은 아니다.
- 구조 분리만 되돌릴 때는 목록 → 폴더 모달 → 기록 모달의 역순으로 해당 커밋을 되돌리고, 두 HTML의 스크립트와 테스트의 팩토리 로딩도 함께 맞춘다. 저장 안전성 수정은 유지한다.
- 강제 reset, 자료 초기화, 개인 복구 파일 덮어쓰기, 오래된 원격 자료 강제 업로드는 복구 절차에 포함하지 않는다. 저장 안전성 이전 소스를 실행하면 기존 문제가 재발할 수 있다.
