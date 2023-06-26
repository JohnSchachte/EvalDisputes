class ApprovalTask extends Task{
    constructor(name,process, taskKey,storage) {
        super(name,process, taskKey,storage);
    }

    rebootChildren(){
        const fiveMins = new Date().getTime() + 300000;
        for(let child of this.children){
            if(child instanceof TimeoutTask){
                child.setTimeout(fiveMins);
            }
            if(child.getStateSelf() === "stopped"){
                child.setTriggerSelf();
                child.updateState("pending");
            }
        }
        Custom_Utilities.fireTrigger(); // fires all the triggers that were just set.
    }

    deconstruct(){
        this.storage.remove(this.taskKey+"state");
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
        Logger.log(message);
        if(!message){
            // was approved
            
            // store state
            this.updateStateSelf("approved");

            // check approval and if children statuses need reboot.
            const isApproved = this.checkNeighborsState(this.siblings,"approved");
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
            const denyProcess = this.siblings.get("sendDenied");
            denyProcess.setTriggerSelf(JSON.stringify([denyProcess.name,...message]));
            Custom_Utilities.fireTrigger();
            this.updateProcess("denied");
            this.process.deconstructTree();
        }
    }

    onFailure(message){
        Logger.log(message);
        // kill all downstream processes
        this.updateNeighborsState("killed",this.children);
        const errorQueue = ss.getSheetByName("Errors");
        // apppend itself and all downstream processes
        errorQueue.appendRow(this.taskKey);
        for(let child of this.children){
            errorQueue.appendRow(child.taskKey);
        }
        Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
        const task = JSON.parse(this.taskKey);
        task.push(new Date().toLocaleString());// col 4 should be the date update column
        task.push(message);
        ss.getSheetByName("Error_Log").appendRow(task);
    }
}