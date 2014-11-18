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
    name = name.toString()
    this.name = name.replace(' ','').replace(',','').replace('(','').replace(')','')
    this.fnc = fnc
    this.terminal = terminal  || false
    this.minParams = minParams || 1
    //maxParams can technically be undefined for unlimited, SO
    //we need to see if nothing was passed there.
    this.maxParams = maxParams === undefined ? this.minParams : maxParams

    this.params = []

    this.id = uuid.v4()

    this._next = setImmediate

    return this
  }

  FunctionalNode.prototype.execute = function(params, cb){
    var self = this

    if(self.terminal){
      return self.fnc(params, cb)
    } else {
      var calculatedParams = []

      //Calculate all params to their end in order to determine the
      //values our function actually needs to calculate
      //This is series in case order matters for our function
      async.eachSeries(self.params, function(param, done){
        self._next(param.execute(params, function(result){
          calculatedParams.push(result)
          self._next(done(null))
        }))
      }, function(err){
        self._next(self.fnc(calculatedParams, cb))
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
  FunctionalNode.prototype.getChildById = function(id, cb){
    var self = this

    //Am I the node of the ID in question?
    if(self.id == id){
      self.clone(function(newClone){
        cb(newClone, self.id)
      })
    } else { // For each parameter, ask them if they are (or have) the node

      var paramCount = 0,
        foundNode,
        originalId

      async.whilst(function(){
        return (paramCount < self.params.length) && !foundNode
      }, function(done){
        self._next(function(){
          self.params[paramCount].getChildById(id, function(child, id){
            if(child){
              foundNode = child
              originalId = id
            }
            paramCount++
            done(null)
          })
        })
      }, function(err){
        cb(foundNode, originalId)
      })
      //
      // var foundNode
      // self.params.forEach(function(param){
      //   var node = param.getChildById(id)
      //
      //   if(node){
      //     foundNode = node
      //   }
      // })
      //
      // //If foundNode is set, we found it - return it higher up
      // //If it's null, it must be on another branch. Return null up
      // return foundNode
    }
  }

  FunctionalNode.prototype.getParentByChildId = function(id, cb){
    var self = this

    //Check all of the current param/children.
    var found
    self.params.forEach(function(param){
      if(param.id == id){
        self._next(function(){
          cb(self)
        })
        found = true
      }
    })

    //Did we find it back there? If not, continue. Otherwise, stop
    if(found){
      return
    }

    var paramCount = 0
    async.whilst(function(){
      return paramCount < self.params.length && !found
    }, function(done){
      if(!self.params[paramCount].terminal){
        self._next(function(){
          self.params[paramCount].getParentByChildId(id, function(parent){
            if(parent){
              found = parent
            }
            paramCount++
            self._next(done)
          })
        })
      } else {
        paramCount++
        self._next(done)
      }
    }, function(err){
      //If we have not found and reported back yet, kill the whole shebang and
      //return null up the chain
      if(!found){
        self._next(cb)
      } else {
        self._next(function(){
          cb(found, self.id)
        })
      }
    })

  }

  //You should never need to check, as it confuses things
  //Check children. If a child matches, set it
  //Otherwise, call on all children.
  //Return true if the set happened.
  FunctionalNode.prototype.setChildById = function(node, id, cb){
    var self = this

    //Check the children BEFORE doing the recursive calls for speed
    var result = false,
      index = 0

    async.whilst(function(){
      return index < self.params.length && !result
    }, function(done){
      if(self.params[index].id == id){
        self.params[index] = node
        result = true
      } else {
        index++
      }

      done(null)
    }, function(err){
      if(result){
        return cb(result)
      }

      //Every non terminal type child, call this function
      index = 0
      async.whilst(function(){
        return index < self.params.length && !result
      }, function(done){
        if(!self.params[index].terminal){
          self._next(function(){
            self.params[index].setChildById(node, id, function(paramResult){
              index++
              result = result || paramResult
              done(null)
            })
          })
        } else {
          index++
          done(null)
        }
      }, function(err){
        cb(result)
      })

    })
  }

  /*
    To prevent issues with functional nodes eventually gaining the same functional
    node sequence twice, this function will reset all of the node uuids
  */
  FunctionalNode.prototype.resetIds = function(cb){
    var self = this

    self.id = uuid.v4()

    if(self.params.length > 0){
      async.eachSeries(self.params, function(param, done){
        self._next(function(){
          param.resetIds(function(){
            done(null)
          })
        })
      }, function(err){
        cb()
      })
      // self.params.forEach(function(param){
      //   param.resetIds()
      // })
    } else {
      cb()
    }
  }

  //Get all the terminal node ids for crossover/mutation work
  FunctionalNode.prototype.getTerminalNodeIds = function(cb){
    var self = this
    if(self.terminal){
      cb([self.id])
    } else {
      var paramIds = []
      async.eachSeries(self.params, function(param, done){
        param.getTerminalNodeIds(function(terminalNodeIds){
          paramIds = paramIds.concat(terminalNodeIds)
          done(null)
        })
      }, function(err){
        cb(paramIds)
      })
    }
  }

  //Get all the terminal node ids for crossover/mutation work
  FunctionalNode.prototype.getFunctionalNodeIds = function(cb){
    var self = this
    var ids = [this.id]

    //We only call on the functional nodes to prevent terminal nodes
    //from getting into the list
    async.each(self.params, function(param, done){
      if(!param.terminal){
        param.getFunctionalNodeIds(function(functionalNodeIds){
          ids = ids.concat(functionalNodeIds)
          done(null)
        })
      } else {
        done(null)
      }
    }, function(err){
      cb(ids)
    })
  }

  /*
    Create a clone of the functional nodes and all its children preserved
    Note that the clone has a new id
  */
  FunctionalNode.prototype.clone = function(cb){
    var self = this

    var clone = new FunctionalNode(self.fnc, self.name, self.terminal, self.minParams, self.maxParams)

    //Now call each param, clone that, and push it to the params in order
    // self.params.forEach(function(param){
    //     clone.params.push(param.clone())
    // })
    async.eachSeries(self.params, function(param, done){
      param.clone(function(clonedParam){
        clone.addParam(clonedParam)
        self._next(done)
      })
    }, function(err){
      cb(clone)
    })
  }

  FunctionalNode.prototype.toString = function(){
    var self = this
    if(self.terminal){
      return self.name
    } else {
      var result =  '( ' + self.name + ' '
      self.params.forEach(function(param, index){
        if(index != 0){
          result += ' '
        }
        result += param.toString()
      })

      result += ' )'

      return result
    }
  }
//( + y ( + x ( + ( - y y y ) x x ) ) ( + ( - ( - x x ) x ) ( - y x ) x ) ( + y x ) )
  FunctionalNode.fromString = function(source, nodeSet, cb){
    var self = this
    source = source.split(' ')

    var getNodeByName = function(name){
      var counter = 0,
        found
      do {
        found = nodeSet[counter].name == name
      } while(!found && ++counter < nodeSet.length)

      return found ? nodeSet[counter] : null
    }

    var parse = function(input, cb){
      var token = input.shift()
      if(token == '('){
        token = input.shift()
        getNodeByName(token).clone(function(functionalNode){
          var nextItem = input[0]

          async.doWhilst(function(done){
            if(nextItem == '('){
              parse(input, function(newNode){
                newNode.clone(function(newNode){
                  functionalNode.params.push(newNode)
                  setImmediate(done)
                })
              })
            } else {
              token = input.shift()
              getNodeByName(token).clone(function(newNode){
                functionalNode.params.push(newNode)
                setImmediate(done)
              })
            }
          }, function(){
            nextItem = input[0]
            return input[0] != ')'
          }, function(err){
            input.shift()
            setImmediate(function(){
              cb(functionalNode)
            })
          })
        })

      } else {
        getNodeByName(token).clone(function(newNode){
          setImmediate(function(){
            cb(newNode)
          })
        })
      }
    }

    parse(source, function(resultingNode){
      setImmediate(function(){
        cb(resultingNode)
      })
    })

    // var parse = function(input, baseNode){
    //   var token = input.shift()
    //
    //   if(token == '('){
    //     return parse(input)
    //   } else if(!baseNode){
    //     baseNode = getNodeByName(token)
    //
    //   } else {
    //     var newNode = getNodeByName(token)
    //     baseNode.params.push()
    //   }
    //
    // }

    // var parenthesize = function(input, list){
    //   list = list ? list : []
    //   var token = input.shift()
    //   if(token == '('){
    //     return parenthesize(input)
    //   } else if(token == ')'){
    //     return list
    //   } else {
    //     var newNode = getNodeByName(token)
    //     newNode.params = parenthesize(input)
    //     return newNode
    //   }
    // }

    // return parenthesize(source)

  }

  return FunctionalNode

}
