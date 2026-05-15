# CRATA AI Office

청하님 혼자 사용하는 로컬 CRATA 에이전트 운영센터입니다.

## 로컬 포트

- Frontend: http://localhost:3005
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

## 1차 MVP 흐름

```text
입력물 등록
-> 작업 후보 추출
-> 작업 실행
-> 승인대기 생성
-> 승인/거부
```

## DB 실행

```bash
docker compose up -d postgres
```
