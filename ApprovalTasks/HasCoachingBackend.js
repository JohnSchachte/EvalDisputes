class HasCoachingBackend extends ApprovalTask {
    constructor(name,process) {
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    run(){
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID_TEST,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0]; 
        const colMap = mkColMap(reader(BACKEND_ID_TEST,"Submissions!1:1").values[0]);
        const email = formResponse[colMap.get("Email Address")];
        const hasBackend = OperationCoachingMembers.isInEmailSet(formResponse[colMap.get("Email Address")].toLowerCase());
        return hasBackend ? false : [email,`Your WFM team ${(EmailToWFM.getAgentObj["Team"] || "No Teamd")} does not map to a backend to store the data. Please, reach out to your supervisor`];
    }
}