function startCheckEval(e){
  const jobName = "checkEvalId";
  const formId = e ? e.range.rowStart : 122;
  initializeStarts(formId,jobName);
}

function startHasBackend(e){
  const jobName = "hasCoachingBackend";
  const formId = e ? e.range.rowStart : 122;
  initializeStarts(formId,jobName);
}

function startSendApproval(e){
  const jobName = "sendApproval";
  const formId = e ? e.range.rowStart : 5;
  initializeStarts(formId,jobName)
}

function startAppendBackend(e){
  const jobName = "appendBackend";
  const formId = e ? e.range.rowStart : 5;
  initializeStarts(formId,jobName)
}

function startSendManagement(e){
  const jobName = "sendManagementEmail";
  const formId = e ? e.range.rowStart : 5;
  initializeStarts(formId,jobName)
}

function initiateTask(e){
  if(e) Custom_Utilities.deleteSelfTrigger(e,ScriptApp);
  // const jobs = getJobs();
  const task = JSON.parse(cache.get(e.triggerUid));
  Logger.log(task);
  // Custom_Utilities.getTaskManager(jobs,[task]).executeTask(task);
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
  const ss = SpreadsheetApp.openById(BACKEND_ID);
  const readFromCache = Custom_Utilities.getMemoizedReads(cache);
  const colMap = mkColMap(readFromCache(BACKEND_ID,"Submissions!1:1").values[0]);

  // all items needed to make tasks and jobs
  const errorQueue = ss.getSheetByName("Errors");

  const jobs = mkJobs({ss,colMap},cache);
  
  const tasks = errorQueue.getDataRange().getValues(); // gets the tasks to do

  const taskManager = Custom_Utilities.getTaskManager(jobs,tasks.slice(1)); // declare task manager and slice the header row of tasks;

  let hasNext = true;
  let count = 0
  while(hasNext){
    hasNext = taskManager.doTask();
    errorQueue.deleteRow(2);
    count++;
    if(count % 5 == 0) Custom_Utilities.fireTrigger();
  }
  Custom_Utilities.fireTrigger();
}