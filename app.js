// =========================================================
// 🌐 깃허브 웹사이트용 연동 소스코드
// =========================================================

// 1. [필수] 구글 앱스 스크립트 배포 URL을 입력하세요.
const GAS_URL = "https://script.google.com/macros/s/발급받은_배포_ID/exec";


/**
 * 🤖 AI 행동지표 변환 함수
 * @param {Array<string>} taskList - 입력받은 핵심 업무 배열
 */
async function generateBehaviorIndicators(taskList) {
  try {
    // ⚠️ headers 속성을 작성하지 않아야 CORS 차단(Failed to fetch)이 발생하지 않습니다.
    const response = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "generate_behavior",
        tasks: taskList
      })
    });

    const data = await response.json();

    if (data.ok) {
      const results = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
      return results;
    } else {
      throw new Error(data.error || "AI 변환 요청 처리 실패");
    }

  } catch (error) {
    console.error("AI 요청 실패 원인:", error);
    alert("AI 변환 실패: " + error.message);
    return null;
  }
}


/**
 * 💾 구글 시트로 데이터 적재 함수 (열별 분리 저장)
 * @param {string} type - 'jd' 또는 'calendar'
 * @param {Object} record - 저장할 데이터 객체
 */
async function saveToGoogleSheet(type, record) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        type: type,
        action: "upsert",
        key: record.id,
        record: record
      })
    });

    const data = await response.json();
    return data.ok;

  } catch (error) {
    console.error("구글 시트 저장 에러:", error);
    return false;
  }
}
