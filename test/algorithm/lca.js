/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Algorithms from '../../src/algorithm/algorithms'
import * as Node from '../../src/node'
import {debug} from '../../src/debug'

const expect = chai.expect

describe('Graph Algorithms', () => {
  describe('» Lowest common ancestor', () => {
    it('» Works if LCA is predecessor.', () => {
      const graph = Graph.flow(
        Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in1', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}]}),
        Graph.addEdge({from: 'a@out', to: 'b@in1'}),
        Graph.addEdge({from: 'a@out', to: 'b@in2'})
      )()
      expect(Algorithms.lowestCommonAncestors(['b@in1', 'b@in2'], graph).map(Node.name)).to.eql(['a'])
    })

    it('» Identifies no LCAs', () => {
      const graph = Graph.flow(
        Graph.addNode({name: 'a1', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({name: 'a2', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({name: 'b', ports: [{port: 'in1', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}]}),
        Graph.addEdge({from: 'a1@out', to: 'b@in1'}),
        Graph.addEdge({from: 'a2@out', to: 'b@in2'})
      )()
      expect(Algorithms.lowestCommonAncestors(['b@in1', 'b@in2'], graph).map(Node.name)).to.eql([])
    })

    it('» Identifies in between nodes', () => {
      const graph = Graph.flow(
        Graph.addNode({name: 'a1', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({name: 'a2', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({
          name: 'c',
          ports: [
            {port: 'out1', kind: 'output', type: 'g'},
            {port: 'out2', kind: 'output', type: 'g'},
            {port: 'in1', kind: 'input', type: 'g'},
            {port: 'in2', kind: 'input', type: 'g'}
          ]}),
        Graph.addNode({name: 'b', ports: [{port: 'in1', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}]}),
        Graph.addEdge({from: 'a1@out', to: 'c@in1'}),
        Graph.addEdge({from: 'a2@out', to: 'c@in2'}),
        Graph.addEdge({from: 'c@out1', to: 'b@in1'}),
        Graph.addEdge({from: 'c@out2', to: 'b@in2'})
      )()
      expect(Algorithms.lowestCommonAncestors(['b@in1', 'b@in2'], graph).map(Node.name)).to.eql(['c'])
    })

    it('» Identifies in between nodes', () => {
      const graph = Graph.flow(
        Graph.addNode({name: 'a1', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({name: 'a2', ports: [{port: 'out', kind: 'output', type: 'g'}]}),
        Graph.addNode({
          name: 'c1',
          ports: [
            {port: 'out1', kind: 'output', type: 'g'},
            {port: 'in1', kind: 'input', type: 'g'},
            {port: 'in2', kind: 'input', type: 'g'}
          ]}),
        Graph.addNode({
          name: 'c2',
          ports: [
            {port: 'out1', kind: 'output', type: 'g'},
            {port: 'in1', kind: 'input', type: 'g'},
            {port: 'in2', kind: 'input', type: 'g'}
          ]}),
        Graph.addNode({name: 'b', ports: [{port: 'in1', kind: 'input', type: 'g'}, {port: 'in2', kind: 'input', type: 'g'}]}),
        Graph.addEdge({from: 'a1@out', to: 'c1@in1'}),
        Graph.addEdge({from: 'a1@out', to: 'c2@in1'}),
        Graph.addEdge({from: 'a2@out', to: 'c1@in2'}),
        Graph.addEdge({from: 'a2@out', to: 'c2@in2'}),
        Graph.addEdge({from: 'c1@out1', to: 'b@in1'}),
        Graph.addEdge({from: 'c2@out1', to: 'b@in2'})
      )()
      const lcas = Algorithms.lowestCommonAncestors(['b@in1', 'b@in2'], graph).map(Node.name)
      expect(lcas).to.include('a1')
      expect(lcas).to.include('a2')
    })
  })
})