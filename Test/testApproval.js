// need to test if a member is apart of coaching and if member is not. 
function testCheckEval(){
    const process = mkProcess("41");
    const checkEvalId = process.getNode("checkEvalId");
    const result = checkEvalId.run();
    if(!Array.isArray(result)) throw new Error("not correct result");
    if(result[0] != "jschachte@shift4.com") throw new Error("not correct result");
    Logger.log(result[1]);
}