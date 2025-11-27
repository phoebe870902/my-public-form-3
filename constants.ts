import { ClassSession } from './types';

// Using 2026 to match the specific Day of Week/Date combinations provided in the prompt (e.g., Jan 9 is Friday)
const Y_YEAR = 2026;

const createSession = (id: string, name: string, month: number, day: number, time: string, instructor: string = 'Sophie'): ClassSession => {
  const date = new Date(Y_YEAR, month - 1, day); // month is 0-indexed in JS Date
  // Adjust for timezone if needed, but ISO string without time component is usually safer for sorting, 
  // here we keep it simple as we use local string for display
  const offset = date.getTimezoneOffset() * 60000; 
  const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 10);
  
  return {
    id,
    name,
    date: localISOTime,
    timeDisplay: time,
    instructor
  };
};

// 1. 修復陰瑜伽 (Restorative Yin Yoga) - Friday AM
const yinSessions = [
  { m: 1, d: 9 }, { m: 1, d: 16 }, { m: 1, d: 23 }, { m: 1, d: 30 },
  { m: 2, d: 6 }, { m: 2, d: 27 }
].map((dt, idx) => createSession(`yin-${idx}`, '修復陰瑜伽 (Restorative Yin) - 教室二', dt.m, dt.d, '09:20 - 10:50'));

// 2. 哈達瑜珈 (Hatha Yoga) - Mon/Wed PM
const hathaEveningSessions = [
  { m: 1, d: 5 }, { m: 1, d: 7 }, { m: 1, d: 12 }, { m: 1, d: 14 },
  { m: 1, d: 19 }, { m: 1, d: 21 }, { m: 1, d: 28 },
  { m: 2, d: 2 }, { m: 2, d: 4 }, { m: 2, d: 9 }, { m: 2, d: 11 }
].map((dt, idx) => createSession(`hatha-pm-${idx}`, '哈達瑜珈 (Hatha Yoga) - 教室二', dt.m, dt.d, '19:30 - 21:00'));

// 3. 哈達瑜珈 (Hatha Yoga) - Thu AM
const hathaMorningSessions = [
  { m: 1, d: 8 }, { m: 1, d: 15 }, { m: 1, d: 22 }, { m: 1, d: 29 },
  { m: 2, d: 5 }, { m: 2, d: 12 }
].map((dt, idx) => createSession(`hatha-am-${idx}`, '哈達瑜珈 (Hatha Yoga) - 教室一', dt.m, dt.d, '10:00 - 11:30'));

// Combine and sort by date
export const MOCK_CLASSES: ClassSession[] = [
  ...yinSessions,
  ...hathaEveningSessions,
  ...hathaMorningSessions
].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

export const CSV_HEADERS = [
  { label: '課程日期', key: 'classDate' },
  { label: '課程名稱', key: 'className' },
  { label: '學員姓名', key: 'studentName' },
  { label: 'Line ID', key: 'lineId' },
  { label: '付款狀態', key: 'paymentStatus' },
  { label: '帳號末五碼', key: 'paymentLast5' },
];

export const APP_CONFIG = {
  instructor: "Sophie",
  lineId: "@tungmei0902",
  location: "辛亥路四段 199 號興昌里區居民活動中心 2F",
  locationNote: "辛亥捷運站斜對面，走路三分鐘之內",
  rules: "六人以上開課 （教室一：8人滿班; 教室二：16人滿班）",
  makeupPolicy: "若您因故請假，可於本月堂課期間內完成補課。\n請於課前透過 Line 告知，將協助安排補課時段（彈性安排，依照教室與學員狀況調整）。",
  paymentInfo: [
    { type: "頭份郵局 (700)", account: "0291290-0193549", name: "林冬梅" },
    { type: "中國信託 (822) 復興分行", account: "635540045178", name: "" },
    { type: "LinePay", link: "https://line.me/ti/p/an0yR-Lra2" }
  ]
};

// Default Script URL for seamless usage
export const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4opi6oUVwrGwJhQHNatkVji2yP0tLqC3JUpadcSxsUlruQEbj3SXQ1QauAzFpw0EEQw/exec";

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
// Google Apps Script for Sophie Yoga Registration

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  // Convert rows to array of objects
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    // Convert boolean strings back to boolean if needed
    if (obj['isPaid'] === 'TRUE') obj['isPaid'] = true;
    if (obj['isPaid'] === 'FALSE') obj['isPaid'] = false;
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    
    // NEW: Handle Delete All Action
    if (payload.action === 'delete_all') {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // Keep the header row (row 1), delete everything else
        sheet.deleteRows(2, lastRow - 1);
      }
      return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'All data cleared'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Normal Registration Logic
    // Ensure payload is an array (handle single or multiple)
    var registrations = Array.isArray(payload) ? payload : [payload];
    
    // Check if headers exist, if not add them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['id', 'studentName', 'lineId', 'classId', 'className', 'classDate', 'isPaid', 'paymentLast5', 'timestamp']);
    }
    
    registrations.forEach(function(r) {
      sheet.appendRow([
        r.id,
        r.studentName,
        r.lineId,
        r.classId,
        r.className,
        r.classDate,
        r.isPaid,
        r.paymentLast5 || '',
        new Date(r.timestamp).toISOString()
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success', count: registrations.length}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;