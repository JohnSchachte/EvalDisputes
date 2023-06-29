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
        ss.getSheetByName("Approval_Log").appendRow(task);
    }

    // ... implement other methods ...
    onSuccess(message) {
        Logger.log("onSuccess message %s",message);
        if(!message){
            this.logSelf(message);
            // move to approved state
            this.updateStateSelf("success");
            this.rebootChildren();
        }else if(message === "skip"){
            this.deconstruct();
            this.deconstructNeighbors(this.siblings);
        }else{
            // deny all downstream processes. not time sensitive.
            const denyProcess = this.process.children.get("sendDenied");
            denyProcess.setTriggerSelf(JSON.stringify([denyProcess.name,...message]));
            denyProcess.fireTriggerSelf();
            this.process.deconstructTree(); // termination of process when denied.
        }
    }

    onFailure(message){
        Logger.log("OnFailure message = %s",message);
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
    }
}