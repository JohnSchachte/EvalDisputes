function testAppendBackend(){
    const process = mkProcess("41");
    const append = process.getNode("appendBackend");
    const result = append.run();
}