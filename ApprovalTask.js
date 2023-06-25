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
        this.storage.remove(this.taskKey);
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
            // deny all downstream processes.
            this.deconstruct();
            this.deconstructNeighbors(this.siblings);
        }else{
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

class HasCoachingBackend extends ApprovalTask {
    constructor(name,process,storage) {
        super(name,process,JSON.stringify([name,process.rootKey]),storage);
    }

    run(){
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0]; 
        const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
        const email = formResponse[colMap.get("Email Address")];
        const hasBackend = OperationCoachingMembers.isInEmailSet(formResponse[colMap.get("Email Address")].toLowerCase());
        return hasBackend ? false : [email,`Your WFM team ${EmailToWFM.getAgentObj["Team"]} does not map to a backend to store the data. Please, reach out to your supervisor`];
    }
}

class CheckEvalId extends ApprovalTask {
    constructor(name,process,storage) {
        super(name,process,JSON.stringify([name,process.rootKey]),storage);
    }

    run(){
        const readFromCache = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = readFromCache(BACKEND_ID,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0]; 
        const colMap = mkColMap(readFromCache(BACKEND_ID,"Submissions!1:1").values[0]);
        const email = formResponse[colMap.get("Email Address")];
        const agentObj = EmailToWFM.getAgentObj(email);
        if(!agentObj){
            Logger.log("skipped")
            return "skip";
        }
        const isValid = validate(formResponse, colMap, agentObj);
        return isValid ?
            false : 
            [
            email,
            `The Eval Id (${formResponse[colMap.get(getType(formResponse,colMap) === "phone" ? "What is the Record Id for the Evaluation" : "What is the Chat Id for the Evaluation")]}) you submitted does not appear in our records or does not appear to be an evaluation about you.\n`
            ];
        }
}
