# Upload to Google Drive
This is a **GitHub action** to upload a file or a folder (zipped) to **Google Drive** using a Google Service Account.

## Table of Contents
- [Setup](#setup)
    - [Google Service Account (GSA)](#google-service-account-(GSA))
    - [Share Drive folder with the GSA](#share-drive-folder-with-the-GSA)
    - [Store credentials as GitHub secrets](#store-credentials-as-github-secrets)
- [Inputs](#inputs)
    - [`credentials`](#credentials)
    - [`folder`](#folder)
    - [`target`](#target)
    - [`name`](#name)
- [Usage Examples](#usage-examples)
    - [Simple usage file workflow example](#simple-usage-file-workflow-example)
    - [Simple usage folder workflow example](#simple-usage-folder-workflow-example)
    - [Complex usage workflow example](#complex-usage-workflow-example)
- [Documentation](#documentation)

## Setup
This section lists the requirements to make this action work and how to meet them.

### Google Service Account (GSA)
First of all you will need a **Google Service Account** for your project. Service accounts are just specific Google account types that are used by services instead of people.  
To make one go to [*Service Accounts*](https://console.cloud.google.com/apis/credentials) in the *IAM and administration* section of the **Google Cloud Plattform** dashboard and create a new project or choose the one you are already using for your current shenanigans.
Click on create new service account and continue with the process. At the end you will get the option to generate a key, **we need this key so store it safely**. It's a json file whith the following structure:
```json
{
  "type": "",
  "project_id": "",
  "private_key_id": "",
  "private_key": "",
  "client_email": "",
  "client_id": "",
  "auth_uri": "",
  "token_uri": "",
  "auth_provider_x509_cert_url": "",
  "client_x509_cert_url": ""
}
```

### Share Drive folder with the GSA
Go to your **Google Drive** and find the folder you want your files to be uploaded to and share it with the GSA. You can find your service account email address in the `client_email` property of your GSA credentials.
While you are here, take a note of **the folder's ID**, the long set of characters after the last `/` in your address bar if you have the folder opened in your browser.

### Store credentials as GitHub secrets
This action needs your GSA credentials to properly authenticate with Google and we don't want anybody to take a peek at them, right? Go to the **Secrets** section of your repo and add a new secret for your credentials. As per GitHub's recommendation, we will store any complex data (like your fancy JSON credentials) as a base64 encoded string.  
You can encode jour `.json` file easily into a new `.txt` file using any bash terminal (just don't forget to change the placeholders with the real name of your credentials file and and the desired output):
```bash
$ base64 CREDENTIALS_FILENAME.json > ENCODED_CREDENTIALS_FILENAME.txt
```
The contents of the newly generated `.txt` file is what we have to procure as a value for our secret.

>![](https://via.placeholder.com/15/f03c15/000000?text=+) **IMPORTANT**: This action assumes that the credentials are stored as a base64 encoded string. If that's not the case, the action will **fail**.

## Inputs
This section lists all inputs this action can take.

### `credentials`
Required: **YES**  
A base64 encoded string with your GSA credentials.

### `folder`
Required: **YES**  
The ID of the Google Drive folder you want to upload to.  
>I would suggest you store this as an environmental variable or a Github secret


### `target`
Required: **YES**  
The local path to the file or folder you want to upload.
>If the path to a folder is given, it will be zipped before upload.

### `name`
Required: **NO**  
Default: `null`  
The name you want your zip file to have.
>- If the `target` input is a file, this input will be ignored.  
>- If not provided, it will default to the folder's name.

## Usage Examples
This section contains some useful examples.

### Simple usage file workflow example
This a very simple workflow example that checks out the repo and uploads the `README.md` file to a Google Drive folder every time there is a push to master.
```yaml
name: Store readme in Drive
on:
  push: { branches: [master] }
jobs:
  buildAndTestForSomePlatforms:
    name: Upload readme to drive
    runs-on: ubuntu-latest
    steps:
      # Checkout
      - name: Checkout repository
        uses: actions/checkout@v2
      # Upload to Drive
      - name: Upload README.md to Google Drive
        uses: Jodebu/upload-to-drive@master
        with:
          target: README.md
          credentials: secrets.<YOUR_DRIVE_CREDENTIALS>
          folder: <YOUR_DRIVE_FOLDER_ID>
```

### Simple usage folder workflow example
This a very simple workflow example that checks out the repo and uploads the `public` folder as a zip file to a Drive folder every time there is a push to master.
```yaml
name: Store public in Drive
on:
  push: { branches: [master] }
jobs:
  buildAndTestForSomePlatforms:
    name: Upload public to drive
    runs-on: ubuntu-latest
    steps:
      # Checkout
      - name: Checkout repository
        uses: actions/checkout@v2
      # Upload to Drive
      - name: Upload public folder to Google Drive
        uses: Jodebu/upload-to-drive@master
        with:
          target: public
          credentials: secrets.<YOUR_DRIVE_CREDENTIALS>
          folder: <YOUR_DRIVE_FOLDER_ID>
```
### Complex usage workflow example
This is a little bit more complex workflow example. This is actually a simplified version of the current workflow that I use in my unity projects to test, compile, and upload several platform builds at a time.
```yaml
name: Dev build
on:
  push: { branches: [develop] }
env:
  UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}

jobs:
  buildAndTestForSomePlatforms:
    name: Build for ${{ matrix.targetPlatform }} on version ${{ matrix.unityVersion }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        projectPath:
          - test-project
        unityVersion:
          - 2019.3.14f1
        targetPlatform:
          - StandaloneOSX
          - StandaloneWindows64
          - StandaloneLinux64
    steps:

      # Checkout
      - name: Checkout repository
        uses: actions/checkout@v2
        with:
          lfs: true
    
      # Cache
      - uses: actions/cache@v1.1.0
        with:
          path: ${{ matrix.projectPath }}/Library
          key: Library-${{ matrix.projectPath }}-${{ matrix.targetPlatform }}
          restore-keys: |
            Library-${{ matrix.projectPath }}-
            Library-

      # Test
      - name: Run tests
        uses: webbertakken/unity-test-runner@v1.3
        id: testRunner
        with:
          projectPath: ${{ matrix.projectPath }}
          unityVersion: ${{ matrix.unityVersion }}
      
      # Upload test results
      - uses: actions/upload-artifact@v1
        with:
          name: Test results (all modes)
          path: ${{ steps.testRunner.outputs.artifactsPath }}

      # Build
      - name: Build projects
        uses: webbertakken/unity-builder@v0.10
        with:
          projectPath: ${{ matrix.projectPath }}
          unityVersion: ${{ matrix.unityVersion }}
          targetPlatform: ${{ matrix.targetPlatform }}
          buildName: ${{ secrets.APP_NAME }}

      # Upload to Drive
      - name: Upload build to Google Drive
        uses: Jodebu/upload-to-drive@master
        with:
          target: build
          name: ${{ matrix.targetPlatform }}
          credentials: ${{ secrets.DRIVE_CREDENTIALS }}
          folder: ${{ secrets.DRIVE_FOLDER }}
```
## Documentation
A simple auto-generated documentation can be found [here](https://jodebu.github.io/upload-to-drive/docs).
