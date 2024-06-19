# Remote

![Remote Logo](https://raw.githubusercontent.com/clams-tech/remote/main/.github/images/clams-remote-dark.svg#gh-dark-mode-only)
![Remote Logo](https://raw.githubusercontent.com/clams-tech/remote/main/.github/images/clams-remote.svg#gh-light-mode-only)

Remote control your Core Lightning node(s) via the lightning network from any web enabled device.

- [App](https://remote.clams.tech)
- [Documentation](https://docs.clams.tech/remote)
- [Discord](https://discord.gg/eWfHuJZVaB)
- [Contributing](#contributing)
- [Running Locally](#running-locally)

## Contributing

This project is open source and contributions are welcome and encouraged! If you find any bugs, creating an issue for it is super helpful. If you would like to contribute some code and or implement a feature, try jumping in to our [Discord](https://discord.gg/eWfHuJZVaB) to discuss or create an [issue](https://github.com/clams-tech/remote/issues) on the repo.

### i18n

We would especially love help translating this app to languages other than English. If you have the ability to translate the text in the [en.json](/src/lib/i18n/en.json) file, please go ahead and create a pull request if you know how, otherwise reach out in our [Discord](https://discord.gg/eWfHuJZVaB) so that we can help you get a pull request open.

## Running locally

1. Install the deps

   ```
   yarn
   ```

2. Run dev environment for the browser

   ```
   yarn dev
   ```

   Then [open in your browser](http://localhost:5173)

   Or for the native app

   ```
   yarn dev-native
   ```

## Building from source

1. Install the deps

   ```
   yarn
   ```

2. Build to run in a browser:

```
yarn build
```

Or build the native desktop app:

```
yarn build-native
```
