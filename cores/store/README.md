1. Run `node index.js` to start the express server.
1. Run `python upload_file.py` to make an HTTP POST request that attaches `demo.zip` to the request. `demo.zip` is just a copy of this project used for demonstration purposes.
1. The app `appID` will be added to the server, `demo.zip` will be uploaded as `appID.zip` and will be sent to `compressed_app_bundles/`, then the unzipped contents are sent to `decompressed_app_bundles/appID/`.
1. Make an HTTP GET request to `/application/store`, the URL to get the application's entrypoint that's specified in the `manifest.js` will be returned in the response.
1. Enter the URL into the browser to render the HTML/JS/whatever. It should be `http://localhost:3000/applications/appID/app_store_server/index.html`.

NOTE: If the zipped bundle for that app already exists in the `compressed_app_bundles/` then the app won't be added to the server, so remember to delete the bundle when testing, or change the `res.send` on line 101 to match the block on line 106.