
import cloneDeep from 'lodash/fp/cloneDeep'
import merge from 'lodash/fp/merge'
import {nodesDeep} from './node'
import {edgesDeep, checkEdge} from './edge'
import {assertValid} from '../node'
import {rePath} from './internal'
import fs from 'fs'
// import {empty} from './basic'
// import {addNode, addNodeTuple} from './node'
// import {addEdge} from './edge'
// import {addComponent} from './component'
// import {meta, setMeta} from './meta'
// import {mergeNodes} from './internal'

/**
 * Load a graph encoded as a JSON document
 * @param {object} jsonGraph The json representing the port graph.
 * @returns {PortGraph} The port graph with its functions.
 */
export function fromJSON (jsonGraph) {
  var graph = cloneDeep(jsonGraph)
  rePath(graph)
  nodesDeep(graph).forEach((n) => assertValid(n))
  edgesDeep(graph).forEach(checkEdge(graph))
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
 * Load a graph encoded as a JSON document
 * @param {object} jsonGraph The json representing the port graph.
 * @returns {PortGraph} The port graph with its functions.
 */
export function fromJSONUnsafe (jsonGraph) {
  var graph = cloneDeep(jsonGraph)
  rePath(graph)
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
 * Load a graph encoded as a string
 * @param {String} graphStr The string representing a json document for the port graph.
 * @returns {PortGraph} The port graph.
 * @throws {Error} If the string does not represent a valid JSON document.
 */
export function fromString (graphStr) {
  return fromJSON(JSON.parse(graphStr))
}

/**
 * Load a graph from a JSON file
 * @param {String} path The JSON file representing the port graph.
 * @returns {PortGraph} The port graph.
 * @throws {Error} If the file does not represent a valid JSON document.
 */
export function fromFile (path) {
  return fromString(fs.readFileSync(path, 'utf8'))
}

/**
 * Returns a JSON object for the graph
 * @param {PortGraph} graph The graph to convert
 * @returns {object} A JSON representation of the graph.
 */
export function toJSON (graph) {
  // var exportGraph = removeGraphInternals(graph)
  return cloneDeep(graph)
}
