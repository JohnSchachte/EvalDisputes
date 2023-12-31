class SendApproval extends TimeoutTask {
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    
    checkTimeout(currentTimeout,newTimeout){
        const rn = new Date().getTime();
        const proposed = rn + newTimeout;
        if(!currentTimeout || proposed > currentTimeout) return proposed.toString(); // there isn't one then return proposed
        return false;
    }

    run(){
        const startState = this.getStateSelf();
        if( startState === "success" || startState === "running") return null;//do nothing because it's already run or is running.
        this.updateStateSelf("running");
        const reader = Custom_Utilities.getMemoizedReads(cache);
        // const formResponse = reader(BACKEND_ID,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0]; 
        // const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
        const template = HtmlService.createTemplateFromFile("html/Approved");
        const resultState = this.wait("approved",()=>{
            return state !== "success";
        });
        Logger.log("resultState = %s in %s",resultState,this.getName());
        if(resultState != "approved"){
            return resultState;
        }
        sendEmail("jschachte@shift4.com","Evaluation Dispute Approved",template);
        // sendEmail(formResponse[colMap.get("Email Address")],"Evaluation Dispute Sdent to Supervisor",template);
        return true;
    }

    logSelf(message){
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
    }

    onSuccess(message){
        Logger.log("message = %s in subprocess = %s",message,this.getName());
        if(message === true){
            this.logSelf(message);
            this.updateStateSelf("success")
        }else if(message === null){
            return;
        }else{
            Logger.log("SendApproval did not send");
            this.updateStateSelf("stopped");
        }
        // this.updateStateSelf("success");
    }
}

class SendDenied extends Task{
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    setTriggerSelf(key = this.taskKey) {
        // Specific implementation for SpecificTask
        setTrigger(key);
    }
  
    fireTriggerSelf(){
        Custom_Utilities.fireTrigger();
    }

    run(email,reason){
        this.updateStateSelf("running");
        const template = HtmlService.createTemplateFromFile("html/DeniedEmail");
        template.denialReason = reason;
        sendEmail("jschachte@shift4.com","Evaluation Dispute Denied",template);
        // sendEmail(email,"Evaluation Dispute Denied",template);
        return true;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
        this.ss.getSheetByName("Denied_Log").appendRow(task);
    }
    
    onSuccess(message){
        this.logSelf(message);
        this.process.deconstructTree();
    }
    deconstruct(){
      this.process.storage.remove(this.taskKey+"state");
    }
}