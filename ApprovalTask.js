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
