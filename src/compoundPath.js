/**
 *  Accessible via `require('@buggyorg/graphtools').CompoundPath`
 *
 * A compound path is a unique representation of a node in the graph. It is defined as an array of
 * parent nodes starting at the root level, e.g. `['A', 'B', 'C']` points to the node `C` whose parent
 * is `B` and the parent of `B` is `A`. All methods accept the array notation or the shorthand string
 * notation. The shorthand string notation starts with a `»` (ALT-GR+Y) and separates each node with
 * a `»`, e.g. `»A»B»C` describes the exact same path as above. For elements on the root level it is
 * okay to omit the `»`, i.e. `»A` is the same as `A`.
 * @module CompoundPath */

import curry from 'lodash/fp/curry'
import _ from 'lodash'

/**
 * Converts a compound path into its string representation. The seperate parts are divided by a '»'.
 * @param {String[]} compoundPathArr An array of node IDs reperesenting the compound path.
 * @returns {String} The string representation of the compound path.
 */
export function toString (compoundPathArr) {
  if (compoundPathArr.length === 1) return compoundPathArr[0]
  return compoundPathArr.reduce((acc, n) => acc + '»' + n, '')
}

/**
 * Converts a compound path string into its array representation. The seperate parts must be divided by a '»'.
 * @param {String} compoundPathStr A string reperesenting the compound path divded by '»'.
 * @returns {String[]} An array of node IDs representing the compound path.
 */
export function fromString (compoundPathStr) {
  if (compoundPathStr.indexOf('»') === -1) return [compoundPathStr]
  return compoundPathStr.split('»').slice(1)
}

/**
 * Returns whether a string represents a compound path or not.
 * @param {string} path The path string to test.
 * @returns {boolean} True if the path represents a compound path, false otherwise.
 */
export function isCompoundPath (path) {
  return Array.isArray(path) || (typeof (path) === 'string' && path[0] === '»')
}

/**
 * Convert a path representation into its normalized array form.
 * @param {string|string[]} path The path as a string or array.
 * @returns {CompoundPath} The normalized path.
 */
export function normalize (path) {
  if (Array.isArray(path)) {
    return _.compact(path)
  } else {
    return _.compact(fromString(path))
  }
}

/**
 * Joins two paths into one.
 * @param {CompoundPath} base The prefix of the new path
 * @param {CompoundPath} rest The postfix of the new path.
 * @returns {CompoundPath} The new path in the form `<base>»<rest>`.
 */
export function join (base, rest) {
  if (!base) return rest
  return _.concat(normalize(base), normalize(rest))
}

/**
 * Returns whether a path points to the root element or not.
 * @param {CompoundPath} path The path to check
 * @returns {boolean} True if the path points to the root element ('', '»' or []), false otherwise.
 */
export function isRoot (path) {
  if (typeof (path) === 'string') {
    if (path === '') return true
    path = fromString(path)
  }
  return path.length === 0
}

/**
 * Returns the parent of a compound path.
 * @param {CompoundPath|string} path The path either as a string or an array.
 * @returns {CompoundPath|string} The parent of the path in the same format as the input.
 * @throws {Error} If the input format is invalid.
 */
export function parent (path) {
  if (typeof (path) === 'string') {
    return toString(parent(fromString(path)))
  } else if (Array.isArray(path)) {
    return path.slice(0, -1)
  } else {
    throw new Error('Malformed compound path. It must either be a string or an array of node IDs. Compounds paths was: ' + JSON.stringify(path))
  }
}

/**
 * Returns the root node in the path, i.e. the first node indicated by the path.
 * @params {CompoundPath} path The path
 * @returns {CompoundPath} The id of the base/root element in the path.
 */
export function base (path) {
  if (typeof (path) === 'string') {
    return toString(base(fromString(path)))
  } else if (Array.isArray(path)) {
    if (path.length === 1) {
      return []
    } else {
      return path.slice(0, 1)
    }
  } else {
    throw new Error('Malformed compound path. It must either be a string or an array of node IDs. Compounds paths was: ' + JSON.stringify(path))
  }
}

/**
 * Returns the node element, i.e. the last element in the path.
 * @param {CompoundPath} path The path
 * @returns {String} The id of the the element at the end of the path chain.
 */
export function node (path) {
  if (typeof (path) === 'string') {
    return node(fromString(path))
  } else if (Array.isArray(path)) {
    return path.slice(-1)
  } else {
    throw new Error('Malformed compound path. It must either be a string or an array of node IDs. Compounds paths was: ' + JSON.stringify(path))
  }
}

/**
 * Returns a new path that omits the root component.
 * @param {CompoundPath} path The path
 * @returns {CompoundPath} A path that omits the root component. E.g. rest([a, b, c]) -> [b, c].
 */
export function rest (path) {
  if (typeof (path) === 'string') {
    return rest(fromString(path))
  } else if (Array.isArray(path)) {
    return path.slice(1)
  } else {
    throw new Error('Malformed compound path. It must either be a string or an array of node IDs. Compounds paths was: ' + JSON.stringify(path))
  }
}

/**
 * @function
 * @name relativeTo
 * @description Creates a new path that shortens path1 assuming that path2 is a prefix to path1.
 * @param {CompoundPath} path1 The path to shorten
 * @param {CompoundPath} path2 The path that is a prefix of path1 and by what path1 is shortend.
 * @returns {CompoundPath} A new shortend path that has the prefix path2 removed.
 * @throws {Error} Of path2 is no prefix of path2.
 */
export const relativeTo = curry((path1, path2) => {
  if (path2.length > path1.length) {
    throw new Error('Cannot calculate relative path to a longer path. Tried to get express: ' + path1 + ' relative to: ' + path2)
  }
  if (path2.length === 0) {
    return path1
  } else if (path1[0] !== path2[0]) {
    throw new Error('Pathes are not subsets and thus the relative path cannot be calculated.' + JSON.stringify(path1) + ' and ' + JSON.stringify(path2))
  } else {
    return relativeTo(rest(path1), rest(path2))
  }
})

const isPrefix = (path1, path2, idx = 0) => {
  if (path2.length <= idx) return true
  if (path1[idx] === path2[idx]) {
    return isPrefix(path1, path2, idx + 1)
  } else return false
}

/**
 * @function
 * @name prefix
 * @description Prefixes path1 by path2. Does not duplicate entries in path1 if they are already part of path1.
 * Every entry in the path is a unique id and if path1 already has a subset of path2 this subset is not prefixed too.
 * @example
 * // Compound paths contain IDs which are usually not that short. Only for brevity.
 * prefix([d, e], [a, b]) => [a, b, d, e]
 * prefix([b, c], [a, b]) => [a, b, c]
 * prefix([a, b, c], [a, b]) => [a, b, c]
 * prefix([a, c], [a, b]) => Throws exception as path2 cannot be a prefix!
 * @param {CompoundPath} path1 The path that gets its prefix.
 * @param {CompoundPath} path2 The prefix path.
 * @returns {CompoundPath} A new path that prefixed path2 onto path1
 */
export const prefix = curry((path1, path2) => {
  if (path2.length === 0) return path1
  if (path2[0] !== path1[0]) {
    return [path2[0]].concat(prefix(path1, rest(path2)))
  } else if (isPrefix(path1, path2)) {
    return path2
  } else {
    throw new Error('Unable to apply inconsistent prefix: ' + JSON.stringify(path1) + ' , ' + JSON.stringify(path2))
  }
})

/**
 * @function
 * @name equal
 * @description Returns whether two compound paths are equal
 * @param {CompoundPath} path1 The first path to compare.
 * @param {CompoundPath} path2 The second path to compare.
 * @returns {boolean} True if the paths are the same, false otherwise.
 */
export const equal = curry((path1, path2) => {
  return _.isEqual(path1, path2)
})

/**
 * Returns if the pathes have the same parent node.
 * @param {CompoundPath} path1 One of the paths.
 * @param {CompoundPath} path2 The other path.
 * @returns {boolean} True if path1 and path2 have the same parents, false otherwise.
 */
export function sameParents (path1, path2) {
  return path1 && path2 && path1.length > 0 && path2.length > 0 && equal(parent(path1), parent(path2))
}
