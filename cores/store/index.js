let host = 'http://localhost:3000';

const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const path = require('path');
// make the decompressed bundle files available at the
app.use('/applications', express.static(path.resolve(__dirname, 'decompressed_app_bundles')));
const bodyparser = require('body-parser');

// used for uploading files to the server
const multer = require('multer');

// unzips the bundles that it receives
const unzipper = require('unzipper');
const fs = require('fs');

// manage where the uploaded files are saved and under what name
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(__dirname, 'compressed_app_bundles/'));
    },
    filename: function (req, file, cb) {
        // console.log('File properties:', file);
        cb(null, req.params.id + '.zip');
    }
});

// log all incoming requests
app.use(function (req, res, next) {
    console.log(req.method, req.url);
    next();
});

// check if the bundle exists already before uploading
function fileFilter (req, file, cb) {
    fs.access(path.resolve(__dirname, 'compressed_app_bundles/') + req.params.id + '.zip', fs.F_OK, (err) => {
        if (err) {
            // App bundle doesn't exist yet
            cb(null, true);
            return;
        }
        // App bundle already exists, don't accept new bundle
        cb('A bundle for this app already exists on the system.', false);
    })
}

app.locals = {
    applications: []
}

const uploadBase = multer({ 
    storage: storage, 
    dest: path.resolve(__dirname, 'compressed_app_bundles'), 
    fileFilter: fileFilter 
});
let upload = uploadBase.any();

app.disable('x-powered-by');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    'extended': false
}));

// download the bundle from the store
app.get('/applications/download/compressed', function (req, res) {
    var file = path.resolve(__dirname, 'compressed_app_bundles/') + req.query.appid;
    console.log('Trying to download compressed file:', file);
    res.download(file, req.query.appid);
});

// download the decompressed bundles
app.get('/applications/download/decompressed', function (req, res) {
    var file = path.resolve(__dirname, 'decompressed_app_bundles/') + req.query.appid;
    console.log('Trying to download decompressed file:', file);
    res.download(file, req.query.appid);
});

// upload the bundle
/*
Expected 'req':
{
    files: {
        #the_apps_uuid: #file_data
    },
    body: {
        uuid: #the_apps_uuid 
    }
}
*/
app.post('/applications/:id', function (req, res) {
    upload(req, res, async function (err) {
        if (err) {
            if (err instanceof multer.MulterError) {
                // Tried to upload file that wasn't in the accepted list of file names (not currently implemented)
                console.log('A MulterError occurred:', err);
                res.status(400).send(err);
            } else {
                // Either an error or the file already exists
                console.log('An error occurred:', err);
                res.status(500).send(err);
            }
        } else {
            let successObj = await unzipBundle(req.params.id);
            if (successObj.success) {
                app.locals.applications.push({ uuid: req.params.id});
                console.log('Bundle unzipped');
                res.sendStatus(200);
            } else {
                console.log('A problem occurred when trying to unzip the bundle.');
                res.status(500).send('Could not unzip bundle. Error: %s', successObj.error);
            }
        }
    });
});

app.put('/host', function (req, res) {
    if (req.body && req.body.host) {
        host = req.body.host;
        console.log(`Updated host: ${host}`);
        res.sendStatus(200);
        return;
    }
    console.log(req.body);
    res.status(400).send('Must attach a host property to the request');
})

// remove the app from the list of apps
app.delete('/applications', function (req, res) {
    if (req.body && req.body.uuid) {
        app.locals.applications = app.locals.applications.filter(app => app.uuid !== req.body.uuid);
        res.status(200).send(`Successfully removed app ${req.body.uuid} from store`);
    } else {
        res.status(400).send('Must attach uuid to the body of the request');
    }
});

async function unzipBundle (uuid) {
    return new Promise (function (resolve, reject) {
        const stream = fs.createReadStream(path.resolve(__dirname, `compressed_app_bundles/${uuid}.zip`));
        stream.pipe(unzipper.Extract({ path: path.resolve(__dirname, `decompressed_app_bundles/${uuid}`)}))
            .promise()
            .then(function() {
                resolve({ success: true });
            }, function(error) {
                console.log(error);
                resolve({ success: false, error: error});
            });
    });
}

// build the url to the entrypoint specified in the app's manifest.js
async function constructUrl (uuid) {
    return new Promise(function(resolve, reject) {
        let bundlePath = path.resolve(__dirname, `decompressed_app_bundles/${uuid}`);
        fs.access(bundlePath, function (err) {
            if (err) {
                // app's folder doesn't exist
                reject({error: err});
            } else {
                // app's folder exists, get the subfolders and check which one has the manifest
                // this is necessary because sometimes zip files have more than one folder or the system adds a folder, i.e. "__MACOSX/"
                fs.readdir(bundlePath, async function (err, directories) {
                    if (err) {
                        // there was a problem reading the directory
                        reject({error: err});
                    } else {
                        let directory;
                        for (let i = 0; i < directories.length; i++) {
                            directory = directories[i];
                            // check if there is a manifest, else move on
                            if (fs.existsSync(`${bundlePath}/${directory}/manifest.js`)) {
                                let manifestJS = fs.readFileSync(`${bundlePath}/${directory}/manifest.js`).toString();
                                // copy what the generic_hmi does to parse the manifest
                                let jsonStart = manifestJS.indexOf('{');
                                let jsonEnd = manifestJS.lastIndexOf('}') + 1;
                                let manifest = {};
                                try {
                                    manifest = JSON.parse(manifestJS.substring(jsonStart, jsonEnd));
                                } catch (e) {
                                    console.error('failed to parse manifest as JSON: ', e);
                                    return reject(e);
                                }
                                // build the path to the entry point
                                let manifest_entrypoint = path.join('applications', uuid, directory, manifest.entrypoint);
                                return resolve({ url: manifest_entrypoint });
                            }
                        }
                        reject({ error: 'Couldn\'t find manifest.js'});
                    }
                })
            }
        });
    });
};

app.get('/applications/store', function (req, res) {
    Promise.all(app.locals.applications
        .map(async function (app) {
            // if there isn't a url yet for the app, build one
            if(app.url === undefined || app.url === null) {
                const urlObj = await constructUrl(app.uuid).catch(error => error);
                // there was a problem building the url
                if (urlObj.error) {
                    return Promise.resolve({
                        uuid: app.uuid,
                        url: urlObj.error
                    })
                }
                return Promise.resolve({
                    uuid: app.uuid,
                    url: `${host}/${urlObj.url}`
                });
            }
            // url exists already
            Promise.resolve({
                uuid: app.uuid,
                url: app.url
            });
        })
    ).then(function (newApps) {
        console.log(newApps);
        res.send(newApps);
    });
});

app.get('/', serverHealthCheck);
app.get('/health', serverHealthCheck);

function serverHealthCheck (req, res) {
    res.sendStatus(200);
}

const server = app.listen(3000, function () {
    console.log('Server running: ', server.address().port);
});
