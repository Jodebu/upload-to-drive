const actions = require('@actions/core');
const { google } = require('googleapis');
const fs = require('fs');
const archiver = require('archiver');

const credentials = actions.getInput('credentials', { required: true });
const folder = actions.getInput('folder', { required: true });
const target = actions.getInput('target', { required: true });

const credentialsJSON = JSON.parse(atob(credentials));
const scopes = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.JWT(credentialsJSON.client_email, null, credentialsJSON.private_key, scopes)
  .catch(e => console.error("Authentication error"));
const drive = google.drive({ version: 'v3', auth });

let filename = target.split('/').pop();

async function main() {
  if (fs.lstatSync(target).isDirectory()){
    filename = `${target}.zip`

    actions.info(`Folder detected in ${target}`)
    actions.info(`Zipping ${target}...`)

    zipDirectory(target, filename)
    .then(() => uploadToDrive())
    .catch(e => {
      actions.error('Zip failed');
      throw e;
    });
  }
  else
    uploadToDrive();
}

function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close',
      () => {
        actions.info(`Folder successfully zipped: ${archive.pointer()} total bytes written`);
        return resolve();
      });
    archive.finalize();
  });
}

function uploadToDrive() {
  actions.info('Uploading file to Goole Drive...');
  drive.files.create({
    requestBody: {
      name: filename,
      parents: [folder]
    },
    media: {
      body: fs.createReadStream(`${target}${fs.lstatSync(target).isDirectory() ? '.zip' : ''}`)
    }
  }).then(() => actions.info('File uploaded successfully'))
    .catch(e => {
      console.error('Upload failed');
      throw e;
    });
}

main().catch(e => actions.setFailed(e));
