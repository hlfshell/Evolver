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

    //The chances of an input (leaf) or a function. Should both add to 1.
    //Defaults are set to .9/.1 as per Koza (in turn, as per book
    this.crossoverTerminalSelectionRate = 0.1
    this.crossoverFunctionSelectionRate = 0.9

    //Chance of a mutation occuring
    this.mutationPercentage = 0.1

    //Current generation count
    this.generation = 0
    //Max generation limit
    this.generationLimit = 50

    //Max simultaenous population size. Used only if generating initial population
    this.populationSize = 25

    //Max depth of a generated node. Must exist, must be over 1.
    this.maxNodeGenerationDepth = 5

    return this
  }

  pinnacle.prototype.addFunctionalNode = function(fnc, name, minParams, maxParams){
    name = name ? name : 'Functional Node ' + Math.random().toString(36).substring(7)
    this.functionalSet.push(new FunctionalNode(fnc, name, minParams, maxParams))
  }

  pinnacle.prototype.addTerminalNode = function(fnc, name){
    name = name ? name : 'Terminal Node ' + Math.random().toString(36).substring(7)
    this.terminalSet.push(new FunctionalNode(fnc, name, true))
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
  pinnacle.prototype.rankPopulation = function(){
    this.population.sort = function(a, b){
      if(a.fitness > b.fitness){
        return 1
      } else if(a.fitness < b.fitness){
        return -1
      } else {
        return 0
      }
    }
  }

  //Calculate the fitness of the entire population
  pinnacle.prototype.calculatePopulationFitness = function(organism, cb){
    var self = this

    //Fire off as many fitnessTests as stipulated by simultaneousFitnessTests
    async.eachLimit(self.population, self.simultaneousFitnessTests,
      function(organism, done){
          self.testOrganism(organism, function(){
            done(null)
          })
      },
      function(err){
        self.rankPopulation(cb)
      })
  }

  //Given an organism, test it against the current training set
  pinnacle.prototype.testOrganism = function(organism, cb){
    var self = this
    var fitnesses = []

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
          function(identifier, done){

            organism.execute(function(result){
              self.calculateFitness(trainingSet.input, trainingSet.results,
                result, function(fitness){
                  fitnesses.push(fitness)
                  done(null)
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
    this.generation >= this.generationLimit ? cb(true) : cb(false)
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

      // var self = this,
      //   nodeChoice = self.functionalSet[Math.floor(Math.random() * self.functionalSet.length)]
      //
      // //Determine how many parameters we need to generate
      // var paramCount
      // if(nodeChoice.maxParams){
      //   paramCount = Math.floor( (Math.random() * (nodeChoice.maxParams - nodeChoice.minParams)) + nodeChoice.minParams)
      // } else {
      //   paramCount = Math.floor( (Math.random() * ((5 + nodeChoice.minParams) - nodeChoice.minParams)) + nodeChoice.minParams)
      // }
      //
      // for(var i = 0; i < paramCount; i++){
      //   console.log(paramCount, i)
      //   nodeChoice.addParam(self.terminalSet[Math.floor(Math.random() * self.terminalSet.length)])
      // }
      //
      // return nodeChoice
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
    var crossOverPotentials = []
    var newPopulation = []

    //If the organismSurvival is set, create a clone of each organism and
    //Pass it along
    if(this.organismSurvival > 0){
      self.population.slice(0, this.organismSurvival).forEach(function(organism){
        newPopulation.push(organism.clone())
      })
    }

    //Now, for the crossoverRankLimit (if there is one), add then to potentials as well
    if(self.crossoverRankLimit){
      self.population.slice(0, this.crossoverRankLimit).forEach(function(organism){
        crossOverPotentials.push(organism.clone())
      })
    } else {
      crossOverPotentials = []
      self.population.forEach(function(organism){
        crossOverPotentials.push(organism.clone())
      })
    }

    //Now, for each item in the population, as per their fitness score, determine their probabiliy
    //of continuing
    var totalFitness = 0,
      fitnessDistribution = []
    crossOverPotentials.forEach(function(organism){
      totalFitness += organism.fitness
      fitnessDistribution.push(organism.fitness)
    })

    /*
      To create an uneven distribution, we're creating an ordered array of all
      fitnesses. We then, during selection, generation a random # from inclusive
      0 to exclusive totalFitness. Move through the array from beginning to end.
      As soon as the number generated is lower than the fitness scores total to
      that point, we have selected that organism. Otherwise, move on - this should
      emulate an uneven distribution based on fitness score.
    */
    while(newPopulation.length == this.population.length){
      var parentA, parentB

      var selectRandomOrganism = function(){
        var selectedNode,
          randomChoice = Math.random() * totalFitness
        fitnessDistribution.forEach(function(value, index){
          if(randomChoice < value){
            selectedNode = index
          }
        })

        return crossOverPotentials[selectedNode]
      }

      parentA = selectRandomOrganism()
      //Keep selecting a random organism until we have a unique random organism
      while(!parentB || parentA.id == parentB.id){
        parentB = selectRandomOrganism
      }

      //Produce a new organism via crossover!
      var child = self.crossoverMate(parentA, parentB, function(newChild){
        //Do we mutate?
        var mutateChoice = Math.random()
        if(mutateChoice < self.mutationPercentage){
          //Mutate!
          self.mutateNode(child, function(mutatedChild){
            child = mutatedChild
          })
        }
      })

      newPopulation.push(child)

    }

    //Finished! Overwrite old population
    self.population = newPopulation
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
            done(null)
          })
        },

        function(done){
          parentB.clone(function(clone){
            parentB = clone
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
            potentialANodes = potentialANodes.slice(potentialANodes.indexOf(parentA.fnc.id), 1)

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
            potentialBNodes = potentialBNodes.slice(potentialBNodes.indexOf(parentA.fnc.id), 1)

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

  pinnacle.prototype.mutateNode = function(node, cb){
    var self = this

    node.getFunctionalNodeIds(function(targets){
      console.log("index", targets.indexOf(node.fnc.id))
      targets = targets.slice(targets.indexOf(node.fnc.id), 1)
      console.log("targets post slice", targets)
      node.getTerminalNodeIds(function(ids){
        targets = targets.concat(ids)

        var chosenNode = targets[Math.floor(Math.random() * targets.length)]
        self.generateRandomNode(function(newNode){
          node.getFunctionalNodeIds(function(fIds){
            node.getTerminalNodeIds(function(tIds){
              console.log("functional ids", fIds)
              console.log("terminal ids", tIds)
              console.log("chosenNode", chosenNode)
              node.setChildById(newNode, chosenNode, function(result){
                console.log("results", chosenNode.toString(), newNode.toString(), result)
                cb(result)
              })
            })
          })

        })
      })
    })
  }


  return pinnacle

}
