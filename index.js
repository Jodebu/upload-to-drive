require('dotenv').config
const { google } = require('googleapis');
const fs = require('fs');
const archiver = require('archiver');
const {
  INPUT_EMAIL: email, //Google Service Account email
  INPUT_KEY: key, //Google Service Account private key
  INPUT_FOLDER: folder,//Google Drive folder to upload the file/folder to
  INPUT_TARGET: target //Local path to the file/folder to upload
} = process.env;

const scopes = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.JWT(email, null, key, scopes);
const drive = google.drive({ version: 'v3', auth });

let filename = target.split('/').pop();

async function main() {
  if (fs.lstatSync(target).isDirectory()){
    filename = `${target}.zip`

    console.log(`Folder detected in ${target}`)
    console.log(`Zipping ${target}...`)

    zipDirectory(target, filename)
    .then(() => uploadToDrive())
    .catch(e => {
      console.error('Zip failed');
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
        console.log(`Folder successfully zipped: ${archive.pointer()} total bytes written`);
        return resolve();
      });
    archive.finalize();
  });
}

function uploadToDrive() {
  console.log('Uploading file to Goole Drive...');
  drive.files.create({
    requestBody: {
      name: filename,
      parents: [folder]
    },
    media: {
      body: fs.createReadStream(`${target}${fs.lstatSync(target).isDirectory() ? '.zip' : ''}`)
    }
  }).then(() => console.log('File uploaded successfully'))
    .catch(e => {
      console.error('Upload failed');
      throw e;
    });
}

main().catch(e => { throw e });
