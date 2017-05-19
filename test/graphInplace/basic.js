/* eslint-env mocha */

import chai from 'chai'
import * as Graph from '../../src/graph'
import {port} from '../../src/port'
import _ from 'lodash'
import semver from 'semver'

var expect = chai.expect

describe('Inplace methods', () => {
  describe('Basic inplace graph functions', () => {
    it('can have edges between references', () => {
      var graph = Graph.flow(
        Graph.Let(
          [
            Graph.addNode({ref: 'a'}),
            Graph.addNode({ref: 'a'})
          ], ([n1, n2], graph) =>
            Graph.addEdge({from: port(n1, 'a'), to: port(n2, 'other')}, graph)
        ),
        {inPlace: true}
      )()
      expect(graph).to.be.ok
      expect(Graph.edgesDeep(graph)).to.have.length(1)
    })

    it('cannot add two nodes with the same name', () => {
      var graph = Graph.flow(Graph.addNode({ref: 'a', name: 'a'}), {inPlace: true})()
      expect(() => Graph.addNode({ref: 'a', name: 'a'}, graph)).to.throw(Error)
    })

    it('Gets all atomics in the graph', () => {
      var cmpd = Graph.flow(
        Graph.addNode({atomic: true, ports: [{port: 'a', kind: 'output', type: 'b'}]}),
        {inPlace: true}
      )(Graph.compound({ports: [{port: 'a', kind: 'output', type: 'b'}]}))
      var graph = Graph.flow(
        Graph.addNode({atomic: true, ports: [{port: 'a', kind: 'output', type: 'b'}]}),
        Graph.addNode(cmpd),
        {inPlace: true}
      )()
      expect(Graph.atomics(graph)).to.have.length(2)
    })
  })
})
