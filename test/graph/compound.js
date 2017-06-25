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
  describe('Compound Node functions', () => {
    it('sets the path when creating compounds', () => {
      var impl = Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]})
      expect(impl.path).to.eql([])
    })

    it('gets nodes by compound path', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )(Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      var n = Graph.node(['b', 'a'], graph)
      expect(n).to.be.ok
      expect(n.name).to.equal('a')
      n = Graph.node('»b»a', graph)
      expect(n).to.be.ok
      expect(n.name).to.equal('a')
    })

    it('does not confuse parent compounds and inner nodes', () => {
      var impl = Graph.addNode(
        {name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
        Graph.compound({name: 'a', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      var n = Graph.node(['a', 'a'], graph)
      expect(n).to.be.ok
      expect(n.name).to.equal('a')
      expect(n.path.map(toNames(graph))).to.eql(['a', 'a'])
      expect(n.atomic).to.be.true
    })

    it('checks nodes by compound path', () => {
      var impl = Graph.addNode(
        {name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
        Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      expect(Graph.hasNode(['b', 'a'], graph)).to.be.true
      expect(Graph.hasNode('»b»a', graph)).to.be.true
      expect(Graph.hasNode(['a'], graph)).to.be.false
      expect(Graph.hasNode(['a', 'b'], graph)).to.be.false
    })

    describe('.addNodeIn', () => {
      it('adds nodes in compounds', () => {
        var impl = Graph.addNode(
          {name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
          Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
        var graph = Graph.flow(
          Graph.addNode(impl),
          Graph.addNodeIn('b', {name: 'c', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
        )()
        expect(Graph.hasNode(['b', 'a'], graph)).to.be.true
        expect(Graph.hasNode(['b', 'c'], graph)).to.be.true
      })

      it('callback returns root graph', () => {
        var impl = Graph.addNode(
          {name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
          Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
        var graph = Graph.flow(
          Graph.addNode(impl),
        )()
        const newGraph = Graph.addNodeIn('b', {name: 'c', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}, graph,
          (n, g) => {
            expect(g.id).to.equal(graph.id)
            return g
          })
        expect(Graph.hasNode('b', newGraph)).to.be.true
        expect(Graph.hasNode('»b»c', newGraph)).to.be.true
      })
    })

    it('gets nodes deep including compound nodes', () => {
      var impl = Graph.addNode(
        {name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
        Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      var nodes = Graph.nodesDeep(graph)
      expect(nodes).to.have.length(3)
      expect(nodes.map((n) => Node.path(n).map(toNames(graph)))).to.have.deep.members([['b', 'a'], ['b'], []])
    })

    it('can get a node by component id', () => {
      var graph = Graph.flow(
        Graph.addNode({componentId: 'a', name: 'A', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addNode({componentId: 'b', name: 'B', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )()
      expect(Graph.node('/a', graph).name).to.equal('A')
      expect(Graph.node('/b', graph).name).to.equal('B')
    })

    it('can get a node by component ref', () => {
      var graph = Graph.flow(
        Graph.addNode({ref: 'a', name: 'A', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addNode({ref: 'b', name: 'B', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )()
      expect(Graph.node('/a', graph).name).to.equal('A')
      expect(Graph.node('/b', graph).name).to.equal('B')
    })

    it('removes a node on the root level', () => {
      var graph = Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}]}, Graph.empty())
      var remGraph = Graph.removeNode('a', graph)
      expect(remGraph).to.be.ok
      expect(Graph.nodes(remGraph)).to.have.length(0)
    })

    it('does not remove other nodes when removing a specific node', () => {
      var graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'p', kind: 'output', type: 'a'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'p', kind: 'output', type: 'a'}]})
      )()
      var remGraph = Graph.removeNode('a', graph)
      expect(remGraph).to.be.ok
      expect(Graph.nodes(remGraph)).to.have.length(1)
      expect(Graph.hasNode('a', remGraph)).to.be.false
      expect(Graph.hasNode('b', remGraph)).to.be.true
    })

    it('removes nodes in compounds', () => {
      var impl = Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
        Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      var remGraph = Graph.removeNode(['b', 'a'], graph)
      expect(Graph.hasNode('»b»a', remGraph)).to.be.false
      expect(Graph.hasNode('b', remGraph)).to.be.true
    })

    it('removes nodes in compounds in compounds', () => {
      var impl = Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
        Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var impl2 = Graph.addNode(impl, Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output'}]}))
      var graph = Graph.addNode(impl2, Graph.empty())
      var remGraph = Graph.removeNode(['c', 'b', 'a'], graph)
      expect(Graph.hasNode('»c»b»a', remGraph)).to.be.false
      expect(Graph.hasNode('c', remGraph)).to.be.true
      expect(Graph.hasNode('»c»b', remGraph)).to.be.true
    })

    it('removes compounds that contain nodes', () => {
      var impl = Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true},
        Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var impl2 = Graph.addNode(impl, Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output'}]}))
      var graph = Graph.addNode(impl2, Graph.empty())
      var remGraph = Graph.removeNode(['c', 'b'], graph)
      expect(Graph.hasNode('»c»b»a', remGraph)).to.be.false
      expect(Graph.hasNode('c', remGraph)).to.be.true
      expect(Graph.hasNode('»c»b', remGraph)).to.be.false
    })

    it('only removes specified node in compound', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )(Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      var remGraph = Graph.removeNode(['b', 'b'], graph)
      expect(Graph.hasNode('»b»a', remGraph)).to.be.true
      expect(Graph.hasNode('»b»b', remGraph)).to.be.false
      expect(Graph.hasNode('b', remGraph)).to.be.true
    })

    it('can address nodes relative to compound', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.addNode(impl, Graph.empty())
      expect(Graph.hasNode('a', Graph.node('c', graph))).to.be.true
      expect(Graph.hasNode('b', Graph.node('c', graph))).to.be.true
    })

    it('replaces references with a node', () => {
      var graph = Graph.flow(
        Graph.addNode({ref: 'abc', name: '123'}),
        Graph.replaceNode('123', {componentId: 'abc', ports: [{port: 'a', kind: 'output', type: 'string'}], atomic: true})
      )()
      expect(Graph.hasNode('123', graph)).to.be.true
      expect(Graph.nodes(graph)).to.have.length(1)
      expect(Graph.node('123', graph).atomic).to.be.true
      expect(Graph.node('123', graph).componentId).to.equal('abc')
      expect(Graph.node('123', graph).ref).to.be.undefined
      expect(Graph.node(Graph.node('123', graph).id, graph)).to.be.ok
    })

    it('replaces references with a compound node', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )(Graph.compound({componentId: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.replaceNode(
        '123', impl,
        Graph.addNode({ref: 'abc', name: '123'}, Graph.empty()))
      expect(Graph.hasNode('123', graph)).to.be.true
      expect(Graph.nodes(graph)).to.have.length(1)
      expect(Graph.nodesDeep(graph)).to.have.length(4)
      expect(Graph.hasNode('»123»a', graph)).to.be.true
      expect(Graph.hasNode('»123»b', graph)).to.be.true
      expect(Graph.node('»123»a', graph).id).to.eql(Graph.node(Graph.node('»123»a', graph).id, graph).id)
      expect(Graph.node('»123»b', graph).id).to.eql(Graph.node(Graph.node('»123»b', graph).id, graph).id)
    })

    it('replaces ports in short notation in edges when replacing', () => {
      var impl = Graph.flow(
        Graph.addEdge({from: '@in', to: '@out'})
      )(Graph.compound({componentId: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}, {port: 'in', kind: 'input', type: 'string'}]}))
      var replGraph = Graph.addNode({ref: 'abc', name: '123'}, Graph.empty())
      var graph = Graph.replaceNode(
        '123', impl, replGraph)
      var edges = Graph.incidents('123', graph)
      expect(edges).to.have.length(1)
      expect(Graph.isFrom('123', graph, edges[0])).to.be.true
      expect(Graph.pointsTo('123', graph, edges[0])).to.be.true
    })

    it('copes with multiple levels of compound nodes', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true})
      )(Graph.compound({name: 'comp', componentId: 'b', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var impl2 = Graph.flow(
        Graph.addNode(impl)
      )(Graph.compound({componentId: 'c', ports: [{port: 'out', kind: 'output'}]}))
      var graph = Graph.replaceNode(
        '123', impl2,
        Graph.addNode({ref: 'abc', name: '123'}, Graph.empty()))
      expect(Graph.hasNode('123', graph)).to.be.true
      expect(Graph.nodes(graph)).to.have.length(1)
      expect(Graph.nodesDeep(graph)).to.have.length(5)
      expect(Graph.hasNode('»123»comp»a', graph)).to.be.true
      expect(Graph.hasNode('»123»comp»b', graph)).to.be.true
      expect(Graph.node('»123»comp»a', graph).id).to.eql(Graph.node(Graph.node('»123»comp»a', graph).id, graph).id)
      expect(Graph.node('»123»comp»b', graph).id).to.eql(Graph.node(Graph.node('»123»comp»b', graph).id, graph).id)
    })

    it('Removing a node removes its edges', () => {
      var graph = Graph.flow(
        Graph.Let(
          [
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output'}]}),
            Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input'}]})
          ], ([node1, node2], graph) =>
            Graph.addEdge({from: port(node1, 'out'), to: port(node2, 'in')}, graph))
      )()
      expect(Graph.edgesDeep(Graph.removeNode('a', graph)).length).to.equal(0)
      expect(Graph.edgesDeep(Graph.removeNode('b', graph)).length).to.equal(0)
    })

    it('Adding a compound relabels all edges to the new id', () => {
      var comp = Graph.addEdge({from: '@inC', to: '@outC'},
        Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
      expect(Graph.predecessors('', comp, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.successors('', comp, {goIntoCompounds: true})).to.have.length(1)
      var graph = Graph.addNode(comp, Graph.empty())
      expect(Graph.predecessors('c', graph, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.successors('c', graph, {goIntoCompounds: true})).to.have.length(1)
      expect(Graph.predecessors('c', graph)).to.have.length(0)
      expect(Graph.successors('c', graph)).to.have.length(0)
    })

    it('is possible to set node values deep in the graph', () => {
      var cmpd1 = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input'}]})
      )(Graph.compound({name: 'b', ports: [{port: 'out', kind: 'output'}]}))
      var cmpd2 = Graph.flow(
        Graph.addNode(cmpd1)
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output'}]}))
      var graph = Graph.flow(
        Graph.addNode(cmpd2)
      )()
      var settedGraph = Graph.set({isSet: true}, '»c»b»a', graph)
      expect(Graph.get('isSet', '»c»b»a', settedGraph)).to.be.true
      var settedGraph2 = Graph.set({isSet: true}, '»c»b', graph)
      expect(Graph.get('isSet', '»c»b', settedGraph2)).to.be.true
      var settedGraph3 = Graph.set({isSet: true}, 'c', graph)
      expect(Graph.get('isSet', 'c', settedGraph3)).to.be.true
    })

    it('replaces all IDs inside a compound', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'number'}], atomic: true}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addEdge({from: 'a@out', to: 'b@in'})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      var graph = Graph.flow(
        Graph.Let(Graph.addNode(impl), (node, graph) =>
          Graph.addNodeIn(node, impl, graph))
      )()
      expect(Graph.hasNode('»c»a', graph)).to.be.true
      expect(Graph.hasNode('»c»b', graph)).to.be.true
      expect(Graph.hasNode('»c»c»a', graph)).to.be.true
      expect(Graph.hasNode('»c»c»b', graph)).to.be.true
    })

    it('replaces all IDs inside a compound', () => {
      var impl = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'number'}], atomic: true}),
        Graph.addNode({name: 'b', ports: [{port: 'in', kind: 'input', type: 'number'}], atomic: true}),
        Graph.addEdge({from: 'a@out', to: 'b@in'})
      )(Graph.compound({name: 'c', ports: [{port: 'out', kind: 'output', type: 'string'}]}))
      const emptyGraph = Graph.empty()
      var graph = Graph.flow(
        Graph.Let(Graph.addNodeIn(emptyGraph, impl), (node, graph) =>
          Graph.addNodeIn(node, impl, graph))
      )(emptyGraph)
      expect(Graph.hasNode('»c»a', graph)).to.be.true
      expect(Graph.hasNode('»c»b', graph)).to.be.true
      expect(Graph.hasNode('»c»c»a', graph)).to.be.true
      expect(Graph.hasNode('»c»c»b', graph)).to.be.true
    })

    it('Can replace full compounds', () => {
      const qsort = Graph.fromFile('./test/fixtures/qsort.json')

      const qnode = Graph.node('/quicksort', qsort)
      const parent = Graph.parent(qnode, qsort)
      const newGraph = Graph.flow(
        Graph.removeNode(qnode),
        Graph.addNodeIn(parent, qnode)
      )(qsort)
      expect(Graph.successors('/partition-right', newGraph, {goIntoCompounds: true})).to.have.length(3)
      expect(Graph.successors('/partition-left', newGraph, {goIntoCompounds: true})).to.have.length(3)
    })
  })
})