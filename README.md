# Production Ready Serverless Ops Boilerplate

This is the first part of the boilerplate. You can find the second part (frontend app) [in here](https://github.com/azarboon/serverless-ops-frontend)

AWS recommends each team to have its own multi-account DevOps oriented setup; however, looking at available materials on the Internet (including AWS own materials), I couldn't find any straighforward and easy-to-use solution. Also, despite being a useful tool, Amazon Cognito currently lacks a good documentation and samples, especially when it comes to integration with Lambda and Api Gateway as well as using Cognito Hosted UI. 

To make your job easier, I have created this boilerplate: all you need to do, is to inject few template parameters and deploy the root Cloudformation stack `./pipeline/root.yaml`. It creates backend pipeline and once run, the pipeline deploys an AWS SAM application and returns Cognito details. Then you inject Cognito details as parameters to create frontend pipeline and run it: it builds [a React app](https://github.com/azarboon/serverless-ops-frontend), then deploys it on S3. The app is available only through Cloudfront distribution. Users can authenticate through Cognito Hosted UI and use the app. You can easily modify this boilerplate based on your needs.


## Architecture

This boilerplate uses AWS native tools for continous integration, continous delivery and other required managed services: An AWS account (called DevOps account) is used to orchestrate CI/CD across dev, test, prod accounts (we refer to them as environment accounts). This setup creates separate pipelines for frontend  `./pipeline/frontend.yaml` and backend`./pipeline/backend.yaml`. We assumes that your backend and frontend code are in separate repositories (but of course you can modify it). This repository includes infrastruture-as-a-code for pipelines `./pipeline` as well as the application `./app`. And [here](https://github.com/azarboon/serverless-ops-frontend) you can find repository for frontend code which is a React.js app. Pipelines are created through CloudFormation nested stacks and share common resources `./pipeline/nested-resources.yaml`.  Updates to nested stacks should be done from the root stack `./pipeline/root.yaml`.

Pipelines use AWS CodeCommit for source control (you can use [Github](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-GitHub.html), [Bitbucket](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections.html) or [other Git services too](https://aws.amazon.com/quickstart/architecture/git-to-s3-using-webhooks/)), CodePipeline for automating pipeline, CodeBuild for building and testing application, CodeDeploy for deployment. Once pipeline gets triggered, CodeBuild creates, encrypt and stores artifact in S3 bucket. Then, CodeDeploy retrieves artifact and performs cross account deployment into other accounts. 


Backend pipeline creates backend service `./app` which is an AWS Serverless application Model (SAM) app: AWS Lambda, Lambda Layer, API Gateway, Cloudfront, Cognito User Pool, Secrets Manager, Key Management Service and S3. Lambda gets secret ApiKey from Secrets Manager and makes request to [weather API](https://openweathermap.org/api) to get today's weather report. Frontend pipeline gets the latest code from frontend repository, builds and deploys it to S3. 


![Architectural diagram](https://user-images.githubusercontent.com/21277296/77357787-63101b80-6d51-11ea-8a4a-6ea556f4e354.jpg)


## Setup your local machine


Login to AWS console, switch to DevOps account, and set your profile following [this instruction](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html) (we specify the profile in our commands as "devops"). Do this also for your environment accounts (dev, test, prod).

Create a bucket in your DevOps account and each of your environment accounts to upload SAM packages into it. Replace YOUR_BUCKET_NAME in the commands with your bucket name. 


Install AWS CLI version 2.0, Node.js v13.7.0 (I have used these versions, but others may work too)


NOTE: All the following commands assume that you are running them from root directory of this repository.


### 1. Create supporting roles in your environment accounts 

Pipeline receives the source code from Codecommit, builds the application in Codebuild and then deploys it through CodeDeploy: Backend pipeline uses [CloudFormation action integration while frontend pipeline uses S3](https://docs.aws.amazon.com/codepipeline/latest/userguide/integrations-action-type.html#integrations-deploy).
Codepipeline in DevOps account assumes support roles, so it can deploy to environment accounts (i.e. cross account deployment). In pipeline/support-role.yaml, add the value to the parameter DevOpsAccountId.  Then run the following command to create support role in your dev account:

    aws cloudformation package \
    --template-file pipeline/support-role.yaml \
    --s3-bucket YOUR_BUCKET_NAME --output-template-file \
    pipeline/support-role-packaged.yaml 

    aws cloudformation deploy \
    --template-file pipeline/support-role-packaged.yaml \
    --stack-name DevOps-support-role --region eu-central-1 \
    --capabilities CAPABILITY_NAMED_IAM --profile dev


### 2. Create pipelines in DevOps account

Following commands create backend and frontend pipelines in DevOps account. We are assuming a trunk-based git flow as it's recommended by AWS (however, you can use easily leverage this boilerplate for [feature-based git flow](https://aws.amazon.com/blogs/devops/implementing-gitflow-using-aws-codepipeline-aws-codecommit-aws-codebuild-and-aws-codedeploy/)); so each environment requires its own pipeline (dev, test, prod pipelines). In pipeline/backend.yaml, create a new key in pipelineParams for each environment and fill out required values. 

We do create pipelines in two stages. Firstly we create backend pipeline `./pipeline/backend.yaml`, which subsequently deploys the application in the dev account. Then, we get Cognito user pool details from the deployed cloudformation stack (which can be found in the dev account). Then we inject the values into required parameters so we can create frontend pipeline `./pipeline/frontend.yaml`. Both pipelines

In the pipeline/root.yaml, add values for parameters WeatherApiKey (get it from openweathermap.org), DevOpsAccountId, BackendRepository, FrontendRepository, AppName. Also, in the mapping PipelineParams, add a new key for each of your environments (it. test, staging prod). Within each key, you need to add at least account id and the repository branch that contains the code for that environment. Then run following command to create backend pipeline. 


    aws cloudformation package \
    --template-file pipeline/root.yaml --s3-bucket YOUR_BUCKET_NAME \
    --output-template-file pipeline/root-packaged.yaml --profile devops

    aws cloudformation deploy \
    --template-file pipeline/root-packaged.yaml  \
    --stack-name serverless-ops --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides Environment=dev \
    --profile devops --region eu-central-1 


From now on, whenever you commit a new code to master branch of your backend repository, it will update the app (you can change branch name in PipelineParams). Wait until the pipeline runs and deploy the application (currently IntegrationTest fails, which is ok). Then switch to dev account (where the app is deployed), get cloudformation output values and in pipeline/root.yaml, fill parameters ApiRoot, UserPoolAppClientId, UserPoolDomain, RedirectUri, and UserPoolId. Then deploy  the template again using this command in order to create frontend pipeline: 



    aws --region eu-central-1 cloudformation deploy \
    --template-file pipeline/root-packaged.yaml  --stack-name serverless-ops \
    --capabilities CAPABILITY_NAMED_IAM --parameter-overrides \
    Environment=dev BackendAppDeployed=true --profile devops   


## Suggestion for further developments::

Make the manual more straighforward by e.g. Ansible, so user just input the required parameters and it gets the job done.
Fix integration test
Restrict CORS origin based on cloudfront
Add OpenApi specifications to Lambda functions
Replace Amazon Cognito Identity SDK with AWS Amplify




## References

This boilerplate is inspired by [Building a Secure Cross-Account Continuous Delivery Pipeline](https://aws.amazon.com/blogs/devops/aws-building-a-secure-cross-account-continuous-delivery-pipeline/). Implementing that solution was challenging, that's why I have created this boilerplate.

    
Also, I have leveraged [Weatherapp](https://github.com/mrako/weatherapp)

    
