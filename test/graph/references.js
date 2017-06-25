/* eslint-env mocha */

import chai from 'chai'
import * as changeSet from '../../src/changeSet'
import * as Graph from '../../src/graph'
import * as Node from '../../src/node'
import {port} from '../../src/port'
import _ from 'lodash'
import semver from 'semver'

var expect = chai.expect

const toNames = (graph) => (id) => Node.name(Graph.node(id, graph))

describe('Basic graph functions', () => {
  describe('References', () => {
    var graphJSON = () => ({
      nodes:
      [
        {
          ref: 'math/add',
          id: '#ciujt9ktl0003lumriay99r9m'
        },
        {
          ref: 'std/const',
          id: '#ciujt9ktp0004lumrth5o5vnd'
        }],
      ports:
        [{ port: 'x', kind: 'input', type: 'generic' },
          { port: 'value', kind: 'output', type: 'generic' }],
      atomic: false,
      id: '#ciujt9kti0002lumr7poczkzx',
      version: '0.0.0',
      componentId: 'myInc',
      name: 'c'
    })

    it('import', () => {
      var graph = Graph.fromJSON(graphJSON())
      expect(graph).to.be.ok
      expect(Graph.nodes(graph)).to.have.length(2)
      expect(Graph.edgesDeep(graph)).to.have.length(0)
      expect(Graph.components(graph)).to.have.length(0)
      expect(graph.ports).to.be.deep.equal(graphJSON().ports)
    })

    it('Simple add edge test', () => {
      var comp = Graph.addEdge({from: '@x', to: '@value'}, Graph.fromJSON(graphJSON()))
      expect(comp).to.be.ok

      expect(Graph.predecessors('', comp, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.successors('', comp, {goIntoCompounds: true})).to.have.length(1)
      var graph = Graph.addNode(comp, Graph.empty())
      expect(Graph.predecessors('c', graph, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.successors('c', graph, {goIntoCompounds: true})).to.have.length(1)
    })

    it('Use addEdge @name notation', () => {
      var graph = Graph.fromJSON(graphJSON())
      var cmpt = Graph.fromJSON(graphJSON())
      var out = Graph.addEdge({from: '@x', to: '@value'}, cmpt)
      var out2 = Graph.addEdge({from: '@x', to: '@value'}, graph)
      expect(out).to.be.ok
      expect(Graph.edgesDeep(out)).to.have.length(1)
      expect(out2).to.be.ok
      expect(Graph.edgesDeep(out2)).to.have.length(1)
    })

    it('Use addEdge @Number notation', () => {
      var graph = Graph.fromJSON(graphJSON())
      var out = Graph.addEdge({from: '@0', to: '#ciujt9ktl0003lumriay99r9m@0'}, graph)
      expect(out).to.be.ok
      expect(Graph.edgesDeep(out)).to.have.length(1)
    })

    it('Use addEdge @Number for inner edges', () => {
      var graph = Graph.fromJSON(graphJSON())
      var out = Graph.addEdge({from: '@0', to: '@0'}, graph)
      expect(out).to.be.ok
      expect(Graph.edgesDeep(out)).to.have.length(1)
    })

    it('Use addEdge #id@name notation', () => {
      var out = Graph.addEdge({from: '#ciujt9kti0002lumr7poczkzx@x', to: '#ciujt9kti0002lumr7poczkzx@value'}, Graph.fromJSON(graphJSON()))
      expect(out).to.be.ok
      expect(Graph.edgesDeep(out)).to.have.length(1)
    })

    it('Use addEdge #id@Number notation', () => {
      var graph = Graph.fromJSON(graphJSON())
      var out = Graph.addEdge({from: '#ciujt9kti0002lumr7poczkzx@0', to: '#ciujt9kti0002lumr7poczkzx@0'}, graph)
      var out2 = Graph.addEdge({from: '#ciujt9kti0002lumr7poczkzx@0', to: '#ciujt9ktl0003lumriay99r9m@0'}, graph)
      expect(out).to.be.ok
      expect(Graph.edgesDeep(out)).to.have.length(1)
      expect(out2).to.be.ok
      expect(Graph.edgesDeep(out2)).to.have.length(1)
    })

    it('Resolves @Number notations when replacing references', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ref: 'a'}),
        Graph.addNode({name: 'b', ref: 'b'}),
        Graph.addEdge({from: 'a@0', to: 'b@0'})
      )()
      var newGraph = Graph.replaceNode('a', {componentId: 'a', atomic: true, name: 'a', ports: [{port: 'aOut', kind: 'output', type: 'generic'}]}, graph)
      expect(Graph.edgesDeep(newGraph)[0].from.port).to.equal('aOut')
      var newGraphIn = Graph.replaceNode('b', {componentId: 'b', atomic: true, name: 'b', ports: [{port: 'bIn', kind: 'input', type: 'generic'}]}, graph)
      expect(Graph.edgesDeep(newGraphIn)[0].to.port).to.equal('bIn')
    })

    it('Resolves @Number from and to compound nodes', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ref: 'a'}),
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'input', type: 'a'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd),
        Graph.addEdge({from: 'c@out', to: '»c»a@0'})
      )()

      var newGraph = Graph.replaceNode('»c»a', {componentId: 'a', atomic: true, name: 'a', ports: [{port: 'aIn', kind: 'input', type: 'generic'}]}, graph)
      expect(Graph.edgesDeep(newGraph)[0].to.port).to.equal('aIn')
    })
  })
})
