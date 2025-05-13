// project-override/.prettierrc.js
module.exports = {
  printWidth: 100, // Max line length
  tabWidth: 2, // Number of spaces per indentation-level
  useTabs: false, // Indent lines with spaces instead of tabs
  semi: true, // Print semicolons at the ends of statements
  singleQuote: true, // Use single quotes instead of double quotes
  quoteProps: 'as-needed', // Only add quotes around object properties where required
  jsxSingleQuote: false, // Use double quotes in JSX
  trailingComma: 'all', // Print trailing commas wherever possible in multi-line comma-separated syntactic structures
  bracketSpacing: true, // Print spaces between brackets in object literals
  bracketSameLine: false, // Put the `>` of a multi-line HTML (HTML, JSX, Vue, Angular) element at the end of the last line
  arrowParens: 'always', // Always include parens around a sole arrow function parameter
  endOfLine: 'lf', // Line ending: Line Feed only (\n), common on Linux and macOS as well as inside git repos
  // You can add more Prettier options as needed
};
