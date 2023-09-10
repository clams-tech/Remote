# Clams

Clams is a FOSS Progressive Web App (PWA) and native desktop app for unifying your Bitcoin data. Connect multiple wallets, automatically sync your data all in the one app.

- [App](https://app.clams.tech)
- [Documentation](https://docs.clams.tech)
- [Discord](https://discord.gg/eWfHuJZVaB)
- [Contributing](#contributing)
- [Running Locally](#running-locally)

![screenshots](./assets/screenshots.png)

## Contributing

This project is open source and contributions are welcome and encouraged! We are working towards having an open roadmap with a list of features we plan on implementing so that anyone who wants to help can pick a feature from the list. In the meantime if you find any bugs or want to implement a feature, try jumping in to our [Discord](https://discord.gg/eWfHuJZVaB) to discuss or create an [issue](https://github.com/clams-tech/app/issues) on the repo.

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
