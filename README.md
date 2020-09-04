# `eslint-plugin-react-hooks-state`

## Need for the rule

If your component uses some state from the app context and then derive the component state based on the context state, this rule makes sure that you always keep the local component state in sync with the context state

```js
const name = useContext(AppContext);
const [localName, setLocalName] = useState(name);

return (
  <input
    type="text"
    value="localName"
    onChange={(ev) => setLocalName(ev.target.value)}
  />
);
```

The above example works fine until the name remains same in AppContext, but if the name changes in the app state the component will have the old value and still use the localName from the component's local state. This can be fixed by having something like below

```js
const name = useContext(AppContext)
const [localName,setLocalName] = useState(name)

useEffect(() => {
    if(name !== localName) {
        setLocalName(name);
    }
},[name])

return(

    <input type="text" value="localName" onChange={(ev) => setLocalName(ev.target.value) }>
)

```

The useEffect hook makes sure that the component local state is always in sync with the context state. This rule helps in catching such errors where you forgot to have a useEffect to sync the state.

It is a part of the [Hooks API](https://reactjs.org/docs/hooks-intro.html) for React.

## Installation

Assuming you already have ESLint installed, run:

```sh
# npm
npm install eslint-plugin-react-hooks-state --save-dev

# yarn
yarn add eslint-plugin-react-hooks-state --dev
```

Then add the rule in your eslintrc file plugins array

```js
{
  "plugins": [
    // ...
    "react-hooks-state"
  ],
  "rules": {
    // ...
    "react-hooks-state/sync-state-with-context": "warn"
  }
}
```
