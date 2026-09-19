# ToDoList 프로젝트 규칙

공통 작업 규칙에 더해 이 프로젝트에서 지킬 기술·데이터 조건이다. 정책은 목표이며, 현재 구현이 모두 충족한다고 가정하지 않는다.

## 1. 실행 구조와 호환성
- 정적 HTML·CSS·JavaScript 웹사이트이며 진입 파일은 `index.html`, `ToDoList.html`이다. 공통 화면 변경은 두 파일의 동작을 맞춘다.
- 주요 로직은 `js/app.js`, 상수·개발기록은 `js/utils/constants.js`, 스타일은 `css/style.css`에 있다.
- 개발기록 화면·상세 모달은 `js/features/devlog/view.js`가 제공하며, 두 HTML에서 `app.js`보다 먼저 읽는다. 이벤트 연결과 공통 `UI` 객체는 `app.js`에서 유지한다.
- AI 스터디 목록·빈 화면·작성/수정/상세 모달·코드 복사는 `js/features/ai-study/view.js`가 제공하며, 두 HTML에서 `app.js`보다 먼저 읽는다. 팩토리는 기존 `store`와 상수·공통 함수를 전달받고, 이벤트 연결·CRUD·저장·동기화는 `app.js`에서 유지한다. `UI` 참조가 필요한 콜백은 팩토리 생성 시 실행하지 않는다.
- 사이트 목록·사이트/폴더 모달은 `js/features/sites/view.js`가 제공하며, 두 HTML에서 `app.js`보다 먼저 읽는다. 이모지 버튼의 모달 내부 이벤트는 함께 두고 공통 이벤트는 `app.js`에서 유지한다.
- 연차 목록·통계 표시·등록/수정·총 발생일 모달은 `js/features/vacation/view.js`가 제공하며, 두 HTML에서 `app.js`보다 먼저 읽는다. 계산·CRUD·공통 이벤트는 `app.js`의 기존 Store/UI에서 유지한다. 연차와 할 일의 휴가 유형을 자동으로 합치지 않는다.
- `window.UI`, `window.store`, HTML 인라인 이벤트 호환성을 유지한다. `app.js` 전체 분리·모듈화는 별도 승인 후 단계적으로 진행한다.
- 단일 `store`를 데이터의 기준으로 유지한다. 기능별 저장소나 별도 Firebase 업로드·암호화·타이머를 만들지 않는다.

## 2. 저장과 클라우드 보호
- 기존 키 `todolist_jy_data_v39`, `todolist_jy_streak_v39`와 메모 객체·암호화 형식을 유지한다. 변경은 별도 설계·승인이 필요하다.
- `notes`, `aiStudyNotes`, `honeymoonData`, `subscriptions`, `deletedItemIds`, `updatedAt`, `syncRevision`을 중앙 저장 흐름에서 함께 관리한다.
- `loadLocalOnly()`의 읽기·파싱 실패는 저장·업로드를 차단한다. 정상적으로 읽은 메모를 메모리에 반영하지 않아 빈 값으로 덮어쓰는 회귀를 검사한다.
- 로컬 저장 확인 전 입력을 지우지 않는다. 미전송 기록은 재실행 후에도 유지하고, 서버의 해당 변경 저장 확인 전에는 해제하지 않는다.
- 최상위 `localSync`는 로컬 전용이다. 암호화 전에 업로드 대상에서 제외하고 서버 다운로드로 교체하지 않는다.
- 서버 시각이 최신이라는 이유만으로 로컬을 덮어쓰지 않는다. 기존 기준값·미전송 기록·서버 버전과 조건부 쓰기를 유지한다.
- 충돌 시 양쪽 원문을 보존하고, 충돌하지 않는 수신과 전체 동기화 완료를 구분한다. 삭제 기록을 무시하거나 기본값 시딩으로 항목을 되살리지 않는다.
- 기본 템플릿은 사용자 원본이 아니다. 화면 렌더링·초기화가 기존 데이터의 재저장·초기화를 유발하지 않게 한다.
- 사이트/폴더 변경은 단일 Store의 `commitSiteChanges()`에서 기존 중앙 저장 흐름을 통해 확인한 뒤 메모리에 반영한다. 폴더 삭제·내부 사이트 이동·삭제 기록을 한 후보로 저장한다. 폴더 삭제 기록은 기존 `deletedItemIds`에 `site-folder:<id>`로 기록해 `work` 등 다른 기능과 공유하는 ID를 삭제하지 않는다. `all`과 이동 대상 `portal`은 삭제하지 않는다. 오래된 사이트/폴더 행의 재유입은 원문을 충돌 기록에 보존하며 자동 복원하지 않는다.
- 연차 변경은 `commitVacationChanges()`에서 기존 중앙 저장·미전송 경로를 확인한 뒤 반영한다. 총 발생일 0은 유효하며 `setTotalVacationDays()`의 실패는 `null`로 구분한다. 삭제한 연차의 오래된 원격 원문도 충돌로 보존한다. 초기화용 할 일·건강/취미/파일보관함 폴더의 임시 보정이 파싱한 사용자 원본을 변경하거나 다른 기능 저장에 섞이지 않게 한다.
- Vault의 파일 메타데이터와 IndexedDB 원문은 함께 검토한다. 메타데이터 수신을 첨부파일 수신 성공으로 간주하지 않는다.
- `file://` 로컬 HTML, GitHub Pages, 다른 기기의 브라우저 저장소는 같다고 가정하지 않는다. 동일 계정 로그인만으로 최신 데이터 동기화가 끝났다고 보고하지 않는다.

## 3. 가계부와 모바일의 재발 조건
- 월별 금액은 `honeymoonData`, 구독은 `subscriptions`로 구분한다. 구독이 보인다는 사실만으로 가계부 수신 성공을 판단하지 않는다.
- `ledgerBankStatements`, `ledgerCategoryRules`는 기기별 은행 원본·분류 설정이다. 다른 기기에 같은 원본이 있다고 가정하거나, 원본 부재를 근거로 동기화된 월별 금액을 0원으로 다시 저장하지 않는다.
- 가계부 검증에는 기존 기기의 0원 기본값·미전송 기록·가계부 자체 충돌·다른 항목 충돌을 포함한다. 빈 새 브라우저 검사만으로 끝내지 않는다.
- 보존된 서버 금액을 읽기 전용으로 표시하는 기능은 실제 충돌 해결이 아니다. 출처를 표시하고 원본·미전송 상태를 유지한다.
- 모바일은 좁은 화면에서 금액 잘림·월 선택·안내 자동 숨김을 확인한다. 긴 안내를 숨겨도 상단 상태와 실제 로컬 저장 실패 경고를 숨기지 않는다.

## 4. 변경별 검증
실제 브라우저 프로필·사용자 백업·운영 Firebase에 접근하지 않는 기존 테스트를 우선 사용한다. 변경과 관계있는 검사만 실행한다.

| 변경 영역 | 관련 검사 파일 (`tests/`) |
|---|---|
| 로컬 읽기·저장·미전송·중앙 동기화 | `local-load-safety.test.cjs`, `outbox.test.cjs` |
| 메모 이전 | `memo-transfer.test.cjs`, `memo-transfer-ui.cjs` |
| AI 노트 수신·표시 | `ai-sync.test.cjs`, `ai-sync-ui.cjs` |
| AI 화면 분리·실제 HTML 로딩·입력 보존 | `ai-study-ui.cjs` (두 HTML, PC/모바일, `file://`, 가상 기기 간 AI 노트 동기화·편집), `ui-performance.cjs` |
| 사이트 저장·폴더 삭제·화면 분리 | `sites-safety.test.cjs`, `sites-ui.cjs` (실제 두 HTML, PC/모바일/`file://`, 저장 실패·재실행·가상 기기 간 사이트/폴더 동기화) |
| 연차 저장·계산·화면 분리 | `vacation-safety.test.cjs`, `vacation-ui.cjs` (0일·반차·휴가, 실패 입력·원문 보존, 관련 없는 기존 자료 보존, 달력·챗봇·기간 필터, 두 HTML/PC/모바일/`file://`/가상 기기 간 동기화) |
| 가계부 금액·충돌·모바일 | `ledger-safety.test.cjs`, `ledger-conflict-sync.test.cjs`, `ledger-view-ui.cjs` |
| 안내·성능 | `sync-notice-ui.cjs`, `ui-performance.cjs`, `sync-performance.cjs` |
| 개발기록 모듈·실제 HTML 로딩·웹/모바일 메뉴 연결 | `devlog-ui.cjs` (두 진입 HTML, `file://`, 독립 브라우저 간 가상 메모 동기화) |

- Node 예: `node --test tests/ledger-safety.test.cjs tests/ledger-conflict-sync.test.cjs`.
- 브라우저 예: `node tests/ledger-view-ui.cjs`. Playwright와 테스트가 사용하는 브라우저가 필요하며, 다른 PC에서는 현재 설치 경로·환경변수를 확인한다. 테스트 때문에 실제 사용자 프로필을 연결하지 않는다.
- 저장·수신 경로 수정 시 표시 검사만으로 끝내지 않는다. 업로드 실패 → 재실행 → 오래된 서버 수신 → 재전송을 필요한 범위에서 검증한다.

## 5. 배포와 문서 유지
- GitHub Pages 배포는 사용자 승인 범위에서만 수행한다. 모든 저장에 `save(true)`를 강제하거나 모든 수정 후 자동 push하도록 규칙을 만들지 않는다.
- 배포할 JS·CSS가 변경되면 두 HTML의 관련 캐시 식별자를 갱신한다. 개발기록과 사용자 표시 버전을 바꿀 때는 서로 일치시킨다.
- 배포 완료는 해당 커밋의 GitHub Pages 성공 결과로 확인한다. 커밋을 브라우저·Firebase 데이터의 백업으로 간주하지 않는다.
- 비밀정보·복구 데이터·개인 백업은 커밋하지 않는다. 기존 `.gitignore`와 실제 staged diff를 확인한다.
- 저장 구조·검사 명령·배포 방식이 바뀌면 이 문서의 해당 부분만 갱신한다. 작업 일지나 일반 개발 팁은 계속 덧붙이지 않는다.
