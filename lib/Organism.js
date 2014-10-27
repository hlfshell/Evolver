var uuid = require('node-uuid')


module.exports = function(){

  var Organism = function(){
    this.fnc //of type FunctionalNode

    this.fitness = 0
    this.id = uuid.v4()

    return this
  }

  //Get all the terminal node ids for crossover/mutation work
  Organism.prototype.getTerminalNodeIds = function(){
    return this.fnc.getTerminalNodeIds()
  }

  //Get all the terminal node ids for crossover/mutation work
  Organism.prototype.getFunctionalNodeIds = function(){
    return this.fnc.getFunctionalNodeIds()
  }

  Organism.prototype.resetIds = function(){
    this.id = uuid.v4()
    return this.fnc.resetIds()
  }

  Organism.prototype.getChildById = function(id){
    return this.fnc.getChildById(id)
  }

  Organism.prototype.setChildById = function(node, id){
    return this.fnc.setChildById(node, id)
  }

  //Execute the function after all parameters have been executed
  Organism.prototype.execute = function(params, cb){
    this.fnc(params, cb)
  }

  Organism.prototype.clone = function(){
    var clone = new Organism()

    clone.fnc = this.fnc.clone()
    clone.resetIds()
    clone.fitness = this.fitness

    return clone
  }

  Organism.prototype.toJSON = function(){
    var self = this
    return {
      id: self.id,
      fitness: self.id,
      fnc: self.fnc.toString()
    }
  }

  return Organism

}
