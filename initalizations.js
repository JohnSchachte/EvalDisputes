// function initializeLastRow() {
//   const docProp = PropertiesService.getDocumentProperties();
//   // const submSheet = SpreadsheetApp.openById(BACKEND_ID).getSheetByName("Submissions");
//   docProp.setProperty("lr",(67).toString());
// }

// function initializeLastRowTest() {
//   const docProp = PropertiesService.getDocumentProperties();
//   // const submSheet = SpreadsheetApp.openById(BACKEND_ID).getSheetByName("Submissions");
//   docProp.setProperty("lrTest",(67).toString());
// }

// function deleteScriptProp(){
//   PropertiesService.getScriptProperties().deleteAllProperties();
// }

// function setUpFormTrigger(){
//   const testSS = "1aDyYnI1Bve9fDrT5k5Ykle93dzrgp0qNTGRtRaR3V3U"
//   ScriptApp.newTrigger("startSendManagement")
//   .forSpreadsheet(SpreadsheetApp.openById(testSS))
//   .onFormSubmit()
//   .create();
// }


function setUpFormTriggersLive(){
  const funcs = ["startCheckEval","startHasBackend","startSendApproval","startAppendBackend","startSendManagement","initializeProcessRunning"];
  const liveBackend = SpreadsheetApp.openById(BACKEND_ID);
  funcs.forEach(func =>{
    ScriptApp.newTrigger(func)
    .forSpreadsheet(liveBackend)
    .onFormSubmit()
    .create();
  });
}
