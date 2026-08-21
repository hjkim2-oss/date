# 구조화 면접 키트

현업 리더가 JD 작성 → 행동지표 → 면접 질문 설계 → STAR 평가 → 면접 일정까지
한곳에서 처리하는 사내 웹앱. 데이터는 구글 시트에 공유 저장된다.

## 저장소에 올릴 파일 (모두 같은 폴더에)

```
index.html          ← 진입점
app.js              ← 앱 코드 (interview-kit.jsx를 미리 컴파일한 결과)
react.min.js        ← React 18 (로컬 포함, CDN 불필요)
react-dom.min.js    ← ReactDOM 18 (로컬 포함)
apps-script.gs      ← 구글 시트 연동용 Apps Script (배포는 이미 완료)
```

> Tailwind CSS만 CDN(`https://cdn.tailwindcss.com`)으로 불러온다.
> 사내망에서 이 도메인이 막혀 있으면 화면 스타일이 깨질 수 있다.

## GitHub Pages로 배포

1. 위 파일들을 저장소 루트(또는 `/docs`)에 올린다.
2. Settings → Pages → Source를 해당 브랜치/폴더로 지정.
3. 몇 분 뒤 발급되는 `https://<계정>.github.io/<저장소>/` 주소를 팀에 공유.

## 구글 시트 연동

- JD·캘린더 데이터는 Apps Script 웹앱 URL을 통해 구글 시트에 저장된다.
- URL은 `app.js` 안 `GS_URL` 상수에 들어 있다. (원본: `interview-kit.jsx`)
- Apps Script를 **재배포하면 URL이 바뀐다.** 바뀌면:
  1. `interview-kit.jsx`의 `GS_URL` 한 줄을 교체하고
  2. 아래 "코드 수정 후 재빌드" 절차로 `app.js`를 다시 만든다.

## 코드 수정 후 재빌드

`interview-kit.jsx`가 원본이다. 이걸 고친 뒤 `app.js`를 다시 만들어야 반영된다.

```bash
npx @babel/core @babel/preset-react 없이 간단히:
npx babel interview-kit.jsx --presets @babel/preset-react -o app.js
```
(단, `import`/`export default` 줄은 브라우저용으로 조정 필요. 어려우면 요청해 달라.)

## 알려진 제약

- **동시 저장 충돌**: 두 사람이 같은 순간 저장하면 뒤에 저장한 쪽이 이긴다.
  부서별로 자기 행만 수정하므로 실사용에선 거의 문제 없음.
- **구글 시트 CORS**: 배포 후 저장/불러오기가 안 되면 Apps Script의
  CORS 설정 문제일 수 있다. 그 경우 스크립트 보완이 필요하다.
