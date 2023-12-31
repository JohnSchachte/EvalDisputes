class ApprovalTask extends Task{
    constructor(name,process, taskKey) {
        super(name,process, taskKey);
    }

    rebootChildren(){
        const fiveMins = new Date().getTime() + 300000;
        this.children.forEach(child => {
            if(child instanceof TimeoutTask){
                child.setTimeout(fiveMins);
            }
            const stoppedStates = new Set(["stopped","killed",null]);
            if(stoppedStates.has(child.getStateSelf())){
                child.setTriggerSelf();
                child.updateStateSelf("pending");
                Logger.log("set = %s trigger",child.getName());
            }
        });
        Custom_Utilities.fireTrigger(); // fires all the triggers that were just set.
    }

    deconstruct(){
        this.process.storage.remove(this.taskKey+"state");
    }

      
    setTriggerSelf(key = this.taskKey) {
        // Specific implementation for SpecificTask
        setTrigger(key);
    }
  
    fireTriggerSelf(){
        Custom_Utilities.fireTrigger();
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
            // was approved
            
            // store state
            this.updateStateSelf("approved");

            // check approval and if children statuses need reboot.
            const isApproved = this.checkNeighborsState(this.siblings,"approved");
            Logger.log("isApproved = %s",isApproved);
            //both are approved so reboot children to make sure everything goes as planned.
            if(isApproved){
                this.updateProcess("approved") //whole task is approved. this will signal running processes to go forward.
                this.rebootChildren();
                this.deconstructNeighbors(this.siblings);
            }
        }else if(message === "skip"){
            this.deconstruct();
            this.deconstructNeighbors(this.siblings);
        }else{
            // deny all downstream processes.
            const denyProcess = this.process.children.get("sendDenied");
            denyProcess.setTriggerSelf(JSON.stringify([denyProcess.name,...message]));
            denyProcess.fireTriggerSelf();
            this.updateProcess("denied");
            this.process.deconstructTree(); // termination of process when denied.
        }
    }

    onFailure(message){
        Logger.log("OnFailure message = %s",message);
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