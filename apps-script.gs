/**
 * 구조화 면접 키트 — 구글 시트 공유 저장 다리(Apps Script)
 * JD와 캘린더 데이터를 한 스프레드시트의 두 시트에 저장/조회한다.
 *
 * 붙여넣은 뒤 할 일:
 *   1) 이 스크립트가 '스프레드시트에 연결된' 상태여야 합니다.
 *      (구글 시트 → 확장 프로그램 → Apps Script 로 열면 자동 연결됩니다)
 *   2) 상단 메뉴 '배포 → 새 배포 → 웹 앱'
 *      - 실행: 나
 *      - 액세스 권한: 조직 내 모든 사용자 (또는 링크가 있는 모든 사용자)
 *   3) 발급된 '웹 앱 URL'을 복사해 웹앱 코드 맨 위에 붙여넣습니다.
 */

// 시트 이름 (자동 생성됨 — 바꾸지 마세요)
var JD_SHEET = 'JD';
var CAL_SHEET = 'Calendar';

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || 'jd';
  var sheet = getSheet(type);
  var rows = sheet.getDataRange().getValues();
  var out = [];
  // 1행은 헤더(key, json), 2행부터 데이터
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      try { out.push(JSON.parse(rows[i][1])); } catch (err) {}
    }
  }
  return json({ ok: true, type: type, rows: out });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var type = body.type || 'jd';        // 'jd' | 'calendar'
  var action = body.action || 'upsert'; // 'upsert' | 'delete'
  var sheet = getSheet(type);

  if (action === 'delete') {
    deleteByKey(sheet, body.key);
    return json({ ok: true, action: 'delete', key: body.key });
  }

  // upsert: key가 같으면 덮어쓰고, 없으면 추가
  var record = body.record;
  var key = String(record.id || body.key);
  upsertByKey(sheet, key, JSON.stringify(record));
  return json({ ok: true, action: 'upsert', key: key });
}

function getSheet(type) {
  var name = type === 'calendar' ? CAL_SHEET : JD_SHEET;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['key', 'json']);
  }
  return sheet;
}

function upsertByKey(sheet, key, jsonStr) {
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(jsonStr);
      return;
    }
  }
  sheet.appendRow([key, jsonStr]);
}

function deleteByKey(sheet, key) {
  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(key)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
