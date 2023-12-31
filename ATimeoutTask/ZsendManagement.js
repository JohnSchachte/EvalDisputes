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
        throw new Error("testing onError repeatedly");
        const startState = this.getStateSelf();
        if(startState === "running") return null;//do nothing because it's already run or is running.
        this.updateStateSelf("running");
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID_TEST,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0];
        const colMap = mkColMap(reader(BACKEND_ID_TEST,"Submissions!1:1").values[0]);
        const evalType = getType(formResponse,colMap);
        const caseArray = mkCaseArray(formResponse,colMap,evalType);

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

        caseArray[9] = formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
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
        
        const resultState = this.wait("appended",()=>{
            const parentStatus = this.process.getNode("appendBackend").getStateSelf();
            parentStatus !== "success"
        });
        Logger.log("resultState = %s in %s",resultState,this.getName());

        if(resultState != "appended"){
            return resultState;
        }
        sendEmail("jschachte@shift4.com","Agent Evaluation Dispute: " + agentObject["Employee Name"],template);
        // sendEmail(CoachingRequestScripts.getEmails(agentObject),"Agent Evaluation Dispute: " + agentObject["Employee Name"],template);
        return true;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
    }
    
    onSuccess(message){
        Logger.log("message = %s in subprocess = %s",message,this.getName());
        if(message === true){
            this.logSelf(message);
            this.deconstruct();
            this.process.deconstructTree(); // process is done!
        }else if(message == "stopped"){
            this.updateStateSelf("stopped");
        }
        // tree was deconstructed
    }
}


