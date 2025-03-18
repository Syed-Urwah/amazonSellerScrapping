# AmazonSellerScraping Serverless Functions

This uses the [Serverless](https://github.com/serverless/serverless) project to manage
configuration and deployment of functions. [Documentation](https://www.serverless.com/framework/docs)
> Note: We're _not_ using Serverless Framework. It is a paid service on top of Serverless.

## Usage
### Environment Setup
Clone repository

Run `npm i`

Set required environment variables
```bash
TODO
```

### Running functions locally
For functions that access AWS, you'll need to login via `aws sso login`
`npm run dev`

### Project structure
- All functions should live inside the `src` directory
- Functions can be grouped inside directories in `src` dir

## Deployment
TODO

### Adding a new environment variable
1. Add variable to .env file
2. Add variable in provider -> environment section of `serverless.yml`
3. Add variable to Bitbucket in `Repository Settings` -> `Repository Variables`
4. Add variable to `bitbucket-pipelines.yml`