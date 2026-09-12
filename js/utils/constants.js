/**
 * ToDoList JY - Constants & Static Configurations (constants.js)
 * Phase 1 Modularization: Global Constants & Seed Data
 */

(function(window) {
  'use strict';

  // Dynamic Real Today Date Helper (YYYY-MM-DD)
  function getRealTodayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const TODAY_STR = getRealTodayStr();

  // Storage Keys
  const STORAGE_KEY = 'todolist_jy_data_v39';
  const STREAK_KEY = 'todolist_jy_streak_v39';

  // =========================================================================
  // Development Logs & Version History Data (개발기록 데이터)
  // =========================================================================
  const DEVLOG_DATA = [
    {
      version: 'v1.3.9',
      date: '2026-09-08',
      dateFormatted: '2026년 9월 8일 (화)',
      title: '🧠 [AI 스터디] MCP 도구 vs 전역 규칙 상충 분석 및 아키텍처 가이드 반영 (v1.3.9)',
      badge: '최신 버전 ✨',
      badgeColor: '#8b5cf6',
      summary: 'MCP 도구 도입 시 4대 규칙 상충 분석, 시니어 아키텍트 거버넌스 수칙 수립, 스터디 보물창고(Study & Knowledge Hub) 등록',
      details: [
        '🧠 4대 상충 분석: UI/스타일링(Vanilla CSS vs Tailwind), 실행 권한(사전 승인 vs 자동 실행), 파일 편집(Diff vs 덮어쓰기), OS 환경(PowerShell vs Linux)',
        '💡 시니어 개발자 원칙: "MCP는 도구일 뿐, 거버넌스를 침범할 수 없다", System Rules > MCP Instructions 우선순위 확립',
        '🔒 권한 분리 원칙: 조회(Read)는 자동화 허용, 쓰기(Write)는 사용자 승인 및 IDE 내장 부분 수정(Diff) 도구로 단일화',
        '💎 보물창고(Study & Knowledge Hub) AI 스터디 노트 및 AI_STUDY.md 개발문서 신규 등록'
      ]
    },
    {
      version: 'v1.3.8',
      date: '2026-09-07',
      dateFormatted: '2026년 9월 7일 (오늘)',
      title: '💎 결제금액 자유 입력 지원 & 구독 관리 모달 및 카드 감성 CSS 전면 리뉴얼 (v1.3.8)',
      badge: '최신 배포 🌟',
      badgeColor: '#ff6b8b',
      summary: '결제금액 10원 단위 제약을 해제하여 모든 숫자(0, 1, 123 등)를 자유롭게 입력할 수 있도록 개선하고, 구독 카드 그리드와 등록 모달의 감성 디자인 및 반응형 스타일을 완벽 매칭',
      details: [
        '✨ 결제금액 자유 입력: step 속성을 개선하여 123원 등 임의의 숫자를 입력할 때 발생하던 브라우저 유효성 툴팁 오류 원천 해결',
        '🎨 구독 카드 감성 디자인 완비: 24종 파스텔 아이콘 박스, 금액 및 결제주기 배지, 결제일 D-Day(3일 전 코랄 강조), 만료일/자동갱신 배지 완벽 스타일링',
        '🔘 원클릭 구독 중/일시중지 토글 스위치: 카드 하단 원클릭 상태 전환 스위치 및 호버 효과 강화',
        '📱 3종 대표 아이콘 칩 & 모달 리뉴얼: 🎮 오락 / 📺 OTT / ✨ 그외 선택 칩과 입력 폼에 포커스 글로우 및 반응형 그리드 탑재'
      ]
    },
    {
      version: 'v1.3.7',
      date: '2026-09-07',
      dateFormatted: '2026년 9월 7일',
      title: '🛡️ 구독 데이터 클라우드 스마트 머지 & 새로고침 보존 및 서브탭 상태 기억 (v1.3.7)',
      badge: '안정화 완료 ✅',
      badgeColor: '#20c997',
      summary: '새로고침 또는 클라우드 동기화 시 로컬에 새로 등록한 구독 데이터가 덮어써지지 않도록 ID 기반 스마트 머지를 적용하고, 구독 관리 서브탭 화면 상태를 안전하게 기억',
      details: [
        '🛡️ 구독 데이터 스마트 머지 완비: 클라우드 동기화 시 Map 기반 병합을 통해 클라우드에 아직 반영되지 않은 신규 로컬 구독 100% 안전 보존',
        '🧟 삭제 장부(Tombstone) 엄격 검증: 사용자가 명시적으로 삭제한 구독은 어떠한 경우에도 부활하지 않도록 무결성 유지',
        '📑 구독 관리 서브탭 상태 기억: 구독 화면에서 새로고침 시 가계부로 튕기지 않고 구독 관리 탭 화면 상태 자동 복원',
        '🔄 전체 뷰 실시간 동기화: 클라우드 동기화 발생 시 구독 관리 통계 배너 및 카드 그리드 자동 갱신'
      ]
    },
    {
      version: 'v1.3.6',
      date: '2026-09-07',
      dateFormatted: '2026년 9월 7일',
      title: '🐞 구독 서비스 신규 등록 스크립트 오류 수정 & 효과음 엔진 안정화 (v1.3.6)',
      badge: '안정화 완료 ✅',
      badgeColor: '#20c997',
      summary: '새로운 구독 서비스 추가 등록 시 미정의 효과음 메서드 호출로 인한 스크립트 오류를 수정하고 방어 로직 및 사운드 별칭을 완비하여 원활한 등록 지원',
      details: [
        '🔧 새 구독 추가 스크립트 오류 수정: 신규 등록 폼 제출 시 playPop 호출로 인한 TypeError를 수정하여 정상 등록 및 자동 모달 닫힘 복구',
        '🔊 효과음 엔진 방어 코드 탑재: 사운드 메서드 호출 전 존재 여부 안전 검사 및 playPop() 호환 별칭 추가',
        '⚡ 실시간 구독 목록 갱신: 신규 등록 후 즉시 카드 그리드 및 이번 달 총 구독료 요약 배너에 실시간 반영'
      ]
    },
    {
      version: 'v1.3.5',
      date: '2026-09-07',
      dateFormatted: '2026년 9월 7일',
      title: '💎 신혼 가계부 ↔ 구독관리 레이아웃 너비 100% 일치화 & 한 줄 요약 배너 및 3종 아이콘(오락/OTT/그외) 간소화 (v1.3.5)',
      badge: '안정화 완료 ✅',
      badgeColor: '#20c997',
      summary: '가계부와 구독관리 탭 가로폭 완벽 일치화, 이번 달 총 구독료 한 줄 요약 배너 개편, 복잡한 카테고리 제거 및 3종 대표 아이콘(오락/OTT/그외) 미니멀 관리 시스템 구축',
      details: [
        '📐 가계부 ↔ 구독관리 레이아웃 100% 일치: 탭 전환 시 화면이 넓어지거나 좁아지지 않고 가계부와 완전히 동일한 안정적 너비 유지',
        '💳 이번 달 총 구독료 한 줄 요약 배너: 글자가 쪼개지던 복잡한 4개 통계 카드를 제거하고 단 하나의 시원하고 깔끔한 미니멀 한 줄 배너로 직관적 개편',
        '🎮 대표 아이콘 3종 단순화: 복잡한 24종 피커 대신 🎮 오락, 📺 OTT, ✨ 그외 3가지 직관적인 원클릭 칩으로 선택',
        '✨ 카테고리 제거 & 미니멀 구독 카드: 불필요한 카테고리 필터 바 및 모달 드롭다운을 제거하여 가장 간결하고 빠른 구독 관리 환경 제공'
      ]
    },
    {
      version: 'v1.3.4',
      date: '2026-09-07',
      dateFormatted: '2026년 9월 7일',
      title: '✨ 구독 관리 CSS 스타일 완비 & 편집 반응 복구 & 구독 만료일 기능 탑재 (v1.3.4)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '카테고리 칩 및 카드 CSS 100% 매칭, 구독 편집 모달 즉시 반응 복구, 바로가기 버튼 제거, 구독 만료일/약정 종료일 D-Day 계산 기능 추가',
      details: [
        '🎨 구독 관리 CSS 정상화: 카테고리 필터 칩(.sub-cat-chip) 및 구독 카드 그리드 스타일을 100% 매칭하여 감성 캡슐 디자인으로 완벽 복구',
        '✏️ 구독 편집 모달 반응 복구: 구독 카드 내 ✏️ 편집 버튼 클릭 시 모달 오버레이가 즉시 활성화되도록 개선',
        '🔗 바로가기 제거: 요청에 따라 카드 및 모달에서 불필요한 URL 바로가기 링크 기능 제거',
        '📅 구독 만료일(약정 종료일) 기능 신설: 구독별 만료일 설정 및 실시간 D-Day 카운트다운 뱃지(D-N / 정기 자동 갱신) 지원'
      ]
    },
    {
      version: 'v1.3.3',
      date: '2026-09-06',
      dateFormatted: '2026년 9월 6일',
      title: '💍 신혼 가계부 탭 분리(가계부 / 구독관리) & 🔄 스마트 구독관리 허브 신설 (v1.3.3)',
      badge: '기능 추가 💎',
      badgeColor: '#7048e8',
      summary: '신혼 가계부 화면 내 2개 서브 탭(가계부 / 구독관리) 분리, 가계부 상단 표준양식 다운로드 버튼 제거, 안티그래비티·WAVVE·지니뮤직 등 정기 구독 서비스 통합 관리 시스템 구축',
      details: [
        '📑 신혼 가계부 2-Way 서브 탭 바 신설: 💍 신혼 가계부(엑셀 결산/통계)와 🔄 구독관리(정기 결제/고정지출) 탭 분리로 화면 편의성 대폭 향상',
        '📥 가계부 뷰 클린업: 요청에 따라 상단 2026 표준 양식 다운로드 버튼을 제거하고 핵심 지표 및 12개월 엑셀 분석 화면에 집중',
        '🔄 스마트 구독관리 대시보드 신설: 이번 달 총 구독료, 연간 예상 지출액, 다가오는 결제일 D-Day 카운트다운 뱃지, 이용 중인 활성 구독 수 실시간 계산',
        '💳 감성 구독 카드 그리드 & 모달: 안티그래비티(23,000원), WAVVE(10,900원), 지니뮤직(8,800원), 쿠팡와우(7,890원) 등 24종 이모지 피커, 매월/매년 결제주기, 원클릭 구독 중/일시중지 토글 지원',
        '🛡️ E2EE AES-256 클라우드 동기화 & 톰스톤(Tombstone) 영구 삭제 보존 완비'
      ]
    },
    {
      version: 'v1.3.0',
      date: '2026-09-06',
      dateFormatted: '2026년 9월 6일',
      title: '🏗️ 1단계 안전 모듈화 (상수/유틸/E2EE 보안 엔진 분리) & 📖 AI 스터디 지식 노트 상세 뷰어 완비 (v1.3.0)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '10,000줄 이상의 app.js를 안전하게 경량화하는 1단계 모듈화(상수/유틸/암호화 분리), AI 스터디 노트 상세 모달 뷰어 탑재, 모바일 5-Emoji 매핑 고도화',
      details: [
        '🏗️ 1단계 안전 모듈화 완료: constants.js(상수), helpers.js(유틸/사운드/폭죽), crypto.js(E2EE 보안 엔진) 분리로 app.js 경량화 및 AI 협업 개발 속도 향상',
        '📖 AI 스터디 지식 노트 전용 상세 뷰어 모달 탑재: 카드 클릭 시 깔끔한 팝업으로 전체 메모/코드 스니펫/태그/출처 링크를 한눈에 열람',
        '🤖 Antigravity & Codex 협업 노트 탑재: 프로젝트 폴더 공유 및 작은 단위 안전 바이브 코딩 가이드라인 수록',
        '📱 모바일 하단 내비게이션 3번째 퀵메뉴(기록 & 메모)에 AI 스터디 연결 완비'
      ]
    },
    {
      version: 'v1.2.6',
      date: '2026-09-04',
      dateFormatted: '2026년 9월 4일',
      title: '🌐 유용한 사이트 폴더별 분류·관리 시스템 구축 & 🌸 스마트 다이어리 비서 (AI Chatbot) 및 4중 데이터 안전 무결성 완비 (v1.2.6)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '🌐 사이트 모음(Sites) 폴더별 탭 분류 & 자유로운 폴더 생성/수정/삭제, 🌸 스마트 다이어리 비서(AI 챗봇) 탑재(테마 실시간 변경, 메뉴명 커스텀, 자연어 일정 등록, 1초 원복 Undo 시스템), 📋 모든 할 일 완료 항목 숨김 분리, 🛡️ 인생 프로젝트 4중 데이터 무결성(Zero Data Loss & Anti-Zombie) 영구 보장',
      details: [
        '🌐 유용한 사이트 모음(Sites) 폴더별 분류 & 맞춤 폴더 관리 시스템 신설: 포털/검색 🔍, 금융/부동산 🏦, 쇼핑/생활 🛍️, 업무/도구 💼 등 기본 폴더 제공 및 자유로운 새 폴더 생성/수정/삭제, 사이트 등록/수정 시 폴더 지정 및 사이트 카드 내 폴더 뱃지 지원',
        '🌸 스마트 다이어리 비서 (AI Chatbot) 탑재: 우측 하단 플로팅 챗봇 버튼을 통해 테마 변경("테마를 라벤더로 바꿔줘"), 메뉴 이름 커스텀("가계부 이름을 지출기록으로 바꿔줘"), 자연어 일정/가계부 등록, 다이어리 현황 브리핑 및 "챗봇으로 뭐 할 수 있어?" 기능 가이드 지원',
        '↩️ 1초 안전 원복(Undo / Rollback) 엔진 구축: 챗봇을 통해 테마나 메뉴명을 변경했을 때 "방금 적용한 CSS 다시 이전 상태로 돌려줘" 또는 말풍선 내 [↩️ 방금 변경 원복하기] 버튼으로 즉시 100% 원상 복구',
        '🛡️ 4대 안전 방어 대책 (Anti-Crash Guardrails): 화이트리스트 기반 CSS 변수 제어로 UI 깨짐 원천 방지, 시스템 고유 ID 불변성 유지, 파괴적 명령 확인 모달 강제, 100% 무료 오프라인 로컬 NLP 엔진',
        '📋 \'모든 할 일\' 메뉴 필터링 고도화: 완료된 할 일은 숨기고 진행 중인 미완료 일정만 깔끔하게 노출하며, 완료된 항목은 \'✨ 완료된 목록\'에서만 별도로 모아볼 수 있도록 완벽 분리',
        '🎯 인생 프로젝트 3종(왕숙 입주, 시험관, 레벨업) 4중 무결성 보호: 1회성 시딩(One-Time Seeding) 플래그 + 톰스톤(Tombstone) 영구 삭제 시스템으로 사용자 수정분 100% 보존 및 좀비 부활 원천 차단'
      ]
    },
    {
      version: 'v1.1.8',
      date: '2026-09-02',
      dateFormatted: '2026년 9월 2일',
      title: '🛡️ 파일보관함 폴더관리·파일이동 완비 & 톰스톤(Tombstone) 기반 삭제 부활 방지 및 연차내역 편집 고도화 (v1.1.8)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '📁 파일보관함 폴더별 분류 & 일괄 이동, 🏖️ 연차내역 인라인 편집 모달, 📂 드래그앤드롭 업로드 안정화, 🛡️ 시계 오차 극복 톰스톤 및 단조 리비전 동기화로 삭제 항목 부활 원천 차단 완비',
      details: [
        '📁 파일 보관함 폴더별(개인 🌸, 회사 💼, 기타 📁 등) 분류 & 자유로운 폴더 생성/편집/삭제: 24종 이모지 피커 지원, 폴더 삭제 시 내부 파일은 \'기타\' 폴더로 안전 자동 이관(Zero Data Loss)',
        '📦 파일 단일/다중 일괄(Batch) 폴더 이동 기능: 보관함 상단 일괄 선택 체크박스 & 선택한 파일들을 원하는 폴더로 한번에 이동하거나 일괄 삭제하는 플로팅 툴바 탑재',
        '🏖️ 연차 관리 등록 내역 수정/편집 지원: 이미 등록된 연차/반차/0일 휴가 내역의 날짜, 휴가 구분(전일/오전반차/오후반차/0일휴가), 사유를 언제든 자유롭게 수정할 수 있는 모달 지원',
        '📂 파일 보관함 전 영역 드래그 앤 드롭 업로드 개선: 보관함 드래그 시 시각적 드롭존 피드백 제공 및 다중 파일 즉시 IndexedDB/클라우드 안전 저장',
        '🛡️ 톰스톤(Tombstone `deletedItemIds`) 영구 삭제 추적 시스템 구축: 일정, 메모, 사진, 위시리스트, 연차, 건강/취미노트, 파일 등 삭제 시 ID를 영구 추적하여 다른 기기의 과거 캐시로 인한 삭제 항목 부활(Zombie Item) 원천 방지',
        '⏱️ 다중 기기 시스템 시계 오차(Clock Drift) 극복 단조 리비전(`syncRevision`): 집/회사 PC 간 시계 차이가 발생해도 모든 로컬 작업에 클라우드보다 엄격하게 높은 논리적 타임스탬프와 버전 리비전 부여로 역전송(Reverse Push) 덮어쓰기 완전 해결',
        '☁️ 클라우드 최신 상태 우선 동기화 (Rule 1 & Rule 2 무결성 준수): 2단계 동기화 로그인 직후 최신 클라우드 상태를 최우선 수신하며, 사용자 기존 데이터를 100% 영구 보존',
        '📜 프로젝트 핵심 가이드라인 (`GEMINI.md`) 영구 정립'
      ]
    },
    {
      version: 'v1.1',
      date: '2026-08-30',
      dateFormatted: '2026년 8월 30일',
      title: '🌸 2026 라이프 다이어리 대규모 고도화 & 인생 프로젝트·건강·취미·연차·파일보관함 및 실시간 클라우드 무결성 완성 (v1.1)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '🏢 인생 대형 프로젝트(왕숙 입주/시험관) 로드맵, 🩺 건강관리 & 🎨 취미활동 폴더 분할 및 일괄 이동, 🏖️ 0일 차감 휴가 분리, 📁 2GB IndexedDB 무제한 파일보관함, ✏️ 메모·파일 삭제 동기화 무결성 및 사이드바 유연한 구분선 완비',
      details: [
        '🏢 인생 대형 프로젝트 (Roadmap & Milestones) 신설: 왕숙 신도시 아파트 입주, 소중한 아기 천사 맞이(시험관 준비) 등 인생의 큰 프로젝트 목표 설정, 단계별 중도금 납부/사전점검/입주일 및 시술 단계별 마일스톤 관리, D-Day & 실시간 프로그레스 바, 폭죽 완료 체크 및 24종 감성 이모지 피커 완비',
        '🩺 건강관리 (Health Manager) 고도화: 건강검진, 산부인과, 치아, 수술계획, 일반 등 맞춤 폴더 분류, 다중 메모 선택 및 다른 폴더로 일괄 이동(Batch Move), 폴더별 편집/삭제(삭제 시 메모 일반 폴더로 자동 안전 이관) 및 대용량 진료 메모/진료비 기록 지원',
        '🎨 취미활동 일지 (Hobby & Life Journal) 고도화: 운동, 피아노, 그림, 독서 등 다양한 취미 카테고리 폴더 지원, 폴더 편집 및 삭제, 다중 취미 일지 일괄 폴더 이동 및 시간/장소 꼼꼼한 기록',
        '🏖️ 연차·반차 & 0일 차감 휴가 분리 관리: 총 발생연차(15일 등 설정), 사용한 연차, 남은 연차 통계 및 연차 차감 없는 0일 휴가(경조사/포상 등) 별도 카운트, 년도별/월별 내역 필터링 및 월별 실시간 요약 배너 탑재',
        '📁 파일 보관함 2GB 무제한 IndexedDB 구축: 브라우저 5MB 한계를 극복한 로컬 IndexedDB 스토리지 엔진 도입, 엑셀/PDF/이미지 등 대용량 파일 드래그 앤 드롭 업로드 & 안전한 다운로드',
        '✏️ 끄적끄적 메모장 & 파일보관함 삭제 무결성 완전 확보: 팝업 확인 삭제 시 실시간 클라우드 동기화 덮어쓰기 레이스 컨디션 및 파일보관함 Fallback 자동 복원 루프 원천 차단 (삭제 즉시 영구 파기 & 클라우드 전파)',
        '🧭 사이드바 유연한 구분선 & 정렬: 업무 메뉴 아래 구분선(divider-1), 연차관리 아래 구분선(divider-vacation) 등 요청에 따른 유연한 구분선 배치 및 카테고리 순서 편집 모드 완비',
        '💎 보물지식함 & 신혼 가계부 연동 강화: 보물지식함 6단위 페이지네이션(1,2,3,4...), 2026년 신혼 가계부 12개월 엑셀 템플릿 양식 다운로드 및 자동 분석 차트 복구',
        '🛡️ AES-256 E2EE 종단간 암호화 실시간 Firebase 클라우드 동기화: 0.01ms 즉시 암호화/복호화 캐시 엔진 및 로컬 최신 상태 우선 동기화 보장'
      ]
    },
    {
      version: 'v1.0',
      date: '2026-08-29',
      dateFormatted: '2026년 8월 29일',
      title: '🚀 Todolist JY 스마트 라이프 다이어리 기초 구축 (v1.0)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '할 일 관리, 주간/월별 캘린더 플래너, 신혼 가계부 엑셀 연동, 폴라로이드 사진첩, 위시리스트 및 AES-256 E2EE 보안 동기화 기초 완성',
      details: [
        '📋 개인 & 업무 할 일 관리 (리스트 뷰 & 칸반 보드 뷰, 마감일 및 상단 고정)',
        '🗓️ 2026년 8월 기준 월별 달력 플래너 및 가로형 주간 다이어리',
        '💰 2026년 신혼 가계부: 12개월 스택 바 차트, 영호 & 진영 급여, 고정지출/변동지출 및 엑셀 업로드',
        '📸 폴라로이드 갤러리: 감성 사진 등록, 1:1 라이트박스 뷰어 및 드래그 앤 드롭 순서 변경',
        '✏️ 끄적끄적 메모장 (감성 테이프 메모, 4가지 파스텔 컬러, 수정 및 삭제)',
        '🎁 위시리스트 허브: 카테고리별 소원 등록 및 소원 달성 폭죽 스탬프 애니메이션',
        '📁 파일 보관함: 엑셀/PDF/이미지 등 안전 보관 및 다운로드',
        '🛡️ AES-256 E2EE 종단간 암호화 실시간 Firebase 클라우드 동기화'
      ]
    }
  ];

  const DEFAULT_HEALTH_FOLDERS = [
    { id: 'all', name: '전체보기', icon: '🌸' },
    { id: 'obgyn', name: '산부인과', icon: '🤰' },
    { id: 'dental', name: '치아', icon: '🦷' },
    { id: 'surgery', name: '수술계획', icon: '🏥' },
    { id: 'checkup', name: '건강검진', icon: '🩺' },
    { id: 'general', name: '일반/기타', icon: '💊' }
  ];

  const HEALTH_EMOJI_LIST = [
    '🩺', '🏥', '🤰', '🦷', '💊', '🩹', '💉', '🩸',
    '👁️', '👂', '🧠', '🫀', '🫁', '🦴', '🧴', '🧘',
    '🏃', '🥗', '🍎', '🍵', '🛌', '💖', '⭐', '📁'
  ];

  const DEFAULT_HOBBY_FOLDERS = [
    { id: 'all', name: '전체보기', icon: '🎨' },
    { id: 'workout', name: '운동', icon: '🏃' },
    { id: 'piano', name: '피아노', icon: '🎹' },
    { id: 'drawing', name: '그림', icon: '🎨' },
    { id: 'reading', name: '독서', icon: '📚' },
    { id: 'general', name: '기타취미', icon: '✨' }
  ];

  const HOBBY_EMOJI_LIST = [
    '🏃', '🏋️', '🧘', '🏊', '🚴', '🧗', '🎹', '🎸',
    '🎻', '🥁', '🎨', '🖌️', '📚', '✍️', '🍳', '☕',
    '🪴', '📷', '🎮', '🧩', '🎬', '🏕️', '🧶', '✨'
  ];

  const DEFAULT_VAULT_FOLDERS = [
    { id: 'all', name: '전체보기', icon: '📁' },
    { id: 'personal', name: '개인', icon: '🌸' },
    { id: 'work', name: '회사', icon: '💼' },
    { id: 'ledger', name: '가계부', icon: '💰' },
    { id: 'general', name: '기타', icon: '📦' }
  ];

  const VAULT_EMOJI_LIST = [
    '📁', '📂', '🌸', '💼', '📦', '📑', '📊', '📄',
    '🏠', '🏢', '💍', '💰', '💳', '🩺', '🎨', '✈️',
    '🔑', '🏷️', '📌', '⭐', '💖', '🔒', '🛡️', '✨'
  ];

  const DEFAULT_SITE_FOLDERS = [
    { id: 'all', name: '전체보기', icon: '🌐' },
    { id: 'portal', name: '포털 & 검색', icon: '🔍' },
    { id: 'finance', name: '금융 & 부동산', icon: '🏦' },
    { id: 'shopping', name: '쇼핑 & 생활', icon: '🛍️' },
    { id: 'work', name: '업무 & 도구', icon: '💼' }
  ];

  const SITE_EMOJI_LIST = [
    '🌐', '🔍', '🏦', '🛍️', '💼', '📊', '📈', '🏢',
    '📰', '🎬', '📚', '✈️', '🚗', '🩺', '🎨', '💡',
    '🔗', '💻', '📱', '📦', '⭐', '💖', '🚀', '✨'
  ];

  const DEFAULT_PROJECT_EMOJIS = [
    '🏢', '🏠', '🔑', '🌱', '👶', '🍼', '💍', '🚗', 
    '✈️', '🎓', '💰', '📈', '🎯', '🌟', '💼', '🏡', 
    '🏥', '🎨', '📚', '🏋️', '💻', '💡', '🌈', '💖'
  ];

  const DEFAULT_PROJECTS = [
    {
      id: 'proj-wangsook',
      title: '왕숙 신도시 아파트 입주 프로젝트',
      category: '부동산/주거',
      icon: '🏢',
      targetDate: '2027-12-31',
      budget: '3억 5,000만원',
      description: '남양주 왕숙 신도시 내 집 마련 & 성공적인 입주 로드맵 🔑✨',
      createdAt: 1724500000000,
      milestones: [
        { id: 'm-1', title: '계약금 10% 납부 완료', date: '2025-06-15', amount: '5,000만원', completed: true, memo: '공급계약서 수령 및 계약금 납부 영수증 보관 완료' },
        { id: 'm-2', title: '1차 중도금 대출 자필서명 및 실행', date: '2026-02-20', amount: '6,000만원', completed: true, memo: '지정 은행 방문하여 서류 제출 및 중도금 대출 실행' },
        { id: 'm-3', title: '2차 중도금 납부', date: '2026-08-25', amount: '6,000만원', completed: false, memo: '납부 기한 확인 및 자동이체 계좌 잔액 점검' },
        { id: 'm-4', title: '입주자 사전점검 방문 및 하자 체크', date: '2027-10-15', amount: '', completed: false, memo: '전문 점검업체 동행 예약 및 줄자/포스트잇 지참' },
        { id: 'm-5', title: '잔금 정산, 취득세 납부 및 열쇠 수령 (입주!)', date: '2027-12-31', amount: '1억 8,000만원', completed: false, memo: '디딤돌/보금자리론 잔금대출 실행, 입주청소 및 이사 예약' }
      ]
    },
    {
      id: 'proj-ivf',
      title: '소중한 아기 천사 맞이 (시험관 준비)',
      category: '가족/임신',
      icon: '🌱',
      targetDate: '2026-12-31',
      budget: '',
      description: '건강하고 행복한 아기 천사를 맞이하기 위한 사랑 가득한 여정 👶💖',
      createdAt: 1724505000000,
      milestones: [
        { id: 'ivf-1', title: '난임 전문 병원 첫 상담 및 기본 산전 검사', date: '2026-04-10', amount: '35만원', completed: true, memo: '부부 기초 혈액 검사 및 호르몬 수치 확인' },
        { id: 'ivf-2', title: '보건소 정부 난임 시술비 지원 신청 및 결정통지서 수령', date: '2026-05-15', amount: '', completed: true, memo: '정부24 온라인 신청 및 지원 결정통지서 병원 제출' },
        { id: 'ivf-3', title: '과배란 유도 주사 시작 및 엽산/영양제 챙겨먹기', date: '2026-08-20', amount: '45만원', completed: true, memo: '매일 일정한 시간에 자가 주사 투여, 단백질 식단 위주 식사' },
        { id: 'ivf-4', title: '난자 채취 및 수정란/배아 5일 배양', date: '2026-09-10', amount: '80만원', completed: false, memo: '채취 당일 안정 취하기, 이온음료 충분히 섭취' },
        { id: 'ivf-5', title: '동결 배아 이식 & 1차 혈액 피검사 (희망 가득!)', date: '2026-10-15', amount: '30만원', completed: false, memo: '착상에 좋은 따뜻한 음식 섭취 및 편안한 마음 유지하기 🌸' }
      ]
    },
    {
      id: 'proj-levelup',
      title: '레벨업 프로젝트',
      category: '자기계발/성장',
      icon: '📈',
      targetDate: '2026-12-31',
      budget: '',
      description: '꾸준한 역량 강화와 성장을 위한 나만의 레벨업 로드맵 🚀✨',
      createdAt: 1724510000000,
      milestones: [
        { id: 'lvl-1', title: '기본 역량 점검 및 핵심 목표 설정', date: '2026-06-30', amount: '', completed: true, memo: '성장을 위한 로드맵 및 단계별 목표 정리' },
        { id: 'lvl-2', title: '실전 프로젝트 기획 및 설계', date: '2026-08-31', amount: '', completed: true, memo: '업무 및 자기계발 실전 프로젝트 구성' },
        { id: 'lvl-3', title: '핵심 기능 개발 및 자동화 구축', date: '2026-10-31', amount: '', completed: false, memo: '생산성 향상을 위한 핵심 기능 개발 및 적용' },
        { id: 'lvl-4', title: '실전 적용 및 피드백 개선', date: '2026-11-30', amount: '', completed: false, memo: '실제 업무 및 일상에 적용하여 고도화' },
        { id: 'lvl-5', title: '최종 완성 및 성과 리뷰 🌟', date: '2026-12-31', amount: '', completed: false, memo: '1년간의 성장 성과 정리 및 다음 단계 플랜 수립' }
      ]
    }
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'personal', name: '개인 🌸', color: '#f06595' },
    { id: 'work', name: '업무 💼', color: '#868e96' }
  ];

  // AI Study & Prompt Knowledge Categories & Sample Notes
  const DEFAULT_AI_STUDY_CATEGORIES = [
    { id: 'all', name: '전체 보기', icon: '🌟', color: '#ff6b8b' },
    { id: 'llm', name: 'LLM & 프롬프트', icon: '🤖', color: '#7048e8' },
    { id: 'vibe', name: 'Vibe 코딩 & 실전', icon: '💻', color: '#10b981' },
    { id: 'agent', name: 'AI 에이전트 & 도구', icon: '🛠️', color: '#f59f00' },
    { id: 'tips', name: '핵심 지식 & 팁', icon: '📚', color: '#339af0' },
    { id: 'scrap', name: '아이디어 & 스크랩', icon: '💡', color: '#e64980' }
  ];

  const DEFAULT_AI_STUDY_NOTES = [
    {
      id: 'ai-antigravity-codex-collaboration',
      title: 'Antigravity와 Codex 연결 및 역할 분담',
      category: 'vibe',
      summary: '같은 프로젝트 폴더를 공유하는 Antigravity와 Codex의 역할을 나누고, 작은 단위로 안전하게 바이브 코딩하는 방법',
      content: `오늘 Antigravity와 Codex를 같은 프로젝트 폴더에 연결해서 함께 사용하는 방법을 익혔다.

기존에는 Antigravity 하나로 프로젝트를 만들고 수정했는데, 작은 수정이나 오류를 해결할 때도 전체 프로젝트를 확인하면서 작업하기 때문에 시간이 오래 걸리는 경우가 있었다.

이번에 Codex를 같은 로컬 프로젝트 폴더에 연결하면 두 AI가 같은 파일을 공유하면서 작업할 수 있다는 것을 알게 되었다.

앞으로는 역할을 나누어 사용하기로 했다.

- Antigravity: 프로젝트의 큰 기능 개발, 화면 구성, 새로운 기능 추가
- Codex: 작은 수정, 오류 수정, 코드 점검, 코드 리뷰 및 필요한 부분의 빠른 수정

또한 AI에게 바로 수정을 요청하기보다, 먼저 프로젝트 구조와 문제점을 분석하고, 수정할 부분과 영향 범위를 확인한 뒤, 작은 단위로 하나씩 수정하고 실제 프로그램에서 확인하는 방식이 안전하다는 것도 배웠다.

현재 프로젝트는 app.js에 많은 기능이 모여 있고 Firebase, localStorage, IndexedDB 등 여러 저장 방식이 연결되어 있기 때문에 한 번에 전체 코드를 수정하거나 리팩토링하는 것은 위험할 수 있다는 것도 알게 되었다.

앞으로는 AI에게 한 번에 모든 기능을 만들어 달라고 하기보다 작은 기능 단위로 요청하고 결과를 확인하면서 프로젝트를 발전시키는 방식으로 바이브 코딩을 해볼 예정이다.`,
      codeSnippet: '',
      snippetLang: 'Text',
      tags: ['#Antigravity', '#Codex', '#VibeCoding', '#협업', '#안전한수정'],
      refUrl: '',
      pinned: true,
      createdAt: 1788693600000,
      updatedAt: 1788693600000
    },
    {
      id: 'ai-vibe-best-practices',
      title: 'Claude Code & Antigravity 바이브 코딩 베스트 프랙티스',
      category: 'vibe',
      summary: '명확한 요구사항 분리와 단계적 검증으로 AI와 페어 프로그래밍 시 환각(Hallucination) 없이 고품질 코드 생산하기',
      content: '1. 모듈 단위 진행: 한 번에 너무 많은 변경을 요구하지 않고 단일 책임 단위로 지시\n2. 아키텍처 및 계획 먼저 수립: 구현 전 Plan과 데이터 모델링을 먼저 정렬\n3. 즉각적인 검증: 브라우저 및 단위 테스트로 회귀 버그 방지',
      codeSnippet: `// 구조화된 AI 프롬프트 템플릿\n[Role]: 시니어 풀스택 엔지니어\n[Goal]: ToDoList 앱에 'AI 스터디' 노트 관리 모듈 추가\n[Constraints]:\n1. Zero Data Loss 보장 (로컬스토리지 및 E2EE 클라우드 동기화)\n2. 기존 코드베이스의 CSS 변수와 디자인 시스템 유지\n3. 프롬프트/코드 원클릭 복사 기능 구현`,
      snippetLang: 'Prompt',
      tags: ['#VibeCoding', '#Prompt', '#BestPractice'],
      refUrl: 'https://docs.anthropic.com',
      pinned: true,
      createdAt: 1788690000000,
      updatedAt: 1788690000000
    },
    {
      id: 'ai-gemini-sys-instruction',
      title: 'Gemini 2.0 Flash / Pro 시스템 프롬프트 최적화 가이드',
      category: 'llm',
      summary: '출력 형식 강제(JSON/Markdown) 및 Role-Play 설정을 통한 추론 정확도 및 속도 극대화',
      content: 'Gemini 모델은 간결하고 명확한 Role-Play 및 Output Constraints에 민감하게 반응합니다. System Instruction에 규칙을 번호 매겨 작성하면 지시 이행률이 대폭 향상됩니다.',
      codeSnippet: `import google.generativeai as genai\n\nmodel = genai.GenerativeModel(\n    model_name="gemini-2.0-flash",\n    system_instruction="너는 AI 지식 정리 전문 어시스턴트야. 사용자가 입력한 내용을 핵심 요약, 상세 설명, 코드 스니펫으로 구조화해서 답변해줘."\n)\n\nresponse = model.generate_content("바이브 코딩 핵심 정리해줘")\nprint(response.text)`,
      snippetLang: 'Python',
      tags: ['#Gemini', '#Python', '#LLM'],
      refUrl: 'https://ai.google.dev',
      pinned: false,
      createdAt: 1788680000000,
      updatedAt: 1788680000000
    }
  ];

  // Subscription Manager Simple Types & Default Seed Data
  const SUBSCRIPTION_SIMPLE_TYPES = [
    { id: 'entertainment', name: '오락', icon: '🎮' },
    { id: 'ott', name: 'OTT', icon: '📺' },
    { id: 'etc', name: '그외', icon: '✨' }
  ];

  const DEFAULT_SUBSCRIPTION_CATEGORIES = [
    { id: 'all', name: '전체 보기', icon: '🌟', color: '#ff6b8b' }
  ];

  const SUBSCRIPTION_EMOJI_LIST = ['🎮', '📺', '✨'];

  const DEFAULT_SUBSCRIPTIONS = [
    {
      id: 'sub-antigravity',
      name: '안티그래비티 (Antigravity)',
      amount: 23000,
      billingCycle: 'monthly',
      payDay: 9,
      category: 'etc',
      icon: '✨',
      isActive: true,
      memo: '바이브 코딩 & AI 페어 프로그래밍 Pro 플랜 ✨',
      createdAt: 1788693600000,
      updatedAt: 1788693600000
    },
    {
      id: 'sub-wavve',
      name: 'WAVVE (웨이브)',
      amount: 10900,
      billingCycle: 'monthly',
      payDay: 15,
      category: 'ott',
      icon: '📺',
      isActive: true,
      memo: '웨이브 스탠다드 요금제 🍿',
      createdAt: 1788693600000,
      updatedAt: 1788693600000
    },
    {
      id: 'sub-genie',
      name: '지니뮤직 (Genie)',
      amount: 8800,
      billingCycle: 'monthly',
      payDay: 22,
      category: 'entertainment',
      icon: '🎮',
      isActive: true,
      memo: '스마트 음악감상 🎧',
      createdAt: 1788693600000,
      updatedAt: 1788693600000
    },
    {
      id: 'sub-coupang-wow',
      name: '쿠팡 와우 멤버십',
      amount: 7890,
      billingCycle: 'monthly',
      payDay: 1,
      category: 'etc',
      icon: '✨',
      isActive: true,
      memo: '로켓배송 & 쿠팡플레이 📦',
      createdAt: 1788693600000,
      updatedAt: 1788693600000
    }
  ];

  const INITIAL_DEMO_TASKS = [];
  const INITIAL_DEMO_WISHLIST = [];
  const INITIAL_DEMO_NOTES = [];
  const INITIAL_LEDGER_FILES = [];

  const MOCK_DEMO_IDS = new Set([
    'task-1', 'task-2', 'task-3', 'task-4',
    'wish-1', 'wish-2', 'wish-3',
    'note-1', 'note-2', 'note-3'
  ]);

  // Global Export to Window Namespace
  window.getRealTodayStr = getRealTodayStr;
  window.TODAY_STR = TODAY_STR;
  window.STORAGE_KEY = STORAGE_KEY;
  window.STREAK_KEY = STREAK_KEY;
  window.DEVLOG_DATA = DEVLOG_DATA;
  window.DEFAULT_HEALTH_FOLDERS = DEFAULT_HEALTH_FOLDERS;
  window.HEALTH_EMOJI_LIST = HEALTH_EMOJI_LIST;
  window.DEFAULT_HOBBY_FOLDERS = DEFAULT_HOBBY_FOLDERS;
  window.HOBBY_EMOJI_LIST = HOBBY_EMOJI_LIST;
  window.DEFAULT_VAULT_FOLDERS = DEFAULT_VAULT_FOLDERS;
  window.VAULT_EMOJI_LIST = VAULT_EMOJI_LIST;
  window.DEFAULT_SITE_FOLDERS = DEFAULT_SITE_FOLDERS;
  window.SITE_EMOJI_LIST = SITE_EMOJI_LIST;
  window.DEFAULT_PROJECT_EMOJIS = DEFAULT_PROJECT_EMOJIS;
  window.DEFAULT_PROJECTS = DEFAULT_PROJECTS;
  window.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
  window.DEFAULT_AI_STUDY_CATEGORIES = DEFAULT_AI_STUDY_CATEGORIES;
  window.DEFAULT_AI_STUDY_NOTES = DEFAULT_AI_STUDY_NOTES;
  window.SUBSCRIPTION_SIMPLE_TYPES = SUBSCRIPTION_SIMPLE_TYPES;
  window.DEFAULT_SUBSCRIPTION_CATEGORIES = DEFAULT_SUBSCRIPTION_CATEGORIES;
  window.SUBSCRIPTION_EMOJI_LIST = SUBSCRIPTION_EMOJI_LIST;
  window.DEFAULT_SUBSCRIPTIONS = DEFAULT_SUBSCRIPTIONS;
  window.INITIAL_DEMO_TASKS = INITIAL_DEMO_TASKS;
  window.INITIAL_DEMO_WISHLIST = INITIAL_DEMO_WISHLIST;
  window.INITIAL_DEMO_NOTES = INITIAL_DEMO_NOTES;
  window.INITIAL_LEDGER_FILES = INITIAL_LEDGER_FILES;
  window.MOCK_DEMO_IDS = MOCK_DEMO_IDS;

})(window);

