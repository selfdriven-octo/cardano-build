Translate the "text" elements in the following JSON data to Spanish, with your response formatted as JSON: 

{
	"building-on-cardano": {
		"template": {
			"name": "plu-ts",
			"caption": "Hello Plu-ts",
			"type": "hello-world",
			"context": [
				"All we need to build a smart contract and interact with it is",
				"plu-ts|A way to submit transactions",
				"Infact, plu-ts allows you to write the smart contract and create transactions.",
				"To submit the tranasction we will use the koios API, with a simple POST request to the submit endpoint; but we'll think about that later."
			],
			"prerequisites": [
				"plu-ts (and npm to install it)",
				"Anything that can run JavaScript (server environment or browser, doesn't matter)",
				"An internet connection"
			],
			"setup": [
				{
					"text": "Using git we clone a very simple template project:"
				},
				{
					"code-file": "plu-ts-git-clone.md"
				},
				{
					"text": "This gives us a simple project structure:"
				},
				{
					"code-file": "plu-ts-folders.md"
				},
				{
					"text": "Now we only need to run npm install to automatically add the plu-ts library."
				},
				{
					"code-text": "npm install"
				},
				{
					"text": "Et voilà we are ready to start!"
				}
			],
			"step-by-step": [
				{
					"name": "foot-hold",
					"caption": "Foot Hold",
					"steps": [
						{
							"name": "foot-hold-1",
							"step": "1",
							"caption": "The Contract",
							"text": "If we now navigate to src/contract.ts we see we have a very simple validator already!",
							"code-file": "plu-ts-foot-hold-contract.md|src/contract.ts"
						},
						{
							"name": "foot-hold-2",
							"step": "2",
							"text": [
								"Let's focus only on the contract for now;",
								"This contract expects a MyDatum, a MyRedeemer and finally a PScriptContext to validate a transaction.",
								"All of the three above are just Structs",
								"MyDatum and MyRedeemer are types defined by us respectively in src/MyDatum/index.ts and src/MyRedeemer/index.ts"
							]
						},
						{
							"name": "foot-hold-3",
							"step": "3",
							"code-file": "plu-ts-foot-hold-mydatum.md|src/MyDatum/index.ts"
						},
						{
							"name": "foot-hold-4",
							"step": "4",
							"code-file": "plu-ts-foot-hold-myredeemer.md|src/MyRedeemer/index.ts"
						},
						{
							"name": "foot-hold-5",
							"step": "5",
							"text": [
								"Whereas PScriptContext is a predefined data structure that is passed by the cardano-node itself that will run our smart contract.",
								"Finally, the contract is used in src/index.ts which is our entry point.",
								"The index just imports script from src/contract.ts and prints it out as JSON."
							],
							"code-file": "plu-ts-foot-hold-index.md|src/index.ts"
						},
						{
							"name": "foot-hold-6",
							"step": "6",
							"text": [
								"If we go back to src/contract.ts we see that the script is obtained using the following steps:",
								"1) Adapting the validator to the standard using makeValidator"
							],
							"code-file": "plu-ts-foot-hold-contract-makevalidator.md|src/contract.ts"
						},
						{
							"name": "foot-hold-7",
							"step": "7",
							"text": [
								"2) Compiling the validator with compile"
							],
							"code-file": "plu-ts-foot-hold-contract-compile.md|src/contract.ts"
						},
						{
							"name": "foot-hold-8",
							"step": "8",
							"text": [
								"3) Wrapping it in a Script that can be used off-chain"
							],
							"code-file": "plu-ts-foot-hold-contract-script.md|src/contract.ts"
						},
						{
							"name": "foot-hold-9",
							"step": "9",
							"caption": "Running the Template",
							"text": "If we did every step correctly we should be able to run:",
							"code-text": "npm run start"
						},
						{
							"name": "foot-hold-10",
							"step": "10",
							"text": "and the output should look like:",
							"code-file": "plu-ts-foot-hold-compiled.md"
						},
						{
							"name": "foot-hold-10",
							"step": "10",
							"text": [
								"Well congratulations!",
								"This is your first compiled smart contract",
								"But we won't stop here for sure!",
								"Let's personalize this smart contract."
							]
						}
					]
				}
			]
		}
	}
}