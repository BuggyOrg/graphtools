
import {nodesBy} from './node'
import {isReference, isAtomic} from '../node'
import {isCompound} from '../compound'

/**
 * Gets a list of all reference nodes.
 * @param {PortGraph} graph The graph.
 * @returns {References[]} A list of all defined reference nodes in the graph.
 */
export function references (graph) {
  return nodesBy(isReference, graph)
}

/**
 * Gets a list of all compound nodes.
 * @param {PortGraph} graph The graph.
 * @returns {References[]} A list of all defined compound nodes in the graph.
 */
export function compounds (graph) {
  return nodesBy(isCompound, graph)
}

/**
 * Gets a list of all atomic nodes.
 * @param {PortGraph} graph The graph.
 * @returns {References[]} A list of all defined atomci nodes in the graph.
 */
export function atomics (graph) {
  return nodesBy(isAtomic, graph)
}
