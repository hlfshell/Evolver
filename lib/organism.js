
module.exports = function(){

  var organism = function(){
    this.fnc = function(params, cb){
      cb(0)
    }

    this.fitnessScore = 0

    return this
  }

  //Get all the terminal node ids for crossover/mutation work
  organism.prototype.getTerminalNodeIds = function(){
    return this.fnc.getTerminalNodeIds()
  }

  //Get all the terminal node ids for crossover/mutation work
  organism.prototype.getFunctionalNodeIds = function(){
    return this.fnc.getFunctionalNodeIds()
  }

  organism.prototype.resetIds = function(){
    return this.fnc.resetIds()
  }

  organism.prototype.getChildById = function(id){
    return this.fnc.getChildById(id)
  }

  organism.prototype.setChildById = function(node, id){
    return this.fnc.setChildById(node, id)
  }

  //Execute the function after all parameters have been executed
  organism.prototype.execute = function(params, cb){
    this.fnc(params, cb)
  }

  return organism

}
