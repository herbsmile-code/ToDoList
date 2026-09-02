# Cloud-First Sync & Data Integrity Safety Rule

이 규칙은 ToDoList 프로젝트의 **1. 클라우드 최신 상태 우선 동기화**와 **2. 기존 데이터 안전 보존**을 보장하기 위한 필수 프로젝트 룰입니다.

---

## 1. ☁️ 클라우드 최신 상태 우선 동기화 (Cloud-First Sync & Single Source of Truth)

1. **단일 원천 원칙 (Single Source of Truth)**:
   - 집, 회사 PC, 모바일 등 다중 기기 환경에서 Firebase 클라우드의 데이터 타임스탬프(`updatedAt`)가 로컬보다 최신일 경우, 클라우드의 상태를 절대적인 최신 기준으로 삼아 동기화합니다.
2. **삭제된 데이터의 부활(Zombie Item) 방지**:
   - 다른 기기에서 삭제된 항목(할 일/일정 `tasks`, 메모 `notes`, 위시리스트 `wishlist`, 사진 `photos`, 건강/취미노트 `healthNotes`/`hobbyNotes`, 연차/휴가 `vacations`, 바로가기 `sites`, 보관 파일 `vaultFiles` 등)이 로컬 캐시로 인해 되살아나는 임의의 `Map.merge` / `Preserve` 로직을 작성하지 않습니다.
3. **타임스탬프 무결성**:
   - 데이터 변경(추가/수정/삭제) 시 항상 최신 밀리초 타임스탬프(`Date.now()`)를 갱신하여 클라우드로 즉시 전달하고, 로컬 저장소와 동기화 시점을 일치시킵니다.

---

## 2. 🛡️ 기존 데이터 안전 보존 (Data Integrity & Zero Data Loss Guarantee)

1. **사용자 데이터 절대 보호**:
   - 사용자가 작성한 기존 데이터(일정, 할 일, 가계부 엑셀 내역, 메모, 첨부파일, 프로젝트 로드맵, 연차 기록 등)는 코드 수정이나 기능 추가 시 절대 임의로 삭제되거나 유실되어서는 안 됩니다.
2. **방어적 예외 처리 (Defensive Fallback)**:
   - 오프라인 상태, 네트워크 오류, Firebase 클라우드 응답 실패, E2EE 암호 해독 오류 등 비정상 상황이 발생하더라도 로컬 스토리지 및 IndexedDB에 저장된 기존 데이터를 임의로 비우거나 덮어쓰지 않고 안전하게 유지합니다.
3. **하위 호환성 (Backward Compatibility)**:
   - 새로운 데이터 필드나 기능을 추가할 때 기존 저장된 데이터 구조를 파괴하지 않고, 안전한 기본값(fallback)을 제공하여 기존 사용자 데이터를 100% 온전하게 유지합니다.
