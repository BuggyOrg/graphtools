/* global describe, it */

import chai from 'chai'
import * as Compound from '../src/compound.js'
import * as Edge from '../src/graph/edge.js'
// import _ from 'lodash'

var expect = chai.expect

describe('Compound API', () => {
  it('Can create new Compound nodes', () => {
    var cmp = Compound.create()
    expect(cmp).to.be.ok
    expect(Compound.children(cmp)).to.have.length(0)
  })

  it('Can add ports to a compound node', () => {
    var cmp1 = Compound.addInputPort('a', Compound.create())
    var cmp2 = Compound.addOutputPort('b', cmp1)
    expect(Compound.hasPort('a', cmp2)).to.be.true
    expect(Compound.hasPort('b', cmp2)).to.be.true
  })

  it('Can remove existing ports', () => {
    var cmp1 = Compound.addInputPort('a', Compound.create())
    var cmp2 = Compound.addOutputPort('b', cmp1)
    var remCmp = Compound.removePort('a', cmp2)
    expect(Compound.hasPort('a', remCmp)).to.be.false
    expect(Compound.hasPort('b', remCmp)).to.be.true
  })

  it('Ignores edges that are not between ports', () => {
    var cmp1 = Compound.addInputPort('a', Compound.create())
    var cmp2 = Compound.addOutputPort('b', cmp1)
    cmp2.edges.push({from: '#id1', to: '#id2', layer: 'not-data-flow'})
    var remCmp = Compound.removePort('a', cmp2)
    expect(Compound.hasPort('a', remCmp)).to.be.false
    expect(Compound.hasPort('b', remCmp)).to.be.true
  })

  it('Removes all edges from/to a port when removing the port', () => {
    var cmp1 = Compound.addInputPort('a', Compound.create())
    var cmp2 = Compound.addOutputPort('b', cmp1)
    var cmpE = Edge.addEdge({from: cmp2.id + '@a', to: cmp2.id + '@b'}, cmp2)
    expect(Edge.edgesDeep(cmpE)).to.have.length(1)
    var remCmpIn = Compound.removePort('a', cmpE)
    expect(Edge.edgesDeep(remCmpIn)).to.have.length(0)
    var remCmpOut = Compound.removePort('b', cmpE)
    expect(Edge.edgesDeep(remCmpOut)).to.have.length(0)
  })

  it('Can rename ports', () => {
    var cmp = Compound.addInputPort('a', Compound.create())
    var cmp2 = Compound.renamePort('a', 'b', cmp)
    expect(Compound.hasPort('a', cmp2)).to.be.false
    expect(Compound.hasPort('b', cmp2)).to.be.true
  })

  it('Removes component information after changing ports', () => {
    var cmp = Compound.addInputPort('a', Compound.create({componentId: 'ABC'}))
    var cmp2 = Compound.renamePort('a', 'b', cmp)
    var cmp3 = Compound.addInputPort('c', cmp)
    var cmp4 = Compound.addOutputPort('d', cmp)
    var cmp5 = Compound.removePort('a', cmp)
    expect(Compound.component(cmp2)).to.not.equal('ABC')
    expect(Compound.component(cmp3)).to.not.equal('ABC')
    expect(Compound.component(cmp4)).to.not.equal('ABC')
    expect(Compound.component(cmp5)).to.not.equal('ABC')
  })
})
