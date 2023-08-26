class HasCoachingBackend extends ApprovalTask {
    constructor(name,process) {
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    run(){
        // Logger.log(this.process.rootKey);
        if(!this.shouldRun())return; //denied,successful, or running
        // if true then the state has been set to running
        const [formResponse,colMap] = this.getFormResponseAndMap(); // gets the form response row and the column map of headers
            
        const email = formResponse[colMap.get("Email Address")];

        const checkFormResponse = this.checkFormResponse(formResponse,colMap,agentObj,email);
        if(!checkFormResponse) return [email, "The form response is not valid. This could be an issue with Google please resubmit the form."];
        
        const hasBackend = OperationCoachingMembers.isInEmailSet(formResponse[colMap.get("Email Address")].toLowerCase());
        return hasBackend ? false : [email,`Your WFM team ${(EmailToWFM.getAgentObj["Team"] || "No Teamd")} does not map to a backend to store the data. Please, reach out to your supervisor`];
    }
}