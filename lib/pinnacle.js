var async = require('async')
var FunctionalNode = require('./FunctionalNode')

//This is a library designed to allow easy programming of an asynchronous genetic algorithm in node.

module.exports = function(){

  var gp = function(){
    //Attributes
    this.inputs = []
    this.functionalSet = []
    this.terminalSet = []
    this.population = []
    this.seed = []

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

    return this
  }

  gp.prototype.addFunctionalNode(fnc, name, minParams, maxParams){
    name = name ? name : 'Functional Node ' + Math.random().toString(36).substring(7)
    this.functionalSet.push(new FunctionalNode(fnc, name, minParams, maxParams))
  }

  gp.prototype.addTerminalNode(fnc, name){
    name = name ? name : 'Terminal Node ' + Math.random().toString(36).substring(7)
    this.terminalSet.push(new FunctionalNode(fnc, name, true))
  }

  gp.prototype.setCrossoverInputSelectionRate = function(rate){
    this.crossoverTerminalSelectionRate = rate
    this.crossoverFunctionSelectionRate = 1 - rate
  }

  gp.prototype.setCrossoverFunctionSelectionRate = function(rate){
    this.crossoverFunctionSelectionRate = rate
    this.crossoverTerminalSelectionRate = 1 - rate
  }

  //Sort/rank the population. By default, simple fitness score comparison
  gp.prototype.rankPopulation = function(){
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
  gp.prototype.calculatePopulationFitness = function(organism, cb){
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
  gp.prototype.testOrganism = function(organism, cb){
    var self = this
    var fitnesses = []

    async.waterfall([
      function(done){
        if(self.trainingSet typeof == 'function'){
          self.trainingSet(function(trainingSet){
            done(null, trainingSet)
          })
        } else {
          done(null, self.trainingSet)
        }
      },

      function(trainingSet, done){

        async.eachLimit(self.trainingSet, self.simultaneousFitnessCalculations,
          function(trainingSet.input, done){

            organism.execute(function(result){
              self.calculateFitness(trainingSet.input, trainingSet.results,
                result, function(fitness){
                  fitnesses.push(fitness)
                  done(null)
                }
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
  gp.prototype.endCondition = function(cb){
    this.generation >= this.generationLimit ? cb(true) : cb(false)
  }

  gp.prototype.generateRandomPopulation = function(cb){

  }


//this.crossoverRankLimit
  gp.prototype.generateNextPopulation = function(){
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
        fitnessDistribution.forEach(value, index){
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
      var child = self.crossoverMate(parentA, parentB)

      //Do we mutate?
      var mutateChoice = Math.random()
      if(mutateChoice < self.mutationPercentage){
        //Mutate!
        child = self.mutateNode(child)
      }

      newPopulation.push(child)

    }

    //Finished! Overwrite old population
    self.population = newPopulation
  }

  //Crossover the parents
  gp.prototype.crossoverMate = function(parentA, parentB){
    var potentialANodes = [],
      potentialBNodes = []

    //Clone to preserve originals
    parentA = parentA.clone()
    parentB = parentB.clone()

    //First, we determine if we're crossing a terminal or functional node of A
    if(Math.random() < this.crossoverTerminalSelectionRate) {
      //It's a terminal node!
      potentialANodes = parentA.getTerminalNodeIds()
    } else {
      //It's a functional node!
      potentialANodes = parentA.getFunctionalNodeIds()

      //Note - we can't for A node use the topmost function!
      potentialANodes.splice(potentialANodes.indexOf(parentA.fnc.id), 1)

      //If there are NO functional nodes at this point, use a terminal node
      if(potentialANodes.length == 0){
        potentialANodes = parentA.getTerminalNodeIds()
      }
    }

    //Then we determine the if we're using the functional or terminal nodes of B
    if(Math.random() < this.crossoverTerminalSelectionRate) {
      //It's a terminal node!
      potentialBNodes = parentB.getTerminalNodeIds()
    } else {
      //It's a functional node!
      potentialBNodes = parentB.getFunctionalNodeIds()

      //Note - we can't for A node use the topmost function!
      potentialBNodes.splice(potentialBNodes.indexOf(parentA.fnc.id), 1)

      //If there are NO functional nodes at this point, use a terminal node
      if(potentialBNodes.length == 0){
        potentialBNodes = parentB.getTerminalNodeIds()
      }
    }

    //Select a random one from each
    var chosenANode = Math.floor(Math.random() * potentialANodes.length),
      chosenBNode = Math.floor(Math.random() * potentialBNodes.length)

    parentA.setChildById(parentB.getChildById(chosenBNode), chosenANode)

    //Reset all the ids to prevent collision later on
    parentA.resetIds()
  }

  gp.prototype.mutateNode = function(node){
    return node
    //TODO - write mutation function!
  }


  return gp

}
