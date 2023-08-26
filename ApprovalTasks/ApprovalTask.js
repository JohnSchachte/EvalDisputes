class ApprovalTask extends CommonTask{
    constructor(name,process, taskKey) {
        super(name,process, taskKey);
    }

    deconstruct(){
        this.process.storage.remove(this.taskKey+"state");
    }

    logSelf(message){
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(!message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Approval_Log").appendRow(task);
    }

    // ... implement other methods ...
    onSuccess(message) {
        if(!message){
            this.logSelf(message);
            // move to approved state
            this.updateStateSelf("success");
            const isApproved = this.checkNeighborsState(this.siblings,"success");
            if(isApproved){
                this.updateProcess("approved");
                this.rebootChildren();
            }
        }else if(message === "skipped"){
            this.deconstruct();
            this.deconstructNeighbors(this.siblings);
        }else if(Array.isArray(message)){
            // deny all downstream processes. not time sensitive.
            this.updateProcess("denied");
            
            // start up the sendDenied process
            const denyProcess = this.process.children.get("sendDenied");
            denyProcess.setTriggerSelf(JSON.stringify([denyProcess.name,...message]));
            denyProcess.fireTriggerSelf();
            // destroy tree except for process state. Garbage collection will take care of the rest.
            this.process.deconstructTree(); // termination of process when denied.
        }
        Logger.log("onSuccess message %s",message);
    }
    
    onFailure(message){
        this.updateStateSelf("error"); // tell other processes that there was a failure. process state remains running.
        // kill all downstream processes
        this.updateNeighborsState(this.children,"killed");
        const errorQueue = this.ss.getSheetByName("Errors");
        // apppend itself and all downstream processes
        const task = JSON.parse(this.taskKey);
        errorQueue.appendRow(task);
        Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
        task.push(new Date().toLocaleString());// col 4 should be the date update column
        task.push(message);
        this.ss.getSheetByName("Error_Log").appendRow(task);
        Logger.log("OnFailure message = %s",message);
    }

    checkFormResponse(formResponse,colMap){
      Logger.log("checking form response: %s",(formResponse[colMap.get("What is the Id for the Evaluation")] || formResponse[colMap.get("What is the Chat Id for the Evaluation")]) && formResponse[colMap.get("Do you have a Ticket Number?")])
      return (formResponse[colMap.get("What is the Id for the Evaluation")] || formResponse[colMap.get("What is the Chat Id for the Evaluation")]) && formResponse[colMap.get("Do you have a Ticket Number?")] 
    }
}