function initializeProcessRunning(e){
  const jobName = "checkEvalId";
  const formId = e ? e.range.rowStart : "41";
  new Storage().set(formId+"state","running");
}

function startCheckEval(e){
  const jobName = "checkEvalId";
  const formId = e ? e.range.rowStart : "41";
  initializeStarts(formId+'',jobName);
}

function startHasBackend(e){
  const jobName = "hasCoachingBackend";
  const formId = e ? e.range.rowStart : "41";
  initializeStarts(formId+'',jobName);
}

function startSendApproval(e){
  const jobName = "sendApproval";
  const formId = e ? e.range.rowStart : 5;
  initializeStarts(formId+'',jobName)
}

function startAppendBackend(e){
  const jobName = "appendBackend";
  const formId = e ? e.range.rowStart : 5;
  initializeStarts(formId+'',jobName)
}

function startSendManagement(e){
  const jobName = "sendManagementEmail";
  const formId = e ? e.range.rowStart : 5;
  initializeStarts(formId+'',jobName)
}

function initiateTask(e){
  if(e) Custom_Utilities.deleteSelfTrigger(e,ScriptApp);
  const task = JSON.parse(cache.get(e.triggerUid));
  Logger.log("task = %s",task);
  const [jobName, formId] = task;
  initializeStarts(formId+'', jobName);

}

function doErrors(e){
  e ? Custom_Utilities.deleteSelfTrigger(e,ScriptApp) : false;
  function fireTrigger() {
    var url = "https://script.google.com/a/macros/shift4.com/s/AKfycbxk_HNTtoeyHebCZNJIccgqeXOsG9VmYUx0cdtZqpBGCWKy1KPkVIuVEsuEeCFWIARmfQ/exec?duration=60000";
    var options = {
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      }
    };
    Custom_Utilities.exponentialBackoff(() => UrlFetchApp.fetch(url, options));
  }
  fireTrigger();
  const ss = SpreadsheetApp.openById(BACKEND_ID_TEST);
  // all items needed to make tasks and jobs
  const errorQueue = ss.getSheetByName("Errors");
  
  const tasks = errorQueue.getDataRange().getValues(); // gets the tasks to do
  tasks.slice(1).forEach(task => {
    Logger.log(task);
    const jobName = task[0];
    const formId = task[1] +'';
    const process = mkProcess(formId);
    !process.getState() ? process.setState("running") : false;
    const node = process.getNode(jobName);
    node.setTriggerSelf(JSON.stringify(task));
    node.fireTriggerSelf();
    errorQueue.deleteRow(2); // delete the task at head of queue
  });
}
