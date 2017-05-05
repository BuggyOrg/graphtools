/* global describe, it */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Node from '../../src/node'
import * as Functional from '../../src/rewrite/functional'
import * as Algorithm from '../../src/algorithm'
import fs from 'fs'

var expect = chai.expect

describe('Rewrite basic API', () => {
  describe('» Functional', () => {
    describe('Creating Lambda nodes for subsets', () => {
      it('Can put compounds into lambda nodes', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const fn = Functional.convertToLambda(graph, ['b', 'a'], graph)
        expect(Graph.hasNode('/functional/lambda', fn)).to.be.true
      })
    })

    describe('» Converting subsets into function calls', () => {
      it('Can create a lambda function out of an compound with matching call', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const fn = Functional.replaceByCall(graph, ['b', 'a'], graph)
        expect(Graph.hasNode('/functional/lambda', fn)).to.be.true
        expect(Graph.hasNode('/call', fn)).to.be.true
      })

      it('The callback returns a the created call node', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const fn = Functional.replaceByCall(graph, ['b', 'a'], graph, (callNode, graph) => {
          expect(callNode.componentId).to.equal('call')
          return graph
        })
        expect(Graph.hasNode('/functional/lambda', fn)).to.be.true
        expect(Graph.hasNode('/call', fn)).to.be.true
      })

      it('Can create a lambda function out of an compound with one input partial', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const fn = Functional.replaceByCall(graph, ['b'], graph)
        expect(Graph.hasNode('/functional/lambda', fn)).to.be.true
        expect(Graph.hasNode('/call', fn)).to.be.true
        expect(Graph.hasNode('/functional/partial', fn)).to.be.true
      })

      it('Can create a lambda function out of an compound with multiple input partials', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a1', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'a2', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in1', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a1@out', to: 'b@in1'}),
          Graph.addEdge({from: 'a2@out', to: 'b@in2'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const fn = Functional.replaceByCall(graph, ['b'], graph)
        expect(Graph.hasNode('/functional/lambda', fn)).to.be.true
        expect(Graph.hasNode('/call', fn)).to.be.true
        expect(Graph.hasNode('/functional/partial', fn)).to.be.true
        expect(Graph.nodes(fn)).to.have.length(7)
      })
    })

    const ifNode = (data) =>
      Object.assign({
        componentId: 'if',
        ports: [
          {port: 'cond', kind: 'input', type: 'Bool'},
          {port: 'a', kind: 'input', type: 'generic'},
          {port: 'b', kind: 'input', type: 'generic'},
          {port: 'out', kind: 'output', type: 'generic'}
        ],
        atomic: true
      }, data)

    describe('» Creating thunks', () => {
      it('» Can create thunks for no-input nodes', () => {
        const graph = Graph.flow(
          Graph.addNode(ifNode({name: 'if'})),
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addNode({name: 'cond', ports: [{port: 'out', kind: 'output', type: 'Bool'}]}),
          Graph.addEdge({from: 'a@out', to: 'if@a'}),
          Graph.addEdge({from: 'b@out', to: 'if@b'}),
          Graph.addEdge({from: 'cond@out', to: 'if@cond'})
        )()

        const thunkG = Functional.replaceByThunk(graph, ['a'], graph)
        expect(Graph.hasNode('/functional/lambda', thunkG)).to.be.true
        expect(Graph.hasNode('a', thunkG)).to.be.false
      })

      it('» Creating thunks works inside a let statement', () => {
        const graph = Graph.flow(
          Graph.addNode(ifNode({name: 'if'})),
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addNode({name: 'cond', ports: [{port: 'out', kind: 'output', type: 'Bool'}]}),
          Graph.addEdge({from: 'a@out', to: 'if@a'}),
          Graph.addEdge({from: 'b@out', to: 'if@b'}),
          Graph.addEdge({from: 'cond@out', to: 'if@cond'})
        )()

        const thunkG = Graph.Let([Functional.replaceByThunk(graph, ['a'])], ([a], graph) => graph)(graph)
        expect(Graph.hasNode('/functional/lambda', thunkG)).to.be.true
        expect(Graph.hasNode('a', thunkG)).to.be.false
      })

      it('» Creating thunks inside a recursive node', () => {
        const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('test/fixtures/fac.json')))
        const ifNode = Graph.node('/if', graph)
        const constPred = Graph.predecessor(Node.port('inTrue', ifNode), graph)
        const thunkG = Graph.Let(Functional.replaceByThunk('/fac', [constPred]), (a, graph) => graph)(graph)
        expect(thunkG).to.be.ok
      })

      it('» Creating thunks inside a recursive node for ancestors', function () {
        this.timeout(10000)
        const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('test/fixtures/fac.json')))
        const ifNode = Graph.node('/if', graph)
        const subset = Algorithm.predecessorsUpTo(Node.port('inFalse', ifNode), Graph.node('/fac', graph), graph)
        const thunkG = Graph.Let(Functional.replaceByThunk('/fac', subset), (a, graph) => graph)(graph)
        expect(thunkG).to.be.ok
      })

      describe('» Cons example', () => {
        it('» Can handle the cons example', function () {
          this.timeout(15000)
          const graph = Graph.fromFile('test/fixtures/cons.json')
          const ifNode = Graph.node(Graph.predecessor(Node.outputPorts(Graph.node('/min', graph))[0], graph), graph)
          const subset = Algorithm.predecessorsUpTo(Node.port('inTrue', ifNode), Graph.node('/min', graph), graph)
          const tGraph = Functional.replaceByThunk('/min', subset, graph, (lambda, graph) => {
            expect(lambda).to.be.an('array')
            expect(lambda).to.have.length(2)
            return graph
          })
          expect(tGraph).to.be.an('object')
        })

        it('» Can handle the cons example [minList » if]', function () {
          this.timeout(15000)
          const graph = Graph.fromFile('test/fixtures/cons.json')
          const ifNode = Graph.node(Graph.predecessor(Node.outputPorts(Graph.node('/minList', graph))[0], graph), graph)
          const subset = Algorithm.predecessorsUpTo(Node.port('inTrue', ifNode), Graph.node('/minList', graph), graph)
          const tGraph = Graph.Let(Functional.replaceByThunk('/minList', subset), (lambda, graph) => {
            expect(lambda).to.be.an('array')
            expect(lambda).to.have.length(2)
            return graph
          })(graph)
          expect(tGraph).to.be.an('object')
        })
      })
    })
  })
})
