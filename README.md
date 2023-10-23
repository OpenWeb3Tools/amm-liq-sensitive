This is the community repository for work on generic AMM smart contract templates open for all to fork and experiment with.

### General repository info:

This repo is not being developed with the intention of deployment and handling of real funds/users in prod, its just an open resource for anyone to experiment with and build from.

### Running locally:

Get deps: `yarn`
Run tests: `yarn test` (Script which compiles and calls `npx hardhat test`)

Only compile: `yarn compile` (Script which calls `npx hardhat compile`)
Only run a mock RPC node: `yarn node` (Script which calls `npx hardhat node`)

### Formatting & standards (not yet finalised):

Filenames:

- Folders: lower-case-with-dash-separators
- Primary solidity files: PascalCase (camelCase with leading capital letter) like `PoolFactory.sol`
- Secondary solidity files (interfaces): camelCase with leading `i` like `iPoolFactory.sol`
- All other files: standard camelCase like `poolFactoryTests.js`

Inside solidity files:

- Solidity contract names: PascalCase
  ie: `contract PoolFactory { }`
- Private global vars: with leading `_`
  ie: `uint128 private _asset1Depth;`
- Global vars of type `address`: camelCase with tailing `Addr`
  ie: `poolFactoryAddr`
- Address-type args handed into 'address changing or setting' functions like constructors etc: camelCase with leading `new` and tailing `Addr`
  ie: `newPoolFactoryAddr`
