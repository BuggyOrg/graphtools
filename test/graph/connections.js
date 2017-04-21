/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Node from '../../src/node'
import fs from 'fs'

var expect = chai.expect

describe('Basic graph functions', () => {
  describe('Connection functions', () => {
    describe('.predecessors', () => {
      it('Can find the predecessor of a recursion node', () => {
        const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('test/fixtures/fac.json', 'utf8')))
        const facNode = Graph.nodesDeepBy((n) => Node.get('isRecursive', n) && !Node.get('recursiveRoot', n), graph)[0]
        const pred = Graph.predecessor(Node.port('n', facNode), graph)
        const pred2 = Graph.predecessor(facNode, graph)
        expect(Graph.node(pred, graph).componentId).to.equal('math/add')
        expect(Graph.node(pred2, graph).componentId).to.equal('math/add')
      })

      it('Can find the predecessor edges on layer \'extra\'', () => {
        const graph = Graph.flow(
          Graph.addNode({name: 'A'}),
          Graph.addNode({name: 'B'}),
          Graph.addNode({name: 'C'}),
          Graph.addEdge({ from: 'A', to: 'B', layer: 'extra' }),
          Graph.addEdge({ from: 'B', to: 'A', layer: 'extraBack' }),
          Graph.addEdge({ from: 'C', to: 'A', layer: 'extraBack' })
        )()

        const succA = Graph.predecessors('A', graph, { layers: ['extraBack'] })
        expect(succA).to.have.lengthOf(2)
        expect(Graph.node(succA[0], graph).name).to.equal('B')
        expect(Graph.node(succA[1], graph).name).to.equal('C')

        const succB = Graph.predecessors('B', graph, { layers: ['extra'] })
        expect(succB).to.have.lengthOf(1)
        expect(Graph.node(succB[0], graph).name).to.equal('A')

        expect(Graph.predecessors('A', graph, { layers: ['extra'] })).to.have.lengthOf(0)
        expect(Graph.predecessors('B', graph, { layers: ['extraBack'] })).to.have.lengthOf(0)
      })
    })

    describe('.successors', () => {
      it('Can find the successors of a recursion node', () => {
        const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('test/fixtures/fac.json', 'utf8')))
        const facNode = Graph.nodesDeepBy((n) => Node.get('isRecursive', n) && !Node.get('recursiveRoot', n), graph)[0]
        const pred = Graph.successors(Node.port('value', facNode), graph)[0]
        const pred2 = Graph.successors(facNode, graph)[0]
        expect(Graph.node(pred, graph).componentId).to.equal('math/multiply')
        expect(Graph.node(pred2, graph).componentId).to.equal('math/multiply')
      })

      it('Can find the successor edge on layer \'extra\'', () => {
        const graph = Graph.flow(
          Graph.addNode({name: 'A'}),
          Graph.addNode({name: 'B'}),
          Graph.addEdge({ from: 'A', to: 'B', layer: 'extra' }),
          Graph.addEdge({ from: 'B', to: 'A', layer: 'extraBack' })
        )()

        const succA = Graph.successors('A', graph, { layers: ['extra'] })
        expect(succA).to.have.lengthOf(1)
        expect(Graph.node(succA[0], graph).name).to.equal('B')

        const succB = Graph.successors('B', graph, { layers: ['extraBack'] })
        expect(succB).to.have.lengthOf(1)
        expect(Graph.node(succB[0], graph).name).to.equal('A')

        expect(Graph.successors('A', graph, { layers: ['extraBack'] })).to.have.lengthOf(0)
        expect(Graph.successors('B', graph, { layers: ['extra'] })).to.have.lengthOf(0)
      })

      it('Can find the successors of a node with default and different edge layers', () => {
        const graph = Graph.flow(
          Graph.addNode({
            name: 'root',
            ports: [
              { port: 'out', kind: 'output', type: 'generic' }
            ]
          }),
          Graph.addNode({
            name: 'merge',
            ports: [
              { port: 'in0', kind: 'input', type: 'generic' },
              { port: 'in1', kind: 'input', type: 'generic' }
            ]
          }),
          Graph.addNode({
            name: 'left',
            ports: [
              { port: 'in', kind: 'input', type: 'generic' },
              { port: 'out', kind: 'output', type: 'generic' }
            ]
          }),
          Graph.addEdge({ from: 'root@out', to: 'left@in' }),
          Graph.addEdge({ from: 'root@out', to: 'merge@in0' }),
          Graph.addEdge({ from: 'left@out', to: 'merge@in1' }),
          Graph.addEdge({ from: 'left', to: 'root', layer: 'extra' })
        )()
        const succRoot = Graph.successors('root', graph)
        expect(succRoot).to.have.lengthOf(2)
        const succLeft = Graph.successors('left', graph)
        expect(succLeft).to.have.lengthOf(1)
        expect(Graph.node(succLeft[0], graph).name).to.equal('merge')

        const succLeftExtra = Graph.successors('left', graph, { layers: ['extra'] })
        expect(succLeftExtra).to.have.lengthOf(1)
        expect(Graph.node(succLeftExtra[0], graph).name).to.equal('root')

        const succLeftFull = Graph.successors('left', graph, { layers: ['extra', 'dataflow'] })
        expect(succLeftFull).to.have.lengthOf(2)
      })
    })

    describe('.areConnected', () => {
      it('finds connected nodes', () => {
        const graph = Graph.fromFile('test/fixtures/fac.json', 'utf8')
        expect(Graph.areConnected('/numToStr', '/print', graph)).to.be.true
      })
    })
  })
})
