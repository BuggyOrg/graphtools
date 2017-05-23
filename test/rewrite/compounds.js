/* global describe, it */

import chai from 'chai'
import * as Graph from '../../src/graph'
import {includePredecessor, excludeNode, unCompound, compoundify} from '../../src/rewrite/compound'
import compoundifyInplace from '../../src/rewrite/inplaceCompoundify'
import * as Node from '../../src/node'
import _ from 'lodash'

var expect = chai.expect

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

describe('Rewrite basic API', () => {
  describe('» Compound', () => {
    describe('Including predecessors', () => {
      it('can include the direct predecessor of a compound port into the compound', () => {
        var comp = Graph.addEdge({from: '@inC', to: '@outC'},
          Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
              Graph.addNode(comp),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]})
            ], ([n1, n2, n3], graph) =>
            Graph.flow(
              Graph.addEdge({from: n1.id + '@outA', to: n2.id + '@inC'}),
              Graph.addEdge({from: n3.id + '@outF', to: n1.id + '@inA'})
            )(graph))
        )()
        expect(Graph.nodes(graph)).to.have.length(3)
        expect(Graph.nodes(Graph.node('c', graph))).to.have.length(0)
        require('../../src/debug').debug(graph)
        var rewGraph = includePredecessor({node: 'c', port: 'inC'}, graph)
        require('../../src/debug').debug(rewGraph)
        expect(Graph.nodes(rewGraph)).to.have.length(2)
        expect(Graph.nodes(Graph.node('c', rewGraph))).to.have.length(1)
        expect(Graph.inIncidents('c', rewGraph, {goIntoCompounds: true})).to.have.length(2)
        expect(Graph.node(Graph.predecessor('c@outC', rewGraph), rewGraph).componentId).to.equal('moved')
      })

      it('can include the direct predecessor via short notation', () => {
        var comp = Graph.addEdge({from: '@inC', to: '@outC'},
          Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
              Graph.addNode(comp),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]})
            ], ([n1, n2, n3], graph) =>
            Graph.flow(
              Graph.addEdge({from: n1.id + '@outA', to: n2.id + '@inC'}),
              Graph.addEdge({from: n3.id + '@outF', to: n1.id + '@inA'})
            )(graph))
        )()
        expect(Graph.nodes(graph)).to.have.length(3)
        expect(Graph.nodes(Graph.node('c', graph))).to.have.length(0)
        var rewGraph = includePredecessor('c@inC', graph)
        expect(Graph.nodes(rewGraph)).to.have.length(2)
        expect(Graph.nodes(Graph.node('c', rewGraph))).to.have.length(1)
        expect(Graph.inIncidents('c', rewGraph, {goIntoCompounds: true})).to.have.length(2)
        expect(Graph.node(Graph.predecessor('c@outC', rewGraph), rewGraph).componentId).to.equal('moved')
      })

      it('can include a node that is a predecessor of multiple ports', () => {
        var comp = Graph.flow(
          Graph.addNode({name: 'inner', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
          Graph.addEdge({from: '@inC1', to: '@outC'}),
          Graph.addEdge({from: '@inC2', to: 'inner@in'})
        )(Graph.compound({name: 'c', ports: [{port: 'inC1', kind: 'input'}, {port: 'inC2', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
              Graph.addNode(comp),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]})
            ], ([n1, n2, n3], graph) =>
            Graph.flow(
              Graph.addEdge({from: n1.id + '@outA', to: n2.id + '@inC1'}),
              Graph.addEdge({from: n1.id + '@outA', to: n2.id + '@inC2'}),
              Graph.addEdge({from: n3.id + '@outF', to: n1.id + '@inA'})
            )(graph))
        )()
        var rewGraph1 = includePredecessor('c@inC1', graph)
        var rewGraph2 = includePredecessor('c@inC2', graph)
        expect(Graph.nodes(rewGraph1)).to.have.length(2)
        expect(Graph.nodes(Graph.node('c', rewGraph1))).to.have.length(2)
        expect(Node.inputPorts(Graph.node('c', rewGraph1))).to.have.length(1)
        expect(Graph.nodes(rewGraph2)).to.have.length(2)
        expect(Graph.nodes(Graph.node('c', rewGraph2))).to.have.length(2)
        expect(Node.inputPorts(Graph.node('c', rewGraph2))).to.have.length(1)
      })

      it('can add new outputs for predecessor successors that are not inside the compound', () => {
        var comp = Graph.flow(
          Graph.addEdge({from: '@inC', to: '@outC'}),
        )(Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved', name: 'moved'}),
              Graph.addNode(comp),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
              Graph.addNode({ports: [{port: 'inOther', kind: 'input'}], name: 'other'})
            ], ([n1, n2, n3, n4], graph) =>
            Graph.flow(
              Graph.addEdge({from: n1.id + '@outA', to: n2.id + '@inC'}),
              Graph.addEdge({from: n3.id + '@outF', to: n1.id + '@inA'}),
              Graph.addEdge({from: 'moved@outA', to: 'other@inOther'})
            )(graph))
        )()
        expect(Node.outputPorts(Graph.node('c', graph))).to.have.length(1)
        var rewGraph1 = includePredecessor('c@inC', graph)
        expect(Graph.nodes(rewGraph1)).to.have.length(3)
        expect(Graph.nodes(Graph.node('c', rewGraph1))).to.have.length(1)
        expect(Node.inputPorts(Graph.node('c', rewGraph1))).to.have.length(1)
        expect(Node.outputPorts(Graph.node('c', rewGraph1))).to.have.length(2)
      })

      it('can include a preceeding node whose ports all point to the compound', () => {
        var comp = Graph.flow(
          Graph.addNode({name: 'inner', ports: [{port: 'in', kind: 'input', type: 'a'}]}),
          Graph.addEdge({from: '@inC1', to: '@outC'}),
          Graph.addEdge({from: '@inC2', to: 'inner@in'})
        )(Graph.compound({name: 'c', ports: [{port: 'inC1', kind: 'input'}, {port: 'inC2', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'outB', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
              Graph.addNode(comp),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]})
            ], ([n1, n2, n3], graph) =>
              Graph.flow(
                Graph.addEdge({from: n1.id + '@outA', to: n2.id + '@inC1'}),
                Graph.addEdge({from: n1.id + '@outB', to: n2.id + '@inC2'}),
                Graph.addEdge({from: n3.id + '@outF', to: n1.id + '@inA'})
              )(graph))
        )()
        var rewGraph1 = includePredecessor('c@inC1', graph)
        var rewGraph2 = includePredecessor('c@inC2', graph)
        expect(Graph.nodes(rewGraph1)).to.have.length(2)
        expect(Graph.nodes(Graph.node('c', rewGraph1))).to.have.length(2)
        expect(Node.inputPorts(Graph.node('c', rewGraph1))).to.have.length(1)
        expect(Graph.nodes(rewGraph2)).to.have.length(2)
        expect(Graph.nodes(Graph.node('c', rewGraph2))).to.have.length(2)
        expect(Node.inputPorts(Graph.node('c', rewGraph2))).to.have.length(1)
      })

      it('removes ports that are unused after including predecessor', () => {
        var comp = Graph.flow(
          Graph.addNode({name: 'inner1', ports: [{port: 'in', kind: 'input', type: 'a'}, {port: 'out', kind: 'output', type: 'a'}]}),
          Graph.addNode({name: 'inner2', ports: [{port: 'in', kind: 'input', type: 'a'}, {port: 'out', kind: 'output', type: 'a'}]}),
          Graph.addEdge({from: '@inC1', to: 'inner1@in'}),
          Graph.addEdge({from: '@inC2', to: 'inner2@in'}),
          Graph.addEdge({from: 'inner1@out', to: '@outC'}),
          Graph.addEdge({from: 'inner2@out', to: '@outC'})
        )(Graph.compound({name: 'c', ports: [{port: 'inC1', kind: 'input'}, {port: 'inC2', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'in', kind: 'input', type: 'a'}]}),
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'outB', kind: 'output'}, {port: 'inA', kind: 'input'}], componentId: 'moved'}),
              Graph.addNode(comp),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]})
            ], ([n1, n2, n3, n4], graph) =>
              Graph.flow(
                Graph.addEdge({from: n2.id + '@outA', to: n3.id + '@inC1'}),
                Graph.addEdge({from: n2.id + '@outB', to: n3.id + '@inC2'}),
                Graph.addEdge({from: n4.id + '@outF', to: n2.id + '@inA'}),
                Graph.addEdge({from: n3.id + '@outC', to: n1.id + '@in'})
              )(graph))
        )()
        expect(Node.inputPorts(comp)).to.have.length(2)
        var inc = includePredecessor('c@inC1', graph)
        expect(Node.inputPorts(Graph.node('c', inc))).to.have.length(1)
      })

      it('can include the fac node in the untypified fac example', function () {
        this.timeout(15000)
        const graph = Graph.fromFile('test/fixtures/fac_no_types.json')
        const multNode = Graph.node('/math/multiply', graph)
        compoundify('/fac', [multNode], graph, (comp, resGraph) => {
          return includePredecessor(Node.inputPorts(comp)[1], resGraph, (newComp, graph) => {
            expect(Node.inputPorts(newComp)).to.have.length(2)
          })
        })
      })

      it('makes port names unique', () => {
        const cmpd = Graph.flow(
          Graph.addNode({name: 'N', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addEdge({from: '@in', to: 'N@in'}),
          Graph.addEdge({from: 'N@out', to: '@out'})
        )(Graph.compound({name: 'C', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}))

        const graph = Graph.flow(
          Graph.addNode({name: 'pred1', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addNode({name: 'pred2', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addNode(cmpd),
          Graph.addEdge({from: 'pred1@out', to: 'pred2@in'}),
          Graph.addEdge({from: 'pred2@out', to: 'C@in2'})
        )()

        const pGraph = includePredecessor('C@in2', graph)
        expect(pGraph).to.be.ok
        expect(Graph.edges(pGraph)).to.have.length(1)
        expect(Graph.successors('pred1', pGraph)).to.have.length(1)
        expect(Graph.predecessors('C', pGraph)).to.have.length(1)
      })

      it('can handle complex types', () => {
        const cmpd = Graph.flow(
          Graph.addNode({name: 'N', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addEdge({from: '@in', to: 'N@in'}),
          Graph.addEdge({from: 'N@out', to: '@out'})
        )(Graph.compound({name: 'C', ports: [{port: 'in', kind: 'input', type: {name: 'A', data: ['g']}}, {port: 'in2', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}))

        const graph = Graph.flow(
          Graph.addNode({name: 'pred1', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: {name: 'A', data: ['g']}}]}),
          Graph.addNode({name: 'pred2', ports: [{port: 'in', kind: 'input', type: {name: 'A', data: ['g']}}, {port: 'out', kind: 'output', type: {name: 'A', data: ['g']}}]}),
          Graph.addNode(cmpd),
          Graph.addEdge({from: 'pred1@out', to: 'pred2@in'}),
          Graph.addEdge({from: 'pred2@out', to: 'C@in2'})
        )()

        const pGraph = includePredecessor('C@in2', graph)
        expect(pGraph).to.be.ok
        expect(Graph.edges(pGraph)).to.have.length(1)
        expect(Graph.successors('pred1', pGraph)).to.have.length(1)
        expect(Graph.predecessors('C', pGraph)).to.have.length(1)
      })
    })

    describe('Excluding inner nodes', () => {
      it('moves a node out of an compound', () => {
        var comp = Graph.flow(
          Graph.Let(Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], name: 'a'}),
            (node, graph) =>
              Graph.flow(
                Graph.addEdge({from: '@inC', to: node.id + '@inA'}),
                Graph.addEdge({to: '@outC', from: node.id + '@outA'})
              )(graph))
        )(Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
              Graph.addNode(comp)
            ], ([node1, node2], graph) =>
              Graph.addEdge({from: node1.id + '@outF', to: 'c@inC'})(graph))
        )()
        expect(Graph.nodes(graph)).to.have.length(2)
        var rewGraph = excludeNode('»c»a', graph)
        expect(Graph.nodes(rewGraph)).to.have.length(3)
        expect(Graph.predecessors('c@outA', rewGraph)).to.have.length(1)
        expect(Graph.node(Graph.predecessor('c@outA', rewGraph), rewGraph).name).to.equal('a')
        expect(Graph.node(Graph.successors('c@outA', rewGraph)[0], rewGraph).name).to.equal('c')
        expect(Graph.node(Graph.predecessor('c@outC', rewGraph), rewGraph).name).to.equal('c')
        expect(Node.hasPort('inC', Graph.node('c', rewGraph))).to.be.false
      })

      it('throws an error if the node has predecessors in the compound node', () => {
        var comp = Graph.flow(
          Graph.Let(
            [
              Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}, {port: 'inB', kind: 'input'}], name: 'a'}),
              Graph.addNode({ports: [{port: 'outF', kind: 'output'}]})
            ], ([node1, node2], graph) =>
            Graph.flow(
              Graph.addEdge({from: node2.id + '@outF', to: node1.id + '@inA'}),
              Graph.addEdge({from: '@inC', to: node1.id + '@inB'})
            )(graph))
        )(Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.addNode(comp, Graph.empty())
        expect(() => excludeNode('a', graph)).to.throw(Error)
      })
    })

    describe('Removing the compound boundaries completely', () => {
      it('Can process empty compounds', () => {
        var graph = Graph.addNode(
          Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}),
          Graph.empty())
        expect(Graph.nodes(unCompound('c', graph))).to.have.length(0)
      })

      it('moves all nodes out of an compound', () => {
        var comp = Graph.flow(
          Graph.addNode({ports: [{port: 'outA', kind: 'output'}, {port: 'inA', kind: 'input'}], name: 'a'}),
          Graph.addNode({ports: [{port: 'outB', kind: 'output'}, {port: 'inB', kind: 'input'}], name: 'b'}),
          Graph.addEdge({from: '@inC', to: 'a@inA'}),
          Graph.addEdge({to: 'b@inB', from: 'a@outA'}),
          Graph.addEdge({to: '@outC', from: 'b@outB'})
        )(Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]}))
        var graph = Graph.flow(
          Graph.Let([
            Graph.addNode({ports: [{port: 'outF', kind: 'output'}]}),
            Graph.addNode({ports: [{port: 'inH', kind: 'input'}], name: 'h'}),
            Graph.addNode(comp)
          ], ([node1, node2, node3], graph) =>
            Graph.flow(
              Graph.addEdge({from: node1.id + '@outF', to: 'c@inC'}),
              Graph.addEdge({from: 'c@outC', to: node2.id + '@inH'})
            )(graph))
        )()
        expect(Graph.nodes(graph)).to.have.length(3)
        var rewGraph = unCompound('c', graph)
        expect(Graph.nodes(rewGraph)).to.have.length(4)
        expect(Graph.predecessors('h', rewGraph)).to.have.length(1)
      })
    })

    it('Can replace nodes in compounds without affecting their edges', () => {
      var cmp = Graph.flow(
        Graph.addNode({
          name: 'Source',
          ports: [
            { port: 'out', kind: 'output', type: 'generic' }
          ]
        }),
        Graph.addNode({
          name: 'Sink',
          ports: [
            { port: 'in', kind: 'input', type: 'number' }
          ]
        }),
        Graph.addEdge({ from: 'Source@out', to: 'Sink@in' })
      )(Graph.compound({ }))
      var graph = Graph.addNode(cmp, Graph.empty())
      expect(Graph.edgesDeep(graph)).to.have.length(1)
      var node = Graph.nodesDeepBy((n) => n.name === 'Source', graph)[0]
      var newNode = _.cloneDeep(node)
      var newGraph = Graph.replaceNode(node, newNode, graph)
      expect(Graph.edgesDeep(newGraph)).to.have.length(1)
    })

    describe('Compoudify', () => {
      it('Can compoundify one node', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const cmpd = compoundify(graph, ['b'], graph)
        expect(Graph.successors('a', cmpd)).to.have.length(1)
        expect(Graph.node(Graph.successors('a', cmpd)[0], cmpd).atomic).to.be.false
        expect(Graph.predecessors('c', cmpd)).to.have.length(1)
        expect(Graph.node(Graph.predecessors('c', cmpd)[0], cmpd).atomic).to.be.false
      })

      it('Creates new generic type names for ports', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        compoundify(graph, ['b'], graph, (c, g) => {
          expect(c.ports.every((p) => p.type !== 'g')).to.be.true
        })
        compoundify(graph, ['c', 'b'], graph, (c, g) => {
          expect(c.ports.every((p) => p.type !== 'g')).to.be.true
        })
      })

      it('Can compoundify all nodes in a compound layer', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        const cmpd = compoundify(graph, ['b', 'a', 'c'], graph)
        expect(Graph.nodes(cmpd)).to.have.length(1)
        expect(Graph.nodes(Graph.nodes(cmpd)[0])).to.have.length(3)
      })

      it('Can compoundify all nodes in a compound layer with multiple ends', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'd', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'}),
          Graph.addEdge({from: 'b@out', to: 'd@in'})
        )()
        const cmpd = compoundify(graph, ['b', 'a', 'c', 'd'], graph)
        expect(Graph.nodes(cmpd)).to.have.length(1)
        expect(Graph.nodes(Graph.nodes(cmpd)[0])).to.have.length(4)
      })

      it('can compoundify compound nodes', () => {
        const cmpd = Graph.flow(
          Graph.addNode({name: 'N', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addEdge({from: '@in', to: 'N@in'}),
          Graph.addEdge({from: 'N@out', to: '@out'})
        )(Graph.compound({name: 'C', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}))
        const graph = Graph.flow(
          Graph.addNode(cmpd)
        )()
        const cmpdGraph = compoundify(graph, ['C'], graph)
        expect(cmpdGraph).to.be.ok
        expect(Graph.nodes(cmpdGraph)).to.have.length(1)
        expect(Graph.nodesDeep(cmpdGraph)).to.have.length(4)

        const graph2 = Graph.flow(
          Graph.addNode({name: 'pred1', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addNode({name: 'pred2', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addNode({name: 'succ1', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
          Graph.addNode(cmpd),
          Graph.addEdge({from: 'pred1@out', to: 'pred2@in'}),
          Graph.addEdge({from: 'pred2@out', to: 'C@in'}),
          Graph.addEdge({from: 'C@out', to: 'succ1@in'})
        )()
        const cmpdGraph2 = compoundify(graph2, ['pred2', 'C'], graph2)
        expect(cmpdGraph2).to.be.ok
        expect(Graph.nodes(cmpdGraph2)).to.have.length(3)
      })

      it('» Can handle testing multiple blocked nodes', () => {
        const graph = Graph.flow(
          Graph.addNode(ifNode({name: 'if'})),
          Graph.addNode({name: 'a1', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'Number'}, {port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
          Graph.addEdge({from: 'a1@out', to: 'a@in'}),
          Graph.addEdge({from: 'a@out', to: 'if@a'}),
          Graph.addEdge({from: 'b@out', to: 'if@b'}),
          Graph.addEdge({from: '@cond', to: 'if@cond'}),
          Graph.addEdge({from: 'if@out', to: '@out'})
        )(Graph.compound({ports: [{port: 'cond', kind: 'input', type: 'Bool'}, {port: 'out', kind: 'output', type: 'generic'}]}))

        const rewGraph = compoundify(graph, ['a', 'a1'], graph)
        expect(Graph.nodes(rewGraph)).to.have.length(3)
        expect(Graph.hasNode('a', rewGraph)).to.not.be.true
        expect(Graph.hasNode('a1', rewGraph)).to.not.be.true
      })

      it('Fails if the node is blocked', () => {
        var graph = Graph.flow(
          Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
          Graph.addEdge({from: 'a@out', to: 'b@in'}),
          Graph.addEdge({from: 'b@out', to: 'c@in'})
        )()
        expect(() => compoundify(graph, ['a', 'c'], graph)).to.throw(Error)
      })

      it('Can handle untypified factorial example', function () {
        this.timeout(15000)
        const graph = Graph.fromFile('test/fixtures/fac_no_types.json')
        const addNode = Graph.node('/math/add', graph)
        const nodes = [
          addNode,
          Graph.node('/math/multiply', graph),
          Graph.successors(addNode, graph)[0],
          Graph.predecessor(Node.port('summand2', addNode), graph)
        ]
        compoundify('/fac', nodes, graph, (comp, resGraph) => {
          expect(Node.inputPorts(comp)).to.have.length(2)
        })
      })

      describe('[Inpalce]', () => {
        it('Can compoundify one node', () => {
          var graph = Graph.flow(
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addEdge({from: 'a@out', to: 'b@in'}),
            Graph.addEdge({from: 'b@out', to: 'c@in'})
          )()
          const cmpd = compoundifyInplace(graph, ['b'], graph)
          expect(Graph.successors('a', cmpd)).to.have.length(1)
          expect(Graph.node(Graph.successors('a', cmpd)[0], cmpd).atomic).to.be.false
          expect(Graph.predecessors('c', cmpd)).to.have.length(1)
          expect(Graph.node(Graph.predecessors('c', cmpd)[0], cmpd).atomic).to.be.false
        })

        it('Creates new generic type names for ports', () => {
          var graph = () => Graph.flow(
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addEdge({from: 'a@out', to: 'b@in'}),
            Graph.addEdge({from: 'b@out', to: 'c@in'})
          )()
          var graph1 = graph()
          compoundifyInplace(graph1, ['b'], graph1, (c, g) => {
            expect(c.ports.every((p) => p.type !== 'g')).to.be.true
          })
          var graph2 = graph()
          compoundifyInplace(graph2, ['c', 'b'], graph2, (c, g) => {
            expect(c.ports.every((p) => p.type !== 'g')).to.be.true
          })
        })

        it('Can compoundify all nodes in a compound layer', () => {
          var graph = Graph.flow(
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addEdge({from: 'a@out', to: 'b@in'}),
            Graph.addEdge({from: 'b@out', to: 'c@in'})
          )()
          const cmpd = compoundifyInplace(graph, ['b', 'a', 'c'], graph)
          expect(Graph.nodes(cmpd)).to.have.length(1)
          expect(Graph.nodes(Graph.nodes(cmpd)[0])).to.have.length(3)
        })

        it('Can compoundify all nodes in a compound layer with multiple ends', () => {
          var graph = Graph.flow(
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'd', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addEdge({from: 'a@out', to: 'b@in'}),
            Graph.addEdge({from: 'b@out', to: 'c@in'}),
            Graph.addEdge({from: 'b@out', to: 'd@in'})
          )()
          const cmpd = compoundifyInplace(graph, ['b', 'a', 'c', 'd'], graph)
          expect(Graph.nodes(cmpd)).to.have.length(1)
          expect(Graph.nodes(Graph.nodes(cmpd)[0])).to.have.length(4)
        })

        it('can compoundify compound nodes', () => {
          const cmpd = Graph.flow(
            Graph.addNode({name: 'N', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
            Graph.addEdge({from: '@in', to: 'N@in'}),
            Graph.addEdge({from: 'N@out', to: '@out'})
          )(Graph.compound({name: 'C', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}))
          const graph = Graph.flow(
            Graph.addNode(cmpd)
          )()
          const cmpdGraph = compoundifyInplace(graph, ['C'], graph)
          expect(cmpdGraph).to.be.ok
          expect(Graph.nodes(cmpdGraph)).to.have.length(1)
          expect(Graph.nodesDeep(cmpdGraph)).to.have.length(4)

          const graph2 = Graph.flow(
            Graph.addNode({name: 'pred1', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
            Graph.addNode({name: 'pred2', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
            Graph.addNode({name: 'succ1', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'out', kind: 'output', type: 'g'}]}),
            Graph.addNode(cmpd),
            Graph.addEdge({from: 'pred1@out', to: 'pred2@in'}),
            Graph.addEdge({from: 'pred2@out', to: 'C@in'}),
            Graph.addEdge({from: 'C@out', to: 'succ1@in'})
          )()
          const cmpdGraph2 = compoundifyInplace(graph2, ['pred2', 'C'], graph2)
          expect(cmpdGraph2).to.be.ok
          expect(Graph.nodes(cmpdGraph2)).to.have.length(3)
        })

        it('» Can handle testing multiple blocked nodes', () => {
          const graph = Graph.flow(
            Graph.addNode(ifNode({name: 'if'})),
            Graph.addNode({name: 'a1', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
            Graph.addNode({name: 'a', ports: [{port: 'in', kind: 'input', type: 'Number'}, {port: 'out', kind: 'output', type: 'Number'}]}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
            Graph.addEdge({from: 'a1@out', to: 'a@in'}),
            Graph.addEdge({from: 'a@out', to: 'if@a'}),
            Graph.addEdge({from: 'b@out', to: 'if@b'}),
            Graph.addEdge({from: '@cond', to: 'if@cond'}),
            Graph.addEdge({from: 'if@out', to: '@out'})
          )(Graph.compound({ports: [{port: 'cond', kind: 'input', type: 'Bool'}, {port: 'out', kind: 'output', type: 'generic'}]}))

          const rewGraph = compoundifyInplace(graph, ['a', 'a1'], graph)
          expect(Graph.nodes(rewGraph)).to.have.length(3)
          expect(Graph.hasNode('a', rewGraph)).to.not.be.true
          expect(Graph.hasNode('a1', rewGraph)).to.not.be.true
        })

        it('Can compoundify multiple nodes', () => {
          var graph = Graph.flow(
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'c', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'd', ports: [{port: 'in', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addEdge({from: 'a@out', to: 'b@in'}),
            Graph.addEdge({from: 'a@out', to: 'd@in2'}),
            Graph.addEdge({from: 'b@out', to: 'c@in'}),
            Graph.addEdge({from: 'c@out', to: 'd@in'})
          )()
          const cmpd = compoundifyInplace(graph, ['b', 'c'], graph)
          expect(Graph.successors('a', cmpd)).to.have.length(2)
          expect(Graph.node(Graph.predecessors('d@in', cmpd)[0], cmpd).atomic).to.be.false
        })

        it('Fails if the node is blocked', () => {
          var graph = Graph.flow(
            Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'g'}, {port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addNode({name: 'c', ports: [{port: 'in', kind: 'input', type: 'g'}], atomic: true}),
            Graph.addEdge({from: 'a@out', to: 'b@in'}),
            Graph.addEdge({from: 'b@out', to: 'c@in'})
          )()
          expect(() => compoundifyInplace(graph, ['a', 'c'], graph)).to.throw(Error)
        })


        it('Can handle untypified factorial example', function () {
          const graph = Graph.fromFile('test/fixtures/fac_no_types.json')
          const addNode = Graph.node('/math/add', graph)
          const nodes = [
            addNode,
            Graph.node('/math/multiply', graph),
            Graph.successors(addNode, graph)[0],
            Graph.predecessor(Node.port('summand2', addNode), graph)
          ]
          compoundifyInplace('/fac', nodes, graph, (comp, resGraph) => {
            expect(Node.inputPorts(comp)).to.have.length(2)
          })
        })
      })
    })
  })
})
