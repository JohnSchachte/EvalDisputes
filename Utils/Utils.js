// function secondsSince(date) {
//   const now = new Date();
//   const difference = now - date; // difference in milliseconds
//   return Math.floor(difference / 1000); // convert to seconds
// }

function mkColMap(headers){
  const colMap = new Map();
  headers.forEach((element,index) => colMap.set(element,index))
  return colMap
}

function sendEmail(recipients,subject,template){
  GmailApp.sendEmail(recipients,subject,"",{
    noReply: "True",
    htmlBody: template.evaluate().getContent()
  });
}


function deepFind (type, id){
  Logger.log("searching deeper for id");
  const values = Custom_Utilities.transpose(type === "phone" ? AgentEvaluationForm.getRecordIds() : AgentEvaluationForm.getChatIds());
  const result = AgentEvaluationForm.mkIdObjs(values)[id];
  Logger.log(result)
  return result ? result.split("#") : result; // if false then result is null; have to done it like this or it will try to split a null value;
}

function validate(formResponse, colMap, agentObj) {
  const type = getType(formResponse,colMap);
  const name = agentObj["Employee Name"].toLowerCase().trim();
  const idObject = getIdObject(formResponse,colMap,type,name);
  
  return idObject;
}

function getType(formResponse,colMap){
  return formResponse[colMap.get("Was this a Phone or Chat Evaluation?")].startsWith("P") ? "phone" : "chat";
}

function getEvalId(formResponse,colMap,name){
  const type = getType(formResponse,colMap);
  return formResponse[colMap.get(type === "phone" ? "What is the Record Id for the Evaluation" : "What is the Chat Id for the Evaluation")] +name;
}

function getIdObject(formResponse,colMap,type,name){
  const id = getEvalId(formResponse,colMap,name);
  let idObject = (type === "phone" ? AgentEvaluationForm.getCallId : AgentEvaluationForm.getChatId)(id);
  const memoizedDeepFind = Custom_Utilities.memoize(deepFind,cache)
  return idObject ? idObject : memoizedDeepFind(type, id);
}

function addTimes(names,key){
  names.forEach(name=>addTime(key,name));
}

function addTime(key,name,dur = 30000){
  //add five minutes to appendBackend and sendApproval for this request.
  return Custom_Utilities.checkDuration(dur,()=>scriptProp.getProperty(JSON.stringify([name,key])),(value)=>scriptProp.setProperty(JSON.stringify([name,key]),value));
}

function storeApprovalFlag(keys, value,setFunc) {
  const obj = keys.reduce((acc, key) => {
    acc[JSON.stringify(key)] = value;
    return acc;
  }, {});
  Logger.log("storing = %s",obj);
  
  setFunc(obj);
}

function removeApprovalKey(task, salts, cache) {
  salts.forEach(salt => {
    const key = JSON.stringify(task) + salt;
    cache.remove(key);
  });
}

function setScriptProp(obj){
  scriptProp.setProperties(obj);
  return true;
}

function checkApprovals(key,names,checkFunc){
  const keys = names.map(name=>JSON.stringify([name,key]));
  return keys.every(key=>checkFunc(key));
}

function checkDownStream(key,names,checkFunc,setFunc){
  // if a setFunc is used return true;
  const result = false;
  names.forEach(name=>{
    if(checkFunc(JSON.stringify([name,key]))){
      setFunc([name,key]);
      result = true;
    }
  });
  return result;
}

function downStreamPredicate(rn = new Date()){
  (key)=>scriptProp.getProperty(key) === "killed" || new Date(scriptProp.getProperty(key)) >= rn
}

function deconstructApproval(task){
  storeApprovalFlag(
    [
      JSON.stringify(["approvalEmail",task[1]]),
      JSON.stringify(["appendBackend",task[1]]),
      JSON.stringify(["sendManagementEmail",task[1]]),
    ],
      "denied",
    setScriptProp
  );
  // remove own key. 
  scriptProp.deleteProperty(JSON.stringify(["checkEvalId",task[1]]));
  scriptProp.deleteProperty(JSON.stringify(["hasCoachingBackend",task[1]]));
}

function deconstructBackend(task){
  // deny all downstream fprocesses.
  storeApprovalFlag(
    [JSON.stringify(["sendManagementEmail",task[1]])],
    "denied",
    setScriptProp
  );
  scriptProp.deleteProperty(JSON.stringify(task));
}


function mkCaseArray(submitRow,colMap, evalType){
  const row = new Array(11);
  row[1] = submitRow[colMap.get("Timestamp")];
  row[5] = submitRow[colMap.get(evalType === "phone" ? "What is the Record Id for the Evaluation" : "What is the Chat Id for the Evaluation")];
  row[6] = CoachingRequestScripts.getTicketNumber(submitRow[colMap.get("Ticket Number?")],submitRow[colMap.get("Do you have a Ticket Number?")].startsWith("Y"));
  row[7] = "High"; //because they want these processed with 24hrs
  row[8] = `Evaluation Dispute : ${submitRow[colMap.get("What is your reason for disputing?")]}`; // category field
  row[10] = submitRow[colMap.get("Add any related files you'd like to share")];
  return row;
}

function formatAdditionalComments(submitRow,colMap,relAgent,evalDate){
  let additionalContext = "";
  if(!BAD_VALUES.has(submitRow[colMap.get("What is your reason for disputing?")])){
    additionalContext += submitRow[colMap.get("What is your reason for disputing?")];
  }
  if(!BAD_VALUES.has(submitRow[colMap.get("SOP or KB article?")])){
    additionalContext += ": "+submitRow[colMap.get("SOP or KB article?")];
  }
  if(relAgent){
    additionalContext += "\nReliability Agent: "+relAgent; 
  }
  if(evalDate){
    additionalContext+= "\nEvaluation Date: " + evalDate;
  }

  if(!BAD_VALUES.has(submitRow[colMap.get("Additional Comments")])){
    additionalContext += "\n\nAdditional Comments: "+submitRow[colMap.get("Additional Comments")];
  }
  return additionalContext;
}

function getHttp(team,cache){
  const getTeams = Custom_Utilities.memoize( () => CoachingRequestScripts.getTeams(REPORTING_ID),cache);
  const teams = getTeams();
  for(let i=0;i<teams.length;i++){
    if(teams[i].values[0].includes(team)){
      return teams[i].values[0][2]; // replace this with web app url
    }
  }
  throw new Error("Team is not on Operation Coaching Master Sheet");
}