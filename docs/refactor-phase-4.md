# 4차: 사이트 모음 안전성 점검과 화면 분리

상태: 4차 안전성 수정·5개 화면 함수 분리·검증 완료. 운영 데이터 접근·main 병합·배포 없음. 4차 변경은 로컬 커밋이며, GitHub에는 3차 완료 복구 지점을 보관했다.

## 최종 결과

- 관련 Node 검사 158개 통과(사이트 안전성 19개 포함).
- 실제 사이트 브라우저 검사에서 안전성 수정 후 확보한 40개 DOM/크기 기준과 분리 후 결과가 일치했다. 두 HTML, PC/모바일/file://, 저장 실패·삭제 실패·재실행·가상 기기 간 동기화·원격 폴더 삭제 후 선택 복구를 확인했다.
- 기존 AI 화면 검사에서 3차 분리 전의 32개 DOM/크기 기준이 유지됐고, 개발기록·전체 메뉴·가상 메모 동기화 검사도 통과했다.
- AI 동기화 화면, 가계부 20개 화면 조건, 모바일 동기화 안내, UI/동기화 성능 회귀 검사를 통과했다. 성능 검사의 과거 버전 대비 수치를 이번 분리의 개선 효과로 해석하지 않는다.
- 새 파일은 `js/features/sites/view.js`이며 이벤트·저장·동기화는 기존 app.js와 단일 Store에서 관리한다. 사용자 데이터 이전이나 새 저장소 생성은 없다.
- 화면 기준 파일 `scratch/sites-safe-before-extraction.json`, 재현/검사 로그는 Git에서 제외했다. 일반 테스트 실행은 기준 JSON 없이도 가능하다.

## 복구 기준

- 3차 완료 커밋: `0da98a0`, GitHub `codex/refactor-phase-3` 브랜치에 업로드·원격 해시 확인 완료.
- 4차 작업 브랜치: `codex/refactor-phase-4`.
- 순서: 재현 검사 → 안전성 수정 커밋 → 화면 기준 확보 → 사이트 모달 → 폴더 모달 → 목록 분리 → 통합 검사·문서화.
- 소스 커밋은 브라우저 localStorage/IndexedDB·Firebase 데이터의 백업이 아니다.

## 사전점검에서 확인한 문제와 결정

1. 사이트/폴더 생성·수정·삭제가 저장 전 메모리를 변경하고, 저장 실패에도 성공값을 반환했다. 폼은 성공 안내 후 닫혔다. 단일 Store의 `commitSiteChanges()`가 변경 후보를 중앙 `commitLocal`/outbox 흐름으로 저장한 뒤 반영하도록 변경한다. 화면은 실패값이면 입력과 모달을 유지한다.
2. 로딩 중 기본 폴더 보충이 파싱한 원본 배열을 직접 변경해, 삭제한 기본 폴더가 재실행 때 복구됐다. 임시 배열을 복제해 원본과 미전송 기준을 보존한다. 누락 필드의 기존 기본값 지원은 유지한다.
3. 폴더 삭제 기록이 없어 이전 기기의 폴더가 다시 유입됐다. 기존 `deletedItemIds` 문자열 목록에 `site-folder:<id>` 기록을 사용한다. `work`처럼 다른 기능과 겹치는 ID를 원문 그대로 넣지 않는다. 저장 키·객체 구조·암호화 형식은 바꾸지 않는다.
4. 확인된 삭제 이후 오래된 서버 행을 그대로 수신하는 경로가 있었다. 사이트/사이트 폴더에 한해 원격 원문을 충돌 기록에 보존하고 자동 복원을 막는다. 삭제와 다른 기기의 수정이 충돌하면 자동으로 원문을 버리지 않는다.
5. 포털 폴더 자체를 삭제하면 사이트 이동 대상이 없어질 수 있다. `all`은 탐색용, `portal`은 기본 이동 대상으로 삭제를 차단한다. 포털 이름/아이콘 변경은 유지하며 나머지 기본 폴더와 사용자 폴더는 삭제할 수 있다. 과거 데이터에 포털이 없다면 명시적인 폴더 삭제/이동을 저장하는 동일 후보 안에서만 이동 대상을 복원한다.
6. 다른 기기에서 현재 선택한 폴더를 지우면 빈 목록에 남았다. 수신 후 렌더링에서 선택 상태만 전체보기로 전환한다. 저장이나 추가 이동은 실행하지 않는다.
7. 폴더 편집 버튼의 깨진 도움말을 정상 한국어로 수정한다.
8. 구버전이 삭제 기록과 같은 원문 행을 함께 재전송하고 양쪽 저장소가 동일한 상태인 경우에도 삭제가 취소되지 않도록 확인했다. 서로 같은 사이트/폴더 행은 기존 삭제 기록을 적용하고, 서로 다른 수정 원문은 충돌로 보존한다.

안전성 수정 기준 커밋은 `acc93a0`이다. 화면 이동은 사이트 모달 `1d9a2d3`, 폴더 모달 `2ab3d3a`, 목록 `77d43be`로 나눴다. 이동한 5개 함수 본문은 안전성 수정본과 줄 끝 공백 외에 동일하며, 각 분리 커밋에서 대상 블록 밖의 app.js는 바꾸지 않았음을 비교했다. 마지막 구버전 동일 행 보완도 화면 이동과 별도 커밋으로 남긴다.

중앙 동기화 수정은 사이트와 폴더 삭제 판정에 한정한다. 다른 컬렉션의 삭제 정책, 가계부, Vault, 인증, 암호화 구현은 변경하지 않는다. 구버전 기기는 새 폴더 삭제 기록을 이해하지 못할 수 있다. 최신 코드에서 재유입을 충돌로 보존하는 방어를 검사하며, 모든 실제 기기의 호환성을 확인했다고 주장하지 않는다.

## 화면 분리 범위

`js/features/sites/view.js`에 `renderSites`, `openSiteModal`, `closeSiteModal`, `openSiteFolderModal`, `closeSiteFolderModal`을 제공하는 일반 script 팩토리를 둔다. 기존 store·DEFAULT_SITE_FOLDERS·SITE_EMOJI_LIST·escapeHTML을 전달하고 UI에 합성한다.

공통 클릭/submit/복사/삭제 이벤트, 저장·동기화는 app.js에 남긴다. 모달 안에서 새로 만드는 이모지 버튼의 선택 이벤트는 모달 함수와 함께 이동한다. 두 HTML의 로딩 순서와 캐시 식별자를 함께 맞춘다.

## 검증과 한계

- `tests/sites-safety.test.cjs`: 6개 변경 경로의 저장 실패, 폼 입력 보존, 원자적인 폴더 삭제·사이트 이동, 재실행, ID 충돌 방지, 오래된 서버/기기, 미전송 재시도, 동시 수정 충돌, 읽기 실패, 쓰기 후 재확인 실패.
- `tests/sites-ui.cjs`: 실제 두 HTML, PC/모바일/file://, 폴더 선택·이모지·반복 모달, 링크·복사, 실패 입력과 삭제 보존, CRUD·재실행, 두 가상 기기의 암호화된 사이트/폴더 동기화.
- 중앙 경로 변경 때문에 기존 로컬 읽기·outbox·AI 동기화·가계부·메모 이전 Node 검사를 함께 실행한다. AI 화면·개발기록·UI/동기화 성능 검사도 회귀 확인한다.
- 외부 링크는 가상 페이지로 대체한다. 브라우저 검사는 새 격리 컨텍스트와 가상 서버만 사용하며 CDN 라이브러리·실제 사용자 프로필·운영 Firebase를 검증하지 않는다.
- 화면 비교 기준은 안전성 수정을 마친 뒤 캡처한다. 저장 실패와 삭제 보호 등 의도적인 동작 수정까지 분리 전과 동일하다고 주장하지 않는다.

실행 예(PowerShell):

```powershell
$env:AI_TEST_PLAYWRIGHT_PATH='C:\Users\JY\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node --test tests/sites-safety.test.cjs tests/local-load-safety.test.cjs tests/outbox.test.cjs tests/ai-sync.test.cjs tests/ledger-conflict-sync.test.cjs tests/ledger-safety.test.cjs tests/memo-transfer.test.cjs
node tests/sites-ui.cjs
node tests/ai-study-ui.cjs
node tests/ai-sync-ui.cjs
node tests/devlog-ui.cjs
node tests/sync-notice-ui.cjs
node tests/ui-performance.cjs
node tests/sync-performance.cjs
$env:LEDGER_TEST_PLAYWRIGHT_PATH=$env:AI_TEST_PLAYWRIGHT_PATH
node tests/ledger-view-ui.cjs
```

`SITES_BASELINE_PATH`에 기존 JSON을 지정하면 DOM/크기를 비교한다. 없는 경로를 지정하면 전체 검사 통과 후 새 기준을 기록한다. 변경 후 새로 만든 기준을 이전 버전 검증으로 취급하지 않는다. 기준 파일과 로그는 Git에서 제외한 scratch 아래에만 둔다.

## 중단·복구

데이터 손실, 실패 성공표시, 불필요한 저장, 중복 이벤트, 기기 간 원문 충돌의 무시, 한 진입 HTML의 로딩 실패가 나오면 다음 단계로 넘어가지 않는다. 문제 커밋을 역순으로 revert하고 새 화면 파일·UI 합성·두 HTML 로딩은 함께 복구한다. 안전성 수정과 화면 이동을 별도 커밋으로 남겨 화면 분리만 되돌릴 수 있게 한다.

구버전 코드로 돌아가도 새로운 삭제 기록 문자열은 지우지 않는다. 안전성 수정 이전으로 돌아가면 기존 결함과 새 삭제 기록 미해석 위험이 다시 생기므로, 운영 중에는 검증된 수정본으로 복구하는 것을 우선한다. 강제 push, 데이터 초기화, 기존 사용자 파일 덮어쓰기를 복구 수단으로 사용하지 않는다.
