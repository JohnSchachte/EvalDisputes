class SendManagementEmail extends TimeoutTask {
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
        
        const evalType = getType(formResponse,colMap);
        const caseArray = this.mkCaseArray(formResponse,colMap,evalType);

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

        caseArray[9] = this.formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
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
        
        const template = HtmlService.createTemplateFromFile("html/Management_Notification");
        template.vars = vars;
        
        const result = this.wait(this.checkCondition.bind(this));
        // Logger.log("resultState = %s in %s",result,this.getName());

        if(result === "approved"){
            // sendEmail("jschachte@shift4.com","Agent Evaluation Dispute: " + agentObject["Employee Name"],template);
            sendEmail(CoachingRequestScripts.getEmails(agentObject),"Agent Evaluation Dispute: " + agentObject["Employee Name"],template);
        }
        return result;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
    }
    
    onSuccess(message){
        if(message === "approved"){
            this.updateProcess("success");
            this.logSelf(message);
            // garbage collection will clean up the storage.
            this.process.deconstructTree();
        }else if(message == "stopped"){
            this.updateStateSelf("stopped"); // signalling a reboot from parent
        }else if(message === "decon"){
            this.deconstruct();
            // tree was deconstructed
        }
        Logger.log("message = %s in subprocess = %s",message,this.getName());
    }

    checkCondition() {
        const neighborsState = this.getNeighborsState(this.parents);
        const processState = this.process.getState();

        //check conditions. these could get coupled together but this would make troubleshooting harder.
        const checkProcessState = this.process.endStates.has(this.process.getState()) ; // process has been denied or succeeded so we should stop.
        const allNull = neighborsState.every(state => state === null) && processState  === null; //statiscally garbage collected.
        const allApproved = neighborsState.every(state => state === "success") || processState === "appended"; // all parents have succeeded
        const anyError = neighborsState.some(state => state === "error"); // parent has errored and needs to reboot children.
        const selfSuccess = this.getStateSelf() === "success"; // this task has already succeeded
        const timeoutExceeded = new Date().getTime() >= this.getTimeout(); // timeout has exceeded
        
        
        if(checkProcessState) return { condition: null, continue: false }; // process has been denied or succeeded so we should stop.
        
        if (allNull) return { condition: null, continue: false }; //statiscally garbage collected.

        if (allApproved) return { condition: 'approved', continue: false }; // all parents have succeeded
        
        if (anyError) return { condition: 'stopped', continue: false }; // parent has errored and needs to reboot children.
        
        if (selfSuccess) return { condition: null, continue: false }; // this task has already succeeded
        
        if (timeoutExceeded) return { condition: 'stopped', continue: false }; // timeout has exceeded
        
        return { condition: null, continue: true };
      }
}


