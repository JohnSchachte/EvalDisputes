function Storage() {
    this.storage = scriptProp;
  }
  
  Storage.prototype.get = function(key) {
    return this.storage.getProperty(key);
  }
  
  Storage.prototype.set = function(key, value) {
    this.storage.setProperty(key,value);
  }
  
  Storage.prototype.remove = function(key) {
    this.storage.deleteProperty(key);
  }