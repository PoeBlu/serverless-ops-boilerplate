# Production Ready Serverless Ops Boilerplate


 AWS recommends each team to have its own multi-account DevOps oriented setup; However, implementing it is challengin. To make your job easier, I have created this boilerplate. It creates a serverless application the DevOps way. It uses AWS Serverless application Model (SAM) for managing application logic & infrastructure, and AWS Codepipeline, Codebuild, CodeDeploy for CI/CD pipeline. 



## Architecture


An AWS account (called DevOps account) is used to orchestrate CI/CD across different Dev,Test, Prod accounts (we refer to them as environment accounts).

This setup assumes that your backend and frontend code are in separate repositories (but of course you can modify it). This repository includes infrastruture-as-a-code templates as well as the application logic (located in the app folder). And [here](https://github.com/azarboon/serverless-ops-frontend) you can find repository for frontend code.


![Architectural diagram](https://user-images.githubusercontent.com/21277296/77357787-63101b80-6d51-11ea-8a4a-6ea556f4e354.jpg)


## Setup your local machine


Login to AWS console, switch to DevOps account, and set your profile following this instruction (we specify the profile in our commands as  "devops"):

https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html

Do this also for your environment accounts (dev, test, prod) too (we specify the profile in our commands as  "devops").

Create a bucket in your DevOps account and each of your environment accounts to upload SAM packages into it. Replace PUT_YOUR_BUCKET in the commands with your bucket name. 


Install AWS CLI, Node.js


NOTE: All the following commands assume that you are running them from root directory of this repository.


You can setup CI/CD pipeline by following these commands (order matters): 


### 1. Create supporting roles in your environment accounts 

Codepipeline in DevOps account assumes support roles, so it can deploy to environment accounts. In pipeline/support-role.yaml, add the value to the parameter DevOpsAccountId.  Then run the following command to create support role in your dev account:

    aws cloudformation package --template-file pipeline/support-role.yaml --s3-bucket PUT_YOUR_BUCKET --output-template-file pipeline/support-role-packaged.yaml 

    aws cloudformation deploy --template-file pipeline/support-role-packaged.yaml --stack-name DevOps-support-role --region eu-central-1 --capabilities CAPABILITY_NAMED_IAM --profile dev


### 2. Create pipelines in DevOps account

Following command creates pipeline backend and frontend pipelines in DevOps account. We are assuming a trunk-based git flow as it's recommended by AWS (however, you can use this configs for feature-based git flow); so each environment requires its own pipeline (dev, test, prod pipeline). In pipeline/backend.yaml, create a new key in pipelineParams for each environment and fill out required values. 

We do create pipelines in two stages. Firstly we create backend pipeline, which subsequently deploys the application in the dev account. Then, we get Cognito user pool details from the deployed cloudformation stack (which is in the dev account). Then we inject the values into required parameters so we can create frontend pipeline.

In the pipeline/root.yaml, add values for parameters WeatherApiKey (get it from openweathermap.org), DevOpsAccountId, BackendRepository, FrontendRepository, AppName. Also, in the mapping PipelineParams, add a new key for each of your environments (it. test, staging prod). Within each key, you need to add at least account id and the repository branch that contains the code for that environment. Then run following command to create backend pipeline. 


    aws --region eu-central-1 cloudformation package --template-file pipeline/root.yaml --s3-bucket PUT_YOUR_BUCKET --output-template-file pipeline/root-packaged.yaml --profile devops

    aws --region eu-central-1 cloudformation deploy --template-file pipeline/root-packaged.yaml  --stack-name serverless-ops --capabilities CAPABILITY_NAMED_IAM --parameter-overrides Environment=dev --profile devops   


From now on, whenever you commit a new code to master branch of your backend repository, it will update the app (you can change branch name in PipelineParams). Wait until the pipeline runs and deploy the application (currently IntegrationTest fails, which is ok). Then switch to dev account (where the app is deployed), get cloudformation output values and in pipeline/root.yaml, fill parameters ApiRoot, UserPoolAppClientId, UserPoolDomain, RedirectUri, and UserPoolId. Then deploy  the template again using this command in order to create frontend pipeline: 



    aws --region eu-central-1 cloudformation deploy --template-file pipeline/root-packaged.yaml  --stack-name serverless-ops --capabilities CAPABILITY_NAMED_IAM --parameter-overrides Environment=dev BackendAppDeployed=true --profile devops   



## Suggestion for further developments::

Replace Amazon Cognito Identity SDK with AWS Amplify
Fix integration test
Restrict CORS origin based on cloudfront
Add OpenApi specifications to Lambda functions




## Contributors

This boilerplate is inspired by and is simplified version of [Building a Secure Cross-Account Continuous Delivery Pipeline](https://aws.amazon.com/blogs/devops/aws-building-a-secure-cross-account-continuous-delivery-pipeline/)

    

Also, I have leveraged [Weatherapp](https://github.com/mrako/weatherapp)

    
