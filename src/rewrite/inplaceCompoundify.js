
import flatten from 'lodash/fp/flatten'
import * as Node from '../node'
import * as Graph from '../api'
import {predecessorsUpTo} from '../algorithm/predecessors'
import setOps from 'set-ops'

const {intersection} = setOps

function uniquePortName (port) {
  return port.port + port.node
}

const uniqify = (port) => {
  // unique type names should not be part of this function
  const t = (typeof (port.type) === 'string' && port.type[0].toLowerCase() === port.type[0]) ? port.type + port.node : port.type
  // const t = port.type
  return Object.assign({}, port, {port: uniquePortName(port), type: t})
}

export default function compoundify (parentLoc, subsetIn, graph, ...cbs) {
  const cb = Graph.flowCallback(cbs)
  const parent = Graph.node(parentLoc, graph)
  const subset = subsetIn.map((n) => Node.id(Graph.node(n, graph)))
  const subsetSet = new Set(subset.map((n) => Graph.node(n, graph)).map(Node.id))
  const nonSubPred = flatten(predecessorsUpTo(subset, subset, graph)).map((n) => n.id).filter((nId) => !subsetSet.has(nId))
  const nonSubSucc = flatten(subset.map((n) => Graph.successors(n, graph))).map((n) => n.node).filter((nId) => !subsetSet.has(nId))
  const i = (intersection(new Set(nonSubPred), new Set(nonSubSucc)))
  if (i.size !== 0) {
    throw new Error('Cannot compoundify subset: "' + subset + '". It would form a loop with: "' + Array.from(i) + '"')
  }
  const edges = Graph.edges(parent).filter((e) => e.layer === 'dataflow')
  var innerE = []
  var inE = []
  var outE = []
  var rest = []
  for (let j = 0; j < edges.length; j++) {
    const e = edges[j]
    const isFrom = subset.some((n) => Graph.isFrom(n, graph, e))
    const pTo = subset.some((n) => Graph.pointsTo(n, graph, e))
    if (isFrom && pTo) innerE.push(e)
    else if (isFrom) outE.push(e)
    else if (pTo) inE.push(e)
    else rest.push(e)
  }
  parent.edges = rest

  const nodes = Graph.nodes(parent)
  var innerNodes = []
  var restNodes = []
  for (let j = 0; j < nodes.length; j++) {
    const n = nodes[j]
    if (subsetSet.has(n.id)) innerNodes.push(n)
    else restNodes.push(n)
  }
  parent.nodes = restNodes

  const inputPorts = inE.map((e) => ({port: e.to.port + e.to.node, kind: 'input', type: uniqify(e.type)}))
  const outputPorts = outE.map((e) => ({port: e.from.port + e.from.node, kind: 'output', type: uniqify(e.type)}))
  const comp = Graph.compound({ports: inputPorts.concat(outputPorts)})
  comp.path = parent.path.concat([comp.id])
  comp.nodes = innerNodes.map((n) => {
    n.path = n.path.slice(0, -1).concat([comp.id]).concat([n.path[n.path.length - 1]])
    return n
  })
  comp.edges = innerE
    .concat(inE.map((e) => ({from: {node: comp.id, port: e.to.port + e.to.node}, to: e.to, layer: 'dataflow'})))
    .concat(outE.map((e) => ({from: e.from, to: {node: comp.id, port: e.from.port + e.from.node}, layer: 'dataflow'})))
  parent.nodes.push(comp)
  parent.edges = parent.edges
    .concat(inE.map((e) => ({to: {node: comp.id, port: e.to.port + e.to.node}, from: e.from, layer: 'dataflow'})))
    .concat(outE.map((e) => ({to: e.to, from: {node: comp.id, port: e.from.port + e.from.node}, layer: 'dataflow'})))
  return cb(comp, graph)
}
