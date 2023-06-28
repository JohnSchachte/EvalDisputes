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
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Backend_Log").appendRow(task);
    }

    onSuccess(message){
        Logger.log("message = %s in subprocess = %s",message,this.getName());
        if(message && (message !== "denied" || message !== "stopped")){
            Logger.log("appendBackend is successful. should change process state to appended and self to success");
            // success
            this.updateProcess("appended");
            this.rebootChildren();
            this.logSelf(message);
            this.updateStateSelf("success");
        }else if(message === "stopped"){
            // parent errored and killed all children.
            this.updateStateSelf("stopped");
        }//denied is handled by the parent
        // tree was deconstructed
    }

    run(){
        Logger.log(this.process.rootKey);
        const startState = this.getStateSelf();
        if( startState === "successful" || startState === "running") return;//do nothing because it's already run or is running.
        this.updateStateSelf("running");
        //do this before the check. Usually waiting 3-5 seconds anyways.
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID_TEST,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0];
        const colMap = mkColMap(reader(BACKEND_ID_TEST,"Submissions!1:1").values[0]);
      
        
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
        Logger.log("resultState = %s in %s",resultState,this.getName());
        if(resultState != "approved"){
            return resultState;
        }
        const response = CoachingRequestScripts.fetchWithOAuth(endPoint,requestOptions); //parsed json.
        return response["id"]; // return id
    }
}