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
