// Code.gs

const SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ここにGoogle SheetsのIDを入力
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // ここにクライアントIDを入力

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.actionType || data.action; // 'login', 'edit', 'save' など
  const token = data.token;

  // トークンの検証
  const userInfo = verifyToken(token);
  if (!userInfo) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: '無効なトークンです。'})).setMimeType(ContentService.MimeType.JSON);
  }

  const email = userInfo.email;

  // スプレッドシートの取得
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Logs');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ログシートが見つかりません。'})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'login') {
    sheet.appendRow([new Date(), email, 'Login', '']);
    return ContentService.createTextOutput(JSON.stringify({status: 'success', email: email})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'edit' || action === 'save') {
    const code = data.code || '';
    sheet.appendRow([new Date(), email, action, code]);
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: '不明なアクションです。'})).setMimeType(ContentService.MimeType.JSON);
}

// トークンの検証関数
function verifyToken(token) {
  try {
    const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const info = JSON.parse(response.getContentText());

    if (info.aud !== CLIENT_ID) {
      return null;
    }

    return {
      email: info.email,
      // 必要に応じて他の情報を追加
    };
  } catch (e) {
    return null;
  }
}
