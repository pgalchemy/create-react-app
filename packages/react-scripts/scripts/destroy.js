const execSync = require('child_process').execSync;
const path = require('path');
const readline = require('readline');
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const cloudformation = new AWS.CloudFormation();

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

  const ans = await askQuestion(
    `Are you sure you want to destroy ${stackName} [y/N] `
  );

  if (ans !== 'y') {
    console.log('Destroy cancelled by user.');
    process.exit(1);
  }

  const describeStacksResult = await cloudformation
    .describeStacks({
      StackName: stackName,
    })
    .promise();

  const Outputs = describeStacksResult.Stacks[0].Outputs;
  const WebsiteBucketName = Outputs.find(
    x => x.OutputKey === 'WebsiteBucketName'
  );

  console.log(`Emptying bucket ${WebsiteBucketName.OutputValue}`);
  execSync(`aws s3 rm s3://${WebsiteBucketName.OutputValue} --recursive`);
  console.log(`Successfully emptied bucket ${WebsiteBucketName.OutputValue}`);

  await cloudformation
    .deleteStack({
      StackName: stackName,
    })
    .promise();

  console.log('Waiting for stack to finish deleting.');
  execSync(
    `aws cloudformation wait stack-delete-complete --stack-name ${stackName} --region us-east-1`
  );

  console.log('Deploy complete.');
})();
