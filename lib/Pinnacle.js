var async = require('async')
var Organism = require('./Organism')()
var FunctionalNode = require('./FunctionalNode')()

//This is a library designed to allow easy programming of an asynchronous genetic algorithm in node.

module.exports = function(){

  var pinnacle = function(){
    //Attributes
    this.inputs = []
    this.functionalSet = []
    this.terminalSet = []
    this.population = []

    //Training set being an object of ids of which we know the results
    //By default, [] to be an [ of identifiers ]
    //Could also be an asynchronous function function(cb) where cb is
    //function([ of identifiers ])
    this.trainingSet = []

    //simultaneousFitnessTests = how many trees we test at once
    this.simultaneousFitnessTests = 10
    //simultaneousFitnessCalculations = how many executions of input/test can be executed at once
    this.simultaneousFitnessCalculations = 10

    //Should we preserve the fittest?
    //To turn this off, use 0. Otherwise, set the amount that will be preserved.
    this.organismSurvival = 0

    //Should we limit mating within a certain pool? By default, null, but if it exists
    //Then we will not mate outside the top crossoverRankLimit
    this.crossoverRankLimit

    //If there is an organismSurvival, recalculate the fitness every time?
    this.recalculateSurvivorFitness = false

    //The chances of an input (leaf) or a function. Should both add to 1.
    //Defaults are set to .9/.1 as per Koza (in turn, as per book)
    this.crossoverTerminalSelectionRate = 0.1
    this.crossoverFunctionSelectionRate = 0.9

    //Chance of a mutation occuring
    this.mutationRate = 0.1
    //There are three kinds of mutations.
    //Random node replacement, random node adding, and random node deletion.
    //Here are the odds of each (must add up to 1)
    this.mutationReplacementRate = 0.34
    this.mutationAdditionRate = 0.33
    this.mutationDeletionRate = 0.33

    //If a mutation calls to add a random node/parameter, do we
    //add at a random order (true) or at the end (false)
    this.mutationAddMixedPlacement = true

    //How many attempts at a particular mutation type shall be attempted before
    //abandoning the mutation attempt and trying another?
    this.mutationAttemptLimit = 3

    //How many randomly generated nodes should be added to the population
    //on each generation run-through.
    //Set to 0 to ignore
    this.generateRandomChildrenOnCrossover = 2

    //Current generation count
    this.generation = 0
    //Max generation limit. If null, will not stop.
    this.generationLimit = 50

    //If the top ranked child exceeds this precision (0-1, 1 being perfect)
    //then the endCondition will occur.
    //If null, it won't be used for stopping.
    this.endOnAccuracy = null

    //During execute, after endCondition check (and if endCondition is false),
    //fire onGenerationEnd. This should be a function(cb) if you want this.
    this.onGenerationEnd


    //Max simultaenous population size. Used only if generating initial population
    this.populationSize = 25

    //Max depth of a generated node. Must exist, must be over 1.
    this.maxNodeGenerationDepth = 5

    //Allow easy changing of "next" - do you wait for I/O to process (setImmediate)
    //or do we push it to the front of the line "process.nextTick"
    this.next = setImmediate

    return this
  }

  pinnacle.prototype.addFunctionalNode = function(fnc, name, minParams, maxParams){
    name = name ? name : 'Functional Node ' + Math.random().toString(36).substring(7)
    this.functionalSet.push(new FunctionalNode(fnc, name, 'functional', minParams, maxParams))
  }

  pinnacle.prototype.addTerminalNode = function(fnc, name){
    name = name ? name : 'Terminal Node ' + Math.random().toString(36).substring(7)
    var x = new FunctionalNode(fnc, name, true)
    this.terminalSet.push(x)
  }

  pinnacle.prototype.addConstantNode = function(constant){
    name = constant
    this.terminalSet.push(new FunctionalNode(function(params, cb){
      cb(constant)
    }, name, true))
  }

  pinnacle.prototype.setCrossoverInputSelectionRate = function(rate){
    this.crossoverTerminalSelectionRate = rate
    this.crossoverFunctionSelectionRate = 1 - rate
  }

  pinnacle.prototype.setCrossoverFunctionSelectionRate = function(rate){
    this.crossoverFunctionSelectionRate = rate
    this.crossoverTerminalSelectionRate = 1 - rate
  }

  //Sort/rank the population. By default, simple fitness score comparison
  pinnacle.prototype.rankPopulation = function(cb){
    this.population.sort(function(a, b){
      if(a.fitness < b.fitness){
        return 1
      } else if(a.fitness > b.fitness){
        return -1
      } else {
        return 0
      }
      // if(Math.abs(1 - a.fitness) > Math.abs(1 - b.fitness)){
      //   return 1
      // } else if(Math.abs(1 - a.fitness) < Math.abs(1 - b.fitness)){
      //   return -1
      // } else {
      //   return 0
      // }
    })
    setImmediate(cb)
  }

  //Calculate the fitness of the entire population
  pinnacle.prototype.calculatePopulationFitness = function(cb){
    var self = this

    //Fire off as many fitnessTests as stipulated by simultaneousFitnessTests
    async.eachLimit(self.population, self.simultaneousFitnessTests,
      function(organism, done){
          setImmediate(function(){
              self.testOrganism(organism, function(){
              setImmediate(done)
            })
          })
      },
      function(err){
        setImmediate(function(){
          self.rankPopulation(cb)
        })
      })
  }

  //Get the fitness (after passing it through gibbs sampling)
  //be it an array or function
  pinnacle.prototype.getFitness = function(cb){

  }

  //Given the fitness values from the fitness, ensuring proper
  //sampling
  pinnacle.prototype.gibbsSampleFitness = function(cb){

  }

  pinnacle.prototype.calculateFitness = function(input, expectedOutput, actualOutput, cb){
    if(expectedOutput == 0){
      expectedOutput = 0.001
    }
    setImmediate(function(){
      cb(1/Math.abs(expectedOutput-actualOutput))
      // cb( 1 - Math.abs((expectedOutput - actualOutput)/expectedOutput) )
    })
  }

  //Given an organism, test it against the current training set
  pinnacle.prototype.testOrganism = function(organism, cb){
    var self = this
    var fitnesses = []

    //If organismSurvival is being used, do we recalculate those fitnesses?
    //If so, check recalculateSurvivorFitness and if this organism already has
    //a non-zero fitness
    if(self.organismSurvival > 0
      && !self.recalculateSurvivorFitness
      && organism.fitness != 0){
      return cb(organism.fitness)
    }

    async.waterfall([
      function(done){
        if(typeof self.trainingSet == 'function'){
          self.trainingSet(function(trainingSet){
            done(null, trainingSet)
          })
        } else {
          done(null, self.trainingSet)
        }
      },

      function(trainingSet, done){
        async.eachLimit(self.trainingSet, self.simultaneousFitnessCalculations,
          function(trainingSet, done){

            setImmediate(function(){
                organism.execute(trainingSet.input, function(result){
                self.calculateFitness(trainingSet.input, trainingSet.result,
                  result, function(fitness){
                    fitnesses.push(fitness)
                    setImmediate(done)
                  })
              })
            })

          },
          function(err){
            var fitnessTotal = 0
            fitnesses.forEach(function(fitness){
              fitnessTotal += fitness
            })
            organism.fitness = fitnessTotal / fitnesses.length
            done(organism.fitness)
          })

        }

      ], function(err, fitness){
        cb(fitness)
      })
  }

  //The end condition for the runs. By default, simply uses generationLimit
  pinnacle.prototype.endCondition = function(cb){
    //If the endOnAccuracy is set, check to see if the population fulfills the
    //requirement. Otherwise false
    var endNow = this.endOnAccuracy ?
      this.endOnAccuracy <= this.population[0].fitness ? true : false
      : false

    //If the generation limit exists, check to see if our current generation
    //exceeds it
    endNow = endNow || this.generationLimit ?
      this.generationLimit <= this.generation ? true: false
      : false

    setImmediate(function(){
      cb(endNow)
    })
  }

  pinnacle.prototype.generateRandomOrganism = function(cb){
    var self = this
    setImmediate(function(){
      self.generateRandomNode(0, function(node){
        var organism = new Organism()
        organism.fnc = node
        cb(organism)
      })
    })
  }

  //Generate a random node. For use in mutations and initial seeding
  pinnacle.prototype.generateRandomNode = function(currentDepth, cb){
      if(typeof currentDepth == 'function'){
        cb = currentDepth
        currentDepth = 0
      }

      var self = this

      //Make a listing of all potential choices
      var potentialChoices = []

      if(currentDepth !== 0){
          potentialChoices = potentialChoices.concat(self.terminalSet)
      }

      //Only allow use of functionalSets if we're at the final depth
      if(currentDepth <= self.maxNodeGenerationDepth){
        potentialChoices = potentialChoices.concat(self.functionalSet)
      }

      //Set a random node

      potentialChoices[Math.floor(Math.random() * potentialChoices.length)].clone(function(choice){
        //If the node is terminal, send it up
        if(choice.terminal){
          cb(choice)
        } else {
          //Otherwise, figure out how many parameters we'll have.
          var paramCount
          if(!this.maxParameters){
            paramCount = Math.floor( (Math.random() * (choice.maxParams - choice.minParams)) + choice.minParams)
          } else {
            paramCount = Math.floor( (Math.random() * 3 + choice.minParams))
          }

          //Populate the parameters
          async.whilst(function(){
            return paramCount > 0
          }, function(done){
            paramCount--

            self.generateRandomNode(++currentDepth, function(paramNode){
              choice.addParam(paramNode)
              done(null)
            })
          }, function(err){
            setImmediate(cb(choice))
          })

        }
      })
  }

  //Create a population of organisms
  pinnacle.prototype.generateRandomPopulation = function(cb){
    var self = this
    self.population = []

    async.whilst(function(){
      return self.population.length < self.populationSize
    }, function(done){
      self.generateRandomOrganism(function(newChild){
        self.population.push(newChild)
        setImmediate(done)
      })
    }, function(err){
      cb()
    })
    // while(self.population.length < self.populationSize){
    //   self.population.push(self.generateRandomNode())
    // }
  }

  pinnacle.prototype.generateNextPopulation = function(cb){
    var self = this

    if(!self.population || self.population.length == 0){
        setImmediate(function(){
          self.generateRandomPopulation(cb)
        })
        return
    }

    var crossOverPotentials = []
    var newPopulation = []

    async.waterfall([
        //If the organismSurvival is set, create a clone of each organism and
        //Pass it along
        function(done){
          if(self.organismSurvival > 0){
            async.eachSeries(self.population.slice(0, self.organismSurvival), function(organism, done){
              organism.clone(function(clone){
                newPopulation.push(clone)
                setImmediate(done)
              })
            }, function(err){
              setImmediate(done)
            })
          } else {
            setImmediate(done)
          }
        },

        function(done){
          if(self.generateRandomChildrenOnCrossover > 0){
            var generatedChildren = 0
            async.whilst(function(){
              return generatedChildren < self.generateRandomChildrenOnCrossover
            }, function(done){
              self.generateRandomOrganism(function(newOrganism){
                generatedChildren++
                newPopulation.push(newOrganism)
                setImmediate(done)
              })
            }, function(err){
              setImmediate(done)
            })
          } else {
            setImmediate(done)
          }
        },

        function(done){
          //Now, for the crossoverRankLimit (if there is one), add then to potentials as well
          if(self.crossoverRankLimit){
            async.eachSeries(self.population.slice(0, self.crossoverRankLimit), function(organism, done){
              organism.clone(function(clone){
                crossOverPotentials.push(clone)
                setImmediate(done)
              })
            }, function(err){
              setImmediate(done)
            })
          } else {
            async.eachSeries(self.population, function(organism, done){
              organism.clone(function(clone){
                crossOverPotentials.push(clone)
                setImmediate(done)
              })
            }, function(err){
              setImmediate(done)
            })
          }
        }
    ], function(err){
      //Now, for each item in the population, as per their fitness score, determine their probabiliy
      //of continuing
      var totalFitness = 0,
        fitnessDistribution = []

      crossOverPotentials.forEach(function(organism){
        var fitness = Math.abs(1 / (1 - organism.fitness))
        totalFitness += fitness
        fitnessDistribution.push(totalFitness)

        //Zero fitnesses make stuff go crazy.
        // if(organism.fitness == 0){
        //   totalFitness += organism.fitness + 0.00001
        //   fitnessDistribution.push(totalFitness)
        // } else {
        //   totalFitness += organism.fitness
        //   fitnessDistribution.push(totalFitness)
        // }
      })

      /*
        To create an uneven distribution, we're creating an ordered array of all
        fitnesses. We then, during selection, generation a random # from inclusive
        0 to exclusive totalFitness. Move through the array from beginning to end.
        As soon as the number generated is lower than the fitness scores total to
        that point, we have selected that organism. Otherwise, move on - this should
        emulate an uneven distribution based on fitness score.
      */
      async.whilst(function(){
        return newPopulation.length < self.population.length
      }, function(done){
        var parentA, parentB

        var selectRandomOrganism = function(){
          var selectedNode,
            randomChoice = Math.random() * totalFitness
          fitnessDistribution.forEach(function(value, index){
            if(!selectedNode && randomChoice < value){
              selectedNode = index
            }
          })

          return crossOverPotentials[selectedNode]
        }

        parentA = selectRandomOrganism()
        //Keep selecting a random organism until we have a unique random organism
        callCount = 0
        while(!parentB || parentA.id == parentB.id){
          parentB = selectRandomOrganism()
        }
        setImmediate(function(){
          self.crossoverMate(parentA, parentB, function(child){
            if(self.population > 250){
              process.exit(0)
            }

            //Do we mutate?
            var mutateChoice = Math.random()
            if(mutateChoice < self.mutationRate){
              //Mutate!
              self.mutateOrganism(child, function(){
                if(self.population > 250){
                  process.exit(0)
                }

                newPopulation.push(child)
                setImmediate(done)
              })
            } else {
              newPopulation.push(child)
              setImmediate(done)
            }
          })
        })

      }, function(err){
        self.population = newPopulation
        setImmediate(cb())
      })

    })

  }

  //Crossover the parents
  pinnacle.prototype.crossoverMate = function(parentA, parentB, cb){
    var potentialANodes = [],
      potentialBNodes = []

    //Clone to preserve originals
    async.waterfall([
        function(done){
          parentA.clone(function(clone){
            parentA = clone
            parentA.fitness = 0
            done(null)
          })
        },

        function(done){
          parentB.clone(function(clone){
            parentB = clone
            parentB.fitness = 0
            done(null)
          })
        },

        function(done){
            var orderedNodes = {}

            async.parallel([
              function(done){
                parentA.getTerminalNodeIds(function(terminalNodes){
                  orderedNodes.parentATerminalNodes = terminalNodes
                  done(null)
                })
              },

              function(done){
                parentA.getFunctionalNodeIds(function(functionalNodes){
                  orderedNodes.parentAFunctionalNodes = functionalNodes
                  done(null)
                })
              },

              function(done){
                parentB.getTerminalNodeIds(function(terminalNodes){
                  orderedNodes.parentBTerminalNodes = terminalNodes
                  done(null)
                })
              },

              function(done){
                parentB.getFunctionalNodeIds(function(functionalNodes){
                  orderedNodes.parentBFunctionalNodes = functionalNodes
                  done(null)
                })
              }

            ], function(err){
              done(err, orderedNodes)
            })
        },

        function(orderedNodes, done){
          var potentialANodes, potentialBNodes
          //First, we determine if we're crossing a terminal or functional node of A
          if(Math.random() < this.crossoverTerminalSelectionRate) {
            //It's a terminal node!
            potentialANodes = orderedNodes.parentATerminalNodes
          } else {
            //It's a functional node!
            potentialANodes = orderedNodes.parentAFunctionalNodes

            //Note - we can't for A node use the topmost function!
            potentialANodes.splice(potentialANodes.indexOf(parentA.fnc.id), 1)

            //If there are NO functional nodes at this point, use a terminal node
            if(potentialANodes.length == 0){
              potentialANodes = orderedNodes.parentATerminalNodes
            }
          }

          //Then we determine the if we're using the functional or terminal nodes of B
          if(Math.random() < this.crossoverTerminalSelectionRate) {
            //It's a terminal node!
            potentialBNodes = orderedNodes.parentBTerminalNodes
          } else {
            //It's a functional node!
            potentialBNodes = orderedNodes.parentBFunctionalNodes

            //Note - we can't for A node use the topmost function!
            potentialBNodes.splice(potentialBNodes.indexOf(parentA.fnc.id), 1)

            //If there are NO functional nodes at this point, use a terminal node
            if(potentialBNodes.length == 0){
              potentialBNodes = orderedNodes.parentBTerminalNodes
            }
          }

          //Select a random one from each
          var chosenANode = potentialANodes[Math.floor(Math.random() * potentialANodes.length)],
            chosenBNode = potentialBNodes[Math.floor(Math.random() * potentialBNodes.length)]
          parentB.getChildById(chosenBNode, function(child){
            parentA.setChildById(child, chosenANode, function(result){
              done(null)
            })
          })
        },

        function(done){
          //Reset all the ids to prevent collision later on
          parentA.resetIds(function(){
            done(null)
          })
        }

      ],
      function(err, child){
        cb(parentA)
      }
    )

  }

  pinnacle.prototype.mutateOrganism = function(node, cb, attempted){
    var self = this
    if(!attempted){
      attempted = []
    } else if(attempted.length == 3){
      //If we have tried every mutation and failed, abort!
      setImmediate(function(){
        cb(node)
      })
      return
    }

    //Generate a number between 0-1 to pick which of the mutation types
    //we'll do.
    var mutationType = Math.random()

    //Use the mutation choice rates to determine which it is. Have them be
    //a consecutive range from 0-1
    var replaceNode = this.mutationReplacementRate,
      addNode = this.mutationAdditionRate + replaceNode,
      deleteNode = this.mutationDeletionRate + replaceNode + addNode

    if(mutationType < replaceNode && attempted.indexOf('replace') == -1){
      // setImmediate(function(){
      //   self.mutationReplaceNode(node, cb)
      // })

      attempted.push('replace')
      //Call add node
      self.mutationReplaceNode(node, function(err, result){
        //If this has failed out after three attempts, call
        //mutateOrganism with attempted
        if(err){
          setImmediate(self.mutateOrganism(node, cb, attempted))
        } else {
          setImmediate(cb(result))
        }
      })

      //This more complicated if statement should take care of the case that
      //replace fails but add is an option
    } else if( (mutationType < addNode && attempted.indexOf('add') == -1)
        || (attempted.indexOf('add') == -1 && attempted.indexOf('replace') != -1
            && mutationType < addNode)
      ){

      attempted.push('add')
      //Call add node
      self.mutationAddNode(node, function(err, result){
        //If this has failed out after three attempts, call
        //mutateOrganism with attempted
        if(err){
          setImmediate(self.mutateOrganism(node, cb, attempted))
        } else {
          setImmediate(cb(result))
        }
      })

    } else {
      attempted.push('delete')

      //Call add node
      self.mutationDeleteNode(node, function(err, result){
        //If this has failed out after three attempts, call
        //mutateOrganism with attempted

        if(err){
          self.mutateOrganism(node, cb, attempted)
        } else {
          cb(result)
        }
      })

    }
  }

  pinnacle.prototype.mutationAddNode = function(organism, cb, attempt){
    var self = this

    if(!attempt){
      attempt = 0
    }

    //Get all the functional nodes available.
    organism.getFunctionalNodeIds(function(targets){
      //Select a random functional node to add an argument too
      var selectedNode = targets[Math.floor(Math.random() * targets.length)]
      //Grab that node
      organism.getChildById(selectedNode, function(child, originalId){
        //Check to see if we have room to add a new child node to it.
        //If so, continue with the adding
        if((child.maxParams && child.maxParams > child.params.length) || !child.maxParams){

          self.generateRandomNode(function(newNode){
            //Are we adding at a random point, or to the end
            if(self.mutationAddMixedPlacement){
              child.params.splice(Math.floor(Math.random()*child.params.length), 0, newNode)
            } else {
              child.addParam(newNode)
            }

            organism.setChildById(child, originalId, function(result){
              if(result){
                setImmediate(cb(null))
              } else if(++attempt >= self.mutationAttemptLimit){
                setImmediate(cb(true))
              } else {
                setImmediate(self.mutationAddNode(organism, cb, attempt))
              }
            })
          })

        } else if(++attempt >= self.mutationAttemptLimit){
          setImmediate(cb(true))
        } else {
          setImmediate(self.mutationAddNode(organism, cb, attempt))
        }
      })

    })

  }

  pinnacle.prototype.mutationReplaceNode = function(organism, cb, attempt){
    var self = this

    if(!attempt){
      attempt = 0
    }

    organism.getFunctionalNodeIds(function(targets){
      targets.splice(targets.indexOf(organism.fnc.id), 1)
      organism.getTerminalNodeIds(function(ids){
        targets = targets.concat(ids)

        var chosenNode = targets[Math.floor(Math.random() * targets.length)]
        self.generateRandomNode(function(newNode){
          organism.setChildById(newNode, chosenNode, function(result){
            if(false){
                //For some reason, the set child by id failed!
                if(attempt >= this.mutationAttemptLimit){
                  setImmediate(cb(true))
                } else {
                  setImmediate(self.mutationReplaceNode(organism, cb, ++attempt))
                }
            } else {
              cb(null, result)
            }
          })
        })
      })
    })
  }

  pinnacle.prototype.mutationDeleteNode = function(organism, cb, attempt){

    var self = this
    if(!attempt){
      attempt = 0
    }

    organism.getFunctionalNodeIds(function(targets){
      //Remove the top most node from the mutation
      targets.splice(0, 1)

      organism.getTerminalNodeIds(function(ids){
        targets = targets.concat(ids)

        var chosenNode = targets[Math.floor(Math.random() * targets.length)]

        organism.getParentByChildId(chosenNode, function(parent){
          //Make sure we don't go under the minimum parameters by removing
          if(parent.params.length != parent.minParams){
            var indexOfChild
            parent.params.forEach(function(param, index){
              if(param.id == chosenNode){
                indexOfChild = index
              }
            })

            //Remove the chosenNode
            parent.params.splice(indexOfChild, 1)
            cb(null)
          } else if(++attempt >= self.mutationAttemptLimit){
            cb(true)
          } else {
            self.mutationDeleteNode(organism, cb, ++attempt)
          }
        })
      })
    })
  }

  pinnacle.prototype.execute = function(cb){
    var self = this

    self.generateNextPopulation(function(){
      setImmediate(function(){
        self.calculatePopulationFitness(function(){
          self.generation++
          self.endCondition(function(end){
            if(end){
              setImmediate(cb)
            } else if(self.onGenerationEnd){
              setImmediate(function(){
                self.onGenerationEnd(function(end){
                  if(end){
                    setImmediate(cb)
                  } else {
                    setImmediate(function(){
                      self.execute(cb)
                    })
                  }
                })
              })
            } else {
              setImmediate(function(){
                self.execute(cb)
              })
            }
          })
        })
      })
    })
  }

  return pinnacle

}
