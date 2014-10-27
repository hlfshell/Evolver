var async = require('async')
var uuid = require('node-uuid')

/*
  ***
  inputs - an array of input objects
  ***
    {
        fnc: function(identifier, cb)
        name: 'Human readable name'
    }
  ***
  functionSet - an array of functionSet objects
  ***
    {
      fnc: function(params, cb) Params is an array of incoming parameters
      name: 'Human readable name'
      minParamaters: 1 //default
      maxParameters: //null default, meaning no max
    }
  ***
  terminalSet - an array of terminalSet objects
  ***
    {
      fnc: function(identifier, cb) Must return a constant value (number)
      name: ex: 'Range 0-1', 'Pi' Human readable name of the terminal set
    }
  ***

*/

module.exports = function(){

  var FunctionalNode = function(fnc, name, terminal, minParams, maxParams){
    this.name = name
    this.fnc = fnc
    this.terminal = this.terminal  || false
    this.minParams = this.minParams || 1
    //maxParams can technically be undefined for unlimited, SO
    //we need to see if nothing was passed there.
    this.maxParams = this.maxParams === undefined ? 1 : this.maxParams

    this.params = []

    this.id = uuid.v4()

    return this
  }

  FunctionalNode.prototype.execute = function(cb){
    var self = this

    if(self.terminal){
      return self.fnc(params, cb)
    } else {
      var calculatedParams = []

      //Calculate all params to their end in order to determine the
      //values our function actually needs to calculate
      //This is series in case order matters for our function
      async.eachSeries(self.params, function(param, done){
        param.execute(function(result){
          calculatedParams.push(result)
          done(null)
        })
      }, function(err){
        self.fnc(calculatedParams, cb)
      })
    }
  }

  FunctionalNode.prototype.addParam = function(newParam){
    this.params.push(newParam)
  }

  /*

  */

  /*
    Get the depth of this function, where depth is defined as
    the deepest route until a terminal set. The depth is inclusive
    of itself

    If terminal set, function returns 1
  */
  FunctionalNode.prototype.getDepth = function(cb){
    var self = this

    if(self.terminal){
      cb(1)
    } else {
      //Get the depth of each param
      var depth = 0
      async.each(self.params, function(param, done){
        param.getDepth(function(paramDepth){
          depth = paramDepth > depth ? paramDepth : depth
        })
      }, function(err){
        cb(depth + 1)
      })
    }
  }

  //Goes to the id passed, returns the FunctionalNode from that point on
  //using clone
  FunctionalNode.prototype.getChildById = function(id){
    var self = this

    //Am I the node of the ID in question?
    if(self.id == id){
      return self.clone()
    } else { // For each parameter, ask them if they are (or have) the node
      var foundNode
      self.params.forEach(function(param){
        var node = param.getChildById(id)

        if(node){
          foundNode = node
        }
      })

      //If foundNode is set, we found it - return it higher up
      //If it's null, it must be on another branch. Return null up
      return foundNode
    }
  }

  //You should never need to check, as it confuses things
  //Check children. If a child matches, set it
  //Otherwise, call on all children.
  //Return true if the set happened.
  FunctionalNode.prototype.setChildById = function(node, id){
    var self = this

    //Check the children BEFORE doing the recursive calls for speed
    var result = false
    self.params.forEach(function(param, index){
      if(param.id == id){
        self.params[index] = node
      }
    })

    if(result){
      return result
    }

    //Every non terminal type child, call this function
    self.params.forEach(function(param){
      if(!param.terminal){
        result = result || param.setChildById(node, id)
      }
    })

    return result
  }

  /*
    To prevent issues with functional nodes eventually gaining the same functional
    node sequence twice, this function will reset all of the node uuids
  */
  FunctionalNode.prototype.resetIds = function(){
    var self = this

    self.id = uuid.v4()

    self.params.forEach(function(param){
      param.resetIds()
    })
  }

  //Get all the terminal node ids for crossover/mutation work
  FunctionalNode.prototype.getTerminalNodeIds = function(){
    if(this.terminal){
      return [this.id]
    } else {
      var paramIds = []
      this.params.forEach(function(param){
        paramIds = paramIds.concat(param.getTerminalNodeIds())
      })

      return paramIds
    }
  }

  //Get all the terminal node ids for crossover/mutation work
  FunctionalNode.prototype.getFunctionalNodeIds = function(){
    var ids = [this.id]

    //We only call on the functional nodes to prevent terminal nodes
    //from getting into the list
    this.params.forEach(function(param){
      if(!param.terminal){
        ids = ids.concat(param.getFunctionalNodeIds())
      }
    })

    return ids
  }

  /*
    Create a clone of the functional nodes and all its children preserved
    Note that the clone has a new id
  */
  FunctionalNode.prototype.clone = function(){
    var self = this

    var clone = new FunctionalNode(this.fnc, this.name, this.terminal, this.minParams, this.maxParams)

    //Now call each param, clone that, and push it to the params in order
    self.params.forEach(function(param){
        clone.params.push(param.clone())
    })

    return clone
  }

  FunctionalNode.prototype.toString = function(){
    if(self.terminal){
      return self.name
    } else {
      var result = self.name + ' ( '
      self.params.forEach(function(param, index){
        if(index != 0){
          result += ', '
        }
        result += param.toString()
      })

      result += ' ) '

      return result
    }
  }

  return FunctionalNode

}
