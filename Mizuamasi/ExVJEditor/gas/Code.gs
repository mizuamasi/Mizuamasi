// Code.gs

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'register') {
    return ContentService.createTextOutput(JSON.stringify(registerUser(data)))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === 'login') {
    return ContentService.createTextOutput(JSON.stringify(loginUser(data)))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === 'saveCode') {
    return ContentService.createTextOutput(JSON.stringify(saveCode(data)))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === 'trackUsage') {
    return ContentService.createTextOutput(JSON.stringify(trackUsage(data)))
      .setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: '無効なアクションです。' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function registerUser(data) {
  const nickname = data.nickname;
  const password = data.password;

  const sheet = getSheet('Users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === nickname) {
      return { success: false, message: 'このニックネームは既に使用されています。' };
    }
  }

  sheet.appendRow([nickname, password]);
  SpreadsheetApp.getActiveSpreadsheet().insertSheet(nickname);

  return { success: true };
}

function loginUser(data) {
  const nickname = data.nickname;
  const password = data.password;

  const sheet = getSheet('Users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === nickname && users[i][1] === password) {
      return { success: true };
    }
  }
  return { success: false, message: 'ニックネームまたはパスワードが違います。' };
}

function saveCode(data) {
  const nickname = data.nickname;
  const timestamp = data.timestamp;
  const code = data.code;

  const sheet = getSheet(nickname);
  if (!sheet) {
    return { success: false, message: 'ユーザーシートが見つかりません。' };
  }

  sheet.appendRow([timestamp, code]);
  return { success: true };
}

function trackUsage(data) {
  const nickname = data.nickname;
  const timestamp = data.timestamp;

  const sheet = getSheet(nickname);
  if (!sheet) {
    return { success: false, message: 'ユーザーシートが見つかりません。' };
  }

  sheet.appendRow([timestamp, '使用時間トラッキング']);
  return { success: true };
}

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}
