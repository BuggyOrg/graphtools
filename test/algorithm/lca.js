/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import * as Algorithms from '../../src/algorithm'
import * as Node from '../../src/node'
import fs from 'fs'

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
      expect(Algorithms.lowestCommonAncestors(['b@in1', 'b@in2'], graph).map(Node.name)).to.eql([graph.id])
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

    it('» Does not return ancestors of only one node', () => {
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

    it('» Handles cases where an input node itself is the lca', () => {
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
      const lcas = Algorithms.lowestCommonAncestors(['b@in1', 'c1'], graph).map(Node.name)
      expect(lcas).to.include('c1')
    })

    it('» Handles recursive nodes', () => {
      const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('test/fixtures/fac.json')))
      const ifNode = Graph.node('/if', graph)
      const lcas = Algorithms.lowestCommonAncestors([Node.port('inTrue', ifNode), Node.port('inFalse', ifNode)], graph)
      expect(lcas).to.have.length(1)
      expect(lcas[0].componentId).to.equal('fac')
    })

    it('» Includes LCA nodes that have some common nodes as successors but not all', () => {
// cheating ascii graphs ;)
` C = Common nodes, NC = non common nodes, SRC = LCA source node
+---+
| C |
++-++
 | +-------+
 |       +-v-+
 |       | C |
 |       ++-++
 | +------+ |
 | |        |
+v-v+       |
|NC |       |
+---+       |
  +-+ +-----+
    | |
   +v-v+
   |SRC|
   +---+

`
      const g = Graph.flow(
        Graph.addNode({componentId: 'C1', name: 'C1', ports: [{kind: 'output', port: 'o1', type: 'A'}, {kind: 'output', port: 'o2', type: 'A'}]}),
        Graph.addNode({componentId: 'NC', name: 'NC', ports: [{kind: 'input', port: 'i1', type: 'A'}, {kind: 'input', port: 'i2', type: 'A'}, {kind: 'output', port: 'o1', type: 'A'}]}),
        Graph.addNode({componentId: 'C2', name: 'C2', ports: [{kind: 'input', port: 'i1', type: 'A'}, {kind: 'output', port: 'o1', type: 'A'}, {kind: 'output', port: 'o2', type: 'A'}]}),
        Graph.addNode({componentId: 'SRC', name: 'SRC', ports: [{kind: 'input', port: 'i1', type: 'A'}, {kind: 'input', port: 'i2', type: 'A'}]}),
        Graph.addEdge({from: 'C1@o1', to: 'NC@i1'}),
        Graph.addEdge({from: 'C1@o2', to: 'C2@i1'}),
        Graph.addEdge({from: 'C2@o2', to: 'NC@i2'}),
        Graph.addEdge({from: 'NC@o1', to: 'SRC@i1'}),
        Graph.addEdge({from: 'C2@o1', to: 'SRC@i2'})
      )()
      const src = Graph.node('/SRC', g)
      const lcas = Algorithms.lowestCommonAncestors([Node.port('i1', src), Node.port('i2', src)], g)
      expect(lcas).to.have.length(2)
    })
  })
})
