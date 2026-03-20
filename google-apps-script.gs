/**
 * GOOGLE APPS SCRIPT FOR BOMBAY GOBINDGARH ROADWAYS
 * 
 * 1. Create a Google Sheet and name it (e.g., "Trip Submissions")
 * 2. In the Sheet, go to Extensions > Apps Script
 * 3. Delete any existing code and paste this code
 * 4. Create a folder in Google Drive for uploads and copy its ID
 * 5. Update FOLDER_ID below
 * 6. Click 'Deploy' > 'New Deployment'
 * 7. Select 'Web App'
 * 8. Execute as 'Me' and Access as 'Anyone'
 * 9. Copy the Web App URL and paste it in your script.js
 */

const FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; // Change this!

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0]; // First sheet
    
    // Create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Trip ID', 'Driver Name', 'Truck Number', 'Phone', 'Route', 
        'Cargo Type', 'GPS Location', 'Timestamp', 
        'Photo Link', 'Doc 1 Link', 'Doc 2 Link'
      ]);
    }
    
    // Handle File Uploads to Drive
    let photoUrl = '';
    let doc1Url = '';
    let doc2Url = '';
    
    if (data.photoFile) photoUrl = saveFile(data.photoFile, data.tripId + '_photo');
    if (data.doc1File) doc1Url = saveFile(data.doc1File, data.tripId + '_doc1');
    if (data.doc2File) doc2Url = saveFile(data.doc2File, data.tripId + '_doc2');
    
    // Append Data to Sheet
    sheet.appendRow([
      data.tripId,
      data.driverName,
      data.truckNo,
      data.phone,
      data.route,
      data.cargoType,
      data.gps,
      data.timestamp,
      photoUrl,
      doc1Url,
      doc2Url
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success',
      'tripId': data.tripId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveFile(fileObj, fileName) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const contentType = fileObj.type;
  const data = Utilities.base64Decode(fileObj.base64.split(',')[1]);
  const blob = Utilities.newBlob(data, contentType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
