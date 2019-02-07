const execSync = require('child_process').execSync;
const path = require('path');
const readline = require('readline');
const fs = require('fs');
const AWS = require('aws-sdk');
const yaml = require('js-yaml');

AWS.config.update({ region: 'us-east-1' });

const cloudformation = new AWS.CloudFormation();

// load the .alchemy.yml file
const alchemyYaml = yaml.safeLoad(fs.readFileSync('.alchemy-deploy.yml'));
const {
  config: { parameters },
} = alchemyYaml;
const stackName = path.basename(process.cwd());

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve =>
    rl.question(query, ans => {
      rl.close();
      resolve(ans);
    })
  );
}

(async () => {
  // make sure aws command exists
  try {
    execSync('command -V aws');
  } catch (e) {
    console.log(
      'aws command does not exist. Please install the awscli and make sure it is available in your PATH'
    );
    process.exit(1);
  }

  // validate the template
  const template = fs.readFileSync(
    path.resolve(__dirname, '../deploy/cloudformation.yaml'),
    'utf-8'
  );
  await cloudformation
    .validateTemplate({
      TemplateBody: template,
    })
    .promise();

  const ans = await askQuestion(
    'Are you sure you want to deploy to PRODUCTION? [y/N] '
  );

  if (ans !== 'y') {
    console.log('Deploy cancelled by user.');
    process.exit(1);
  }

  let err;
  // check if the stack already exists
  try {
    await cloudformation
      .describeStacks({
        StackName: stackName,
      })
      .promise();
  } catch (e) {
    err = e;
  }

  if (err && err.message === `Stack with id ${stackName} does not exist`) {
    await cloudformation
      .createStack({
        StackName: stackName,
        EnableTerminationProtection: true,
        TemplateBody: template,
        Parameters: parameters,
      })
      .promise();

    console.log('Waiting for stack to finish creating.');

    execSync(
      `aws cloudformation wait stack-create-complete --region us-east-1 --stack-name ${stackName}`
    );

    console.log('Stack finished creating.');
  } else {
    await cloudformation
      .updateStack({
        StackName: stackName,
        TemplateBody: template,
        Parameters: parameters,
      })
      .promise();

    console.log('Waiting for stack to finish updating.');

    execSync(
      `aws cloudformation wait stack-update-complete --region us-east-1 --stack-name ${stackName}`
    );

    console.log('Stack finished updating.');
  }

  const describeStacksResult = await cloudformation
    .describeStacks({
      StackName: stackName,
    })
    .promise();

  const Outputs = describeStacksResult.Stacks[0].Outputs;
  console.log(Outputs);
})();
