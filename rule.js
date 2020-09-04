module.exports = {
  meta: {
    docs: {
      description: 'verifies user syncs component state with the context state',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    function visitCallExpression(node) {
      // if not a useStateHook node exit early, we should be good here
      if (!isUseStateHookCall(node.callee, {})) return;

      // get the argument with which useState hook has been initialized
      const stateHookInitialValueNode = getArgVal(node.arguments[0]);
      if (
        !stateHookInitialValueNode ||
        stateHookInitialValueNode.type !== 'Identifier'
      )
        return;
      // get all the variables and find the variable which is same as the one initialized in the useState hoook
      const variableNode = context
        .getScope()
        .variables.filter(
          (variable) => variable.name === stateHookInitialValueNode.name
        );
      // if we can't find such variable return. This won't happen in most of the cases
      if ((variableNode || []).length < 1) return;

      // we need to find the parent of the variable because most of the time user will initialise the variable in an object pattern
      // something like const {a,b} = c;
      // we want to find the corresponding call expression for the same
      // so that we can know if the value is variable coming from the useContext hook
      const variableDecalaratorNode = findParent(
        variableNode[0].identifiers[0],
        (parent) => parent.type === 'VariableDeclarator'
      );

      if (
        !variableDecalaratorNode ||
        variableDecalaratorNode.init.type !== 'CallExpression'
      )
        return;

      // use can have React.useContext or useContext make sure we get the node without the React namespace
      const variableDeclaratorIdentifierNode = getNodeWithoutReactNamespace(
        variableDecalaratorNode.init.callee
      );
      if (!variableDeclaratorIdentifierNode) return;
      let isReportable = true;

      // if the identifier is useContext
      // we don't just check for useContext user can also have a factory/helper fn like useGlobalMetadataStateContext
      // user can also have names without context in it but there is nothing we can do about right now
      if (/context/i.test(variableDeclaratorIdentifierNode.name)) {
        // before we report the error let's make sure that there is not already a useEffect already defined with the useState
        // initial value
        context.getScope().block.body.body.forEach((item) => {
          if (
            looksLike(item, {
              type: 'ExpressionStatement',
              expression: {
                type: 'CallExpression',
              },
            })
          ) {
            const calleeNode = getNodeWithoutReactNamespace(
              item.expression.callee
            );
            if (isUseEffectHookCall(calleeNode)) {
              if (
                item.expression.arguments &&
                item.expression.arguments[1] &&
                item.expression.arguments[1].elements &&
                item.expression.arguments[1].elements.findIndex(
                  (fnarg) =>
                    getArgVal(fnarg).name === stateHookInitialValueNode.name
                ) > -1
              ) {
                isReportable = false;
              }
            }
          }
        });
        isReportable &&
          context.report({
            node: node,
            message:
              'The initial value of this state is being initalized with some state from global context. Did you initialise a useEffect for the same?',
          });
      }
    }

    return {
      CallExpression: visitCallExpression,
    };
  },
};

function findParent(node, test) {
  if (test(node)) {
    return node;
  } else if (node.parent) {
    return findParent(node.parent, test);
  }
  return null;
}

function isUseStateHookCall(calleeNode, options) {
  const node = getNodeWithoutReactNamespace(calleeNode);
  if (node.type !== 'Identifier' || node.name !== 'useState') {
    return false;
  }
  return true;
}

function isUseEffectHookCall(calleeNode, options) {
  const node = getNodeWithoutReactNamespace(calleeNode);
  if (node.type !== 'Identifier' || node.name !== 'useEffect') {
    return false;
  }
  return true;
}

function getNodeWithoutReactNamespace(node, options) {
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'React' &&
    node.property.type === 'Identifier' &&
    !node.computed
  ) {
    return node.property;
  }
  return node;
}

// credit goes to https://github.com/kentcdodds/asts-workshop/blob/master/other/final/no-console-7.js#L123
function looksLike(a, b) {
  return (
    a &&
    b &&
    Object.keys(b).every((bKey) => {
      const bVal = b[bKey];
      const aVal = a[bKey];
      if (typeof bVal === 'function') {
        return bVal(aVal);
      }

      return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
    })
  );
}

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val);
}

function getArgVal(node) {
  if (
    node &&
    node.type === 'MemberExpression' &&
    node.object &&
    node.object.type === 'Identifier' &&
    node.property &&
    node.property.type === 'Identifier' &&
    !node.computed
  ) {
    return node.object;
  }
  return node;
}
