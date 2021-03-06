import find from 'lodash/fp/find'
import curry from 'lodash/fp/curry'
import omit from 'lodash/fp/omit'
import * as Component from '../component'
import * as changeSet from '../changeSet'

/**
 * Returns a list of defined components. Components are not part of the program flow, but are defined
 * procedures that can be used in the resolve process.
 * @param {PortGraph} graph The graph.
 * @returns {Components[]} A list of components that are defined in the graph.
 */
export function components (graph) {
  return graph.components || []
}

/**
 * Returns a list of component ids. [Performance O(|V|)]
 * @param {PortGraph} graph The graph.
 * @returns {string[]} A list of component ids.
 */
export function componentIds (graph) {
  return components(graph).map(Component.id)
}

/**
 * @function
 * @name component
 * @description Returns the component with the given component id. [Performance O(|V|)]
 * @param {Component|string} comp The component or its component id.
 * @param {PortGraph} graph The graph.
 * @returns {Component} The component in the graph
 * @throws {Error} If the queried component does not exist in the graph.
 */
export const component = curry((comp, graph) => {
  var res = find(Component.equal(comp), components(graph))
  if (!res) {
    // TODO: debug(JSON.stringify(graph, null, 2)) // make printing the graph possible
    throw new Error(`Component with id '${comp}' does not exist in the graph.`)
  }
  return res
})

/**
 * @function
 * @name hasComponent
 * @description Checks whether the graph has a component with the given component id. [Performance O(|V|)]
 * @param {PortGraph} graph The graph.
 * @param {Component|string} comp The component or its component id you want to check for.
 * @returns {boolean} True if the graph has a component with the given component id, false otherwise.
 */
export const hasComponent = curry((comp, graph) => {
  return !!find(Component.equal(comp), components(graph))
})

function checkComponent (graph, comp) {
  if (!comp) {
    throw new Error('Cannot add undefined component to graph.')
  }
  /* else if (!Component.isValid(comp)) {
    throw new Error('Cannot add invalid component to graph. Are you missing the component-id, the version or a port?\nComponent: ' + JSON.stringify(comp))
  } */
  Component.assertValid(comp)
}

/**
 * @function
 * @name addComponent
 * @description Add a component to the graph. [Performance O(|V| + |E|)]
 * @param {Component} comp The component object that should be added.
 * @param {PortGraph} graph The graph.
 * @returns {PortGraph} A new graph that includes the component.
 */
export const addComponent = curry((comp, graph) => {
  if (hasComponent(comp, graph)) {
    throw new Error('Cannot add already existing component: ' + Component.id(comp))
  }
  checkComponent(graph, comp)
  return changeSet.applyChangeSet(graph, changeSet.insertComponent(comp))
})

/**
 * @function
 * @name removeComponent
 * @description Removes a component from the graph. [Performance O(|V| + |E|)]
 * @param {Component|string} comp The component that shall be removed, either the component object or the component id.
 * @param {PortGraph} graph The graph.
 * @returns {PortGraph} A new graph without the given component.
 */
export const removeComponent = curry((comp, graph) => {
  return changeSet.applyChangeSet(graph, changeSet.removeComponent(Component.id(comp)))
})

/**
 * @function
 * @name updateComponent
 * @description Update an existing component in the graph.
 * @param {Component|string} comp The component that will be update, either the component object or the component id.
 * @param {Object} merge Updated values of the component. It is not possible to change the component id with this method.
 * @param {PortGraph} graph The graph
 */
export const updateComponent = curry((comp, merge, graph) => {
  if (!hasComponent(comp, graph)) {
    throw new Error('Cannot update non existing component: "' + Component.id(comp) + '"')
  }
  return changeSet.applyChangeSet(graph,
    changeSet.updateComponent(Component.id(comp), omit('componentId', merge)))
})

export function isomorphComponents (graph1, graph2) {
  const c1 = components(graph1)
  const c2 = components(graph2)
  if (c1.length !== c2.length) return false
  if (!components(graph1).every((c) => hasComponent(c, graph2))) return false
  if (!components(graph1).every((c) => Component.isomorph(c, component(c, graph2)))) return false
  return true
}
