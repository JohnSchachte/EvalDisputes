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
        if(!this.shouldRun())return; //denied,successful, or running
        // if true then the state has been set to running
        const [formResponse,colMap] = this.getFormResponseAndMap(); // gets the form response row and the column map of headers
        const template = HtmlService.createTemplateFromFile("html/Approved");
        //wait for parents or other events described in timeout task
        const result = this.wait(this.checkCondition.bind(this));

        Logger.log("resultState = %s in %s",result,this.getName());
        if(result === "approved"){
            //parents have approved
            sendEmail("jschachte@shift4.com","Evaluation Dispute Approved",template);
            // sendEmail(formResponse[colMap.get("Email Address")],"Evaluation Dispute Sdent to Supervisor",template);
        }
        return result; // approved, denied, or stopped
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
        if(message === "approved"){
            this.logSelf(message);
            this.updateStateSelf("success")
        }else if(message === "stopped"){
            Logger.log("SendApproval did not send");
            this.updateStateSelf("stopped");
        }
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
        if(!this.shouldRun())return; //denied,successful, or running
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