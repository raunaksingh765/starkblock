# Contributing to StarkBlock

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to StarkBlock. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by respect and professionalism. By participating, you are expected to uphold this standard.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples** to demonstrate the steps
* **Describe the behavior you observed** and what behavior you expected
* **Include screenshots or GIFs** if possible
* **Include your browser version and OS**
* **Include your StarkBlock version**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide:

* **A clear and descriptive title**
* **A detailed description of the suggested enhancement**
* **Explain why this enhancement would be useful**
* **List some examples of how it would be used**

### Pull Requests

* Fill in the required template
* Follow the JavaScript style guide
* Include screenshots and animated GIFs in your pull request whenever possible
* End all files with a newline
* Avoid platform-dependent code

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/starkblock.git
   ```
3. Create a branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
4. Make your changes
5. Test thoroughly in Chrome/Edge
6. Commit your changes:
   ```bash
   git commit -m 'Add some feature'
   ```
7. Push to the branch:
   ```bash
   git push origin feature/my-new-feature
   ```
8. Create a Pull Request

## Coding Conventions

### JavaScript

* Use 2 spaces for indentation
* Use camelCase for variable and function names
* Use PascalCase for class names
* Add comments for complex logic
* Keep functions small and focused
* Use meaningful variable names
* Avoid global variables when possible

### CSS

* Use 2 spaces for indentation
* Use kebab-case for class names
* Group related properties together
* Use CSS variables for colors and common values
* Add comments for complex selectors

### File Organization

```
starkblock/
├── manifest.json       # Extension configuration
├── popup.html          # Popup UI
├── js/
│   ├── popup.js       # Popup logic
│   ├── background.js  # Background service worker
│   └── content.js     # Content scripts
├── css/
│   ├── popup.css      # Popup styles
│   └── content.css    # Content styles
├── filters/
│   └── rules.json     # Blocking rules
└── icons/             # Extension icons
```

## Adding Filter Rules

When adding new blocking rules to `filters/rules.json`:

1. Test the rule thoroughly
2. Ensure it doesn't break legitimate sites
3. Document why the domain should be blocked
4. Provide source/evidence if possible
5. Follow the existing JSON structure
6. Increment the ID sequentially

Example:
```json
{
  "id": 100,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "*example-ad-network.com*",
    "resourceTypes": ["script", "xmlhttprequest"]
  }
}
```

## Testing Guidelines

Before submitting a PR:

1. **Test in Chrome** - Primary browser
2. **Test in Edge** - Secondary browser
3. **Test on common sites**:
   - YouTube
   - Facebook
   - Twitter
   - News sites
   - E-commerce sites
4. **Verify stats are tracking correctly**
5. **Test all protection modes**
6. **Test element zapper**
7. **Test whitelist functionality**
8. **Check for console errors**

## Commit Message Guidelines

Use clear and meaningful commit messages:

* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation changes
* **style**: Code style changes (formatting, etc)
* **refactor**: Code refactoring
* **test**: Adding tests
* **chore**: Maintenance tasks

Examples:
```
feat: add YouTube ad skip functionality
fix: resolve popup stats not updating
docs: update installation instructions
style: format background.js code
refactor: optimize element zapper logic
```

## Feature Development Workflow

1. **Discuss** - Open an issue to discuss the feature
2. **Design** - Plan the implementation
3. **Implement** - Write the code
4. **Test** - Thoroughly test the feature
5. **Document** - Update README if needed
6. **Submit** - Create a pull request

## Questions?

Feel free to:
* Open an issue with the `question` label
* Start a discussion in GitHub Discussions
* Reach out to the maintainers

## Recognition

Contributors will be recognized in:
* README.md contributors section
* Release notes
* Project documentation

Thank you for contributing to StarkBlock! 🛡️⚡
