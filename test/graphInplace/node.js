/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Port from '../../src/port'

var expect = chai.expect

const toIP = (g) => { g.inplace = true; return g }

describe('Inplace methods', () => {
  describe('Basic graph functions', () => {
    describe('Basic Node functions', () => {
      it('adds nodes to the graph', () => {
        var graph = Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}]}, toIP(Graph.empty()))
        expect(Graph.hasNode('a', graph)).to.be.true
      })

      it('can flow adding nodes', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}]}),
          Graph.addNode({name: 'b', ports: [{port: 'p', kind: 'output', type: 'a'}]}),
          {inPlace: true}
        )()
        expect(Graph.nodes(graph)).to.have.length(2)
      })

      it('sets the type of ports to `generic` if no type is given', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'input'}]}),
          {inPlace: true}
        )()
        expect(Graph.node('a', graph).ports[0].type).to.equal('generic')
      })

      it('should throw an error if an node with the same name gets added twice', () => {
        var graph = Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}]}, toIP(Graph.empty()))
        expect(() => Graph.addNode({name: 'a', prop: 'p'}, graph)).to.throw(Error)
      })

      it('can check whether a node exists in the graph', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}]}),
          Graph.addNode({name: 'b', ports: [{port: 'p', kind: 'output', type: 'a'}]}),
          {inPlace: true}
        )()
        expect(Graph.hasNode('a', graph)).to.be.true
        expect(Graph.hasNode({name: 'b'}, graph)).to.be.true
      })

      it('can update a port of a node', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}, {port: 'p2', kind: 'output', type: 'a'}]}),
          {inPlace: true}
        )()
        var graph1 = Graph.setNodePort('a', 'p', {type: 'c'}, graph)
        var graph2 = Graph.setNodePort('a', 1, {type: 'd'}, graph)
        expect(Graph.node('a', graph1).ports[0].type).to.equal('c')
        expect(Graph.node('a', graph2).ports[1].type).to.equal('d')
      })

      it('can replace a port of a node', () => {
        const graph = Graph.addNode({name: 'a', ports: [{port: 'a', kind: 'output', type: 'generic'}]}, toIP(Graph.empty()))
        const repGraph = Graph.replacePort(Graph.port('a@a', graph), {kind: 'input'}, toIP(graph))
        expect(Port.kind(Graph.port('a@a', repGraph))).to.equal('input')
      })

      it('can replace a port of a node with a complex type', () => {
        const graph = Graph.addNode({name: 'a', ports: [{port: 'a', kind: 'output', type: { data: ['a', 'b'] }}]}, toIP(Graph.empty()))
        const repGraph = Graph.replacePort(Graph.port('a@a', graph), {type: {data: ['A']}}, toIP(graph))
        expect(Port.type(Graph.port('a@a', repGraph)).data).to.eql(['A'])
      })
    })
  })
})
