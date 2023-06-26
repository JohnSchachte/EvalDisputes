

class AppendBackend extends TimeoutTask {
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]),process.storage);
    }

    checkTimeout(currentTimeout,newTimeout){
        return newTimeout > currentTimeout;
    }

    logSelf(message){
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Backend_Log").appendRow(task);
    }

    onSuccess(message){
        // case one run returns void -> do nothing and deconstruct
        // case two run returns a message of denied -> deconstruct
        // case three
        if(message == "approved"){
            // success
            this.updateProcess("appended");
            this.rebootChildren();
            this.logSelf(message);
            this.updateSelfState("success");
        }else if(message = "killed"){
            // parent errored and killed all children.
            this.updateSelfState("stopped");
        }
        // tree was deconstructed
    }

    run(){
        Logger.log(this.rootKey);
        this.updateSelfState("running");
        //do this before the check. Usually waiting 3-5 seconds anyways.
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID,`Submissions!${this.rootKey}:${this.rootKey}`).values[0];
        const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
      
        
        const memoizedGetHttp = Custom_Utilities.memoize(getHttp,cache);
        
        
        const caseArray = mkCaseArray(formResponse,colMap);
      
        const requestOptions = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            Authorization: 'Bearer ' + CoachingRequestScripts.getOAuthService().getAccessToken()
          }
        };
      
        //check has been performed for the valid wfm agent;
        // all the things we can do with agentObject
        const agentObject = EmailToWFM.getAgentObj(formResponse[colMap.get("Email Address")]);
        if(!agentObject){
            return;
        }

        const endPoint = memoizedGetHttp(agentObject["Team"],cache);
        caseArray[2] = agentObject["Employee Name"];
        caseArray[3] = agentObject["SUPERVISOR"];
        caseArray[4] = agentObject["Email Address"]; //submitter
        const name = agentObject["Employee Name"].toLowerCase().trim();
        
        // the check has been performed for the evalId.
        const evalType = getType(formResponse,colMap);
        const idObject = getIdObject(formResponse,colMap,evalType,name);
        if(!idObject){
            return;
        }

        caseArray[9] = formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
        requestOptions["payload"] = JSON.stringify(caseArray); // prepare for request
        const resultState = this.wait("approved");
        if(resultState != "approved"){
            return resultState;
        }
        const response = CoachingRequestScripts.fetchWithOAuth(endPoint,requestOptions); //parsed json.
        return response["id"]; // return id
    }
}

class SendManagementEmail extends TimeoutTask {
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]),process.storage);
    }
    
    checkTimeout(currentTimeout,newTimeout){
        return newTimeout > currentTimeout;
    }

    run(){
        this.updateSelfState("running");
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID,`Submissions!${this.rootKey}:${this.rootKey}`).values[0];
        const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
        const evalType = getType(formResponse,colMap);
        const caseArray = mkCaseArray(formResponse,colMap,evalType);

        const agentObject = EmailToWFM.getAgentObj(formResponse[colMap.get("Email Address")]);
        if(!agentObject){
            return;
        }

        const name = agentObject["Employee Name"].toLowerCase().trim();
        // the check has been performed for the evalId.
        const idObject = getIdObject(formResponse,colMap,evalType,name);
        if(!idObject){
            return;
        }

        caseArray[9] = formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
        caseArray[2] = agentObject["Employee Name"];
        caseArray[3] = agentObject["SUPERVISOR"];
        caseArray[4] = agentObject["Email Address"]; //submitter
        
        // for template vars
        const vars = {
            agentName : agentObject["Employee Name"],
            id : caseArray[5],
            ticket : caseArray[6] == "No Ticket" ?
            [caseArray[6]] :
            caseArray[6].match(/\d{7}/g).map(el => {return {"id" : el, "url" : "https://tickets.shift4.com/#/tickets/"+el}}),
            severity : caseArray[7],
            reason : caseArray[8],
            description : caseArray[9],
            file : caseArray[10] ? caseArray[10].split(", ") : null,
            agentEmail : formResponse[colMap.get("Email Address")]
        };
        
        const template = HtmlService.createTemplateFromFile("Management_Notification");
        template.vars = vars;
        
        const resultState = this.wait("appended");
        if(resultState != "appended"){
            return resultState;
        }

        sendEmail(CoachingRequestScripts.getEmails(agentObject),"Agent Evaluation Dispute: " + agentObject["Employee Name"],template);
        return true;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
    }
    
    onSuccess(message){
        if(message === true){
            this.logSelf(message);
            this.deconstruct();
            this.process.deconstructTree(); // process is done!
        }else if(message == "killed"){
            this.updateSelfState("stopped");
        }
        // tree was deconstructed
    }
}


