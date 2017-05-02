/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Node from '../../src/node'
import {port} from '../../src/port'
import _ from 'lodash'
import fs from 'fs'

var expect = chai.expect

const toNames = (graph) => (id) => Node.name(Graph.node(id, graph))

describe('Basic graph functions', () => {
  describe('Edge functions', () => {
    it('Can add edges to the graph', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]})
      )()
      var newGraph = Graph.addEdge({from: 'a@out', to: 'b@in'}, graph)
      expect(Graph.edgesDeep(newGraph)).to.have.length(1)
      expect(Graph.edgesDeep(newGraph)[0].from.port).to.eql('out')
      expect(Graph.edgesDeep(newGraph)[0].to.port).to.eql('in')
    })

    it('Can remove edges from the graph', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in'})
      )()
      var newGraph = Graph.removeEdge({from: 'a@out', to: 'b@in'}, graph)
      expect(Graph.edgesDeep(newGraph)).to.have.length(0)
    })

    it('Throws an error if the edge that should be deleted does not exist', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]})
      )()
      expect(() => Graph.removeEdge({from: 'a@out', to: 'b@in'}, graph)).to.throw(Error)
    })

    it('Throws an error if at least one node in the edge does not exist', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]})
      )()
      expect(() => Graph.addEdge({from: 'N@out', to: 'b@in'}, graph))
        .to.throw(Error)
      expect(() => Graph.addEdge({from: 'a@out', to: 'N@in'}, graph))
        .to.throw(Error)
      expect(() => Graph.addEdge({from: 'N@out', to: 'M@in'}, graph))
        .to.throw(Error)
    })

    it('Throws an error if the edge is a loop', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]})
      )()
      expect(() => Graph.addEdge({from: 'b@in', to: 'b@in'}, graph))
        .to.throw(Error)
    })

    it('Throws an error if the edge goes from output to output', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]})
      )()
      expect(() => Graph.addEdge({from: 'a@out', to: 'b@out'}, graph))
        .to.throw(Error)
    })

    it('Check whether an edge is in the graph', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]})
      )()
      var newGraph = Graph.addEdge({from: 'a@out', to: 'b@in'}, graph)
      expect(Graph.hasEdge({from: 'a@out', to: 'b@in'}, graph)).to.be.false
      expect(Graph.hasEdge({from: 'a@out', to: 'b@in'}, newGraph)).to.be.true
    })

    it('Check whether an edge is in the graph with /ref or /componentId syntax in nodes', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ref: 'BB', ports: [{port: 'inB', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ref: 'AA', ports: [{port: 'outA', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'bb', componentId: 'BBB', ports: [{port: 'inBB', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'aa', componentId: 'AAA', ports: [{port: 'outAA', kind: 'output', type: 'a'}]})
      )()
      var newGraph = Graph.addEdge({from: 'a@outA', to: 'b@inB'}, 
                     Graph.addEdge({from: 'aa@outAA', to: 'bb@inBB'}, graph))
      // ref
      expect(Graph.hasEdge({from: '/AA@outA', to: '/BB@inB'}, graph)).to.be.false
      expect(Graph.hasEdge({from: '/AA@outA', to: '/BB@inB'}, newGraph)).to.be.true
      expect(Graph.hasEdge({from: '/AA@outA', to: '/BB@inC'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/AA@outE', to: '/BB@inB'}, newGraph)).to.be.false
      // componentId
      expect(Graph.hasEdge({from: '/AAA@outAA', to: '/BBB@inBB'}, graph)).to.be.false
      expect(Graph.hasEdge({from: '/AAA@outAA', to: '/BBB@inBB'}, newGraph)).to.be.true
      expect(Graph.hasEdge({from: '/AAA@0', to: '/BBB@0'}, newGraph)).to.be.true
      expect(Graph.hasEdge({from: '/AAA@outAA', to: '/BBB@inC'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/AAA@5', to: '/BBB@0'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/AAA@0', to: '/BBB@5'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/AAA@outCCC', to: '/BBB@inBB'}, newGraph)).to.be.false
    })

    it('Check whether an edge is in the graph with /componentId syntax for multiple components', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ref: 'BB', ports: [{port: 'inB', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ref: 'AA', ports: [{port: 'outA', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'a2', ref: 'AA', ports: [{port: 'outA', kind: 'output', type: 'a'}]})
      )()
      var newGraph = Graph.addEdge({from: 'a2@outA', to: 'b@inB'}, graph)
      // ref
      expect(Graph.hasEdge({from: '/AA@outA', to: '/BB@inB'}, newGraph)).to.be.true
      expect(Graph.hasEdge({from: '/AA@outA', to: '/BB@inC'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/AA@outD', to: '/BB@inB'}, newGraph)).to.be.false
    })

    it('Check whether an edge is in the graph with /componentId syntax for multiple components with port numbers', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ref: 'BB', ports: [{port: 'inB', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ref: 'AA', ports: [{port: 'outA', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'a2', ref: 'AA', ports: [{port: 'outA', kind: 'output', type: 'a'}]})
      )()
      var newGraph = Graph.addEdge({from: 'a2@outA', to: 'b@inB'}, graph)
      // ref
      expect(Graph.hasEdge({from: '/AA@0', to: '/BB@0'}, newGraph)).to.be.true
      expect(Graph.hasEdge({from: '/AA@1', to: '/BB@0'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/AA@0', to: '/BB@1'}, newGraph)).to.be.false
    })

    it('Check whether an parent port notation is possible with the number style', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ref: 'BB', ports: [{port: 'inB', kind: 'input', type: 'a'}]})
      )()
      graph.ports = [{port: 'a', kind: 'input', type: 'generic'}]
      var newGraph = Graph.addEdge({from: '@0', to: 'b@inB'}, graph)
      // ref
      expect(Graph.hasEdge({from: '@0', to: '/BB@0'}, newGraph)).to.be.true
    })

    it.skip('It should not find the parent in compound queries', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ref: 'BB', ports: [{port: 'inB', kind: 'input', type: 'a'}]})
      )()
      graph.ports = [{port: 'a', kind: 'input', type: 'generic'}]
      graph.componentId = 'OUTER'
      var newGraph = Graph.addEdge({from: '@0', to: 'b@inB'}, graph)
      // ref
      expect(Graph.hasEdge({from: '/OUTER@0', to: '/BB@0'}, newGraph)).to.be.false
      expect(Graph.hasEdge({from: '/OUTER', to: '/BB@0'}, newGraph)).to.be.false
    })

    it('Check whether an edge is in the graph with /ref or /componentId syntax in edges', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'b', ref: 'BB', ports: [{port: 'inB', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'a', ref: 'AA', ports: [{port: 'outA', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'bb', componentId: 'BBB', ports: [{port: 'inBB', kind: 'input', type: 'a'}]}),
        Graph.addNode({name: 'aa', componentId: 'AAA', ports: [{port: 'outAA', kind: 'output', type: 'a'}]})
      )()
      var newGraph = Graph.addEdge({from: 'a@outA', to: 'b@inB'},
                     Graph.addEdge({from: 'aa@outAA', to: 'bb@inBB'}, graph))
      // ref
      expect(Graph.hasEdge({from: '/AA', to: '/BB'}, graph)).to.be.false
      expect(Graph.hasEdge({from: '/AA', to: '/BB'}, newGraph)).to.be.true
      // componentId
      expect(Graph.hasEdge({from: '/AAA', to: '/BBB'}, graph)).to.be.false
      expect(Graph.hasEdge({from: '/AAA', to: '/BBB'}, newGraph)).to.be.true
    })

    it('Get an edge in the graph', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in'})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'a'}]}))
      var graph = Graph.addNode(cmpd, Graph.empty())
      expect(Graph.edge({from: '»c»a@out', to: '»c»b@in', graph})).to.be.ok
      expect(() => Graph.edge({from: 'a@out', to: 'b@in'}, graph)).to.throw(Error)
    })

    it('Can add edges in compounds', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'a'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd),
        Graph.addEdge({from: '»c»a@out', to: '»c»b@in'})
      )()
      // accessible via the root graph
      expect(Graph.edge({from: '»c»a@out', to: '»c»b@in', graph})).to.be.ok
      // accessible via the compound node
      expect(Graph.edge({from: 'a@out', to: 'b@in', graph}, Graph.node('c', graph))).to.be.ok
    })

    it('Can connect from the compound to an inner node', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'a'}]})
      )(Graph.compound({name: 'c', ports: [{port: 'in', kind: 'input', type: 'a'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd),
        Graph.addEdge({from: '»c@in', to: '»c»a@in'})
      )()
      expect(Graph.successors('c', graph, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.node(Graph.successors('c', graph, {goIntoCompounds: true})[0], graph).name).to.equal('a')
    })

    it('Can connect from the root compound to an inner node', () => {
      const cmpd = Graph.compound({ports: [{port: 'in', kind: 'input', type: 'a'}]})
      const graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: '@in', to: 'a@in'})
      )(cmpd)
      expect(Graph.successors(cmpd.id, graph, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.node(Graph.successors(cmpd.id, graph, {goIntoCompounds: true})[0], graph).name).to.equal('a')
    })

    it('Fails if the connecting ports do not exist', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]})
      )()
      expect(() => Graph.addEdge({from: 'a@no', to: 'b@in', parent: 'a'}, graph)).to.throw(Error)
      expect(() => Graph.addEdge({from: 'a@out', to: 'b@no', parent: 'a'}, graph)).to.throw(Error)
      expect(() => Graph.addEdge({from: 'a@no', to: 'b@no', parent: 'a'}, graph)).to.throw(Error)
      expect(() => Graph.addEdge({from: 'a@in', to: 'b@out', parent: 'a'}, graph)).to.throw(Error)
    })

    it('Gets the predecessors for a node', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in'})
      )()
      expect(_.map(Graph.predecessors('b', graph), 'port')).to.eql(['out'])
      expect(_.map(Graph.predecessors({node: 'b', port: 'in'}, graph), 'port')).to.eql(['out'])
    })

    it('Returns the predecessors inside a compound node', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'a'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd),
        Graph.addEdge({from: '»c»a@out', to: '»c@out'})
      )()
      expect(Graph.predecessors('c', graph, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.node(Graph.predecessor('c', graph, {goIntoCompounds: true}), graph).name).to.equal('a')
    })

    it('adds edges via a flow', () => {
      var graph = Graph.flow(
        Graph.Let(
          [
            Graph.addNode({ports: [{port: 'out', kind: 'output'}]}),
            Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input'}]})
          ], ([n1, n2], graph) =>
          Graph.addEdge({from: port(n1, 'out'), to: port(n2, 'in')}, graph)
        )
      )()
      expect(Graph.predecessors('b', graph)).to.have.length(1)
      expect(Graph.predecessor('b', graph).port).to.equal('out')
      expect(Graph.predecessors('b', graph)[0].port).to.equal('out')
      expect(Graph.predecessors({node: 'b', port: 'in'}, graph)[0].port).to.equal('out')
    })

    it('Can remove an edge', () => {
      var graph = Graph.flow(
        Graph.Let([
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output'}]}),
          Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input'}]})
        ], ([newNode1, newNode2], graph) =>
          Graph.addEdge({from: port(newNode1, 'out'), to: port(newNode2, 'in')}, graph))
      )()
      var edge = Graph.inIncident('b', graph)
      expect(Graph.edgesDeep(Graph.removeEdge(edge, graph)).length).to.equal(0)
      expect(Graph.edgesDeep(Graph.removeEdge({from: 'a@out', to: 'b@in'}, graph)).length).to.equal(0)
    })

    it('Can remove an edge inside a compound', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'a'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd),
        Graph.addEdge({from: '»c»a@out', to: '»c»b@in'})
      )()
      var edge = Graph.inIncident('»c»b', graph)
      expect(Graph.edgesDeep(Graph.removeEdge(edge, graph)).length).to.equal(0)
      expect(Graph.edgesDeep(Graph.removeEdge({from: '»c»a@out', to: '»c»b@in'}, graph)).length).to.equal(0)
    })

    it.skip('Supports special syntax', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input'}, {port: 'out', kind: 'output'}]}),
        Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input'}]}),
        (graph, objs) => Graph.addEdge({from: port(objs()[0], 'out'), to: port(objs()[1], 'in')})(graph),
        Graph.addEdge({from: 'b@out', to: 'c@in'})
      )()
      // all edges from a to b
      expect(Graph.edgesDeep(Graph.removeEdge({from: 'a', to: 'b'}, graph)).length).to.equal(1)
      // all edges from a
      expect(Graph.edgesDeep(Graph.removeEdge({from: 'a'}, graph)).length).to.equal(1)
      expect(Graph.edgesDeep(Graph.removeEdge('a→', graph)).length).to.equal(1)
      // all edges to b
      expect(Graph.edgesDeep(Graph.removeEdge({to: 'b'}, graph)).length).to.equal(1)
      expect(Graph.edgesDeep(Graph.removeEdge('→b', graph)).length).to.equal(1)
      // all edges from and to b
      expect(Graph.edgesDeep(Graph.removeEdge('b', graph)).length).to.equal(0)
      expect(Graph.edgesDeep(Graph.removeEdge('→b→', graph)).length).to.equal(0)
    })

    it('Gets the successors for a node', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input'}]}),
        Graph.addNode({name: 'c', ports: [{port: 'in2', kind: 'input'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in'}),
        Graph.addEdge({from: 'a@out', to: 'c@in2'})
      )()
      expect(Graph.successors('a', graph)).to.have.length(2)
      expect(_.map(Graph.successors('a', graph), 'port')).to.deep.have.members(['in', 'in2'])
    })

    it('is possible to add a non dataflow edge', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input'}]}),
        Graph.addEdge({from: 'a', to: 'b', layer: 'recursion'})
      )()
      expect(Graph.edges(graph)).to.have.length(1)
      expect(Graph.hasEdge({from: 'a', to: 'b', layer: 'recursion'}, graph)).to.be.true
    })

    it('is possible to add a non dataflow edge in compounds', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input'}]})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd),
        Graph.addEdge({from: '»c»a', to: 'c', layer: 'recursion'})
      )()
      expect(Graph.edgesDeep(graph)).to.have.length(1)
      expect(Graph.hasEdge({from: '»c»a', to: 'c', layer: 'recursion'}, graph)).to.be.true
    })

    it('is possible to add a non dataflow edge inside compounds', () => {
      var cmpd = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input'}]}),
        Graph.addEdge({from: 'a', to: '', layer: 'recursion'})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd)
      )()
      expect(Graph.edgesDeep(graph)).to.have.length(1)
      expect(Graph.hasEdge({from: '»c»a', to: 'c', layer: 'recursion'}, graph)).to.be.true
    })

    it('adds edge types', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in'})
      )()
      expect(Graph.edges(graph)[0]).to.have.property('type', 'a')
    })

    it('does not break due to the cache', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in'}),
        Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
        Graph.addEdge({from: 'a@out', to: 'c@in'}),
      )()
      expect(Graph.edges(graph)[0]).to.have.property('type', 'a')
    })

    it('does not implicity go in compounds when looking for node predecessors / successors', () => {
      var graph = Graph.fromJSON(JSON.parse(fs.readFileSync('./test/fixtures/print-thread-co.json', 'utf8')))
      expect(Graph.successors('/thread', graph)).to.have.length(1)
      expect(Graph.outIncidents('/thread', graph)).to.have.length(1)
      expect(Graph.predecessors('/thread', graph)).to.have.length(1)
      expect(Graph.inIncidents('/thread', graph)).to.have.length(1)
    })
  })
})
