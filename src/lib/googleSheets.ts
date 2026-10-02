import { SheetFile, Worksheet, SheetColumn, SheetRow } from '../types';

export const columnLetterToIndex = (letter: string): number => {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column - 1;
};

export const indexToColumnLetter = (index: number): string => {
  let temp = index + 1;
  let letter = '';
  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
};

export async function fetchUserSpreadsheets(accessToken: string): Promise<SheetFile[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=50`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const text = await res.text();
  if (!res.ok || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.error("Drive API Spreadsheets Error:", res.status, text);
    throw new Error(`Failed to fetch spreadsheets (${res.status}): ${text}`);
  }

  const data = JSON.parse(text);
  return data.files || [];
}

export async function fetchSpreadsheetMetadata(accessToken: string, spreadsheetId: string): Promise<{ title: string; sheets: Worksheet[] }> {
  if (!spreadsheetId) {
    throw new Error("Selected spreadsheet has no valid spreadsheet ID.");
  }

  console.log("Selected spreadsheet ID:", spreadsheetId);
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties,sheets.properties`;
  console.log("Sheets API URL:", apiUrl);

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const responseText = await response.text();
  console.log("Sheets API status:", response.status);
  console.log("Sheets API content type:", response.headers.get("content-type"));

  if (!response.ok || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
    console.error("Sheets API error response body:", responseText);
    throw new Error(`HTTP status: ${response.status}\nRequest URL: ${apiUrl}\nSpreadsheet ID: ${spreadsheetId}\nResponse content-type: ${response.headers.get("content-type")}\nResponse body: ${responseText}`);
  }

  try {
    const metadata = JSON.parse(responseText);
    return {
      title: metadata.properties?.title || 'Untitled Spreadsheet',
      sheets: metadata.sheets || []
    };
  } catch (e: any) {
    throw new Error(`Failed to parse Sheets API response JSON: ${e.message}\nResponse body: ${responseText}`);
  }
}

export async function fetchSheetData(accessToken: string, spreadsheetId: string, sheetName: string): Promise<{ columns: SheetColumn[]; rows: SheetRow[] }> {
  if (!spreadsheetId) {
    throw new Error("Selected spreadsheet has no valid spreadsheet ID.");
  }

  const range = encodeURIComponent(`${sheetName}!A1:ZZ1000`);
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`;
  console.log("Sheets API values URL:", apiUrl);

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const responseText = await response.text();
  console.log("Sheets API values status:", response.status);

  if (!response.ok || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
    console.error("Sheets API values error body:", responseText);
    throw new Error(`HTTP status: ${response.status}\nRequest URL: ${apiUrl}\nSpreadsheet ID: ${spreadsheetId}\nResponse body: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  const values: string[][] = data.values || [];

  if (values.length === 0) {
    return { columns: [], rows: [] };
  }

  const headerValues = values[0];
  const columns: SheetColumn[] = headerValues.map((header, idx) => ({
    header: header && header.trim() !== '' ? header.trim() : `Col ${indexToColumnLetter(idx)}`,
    columnIndex: idx,
    columnLetter: indexToColumnLetter(idx)
  }));

  const rows: SheetRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const rowValues = values[i];
    const spreadsheetRow = i + 1;
    const rowObj: Record<string, string> = {};

    columns.forEach((col) => {
      rowObj[col.header] = rowValues[col.columnIndex] !== undefined ? String(rowValues[col.columnIndex]) : '';
    });

    rows.push({
      spreadsheetRow,
      values: rowObj
    });
  }

  return { columns, rows };
}

export async function updateCell(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  columnLetter: string,
  value: string
): Promise<void> {
  const range = `${sheetName}!${columnLetter}${rowNumber}`;
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[value]]
    })
  });

  const responseText = await response.text();
  if (!response.ok || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
    console.error("Sheets API update cell error:", responseText);
    throw new Error(`HTTP status: ${response.status}\nRequest URL: ${apiUrl}\nResponse body: ${responseText}`);
  }
}

export async function batchUpdateCells(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  updates: { rowNumber: number; columnLetter: string; value: string }[]
): Promise<void> {
  const data = updates.map((u) => ({
    range: `${sheetName}!${u.columnLetter}${u.rowNumber}`,
    values: [[u.value]]
  }));

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data
    })
  });

  const responseText = await response.text();
  if (!response.ok || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
    console.error("Sheets API batch update error:", responseText);
    throw new Error(`HTTP status: ${response.status}\nRequest URL: ${apiUrl}\nResponse body: ${responseText}`);
  }
}
