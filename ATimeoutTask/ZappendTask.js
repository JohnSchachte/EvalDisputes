class AppendBackend extends TimeoutTask {
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    checkTimeout(currentTimeout,newTimeout){
        const rn = new Date().getTime();
        const proposed = rn + newTimeout;
        if(!currentTimeout || proposed > currentTimeout) return proposed.toString(); // there isn't one then return proposed
        return false;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Backend_Log").appendRow(task);
        
        this.ss.getSheetByName("Submissions").getRange("L"+this.process.rootKey).setValue(message)
        Logger.log("logging submissions sheet")
    }

    
    run(){
        
        Logger.log(this.process.rootKey);
        if(!this.shouldRun())return; //denied,successful, or running
        // if true then the state has been set to running
        const [formResponse,colMap] = this.getFormResponseAndMap(); // gets the form response row and the column map of headers
        
        const memoizedGetHttp = Custom_Utilities.memoize(this.getHttp,cache);
        
        
        const caseArray = this.mkCaseArray(formResponse,colMap,getType(formResponse,colMap));
        
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

        caseArray[9] = this.formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
        requestOptions["payload"] = JSON.stringify(caseArray); // prepare for request
        const result = this.wait(this.checkCondition.bind(this));
        
        // Logger.log("resultState = %s in %s",result,this.getName());
        if(result === "approved"){
            //appending to backend
            const response = CoachingRequestScripts.fetchWithOAuth(endPoint,requestOptions); //parsed json.
            return response["id"]; // approved
        }
        return result; // return denied or stopped
    }

    onSuccess(message){
        
        if(message && (message !== "denied" || message !== "stopped" || message !== "decon")){
            // Logger.log("appendBackend is successful. should change process state to appended and self to success");
            // success
            this.rebootChildren();
            this.updateStateSelf("success");
            this.updateProcess("appended");
            this.logSelf(message);
        }else if(message === "stopped"){
            // parent errored and killed all children.
            this.updateStateSelf("stopped");
        }else if(message === "decon"){
            this.deconstruct();
            // tree was deconstructed
        }
        Logger.log("message = %s in subprocess = %s",message,this.getName());
    }
}