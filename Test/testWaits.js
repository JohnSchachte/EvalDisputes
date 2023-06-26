function testAppendBackend(){
    const process = mkProcess("41");
    const append = process.getNode("appendBackend");
    append.setTimeout(60000)
    const result = append.run();
    Logger.log(result)
}