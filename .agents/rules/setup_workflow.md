# Antigravity 5-Stage Sequential Development Workflow Rule

This rule defines the user's standardized 5-step development workflow (1~5번 셋업).

## 5-Stage Workflow Mapping

1. **1단계: 1번 셋업 (`/setup-project`) - 환경 세팅**
   - UV Python virtual environment (`.venv`), `.gitignore`, Git initialization.
   - **MANDATORY POST-STEP GUIDANCE**:
     Whenever 1번 셋업 is executed or completed, ALWAYS output friendly next-step guidance:
     > 💡 **가상환경 및 기본 환경 설정이 완료되었습니다!**
     > 다음은 **[2단계: 2번 셋업 (/design-api)]**으로 데이터 모델링 및 API/화면 설계를 진행하실 차례입니다.

2. **2단계: 2번 셋업 (`/design-api`) - 설계 퍼스트**
   - Plan data schema, tables, UI components, and API specifications before coding to prevent bugs and misunderstandings.

3. **3단계: 3번 셋업 (`/setup-skill`) - 전용 도구 / 스킬 제작**
   - Create reusable skills/tools with YAML frontmatter for specific automation needs (e.g., excel analysis, web scraping, data conversion).

4. **4단계: 4번 셋업 (`/verify`) - 코드 무결성 & 자체 검증**
   - Run automated and manual tests, execute the code with test scripts, fix any errors autonomously, and report passing results.

5. **5단계: 5번 셋업 (`/commit`) - 영구 백업 & 표준 커밋**
   - Conventional Git commit and push to remote repository for safe permanent backup.

## 📌 버전 관리 정책 (Versioning Policy)
- 버전 업데이트는 **하루(1일)를 기준**으로 합니다.
- 하루에 수정이나 커밋을 여러 번 진행하더라도 같은 날짜 안에서는 소수점 판올림을 남발하지 않고 **1일 단위 버전(예: 어제 v1.0 -> 오늘 v1.1)**을 유지합니다.
