var uuid = require('node-uuid')


module.exports = function(){

  var Organism = function(){
    this.fnc //of type FunctionalNode

    this.fitness = 0
    this.id = uuid.v4()

    this._next = setImmediate

    return this
  }

  //Get all the terminal node ids for crossover/mutation work
  Organism.prototype.getTerminalNodeIds = function(cb){
    this.fnc.getTerminalNodeIds(cb)
  }

  //Get all the terminal node ids for crossover/mutation work
  Organism.prototype.getFunctionalNodeIds = function(cb){
    this.fnc.getFunctionalNodeIds(cb)
  }

  Organism.prototype.resetIds = function(cb){
    this.id = uuid.v4()
    this.fnc.resetIds(cb)
  }

  Organism.prototype.getChildById = function(id, cb){
    this.fnc.getChildById(id, cb)
  }

  Organism.prototype.setChildById = function(node, id, cb){
    this.fnc.setChildById(node, id, cb)
  }

  Organism.prototype.getParentByChildId = function(id, cb){
    if(this.fnc.id == id){
      cb(null)
    } else {
      this.fnc.getParentByChildId(id, cb)
    }
  }

  //Execute the function after all parameters have been executed
  Organism.prototype.execute = function(params, cb){
    this.fnc.execute(params, cb)
  }

  Organism.prototype.clone = function(cb){
    var self = this,
      clone = new Organism()

    clone.fitness = this.fitness
    self.fnc.clone(function(clonedFunctionalNode){
        clone.fnc = clonedFunctionalNode

        self._next(function(){
          clone.resetIds(function(){
            self._next(function(){
              clone.resetIds(function(){
              cb(clone)
              })
            })
          })
        })
    })
  }

  Organism.prototype.toJSON = function(){
    var self = this
    return {
      id: self.id,
      fitness: self.id,
      fnc: self.fnc.toString()
    }
  }

  Organism.prototype.toString = function(){
    return this.fnc.toString()
  }

  //+ ( - ( - ( y, y, - ( x, x, y )  ) , + ( * ( - ( y, x ) , y ) , + ( y, y, x ) , x ) , x ) , y )
  // Organism.buildFromString = function(functionalSet, terminalSet, cb){
  //   var self = this
  //
  //   var organism = new self()
  //
  //   var grabNodeByName = function(name){
  //     var counter = 0,
  //       found
  //     do {
  //       found = functionalSet[counter].name == name
  //     } while(!found || counter++ < functionalSet.length)
  //
  //     found ? return functionalSet[counter - 1] : null
  //     counter = 0
  //
  //     do {
  //       found = terminalSet[counter].name == name
  //     } while(!found || counter++ < terminalSet.length)
  //
  //     found ? return terminalSet[counter - 1] : return null
  //   }
  //
  //
  //
  // }

  return Organism

}
