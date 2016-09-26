/* global describe, it */

import chai from 'chai'
import * as Graph from '../src/graph'
import {includePredecessor, excludeNode} from '../src/rewrite/compound'
import * as Node from '../src/node'

var expect = chai.expect

describe('Rewrite basic API', () => {
  describe('Including predecessors', () => {
    it('can include the direct predecessor of a compound port into the compound', () => {
      var comp = Graph.addEdge({from: '@inC', to: '@outC'},
        Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
        Graph.addNode(comp),
        Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
        (graph, objs) =>
          Graph.addEdge({from: objs()[0].id + '@outA', to: objs()[1].id + '@inC'})(graph),
        (graph, objs) =>
          Graph.addEdge({from: objs()[2].id + '@outF', to: objs()[0].id + '@inA'})(graph)
      )()
      expect(Graph.nodes(graph)).to.have.length(3)
      expect(Graph.nodes(Graph.node('c', graph))).to.have.length(0)
      var rewGraph = includePredecessor({node: 'c', port: 'inC'}, graph)
      expect(Graph.nodes(rewGraph)).to.have.length(2)
      expect(Graph.nodes(Graph.node('c', rewGraph))).to.have.length(1)
      expect(Graph.inIncidents('c', rewGraph)).to.have.length(2)
      expect(Graph.node(Graph.predecessor('c@outC', rewGraph), rewGraph).componentId).to.equal('moved')
    })

    it('can include the direct predecessor via short notation', () => {
      var comp = Graph.addEdge({from: '@inC', to: '@outC'},
        Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
        Graph.addNode(comp),
        Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
        (graph, objs) =>
          Graph.addEdge({from: objs()[0].id + '@outA', to: objs()[1].id + '@inC'})(graph),
        (graph, objs) =>
          Graph.addEdge({from: objs()[2].id + '@outF', to: objs()[0].id + '@inA'})(graph)
      )()
      expect(Graph.nodes(graph)).to.have.length(3)
      expect(Graph.nodes(Graph.node('c', graph))).to.have.length(0)
      var rewGraph = includePredecessor('c@inC', graph)
      expect(Graph.nodes(rewGraph)).to.have.length(2)
      expect(Graph.nodes(Graph.node('c', rewGraph))).to.have.length(1)
      expect(Graph.inIncidents('c', rewGraph)).to.have.length(2)
      expect(Graph.node(Graph.predecessor('c@outC', rewGraph), rewGraph).componentId).to.equal('moved')
    })

    it('throws an error if the predecessor of an port has other successors', () => {
      var comp = Graph.addEdge({from: '@inC', to: '@outC'},
        Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
        Graph.addNode(comp),
        Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
        Graph.addNode({ports: [{port: 'inB', kind: 'input'}]}),
        (graph, objs) =>
          Graph.addEdge({from: objs()[0].id + '@outA', to: objs()[1].id + '@inC'})(graph),
        (graph, objs) =>
          Graph.addEdge({from: objs()[0].id + '@outA', to: objs()[3].id + '@inB'})(graph),
        (graph, objs) =>
          Graph.addEdge({from: objs()[2].id + '@outF', to: objs()[0].id + '@inA'})(graph)
      )()
      expect(() => includePredecessor({node: 'c', port: 'inC'}, graph)).to.throw(Error)
    })
  })

  describe('Excluding inner nodes', () => {
    it('moves a node out of an compound', () => {
      var comp = Graph.flow(
        Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], name: 'a'}),
        (graph, objs) =>
          Graph.addEdge({from: '@inC', to: objs()[0].id + '@inA'})(graph),
        (graph, objs) =>
          Graph.addEdge({to: '@outC', from: objs()[0].id + '@outA'})(graph)
      )(Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
        Graph.addNode(comp),
        (graph, objs) =>
          Graph.addEdge({from: objs()[0].id + '@outF', to: 'c@inC'})(graph)
      )()
      expect(Graph.nodes(graph)).to.have.length(2)
      var rewGraph = excludeNode('»c»a', graph)
      expect(Graph.nodes(rewGraph)).to.have.length(3)
      expect(Graph.predecessors('c@outA', rewGraph)).to.have.length(1)
      expect(Graph.node(Graph.predecessor('c@outA', rewGraph), rewGraph).name).to.equal('a')
      expect(Graph.node(Graph.successors('c@outA', rewGraph)[0], rewGraph).name).to.equal('c')
      expect(Node.hasPort('inC', Graph.node('c', rewGraph))).to.be.false
    })

    it('throws an error if the node has predecessors in the compound node', () => {
      var comp = Graph.flow(
        Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}, {port: 'inB', kind: 'input'}], name: 'a'}),
        Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
        (graph, objs) =>
          Graph.addEdge({from: objs()[1].id + '@outF', to: objs()[0].id + '@inA'})(graph),
        (graph, objs) =>
          Graph.addEdge({from: '@inC', to: objs()[0].id + '@inB'})(graph)
      )(Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
      var graph = Graph.addNode(comp, Graph.empty())
      expect(() => excludeNode('a', graph)).to.throw(Error)
    })
  })
})