# GitVersionJS

GitVersionJS is a JavaScript library designed to simplify versioning in Git-based projects. It automates semantic versioning by extracting version information directly from your Git repository.

## Features

- Automatic semantic versioning based on Git history.
- Supports major, minor, and patch version increments.
- Easy integration with CI/CD pipelines.
- Lightweight and fast.

## Installation

Install GitVersionJS via npm from your Azure DevOps project feed:

First, configure npm to use your Azure DevOps feed:

```bash
npm config set registry https://pkgs.dev.azure.com/capfbygg/Forsvarsbygg/_packaging/fb-npm/npm/registry/
npm install gitversionjs --save-dev
```

Replace `<organization>`, `<project>`, and `<feed>` with your Azure DevOps organization, project, and feed names.

## Usage

### Basic Example

```javascript
import { gitversion } from "gitversionjs";

(async () => {
  const versionInfo = await gitversion();
  console.log(`Current version:`, versionInfo.version);
})();
```

### CLI Usage

You can also use GitVersionJS via the command line:

```bash
npx gitversionjs
```

## Configuration

GitVersionJS can be configured using a `.gitversion.config.js` file in the root of your project. Below is an example configuration:

```javascript
export default {
  tagPrefix: "v",
  branchPrefixes: {
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  },
};
```

### Configuration Options

- **`tagPrefix`**: The prefix used for Git tags (default: `"v"`).
- **`branchPrefixes`**: An object defining prefixes for different branch types:
  - `feature`: Prefix for feature branches (e.g., `"feature/"`).
  - `release`: Prefix for release branches (e.g., `"release/"`).
  - `hotfix`: Prefix for hotfix branches (e.g., `"hotfix/"`).

## Packaging and Uploading to Azure DevOps npm Feed

To package and upload the library to your Azure DevOps npm feed, follow these steps:

1. **Build the Package**  
   Ensure your project is built and ready for packaging. Run the following command to create a package:

   ```bash
   npm pack
   ```

2. **Authenticate with Azure DevOps**  
   Use the following command to authenticate with your Azure DevOps npm feed:

   ```bash
   npm login --registry=https://pkgs.dev.azure.com/<organization>/<project>/_packaging/<feed>/npm/registry/
   ```

   Replace `<organization>`, `<project>`, and `<feed>` with your Azure DevOps details.

3. **Publish the Package**  
   Once authenticated, publish the package to the feed:

   ```bash
   npm publish --registry=https://pkgs.dev.azure.com/<organization>/<project>/_packaging/<feed>/npm/registry/
   ```

4. **Verify the Upload**  
   Check your Azure DevOps npm feed to ensure the package has been uploaded successfully.

## Contributing

Contributions are welcome! Please submit issues or pull requests via the [Azure DevOps repository](https://capfbygg@dev.azure.com/capfbygg/Forsvarsbygg/_git/gitversjonjs).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
