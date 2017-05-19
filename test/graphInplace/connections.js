/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Node from '../../src/node'
import fs from 'fs'

var expect = chai.expect

describe('Inplace methods', () =>  {
  describe('Basic graph functions', () => {
    describe('Connection functions', () => {
      describe('.predecessors', () => {
        it('Can find the predecessor edges on layer \'extra\'', () => {
          const graph = Graph.flow(
            Graph.addNode({name: 'A'}),
            Graph.addNode({name: 'B'}),
            Graph.addNode({name: 'C'}),
            Graph.addEdge({ from: 'A', to: 'B', layer: 'extra' }),
            Graph.addEdge({ from: 'B', to: 'A', layer: 'extraBack' }),
            Graph.addEdge({ from: 'C', to: 'A', layer: 'extraBack' }),
            {inPlace: true}
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
        it('Can find the successor edge on layer \'extra\'', () => {
          const graph = Graph.flow(
            Graph.addNode({name: 'A'}),
            Graph.addNode({name: 'B'}),
            Graph.addEdge({ from: 'A', to: 'B', layer: 'extra' }),
            Graph.addEdge({ from: 'B', to: 'A', layer: 'extraBack' }),
            {inPlace: true}
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
            Graph.addEdge({ from: 'left', to: 'root', layer: 'extra' }),
            {inPlace: true}
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

        it('finds edges that connect compound inputs with outputs', () => {
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
              )(graph)),
            {inPlace: true}
          )()
          expect(Graph.nodes(graph)).to.have.length(3)
          expect(Graph.nodes(Graph.node('c', graph))).to.have.length(0)
          var out = Graph.successors({node: 'c', port: 'inC'}, graph)
          expect(out).to.have.length(1)
          expect(Graph.node(out, graph).name).to.equal('c')
        })
      })
    })
  })
})
