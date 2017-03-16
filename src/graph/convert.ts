
import {cloneDeep, merge} from 'lodash/fp'
import {nodesDeep} from './node'
import {edgesDeep, checkEdge} from './edge'
import {assertValid} from '../node'
import {rePath} from './internal'
import {Portgraph} from './graph'
// import {empty} from './basic'
// import {addNode, addNodeTuple} from './node'
// import {addEdge} from './edge'
// import {addComponent} from './component'
// import {meta, setMeta} from './meta'
// import {mergeNodes} from './internal'

/**
 * Adds the API to the JSON document to work with the graph.
 * @param {object} jsonGraph The json representing the port graph.
 * @returns {PortGraph} The port graph with its functions.
 */
export function fromJSON (jsonGraph):Portgraph {
  var graph = cloneDeep(jsonGraph)
  rePath(graph)
  nodesDeep(graph as Portgraph).forEach((n) => assertValid(n))
  edgesDeep(graph as Portgraph).forEach((e) => checkEdge(graph, e))
  return merge({components: [], edges: [], nodes: []}, graph)
  // TODO: add checks back in again
  // var nodes = concat(jsonGraph.Nodes || [], (Array.isArray(jsonGraph.nodes)) ? jsonGraph.nodes : [])
  // var edges = concat(jsonGraph.Edges || [], (Array.isArray(jsonGraph.edges)) ? jsonGraph.edges : [])
  // var components = concat(jsonGraph.Components || [], (Array.isArray(jsonGraph.components)) ? jsonGraph.components : [])
  // var graph = empty()
  // TODO: addNodes recursivly
  // graph = nodes.reduce((curGraph, node) => {
  //   return addNode(node, curGraph)
  //   // TODO: merge node data
  //   // let result = addNodeTuple(node, curGraph)
  //   // return mergeNodes({id:result[1]})
  // }, graph)
  // graph = edges.reduce((curGraph, edge) => addEdge(edge, curGraph), graph)
  // graph = components.reduce((curGraph, comp) => addComponent(comp, curGraph), graph)

  // graph = setMeta(meta(jsonGraph), graph)
  // graph.ports = jsonGraph.ports || []
  // // add parents ? optimizations!!
  // return graph
}

/**
 * Returns a JSON object for the graph
 * @param {PortGraph} graph The graph to convert
 * @returns {object} A JSON representation of the graph.
 */
export function toJSON (graph:Portgraph) {
  // var exportGraph = removeGraphInternals(graph)
  return cloneDeep(graph)
}
