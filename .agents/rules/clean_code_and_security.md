# Clean Code Quality & Security Guardrails Rule

This rule enforces strict quality and security standards on all code generated or modified in this workspace.

## 1. 품질 규칙 (Clean Code & Defensive Programming) - 상시 적용 📐
1. **단일 책임 원칙 (Single Responsibility)**: 하나의 함수/컴포넌트는 하나의 명확한 작업만 담당하도록 간결하게 작성합니다.
2. **타입 힌트 및 명확한 시그니처**: 매개변수와 반환값의 데이터 타입을 명시하여 버그를 사전에 방지합니다.
3. **방어적 예외 처리 (Defensive Try-Catch)**: 예기치 않은 오류로 프로그램 전체가 중단되지 않도록 적절한 `try-catch` / `try-except` 블록과 안전한 기본값(fallback)을 배치합니다.
4. **기존 데이터 및 주석 무결성 보존**: 사용자의 기존 데이터 구조, 설정값, 주석 및 메타데이터를 임의로 삭제하거나 훼손하지 않습니다.

## 2. 보안 규칙 (Security Guardrails) - 상시 적용 🔒
1. **민감 정보 하드코딩 절대 금지**: API 키, 개인 토큰, 비밀번호는 소스코드에 직접 작성하지 않고 `.env` 환경변수로 안전하게 분리합니다.
2. **`.gitignore` 보안 점검**: `.env`, 개인 백업 파일, 인증 키 등이 Git 저장소에 노출되지 않도록 항상 점검합니다.
3. **입력값 검증 및 보안 필터링**: 사용자 입력값(문자열, 파일 등)에 대해 XSS, 악성 스크립트, 유효하지 않은 데이터가 실행되지 않도록 철저히 이스케이프 및 유효성 검사를 수행합니다.
